const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const { ensureAdmin } = require('../middleware/auth');

const RECORD_TYPES = ['checkup', 'treatment', 'vaccination'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Vet report uploads (PDF, JPEG, PNG or WebP, max 5 MB).
//
// Reports are stored INSIDE MySQL (table `uploaded_images`), not on disk,
// because Render's free tier wipes the filesystem on every restart/redeploy
// (same approach as sightings.js). medical_records.report_path holds
// "/uploads/db/<image_id>", which server.js already serves with the stored
// mime type and nosniff. getImageUrl() on the frontend resolves it.
// ---------------------------------------------------------------------------
const MAX_REPORT_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const DB_IMAGE_RE = /^\/uploads\/db\/(\d+)$/;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_REPORT_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Vet report must be a PDF or an image (jpg, png, webp)'));
  },
});

// Wrapper so upload errors come back as clean 400 JSON instead of a stack trace.
function uploadReport(req, res, next) {
  upload.single('report')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Vet report must be 5 MB or smaller' : err.message;
      return res.status(400).json({ error: msg });
    }
    next();
  });
}

// Never trust the client-declared mimetype: check the real file signature.
// This also blocks SVG/HTML files disguised as reports.
function detectReportType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  const head = buf.toString('ascii', 0, 12);
  if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

// Insert the uploaded file into uploaded_images (inside the caller's
// transaction) and return the path to store in medical_records.report_path.
async function saveReport(conn, file) {
  const mime = detectReportType(file.buffer);
  if (!mime) {
    const e = new Error('That file is not a valid PDF, JPEG, PNG or WebP');
    e.status = 400;
    throw e;
  }
  const [r] = await conn.query(`INSERT INTO uploaded_images (mime_type, data) VALUES (?, ?)`, [mime, file.buffer]);
  return `/uploads/db/${r.insertId}`;
}

// Delete the uploaded_images row behind a stored report path (if it is one).
// report_path is never client-supplied, so this can only touch rows this
// route created.
async function deleteReport(conn, reportPath) {
  const m = DB_IMAGE_RE.exec(reportPath || '');
  if (m) await conn.query(`DELETE FROM uploaded_images WHERE image_id = ?`, [Number(m[1])]);
}

// ---------------------------------------------------------------------------
// Validates and normalises the body shared by POST and PUT.
// vaccine_name / next_due_date are only meaningful for record_type
// 'vaccination' (app-level rule per the schema notes). For other types they
// are silently nulled. A vaccination record REQUIRES a vaccine_name.
// ---------------------------------------------------------------------------
function validateBody(b) {
  if (!RECORD_TYPES.includes(b.record_type)) {
    return { error: `record_type must be one of: ${RECORD_TYPES.join(', ')}` };
  }
  if (!b.record_date || !DATE_RE.test(b.record_date)) {
    return { error: 'record_date is required in YYYY-MM-DD format' };
  }

  const isVaccination = b.record_type === 'vaccination';
  const vaccineName = isVaccination ? (b.vaccine_name || '').trim() : '';
  if (isVaccination && !vaccineName) return { error: 'vaccine_name is required for a vaccination record' };
  if (vaccineName.length > 150) return { error: 'vaccine_name must be 150 characters or fewer' };

  const nextDue = isVaccination && b.next_due_date ? b.next_due_date : null;
  if (nextDue) {
    if (!DATE_RE.test(nextDue)) return { error: 'next_due_date must be in YYYY-MM-DD format' };
    if (nextDue < b.record_date) return { error: 'next_due_date cannot be earlier than record_date' };
  }

  const vetName = (b.vet_name || '').trim();
  if (vetName.length > 150) return { error: 'vet_name must be 150 characters or fewer' };

  return {
    value: {
      record_type: b.record_type,
      record_date: b.record_date,
      condition_notes: (b.condition_notes || '').trim() || null,
      vet_name: vetName || null,
      vaccine_name: vaccineName || null,
      next_due_date: nextDue,
    },
  };
}

