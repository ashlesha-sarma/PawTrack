const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const { ensureAdmin, ensureAuth } = require('../middleware/auth');

// ── Multer setup (unchanged from the original — campaign photo uploads) ──────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_')),
});
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) return cb(null, true);
  cb(new Error('Only image files are allowed'), false);
};
const upload = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ---------------------------------------------------------------------------
// raised_amount computation.
//
// donation_drives has NO raised_amount column (per the frozen schema — see
// Section A: "No raised_amount/spent/remaining stored — all three are
// query-time computations"). Every endpoint that returns a drive computes it
// live as SUM(donations.amount) WHERE drive_id = X, via a correlated
// subquery alongside the existing donor_count subquery. The JSON response
// field is still named `raised_amount` (and `photo`, aliased from the new
// photo_path column — see SCHEMA_AMENDMENTS.md) so DonationCard.jsx,
// DriveDetail.jsx, and ManageDrives.jsx need no changes — they only ever
// read these fields, never write them directly.
//
// drive_id is also aliased as `id` for the same reason animals.js aliases
// animal_id as `id`: the existing frontend uses `drive.id` throughout for
// routing, React keys, and edit/close/reopen targets.
// ---------------------------------------------------------------------------
const DRIVE_SELECT = `
  SELECT dd.drive_id AS id,
         dd.title, dd.description, dd.target_amount, dd.deadline, dd.is_active,
         dd.created_by, dd.animal_id, dd.created_at,
         dd.photo_path AS photo,
         COALESCE((SELECT SUM(amount) FROM donations WHERE drive_id = dd.drive_id), 0) AS raised_amount,
         (SELECT COUNT(DISTINCT user_id) FROM donations WHERE drive_id = dd.drive_id) AS donor_count
  FROM donation_drives dd
`;

// ── GET /drives  (all drives + donor count + live raised_amount) ────────────
router.get('/drives', async (req, res) => {
  try {
    const [rows] = await pool.query(`${DRIVE_SELECT} ORDER BY dd.created_at DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /drives/active ────────────────────────────────────────────────────
router.get('/drives/active', async (req, res) => {
  try {
    const [rows] = await pool.query(`${DRIVE_SELECT} WHERE dd.is_active = 1 ORDER BY dd.created_at DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /drives/:id  (single drive) ──────────────────────────────────────
router.get('/drives/:id', async (req, res) => {
  try {
    const [[row]] = await pool.query(`${DRIVE_SELECT} WHERE dd.drive_id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Drive not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /drives/:id/recent  (recent donations for a drive) ──────────────────
router.get('/drives/:id/recent', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.amount, d.donated_at AS date, u.name AS donor_name
       FROM donations d JOIN users u ON d.user_id = u.user_id
       WHERE d.drive_id = ?
       ORDER BY d.donated_at DESC LIMIT 10`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /donate — the primary (and now only) donation path. No payment
// gateway: this mirrors the original "simulated / legacy" /donate endpoint,
// which is now the standard flow. Razorpay's /create-order and
// /verify-payment endpoints, the razorpay package usage, and all
// crypto/HMAC signature-verification logic have been removed entirely.
//
// Since raised_amount is never stored, there is nothing to increment here —
// inserting the donation row is the entire effect. The updated total is
// simply whatever GET /drives/:id computes next.
// ---------------------------------------------------------------------------
router.post('/donate', ensureAuth, async (req, res) => {
  const { drive_id, amount } = req.body;
  const parsedAmount = Number(amount);

  if (!drive_id || !parsedAmount || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Invalid donation data' });
  }

  try {
    const [[drive]] = await pool.query(`SELECT drive_id FROM donation_drives WHERE drive_id = ?`, [drive_id]);
    if (!drive) return res.status(404).json({ error: 'Drive not found' });

    await pool.query(
      `INSERT INTO donations (drive_id, user_id, amount, status) VALUES (?, ?, ?, 'completed')`,
      [drive_id, req.session.user.id, parsedAmount]
    );

    // Return the freshly computed totals so the frontend can update its
    // progress bar/donor count immediately, matching the old verify-payment
    // response shape (raised_amount, donor_count) that DriveDetail.jsx reads.
    const [[updated]] = await pool.query(`${DRIVE_SELECT} WHERE dd.drive_id = ?`, [drive_id]);
    res.json({ success: true, raised_amount: updated.raised_amount, donor_count: updated.donor_count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /my-donations ─────────────────────────────────────────────────────
router.get('/my-donations', ensureAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.amount, d.donated_at AS date, dd.title, dd.drive_id AS drive_id
       FROM donations d JOIN donation_drives dd ON d.drive_id = dd.drive_id
       WHERE d.user_id = ? ORDER BY d.donated_at DESC`,
      [req.session.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: create/update/close/reopen drives ────────────────────────────────
router.post('/drives', ensureAdmin, upload.single('photo'), async (req, res) => {
  const b = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const [result] = await pool.query(
      `INSERT INTO donation_drives (title, description, target_amount, deadline, is_active, created_by, photo_path)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [b.title, b.description || null, b.target_amount, b.deadline, req.session.user.id, photo]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/drives/:id', ensureAdmin, upload.single('photo'), async (req, res) => {
  const b = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : b.existing_photo;

  try {
    await pool.query(
      `UPDATE donation_drives SET title=?, description=?, target_amount=?, deadline=?, photo_path=?
       WHERE drive_id=?`,
      [b.title, b.description || null, b.target_amount, b.deadline, photo, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/drives/:id/close', ensureAdmin, async (req, res) => {
  try {
    await pool.query(`UPDATE donation_drives SET is_active = 0 WHERE drive_id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/drives/:id/reopen', ensureAdmin, async (req, res) => {
  try {
    await pool.query(`UPDATE donation_drives SET is_active = 1 WHERE drive_id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
