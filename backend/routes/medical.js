const express = require('express');
const router = express.Router();
const pool = require('../db');
const { ensureAdmin } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// POST / (ensureAdmin) — create a medical record.
//
// vaccine_name / next_due_date are only meaningful when record_type is
// 'vaccination' (per the frozen schema notes: "populated only when
// record_type='vaccination', enforced at application level"). MySQL has no
// column-level CHECK tying vaccine_name's presence to record_type here, so
// this route is the single place that enforces it: if the client sends
// record_type='checkup' or 'treatment' along with vaccine_name/next_due_date
// (e.g. leftover form state, a buggy client, or a malicious request), those
// two fields are silently nulled out before the INSERT rather than trusted
// or rejected — the record is still created, just without data that
// wouldn't make sense for that record_type.
// ---------------------------------------------------------------------------
const RECORD_TYPES = ['checkup', 'treatment', 'vaccination'];

router.post('/', ensureAdmin, async (req, res) => {
  const b = req.body;
  const recordedBy = req.session.user.id;

  if (!b.animal_id || !b.record_type || !b.record_date) {
    return res.status(400).json({ error: 'animal_id, record_type, and record_date are required' });
  }
  if (!RECORD_TYPES.includes(b.record_type)) {
    return res.status(400).json({ error: `record_type must be one of: ${RECORD_TYPES.join(', ')}` });
  }

  // Application-level validation: only a 'vaccination' record may carry
  // vaccine_name / next_due_date. Anything else gets nulled, not rejected —
  // an admin submitting a checkup with a stray vaccine_name shouldn't fail
  // the whole request over an irrelevant field.
  const isVaccination = b.record_type === 'vaccination';
  const vaccineName = isVaccination ? (b.vaccine_name || null) : null;
  const nextDueDate = isVaccination ? (b.next_due_date || null) : null;

  try {
    const [[animal]] = await pool.query(`SELECT animal_id FROM animals WHERE animal_id = ?`, [b.animal_id]);
    if (!animal) return res.status(404).json({ error: 'Animal not found' });

    const [result] = await pool.query(
      `INSERT INTO medical_records
         (animal_id, recorded_by, record_type, condition_notes, vet_name, record_date, vaccine_name, next_due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.animal_id, recordedBy, b.record_type, b.condition_notes || null, b.vet_name || null, b.record_date, vaccineName, nextDueDate]
    );

    res.json({ success: true, record_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /vaccinations/due — vaccination records whose next_due_date is either
// already past, or falls within the next 30 days. Registered BEFORE
// GET /:animal_id so Express doesn't try to match "vaccinations" as an
// :animal_id path parameter.
//
// Business value: this is exactly the kind of query the vaccine_name /
// next_due_date columns exist to enable — a moderator-facing "what needs a
// booster soon" worklist, computed directly from stored dates rather than
// any derived/cached status.
router.get('/vaccinations/due', ensureAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.record_id, m.animal_id, a.name AS animal_name, m.vaccine_name,
              m.next_due_date, m.record_date, m.vet_name
       FROM medical_records m
       JOIN animals a ON a.animal_id = m.animal_id
       WHERE m.record_type = 'vaccination'
         AND m.next_due_date IS NOT NULL
         AND m.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       ORDER BY m.next_due_date ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:animal_id — medical history for one animal, most recent first.
router.get('/:animal_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.*, u.name AS recorded_by_name
       FROM medical_records m
       LEFT JOIN users u ON u.user_id = m.recorded_by
       WHERE m.animal_id = ?
       ORDER BY m.record_date DESC`,
      [req.params.animal_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
