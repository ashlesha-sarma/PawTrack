const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../db');
const { ensureAdmin } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});
// Whitelist of safe raster formats. The old filter accepted every image/*
// type, which includes image/svg+xml (SVG files can carry scripts).
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const imageFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only JPEG, PNG, WebP, AVIF or GIF images are allowed'), false);
};
const upload = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Animals created from a user's sighting report start as 'reported'. Those are
// hidden from the public (visitors and normal users) until a moderator changes
// their status. Moderators (session role) always see every animal, so the admin
// screens that call these same endpoints keep working.
const isModerator = (req) => !!(req.session && req.session.user && req.session.user.role === 'moderator');

// ---------------------------------------------------------------------------
// Backward-compatibility shim for the existing frontend.
//
// The frozen schema replaced the old health_status / vaccination_status /
// up_for_adoption text fields (and the location_found / current_location
// fields) with a single current_status ENUM. Rather than editing every
// frontend component that reads those old field names, we derive them here
// so existing components (AnimalCard, Animals.jsx, AnimalDetail.jsx) keep
// working unchanged wherever they only READ these fields.
//
// Mapping (best-effort, one-directional — for DISPLAY only):
//   current_status = 'under_care'                -> up_for_adoption: 'Cannot be adopted', health_status: 'Needs treatment'
//   current_status = 'reported' | 'fostered'      -> up_for_adoption: 'Cannot be adopted', health_status: 'Healthy'
//   current_status = 'available'                  -> up_for_adoption: 'Up for adoption',   health_status: 'Healthy'
//   current_status = 'adopted'                    -> up_for_adoption: 'Adopted',            health_status: 'Healthy'
//
// vaccination_status is derived from medical_records (see vaccination_current subquery).
//
// location_found: populated by the GET queries via a correlated subquery that
// fetches the location of the earliest sighting. NULL when no sightings exist.
//
// current_location: derived from has_active_foster (also from the query) and
// current_status. Never exposes foster user identity.
//
// `id` is aliased from animal_id so route params, React keys, and links
// throughout the frontend (`animal.id`) keep working without edits.
// ---------------------------------------------------------------------------
function withLegacyFields(row) {
  if (!row) return row;

  let up_for_adoption;
  let health_status = 'Healthy';
  if (row.current_status === 'available') up_for_adoption = 'Up for adoption';
  else if (row.current_status === 'adopted') up_for_adoption = 'Adopted';
  else {
    up_for_adoption = 'Cannot be adopted';
    if (row.current_status === 'under_care') health_status = 'Needs treatment';
  }

  // Derive a human-readable current location without leaking any user data.
  let current_location;
  if (row.has_active_foster || row.current_status === 'fostered') {
    current_location = 'With a foster family';
  } else if (row.current_status === 'adopted') {
    current_location = 'Adopted';
  } else {
    current_location = 'Campus shelter';
  }

  return {
    ...row,
    id: row.animal_id,
    up_for_adoption,
    health_status,
    vaccination_status: row.vaccination_current > 0 ? 'Vaccinated' : 'Not vaccinated',
    // location_found comes from the correlated subquery in the SELECT — pass
    // it through unchanged. Falls back to null if no sightings exist.
    location_found: row.location_found || null,
    current_location,
  };
}

router.get('/', async (req, res) => {
  try {
    const visibility = isModerator(req) ? '' : `WHERE a.current_status <> 'reported'`;
    const [rows] = await pool.query(
      `SELECT a.*,
         (
           SELECT s.location
           FROM   sightings s
           WHERE  s.animal_id = a.animal_id
           ORDER  BY s.reported_at ASC, s.sighting_id ASC
           LIMIT  1
         ) AS location_found,
         (
           SELECT COUNT(*)
           FROM   foster_placements fp
           WHERE  fp.animal_id = a.animal_id
             AND  fp.status = 'active'
         ) AS has_active_foster,
         (
           SELECT COUNT(*)
           FROM   medical_records mr
           WHERE  mr.animal_id = a.animal_id
             AND  mr.record_type = 'vaccination'
             AND  (mr.next_due_date IS NULL OR mr.next_due_date >= CURDATE())
         ) AS vaccination_current
       FROM animals a
       ${visibility}
       ORDER BY a.created_at DESC`
    );
    res.json(rows.map(withLegacyFields));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const visibility = isModerator(req) ? '' : `AND a.current_status <> 'reported'`;
    const [[row]] = await pool.query(
      `SELECT a.*,
         (
           SELECT s.location
           FROM   sightings s
           WHERE  s.animal_id = a.animal_id
           ORDER  BY s.reported_at ASC, s.sighting_id ASC
           LIMIT  1
         ) AS location_found,
         (
           SELECT COUNT(*)
           FROM   foster_placements fp
           WHERE  fp.animal_id = a.animal_id
             AND  fp.status = 'active'
         ) AS has_active_foster,
         (
           SELECT COUNT(*)
           FROM   medical_records mr
           WHERE  mr.animal_id = a.animal_id
             AND  mr.record_type = 'vaccination'
             AND  (mr.next_due_date IS NULL OR mr.next_due_date >= CURDATE())
         ) AS vaccination_current
       FROM animals a
       WHERE a.animal_id = ? ${visibility}`,
      [req.params.id]
    );
    res.json(withLegacyFields(row) || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shared insert helper (admin "Add animal"). Sighting reports no longer use
// this — sightings.js inserts inside its own transaction and forces the
// status to 'reported'. Kept exported so nothing that imports it breaks.
async function insertAnimal(b, imagePath) {
  const status = b.current_status || 'reported';
  const [result] = await pool.query(
    `INSERT INTO animals (name, species, breed, age, gender, current_status, image_path, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [b.name, b.species, b.breed || null, b.age || null, b.gender || null, status, imagePath, b.description || '']
  );
  return result.insertId;
}

router.post('/', ensureAdmin, upload.single('image'), async (req, res) => {
  const b = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : '/uploads/placeholder.png';

  try {
    const id = await insertAnimal(b, image);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', ensureAdmin, upload.single('image'), async (req, res) => {
  const b = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : b.existing_image_path;
  const status = b.current_status || 'reported';

  try {
    await pool.query(
      `UPDATE animals SET name=?, species=?, breed=?, age=?, gender=?, current_status=?, image_path=?, description=?
       WHERE animal_id=?`,
      [b.name, b.species, b.breed || null, b.age || null, b.gender || null, status, image, b.description || '', req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE is only safe once an animal has no lifecycle history — the FKs from
// sightings / medical_records / foster_placements / adoption_requests to
// animals are all ON DELETE RESTRICT, so MySQL itself refuses the delete at
// the storage-engine level if any related rows exist. We just catch the FK
// violation and turn it into a clear message. Archiving via current_status is
// the intended path for animals with history.
router.delete('/:id', ensureAdmin, async (req, res) => {
  try {
    const [result] = await pool.query(`DELETE FROM animals WHERE animal_id = ?`, [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Animal not found' });
    }
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({
        error: 'This animal has related records (sightings, medical history, foster placements, or adoption requests) and cannot be deleted. Update its status instead to archive it.'
      });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.insertAnimal = insertAnimal;
module.exports.upload = upload;
