const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../db');
const { ensureAuth, ensureAdmin } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// Sighting reports.
//
// Photos are stored INSIDE MySQL (table `uploaded_images`) instead of on disk,
// because Render's free tier wipes the filesystem on every restart/redeploy.
// A stored image is referenced by the path  /uploads/db/<image_id>  which
// server.js serves from the database. The existing frontend helper
// getImageUrl() already turns "/uploads/..." into a full backend URL, so no
// frontend image logic needs to change.
// ---------------------------------------------------------------------------

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_REPORTS_PER_HOUR = 5;          // per normal user (moderators exempt)
const SPECIES = ['dog', 'cat', 'others'];
const GENDERS = ['Male', 'Female', 'Unknown'];
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, WebP, AVIF or GIF photos are allowed'));
  },
});

// Wrap multer so upload errors become clean 400 JSON responses.
const uploadPhoto = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 5 MB or smaller' : err.message;
    res.status(400).json({ error: msg });
  });
};

// Never trust the client-declared mimetype: check the real file signature.
// This also blocks SVG/HTML files disguised as images.
function detectImageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  const head = buf.toString('ascii', 0, 12);
  if (head.startsWith('GIF87a') || head.startsWith('GIF89a')) return 'image/gif';
  if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return 'image/webp';
  if (head.slice(4, 8) === 'ftyp') {
    const brand = head.slice(8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  return null;
}

async function saveImage(conn, file) {
  const mime = detectImageType(file.buffer);
  if (!mime) {
    const e = new Error('That file is not a valid JPEG, PNG, WebP, AVIF or GIF image');
    e.status = 400;
    throw e;
  }
  const [r] = await conn.query(`INSERT INTO uploaded_images (mime_type, data) VALUES (?, ?)`, [mime, file.buffer]);
  return `/uploads/db/${r.insertId}`;
}

const clean = (v, max) => String(v === undefined || v === null ? '' : v).trim().slice(0, max);

// ---------------------------------------------------------------------------
// POST / — report a sighting (any logged-in user).
//
// Two shapes in one endpoint:
//   1. animal_id present  -> sighting of an existing animal.
//   2. animal_id absent   -> a brand-new animal. `species` is required, `name`
//      is optional (people rarely know a stray's name). The animal is created
//      with current_status = 'reported' ALWAYS (the client cannot choose),
//      which keeps it hidden from the public list until a moderator promotes it.
//
// The animal insert, photo insert and sighting insert run in ONE transaction,
// so a failure can never leave an orphan animal or an orphan image behind.
// reported_by always comes from the session, never from the request body.
// ---------------------------------------------------------------------------
router.post('/', ensureAuth, uploadPhoto, async (req, res) => {
  const b = req.body || {};
  const user = req.session.user;
  const isModerator = user.role === 'moderator';

  const location = clean(b.location, 300);
  const notes = clean(b.notes, 1100);
  if (!location) return res.status(400).json({ error: 'Location is required' });
  if (location.length > 255) return res.status(400).json({ error: 'Location must be 255 characters or fewer' });
  if (notes.length > 1000) return res.status(400).json({ error: 'Notes must be 1000 characters or fewer' });

  let animalId = null;
  if (b.animal_id !== undefined && b.animal_id !== null && b.animal_id !== '') {
    animalId = Number(b.animal_id);
    if (!Number.isInteger(animalId) || animalId <= 0) {
      return res.status(400).json({ error: 'Invalid animal_id' });
    }
  }

  let newAnimal = null;
  if (!animalId) {
    const species = clean(b.species, 50).toLowerCase();
    if (!SPECIES.includes(species)) {
      return res.status(400).json({ error: 'Choose a species (dog, cat or others) for a new animal' });
    }
    newAnimal = {
      name: clean(b.name, 150) || null,
      species,
      breed: clean(b.breed, 100) || null,
      gender: GENDERS.includes(b.gender) ? b.gender : null,
      description: clean(b.description, 1000),
    };
  }

  const conn = await pool.getConnection();
  try {
    // Simple spam control: max 5 reports per hour for normal users.
    if (!isModerator) {
      const [[{ cnt }]] = await conn.query(
        `SELECT COUNT(*) AS cnt FROM sightings
         WHERE reported_by = ? AND reported_at > (NOW() - INTERVAL 1 HOUR)`,
        [user.id]
      );
      if (Number(cnt) >= MAX_REPORTS_PER_HOUR) {
        return res.status(429).json({
          error: `You can submit at most ${MAX_REPORTS_PER_HOUR} reports per hour. Please try again later.`,
        });
      }
    }

    await conn.beginTransaction();

    const photoPath = req.file ? await saveImage(conn, req.file) : null;

    if (animalId) {
      const [[animal]] = await conn.query(
        `SELECT animal_id, current_status FROM animals WHERE animal_id = ?`,
        [animalId]
      );
      // Normal users must not be able to probe hidden (unreviewed) animals by id.
      if (!animal || (!isModerator && animal.current_status === 'reported')) {
        await conn.rollback();
        return res.status(404).json({ error: 'Animal not found' });
      }
    } else {
      const [ins] = await conn.query(
        `INSERT INTO animals (name, species, breed, age, gender, current_status, image_path, description)
         VALUES (?, ?, ?, NULL, ?, 'reported', ?, ?)`,
        [
          newAnimal.name,
          newAnimal.species,
          newAnimal.breed,
          newAnimal.gender,
          photoPath || '/uploads/placeholder.png',
          newAnimal.description,
        ]
      );
      animalId = ins.insertId;
    }

    const [result] = await conn.query(
      `INSERT INTO sightings (animal_id, reported_by, location, notes, photo_path)
       VALUES (?, ?, ?, ?, ?)`,
      [animalId, user.id, location, notes || null, photoPath]
    );

    await conn.commit();
    res.json({ success: true, sighting_id: result.insertId, animal_id: animalId });
  } catch (err) {
    try { await conn.rollback(); } catch (_) { /* connection may already be closed */ }
    console.error('[sightings/post]', err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not save the sighting' });
  } finally {
    conn.release();
  }
});

// GET /mine — the logged-in user's own reports with a friendly status.
// Registered BEFORE /:animal_id so "mine" is not parsed as an animal id.
router.get('/mine', ensureAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.sighting_id, s.animal_id, s.location, s.notes, s.photo_path, s.reported_at,
              a.name AS animal_name, a.species,
              CASE WHEN s.assigned_to IS NOT NULL THEN 'Assigned'
                   WHEN s.verified = 1 THEN 'Verified'
                   ELSE 'Pending' END AS status
       FROM sightings s
       JOIN animals a ON a.animal_id = s.animal_id
       WHERE s.reported_by = ?
       ORDER BY s.reported_at DESC`,
      [req.session.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /public/:animal_id — public-safe history. Only VERIFIED sightings are
// shown, and sightings of still-hidden ('reported') animals are never exposed.
// No user ids or names are returned.
router.get('/public/:animal_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.sighting_id, s.location, s.notes, s.reported_at, s.verified
       FROM   sightings s
       JOIN   animals a ON a.animal_id = s.animal_id
       WHERE  s.animal_id = ? AND s.verified = 1 AND a.current_status <> 'reported'
       ORDER  BY s.reported_at DESC`,
      [req.params.animal_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET / (moderator) — the moderation queue: every sighting, unverified first.
router.get('/', ensureAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.sighting_id, s.animal_id, s.location, s.notes, s.photo_path,
              s.reported_at, s.verified, s.verified_at, s.assigned_to, s.assigned_at,
              a.name AS animal_name, a.species, a.current_status AS animal_status,
              u.name AS reported_by_name, u.email AS reported_by_email,
              asg.name AS assigned_to_name
       FROM sightings s
       JOIN animals a ON a.animal_id = s.animal_id
       LEFT JOIN users u ON u.user_id = s.reported_by
       LEFT JOIN users asg ON asg.user_id = s.assigned_to
       ORDER BY s.verified ASC, s.reported_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:animal_id (moderator) — full sighting history for one animal, including
// reporter / verifier / assignee names. Previously public; now admin-only
// because it exposes personal names. Public pages use /public/:animal_id.
router.get('/:animal_id', ensureAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, u.name AS reported_by_name, v.name AS verified_by_name, a.name AS assigned_to_name
       FROM sightings s
       LEFT JOIN users u ON u.user_id = s.reported_by
       LEFT JOIN users v ON v.user_id = s.verified_by
       LEFT JOIN users a ON a.user_id = s.assigned_to
       WHERE s.animal_id = ?
       ORDER BY s.reported_at DESC`,
      [req.params.animal_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /:id/verify — the moderator confirms a sighting is genuine.
router.patch('/:id/verify', ensureAdmin, async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE sightings
       SET verified = TRUE, verified_by = ?, verified_at = NOW()
       WHERE sighting_id = ?`,
      [req.session.user.id, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Sighting not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /:id/assign — the moderator takes ownership of the rescue case.
// With a single moderator, assigned_to simply defaults to the acting
// moderator; an explicit assigned_to is still accepted (and must be a
// moderator) so the endpoint keeps working if more moderators are added.
router.patch('/:id/assign', ensureAdmin, async (req, res) => {
  const assignedTo = req.body && req.body.assigned_to ? Number(req.body.assigned_to) : req.session.user.id;

  try {
    const [[target]] = await pool.query(`SELECT user_id, role FROM users WHERE user_id = ?`, [assignedTo]);
    if (!target) return res.status(404).json({ error: 'Assigned user not found' });
    if (target.role !== 'moderator') {
      return res.status(400).json({ error: 'assigned_to must be a moderator' });
    }

    const [result] = await pool.query(
      `UPDATE sightings
       SET assigned_to = ?, assigned_at = NOW()
       WHERE sighting_id = ?`,
      [assignedTo, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Sighting not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
