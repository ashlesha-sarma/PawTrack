const express = require('express');
const router = express.Router();
const pool = require('../db');
const { ensureAdmin } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// POST / (ensureAdmin) — create a foster placement.
//
// "One active placement per animal at a time" is an app-level rule (per the
// frozen schema notes — MySQL 8 doesn't cleanly support a partial unique
// index like `UNIQUE (animal_id) WHERE status='active'`; a full unique index
// on animal_id would wrongly block a *second, later* placement once the
// first is completed). So this route enforces it manually.
//
// Race-condition handling: a plain "SELECT to check, then INSERT if clear"
// is NOT safe on its own — two concurrent POSTs for the same animal_id could
// both run their SELECT before either INSERT commits, and both would see
// "no active placement" and both would insert, violating the rule anyway.
//
// This route closes that gap with a transaction + SELECT ... FOR UPDATE:
//   1. BEGIN a transaction on a dedicated connection (not the shared pool.query
//      convenience method, since transactions need a single connection held
//      across statements).
//   2. SELECT ... FOR UPDATE the animal's active placement row (if any).
//      Under InnoDB's default REPEATABLE READ isolation, this takes a
//      next-key (gap) lock on the animal_id range being searched even when
//      no matching row currently exists — so a second concurrent transaction
//      running the same SELECT ... FOR UPDATE for the same animal_id blocks
//      until the first transaction commits or rolls back, rather than both
//      transactions independently seeing "no active placement".
//   3. If a row was found, ROLLBACK and return 409 immediately.
//   4. If not, INSERT the new placement, then COMMIT (releasing the lock).
//
// This is correct as long as the MySQL connection's isolation level is left
// at InnoDB's default (REPEATABLE READ) — if a deployment ever overrides it
// to READ COMMITTED, gap locking is disabled and this specific protection
// would need an alternative (e.g. a real unique index workaround, or
// retrying on a duplicate-key error). Worth a one-line note in deployment
// docs; not changing db.js's connection config here since no isolation
// level is currently set, so the InnoDB default applies.
// ---------------------------------------------------------------------------
router.post('/', ensureAdmin, async (req, res) => {
  const { animal_id, foster_user_id, start_date } = req.body;

  if (!animal_id || !foster_user_id || !start_date) {
    return res.status(400).json({ error: 'animal_id, foster_user_id, and start_date are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Confirm the animal exists (clearer error than a bare FK failure).
    const [[animal]] = await conn.query(`SELECT animal_id FROM animals WHERE animal_id = ?`, [animal_id]);
    if (!animal) {
      await conn.rollback();
      return res.status(404).json({ error: 'Animal not found' });
    }

    // Lock any existing active placement row for this animal so a concurrent
    // request for the same animal_id has to wait behind this transaction.
    const [[activePlacement]] = await conn.query(
      `SELECT placement_id FROM foster_placements
       WHERE animal_id = ? AND status = 'active'
       FOR UPDATE`,
      [animal_id]
    );

    if (activePlacement) {
      await conn.rollback();
      return res.status(409).json({
        error: 'This animal already has an active foster placement. Complete or cancel it before starting a new one.'
      });
    }

    const [result] = await conn.query(
      `INSERT INTO foster_placements (animal_id, foster_user_id, start_date, status)
       VALUES (?, ?, ?, 'active')`,
      [animal_id, foster_user_id, start_date]
    );

    // Keep the animal's status in sync with its active placement.
    await conn.query(
      `UPDATE animals SET current_status = 'fostered' WHERE animal_id = ?`,
      [animal_id]
    );

    await conn.commit();
    res.json({ success: true, placement_id: result.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// PATCH /:id/complete (ensureAdmin) — end an active placement.
router.patch('/:id/complete', ensureAdmin, async (req, res) => {
  const endDate = req.body.end_date || new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const [result] = await pool.query(
      `UPDATE foster_placements
       SET status = 'completed', end_date = ?
       WHERE placement_id = ?`,
      [endDate, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    // Return the animal to 'available' when its foster ends.
    await pool.query(
      `UPDATE animals a
       JOIN foster_placements fp ON fp.animal_id = a.animal_id
       SET a.current_status = 'available'
       WHERE fp.placement_id = ? AND a.current_status = 'fostered'`,
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    // Covers the chk_foster_dates CHECK constraint (end_date >= start_date)
    // if an out-of-order date is supplied.
    res.status(400).json({ error: err.message });
  }
});

// GET /public/:animal_id — public-safe foster history for one animal.
// Returns only display fields; no foster_user_id or foster_user_name are
// included so this endpoint is safe to call from unauthenticated pages.
// IMPORTANT: registered BEFORE /:animal_id so Express does not parse
// the literal string "public" as an animal_id parameter.
router.get('/public/:animal_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT placement_id, start_date, end_date, status
       FROM   foster_placements
       WHERE  animal_id = ?
       ORDER  BY start_date DESC`,
      [req.params.animal_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:animal_id — placement history for one animal, most recent first.
router.get('/:animal_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.*, u.name AS foster_user_name
       FROM foster_placements f
       LEFT JOIN users u ON u.user_id = f.foster_user_id
       WHERE f.animal_id = ?
       ORDER BY f.start_date DESC`,
      [req.params.animal_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
