const express = require('express');
const router = express.Router();
const pool = require('../db');
const { ensureAdmin, ensureAuth } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// Status-casing shim.
//
// The frozen schema's status column is ENUM('pending','approved','rejected')
// (lowercase). The existing frontend (Requests.jsx, Profile.jsx) sends and
// displays 'Pending' / 'Approved' / 'Rejected' (capitalized) — both in the
// PUT /:id/status body and in its own STATUS_STYLE lookup tables. Rather
// than edit those components, this route translates transparently: incoming
// status values are lowercased before touching the DB, and every outgoing
// row has its status re-capitalized before being sent back. Frontend needs
// no changes.
// ---------------------------------------------------------------------------
const toDbStatus = (s) => (s || '').toLowerCase();
const toDisplayStatus = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const withDisplayStatus = (row) => (row ? { ...row, status: toDisplayStatus(row.status) } : row);

router.post('/', ensureAuth, async (req, res) => {
  const b = req.body;
  if (!b.animal_id || !b.reason) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const [[animal]] = await pool.query(`SELECT animal_id FROM animals WHERE animal_id = ?`, [b.animal_id]);
    if (!animal) return res.status(404).json({ error: 'Animal not found' });

    const [result] = await pool.query(
      `INSERT INTO adoption_requests (animal_id, user_id, reason, phone, address, experience, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [b.animal_id, req.session.user.id, b.reason, b.phone || null, b.address || null, b.experience || 'No']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mine', ensureAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ar.request_id, ar.reason, ar.status, ar.created_at AS date, ar.experience,
              a.name AS animal_name, a.species, a.image_path
       FROM adoption_requests ar
       JOIN animals a ON ar.animal_id = a.animal_id
       WHERE ar.user_id = ?
       ORDER BY ar.created_at DESC`,
      [req.session.user.id]
    );
    res.json(rows.map(withDisplayStatus));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', ensureAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ar.request_id AS id, ar.reason, ar.status, ar.created_at AS date, ar.experience,
              ar.phone, ar.address,
              u.name AS user_name, u.email AS user_email,
              a.name AS animal_name, a.species
       FROM adoption_requests ar
       JOIN users u ON ar.user_id = u.user_id
       JOIN animals a ON ar.animal_id = a.animal_id
       ORDER BY ar.created_at DESC`
    );
    res.json(rows.map(withDisplayStatus));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id/status (ensureAdmin)
//
// Every status change records reviewed_by (the acting moderator) and
// reviewed_at (now) — this is new behavior the old sqlite version never had.
//
// 'approved' is the interesting case: approving one request has consequences
// for the animal and for every OTHER pending request on that same animal, so
// it all happens inside a single transaction:
//   (a) this row -> status='approved', reviewed_by, reviewed_at, handover_date=now
//   (b) animals.current_status -> 'adopted' for this request's animal
//   (c) every OTHER 'pending' request for the same animal_id -> 'rejected',
//       reviewed_by = same moderator (they didn't individually review each
//       one, but the acting moderator is still the correct audit reference —
//       reviewed_at is also stamped 'now' for consistency)
//
// If any step fails, the whole transaction rolls back — we never want an
// animal marked 'adopted' without its approving request actually being
// marked 'approved', or vice versa.
//
// 'rejected' (and reverting to 'pending') is a simple single-row UPDATE —
// it has no side effects on the animal or on other requests, so no
// transaction is needed.
// ---------------------------------------------------------------------------
router.put('/:id/status', ensureAdmin, async (req, res) => {
  const status = toDbStatus(req.body.status);
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const requestId = req.params.id;
  const moderatorId = req.session.user.id;

  if (status !== 'approved') {
    // Simple path: pending <-> rejected, no cascading effects.
    try {
      const [result] = await pool.query(
        `UPDATE adoption_requests
         SET status = ?, reviewed_by = ?, reviewed_at = NOW()
         WHERE request_id = ?`,
        [status, moderatorId, requestId]
      );
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Request not found' });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // Approval path: transactional.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[request]] = await conn.query(
      `SELECT request_id, animal_id, status FROM adoption_requests WHERE request_id = ? FOR UPDATE`,
      [requestId]
    );
    if (!request) {
      await conn.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    // (a) approve this request
    await conn.query(
      `UPDATE adoption_requests
       SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), handover_date = CURDATE()
       WHERE request_id = ?`,
      [moderatorId, requestId]
    );

    // (b) mark the animal adopted
    await conn.query(
      `UPDATE animals SET current_status = 'adopted' WHERE animal_id = ?`,
      [request.animal_id]
    );

    // (c) auto-reject every other still-pending request for the same animal
    await conn.query(
      `UPDATE adoption_requests
       SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW()
       WHERE animal_id = ? AND request_id != ? AND status = 'pending'`,
      [moderatorId, request.animal_id, requestId]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
