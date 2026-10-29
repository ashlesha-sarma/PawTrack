const express = require('express');
const router = express.Router();
const pool = require('../db');
const { ensureAuth, ensureAdmin } = require('../middleware/auth');
const animalsRoute = require('./animals');

// Reuse animals.js's multer config and insert helper so a sighting report
// that includes a brand-new animal doesn't duplicate the file-upload or
// INSERT logic that already lives there.
const { upload, insertAnimal } = animalsRoute;

// ---------------------------------------------------------------------------
// POST / — report a sighting (ensureAuth: any logged-in user can report).
//
// Two shapes are accepted in the same endpoint:
//   1. animal_id is provided        -> log a sighting against an existing animal.
//   2. animal_id is omitted         -> treat this as reporting a brand-new,
//      not-yet-known animal: create the animal row first (reusing animals.js's
//      insertAnimal helper, defaulting current_status to 'reported'), then
//      log the sighting against the newly created animal_id in the same request.
//
// reported_by is always taken from the session, never trusted from the body.
// ---------------------------------------------------------------------------
router.post('/', ensureAuth, upload.single('image'), async (req, res) => {
  const b = req.body;
  const reportedBy = req.session.user.id;

  if (!b.location) {
    return res.status(400).json({ error: 'Location is required' });
  }

  try {
    let animalId = b.animal_id ? Number(b.animal_id) : null;

    if (!animalId) {
      // No existing animal referenced — this sighting is the first report
      // of a new animal. Register it (status defaults to 'reported' inside
      // insertAnimal unless the body explicitly overrides it).
      if (!b.name || !b.species) {
        return res.status(400).json({
          error: 'animal_id is required, or provide name and species to report a new animal'
        });
      }
      const image = req.file ? `/uploads/${req.file.filename}` : '/uploads/placeholder.png';
      animalId = await insertAnimal(b, image);
    } else {
      // Confirm the referenced animal actually exists so we fail clearly
      // instead of letting the FK RESTRICT throw an opaque DB error.
      const [[animal]] = await pool.query(`SELECT animal_id FROM animals WHERE animal_id = ?`, [animalId]);
      if (!animal) return res.status(404).json({ error: 'Animal not found' });
    }

    const [result] = await pool.query(
      `INSERT INTO sightings (animal_id, reported_by, location, notes)
       VALUES (?, ?, ?, ?)`,
      [animalId, reportedBy, b.location, b.notes || null]
    );

    res.json({ success: true, sighting_id: result.insertId, animal_id: animalId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /public/:animal_id — public-safe sighting history for one animal.
// Returns only display fields; no user IDs, reported_by, or names are
// included so this endpoint is safe to call from unauthenticated pages.
// IMPORTANT: registered BEFORE /:animal_id so Express does not parse
// the literal string "public" as an animal_id parameter.
router.get('/public/:animal_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT sighting_id, location, notes, reported_at, verified
       FROM   sightings
       WHERE  animal_id = ?
       ORDER  BY reported_at DESC`,
      [req.params.animal_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:animal_id — all sightings for a given animal, most recent first.
router.get('/:animal_id', async (req, res) => {
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

// PATCH /:id/verify — a moderator confirms a sighting is genuine.
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

// PATCH /:id/assign — a moderator takes (or is given) ownership of a
// rescue case. assigned_to holds the responsible moderator's user_id;
// there is no separate volunteer/rescue-case table (per the frozen design
// decision) — the sighting row itself IS the rescue case record.
router.patch('/:id/assign', ensureAdmin, async (req, res) => {
  const { assigned_to } = req.body;
  if (!assigned_to) {
    return res.status(400).json({ error: 'assigned_to (moderator user_id) is required' });
  }

  try {
    // Validate the target user is actually a moderator — assigning a rescue
    // case to a plain 'user' account wouldn't make sense under the role model.
    const [[target]] = await pool.query(`SELECT user_id, role FROM users WHERE user_id = ?`, [assigned_to]);
    if (!target) return res.status(404).json({ error: 'Assigned user not found' });
    if (target.role !== 'moderator') {
      return res.status(400).json({ error: 'assigned_to must be a moderator' });
    }

    const [result] = await pool.query(
      `UPDATE sightings
       SET assigned_to = ?, assigned_at = NOW()
       WHERE sighting_id = ?`,
      [assigned_to, req.params.id]
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