// ---------------------------------------------------------------------------
// POST / (ensureAdmin) — create a medical record, optionally with a report.
// Multipart form fields: animal_id, record_type, record_date, vet_name,
// condition_notes, vaccine_name, next_due_date, and file field "report".
// The report insert and the record insert share ONE transaction, so a failure
// can never leave an orphan image row behind.
// ---------------------------------------------------------------------------
router.post('/', ensureAdmin, uploadReport, async (req, res) => {
  const b = req.body;
  const recordedBy = req.session.user.id;

  if (!b.animal_id) return res.status(400).json({ error: 'animal_id is required' });
  const parsed = validateBody(b);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const v = parsed.value;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[animal]] = await conn.query(`SELECT animal_id FROM animals WHERE animal_id = ?`, [b.animal_id]);
    if (!animal) {
      await conn.rollback();
      return res.status(404).json({ error: 'Animal not found' });
    }

    const reportPath = req.file ? await saveReport(conn, req.file) : null;

    const [result] = await conn.query(
      `INSERT INTO medical_records
         (animal_id, recorded_by, record_type, condition_notes, vet_name, record_date, vaccine_name, next_due_date, report_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.animal_id, recordedBy, v.record_type, v.condition_notes, v.vet_name, v.record_date, v.vaccine_name, v.next_due_date, reportPath]
    );

    await conn.commit();
    res.json({ success: true, record_id: result.insertId });
  } catch (err) {
    try { await conn.rollback(); } catch (_) { /* connection may already be closed */ }
    res.status(err.status || 500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------------------------
// GET /vaccinations/due (ensureAdmin) — worklist of vaccinations that are
// overdue or due within the next 30 days. Registered BEFORE /:animal_id so
// "vaccinations" is not parsed as an animal_id.
//
// A record is excluded once a LATER vaccination of the same vaccine has been
// recorded for the same animal (the booster was given, so the old due date
// is no longer outstanding).
// days_until_due is negative when overdue. Computed at query time, never stored.
// ---------------------------------------------------------------------------
router.get('/vaccinations/due', ensureAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.record_id, m.animal_id, a.name AS animal_name, m.vaccine_name,
              m.next_due_date, m.record_date, m.vet_name,
              DATEDIFF(m.next_due_date, CURDATE()) AS days_until_due
       FROM medical_records m
       JOIN animals a ON a.animal_id = m.animal_id
       WHERE m.record_type = 'vaccination'
         AND m.next_due_date IS NOT NULL
         AND m.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
         AND NOT EXISTS (
           SELECT 1 FROM medical_records m2
           WHERE m2.animal_id = m.animal_id
             AND m2.record_type = 'vaccination'
             AND m2.vaccine_name <=> m.vaccine_name
             AND (m2.record_date > m.record_date
                  OR (m2.record_date = m.record_date AND m2.record_id > m.record_id))
         )
       ORDER BY m.next_due_date ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:animal_id — medical history for one animal, most recent first.
// Public (shown on the animal profile). Unlike the old version it does NOT
// expose who recorded the entry (no recorded_by_name).
router.get('/:animal_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT record_id, animal_id, record_type, condition_notes, vet_name,
              record_date, vaccine_name, next_due_date, report_path
       FROM medical_records
       WHERE animal_id = ?
       ORDER BY record_date DESC, record_id DESC`,
      [req.params.animal_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id (ensureAdmin) — edit a record. The animal cannot be changed.
// Report handling (all in one transaction):
//   - new file uploaded            -> replaces the old report (old row deleted)
//   - remove_report === 'true'     -> report cleared (old row deleted)
//   - neither                      -> existing report kept
// ---------------------------------------------------------------------------
router.put('/:id', ensureAdmin, uploadReport, async (req, res) => {
  const b = req.body;

  const parsed = validateBody(b);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const v = parsed.value;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[existing]] = await conn.query(
      `SELECT record_id, report_path FROM medical_records WHERE record_id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!existing) {
      await conn.rollback();
      return res.status(404).json({ error: 'Medical record not found' });
    }

    let reportPath = existing.report_path;
    if (req.file) reportPath = await saveReport(conn, req.file);
    else if (b.remove_report === 'true') reportPath = null;

    await conn.query(
      `UPDATE medical_records
       SET record_type = ?, condition_notes = ?, vet_name = ?, record_date = ?,
           vaccine_name = ?, next_due_date = ?, report_path = ?
       WHERE record_id = ?`,
      [v.record_type, v.condition_notes, v.vet_name, v.record_date, v.vaccine_name, v.next_due_date, reportPath, req.params.id]
    );

    if (existing.report_path && existing.report_path !== reportPath) {
      await deleteReport(conn, existing.report_path);
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    try { await conn.rollback(); } catch (_) { /* connection may already be closed */ }
    res.status(err.status || 500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id (ensureAdmin) — delete a record and its stored report.
// expenses.medical_record_id is ON DELETE SET NULL, so linked expenses keep
// existing and simply lose the link.
// ---------------------------------------------------------------------------
router.delete('/:id', ensureAdmin, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[existing]] = await conn.query(
      `SELECT report_path FROM medical_records WHERE record_id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!existing) {
      await conn.rollback();
      return res.status(404).json({ error: 'Medical record not found' });
    }

    await conn.query(`DELETE FROM medical_records WHERE record_id = ?`, [req.params.id]);
    await deleteReport(conn, existing.report_path);

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    try { await conn.rollback(); } catch (_) { /* connection may already be closed */ }
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
