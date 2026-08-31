const express = require('express');
const router = express.Router();
const pool = require('../db');
const { ensureAdmin } = require('../middleware/auth');

const CATEGORIES = ['medical', 'food', 'shelter', 'other'];

// ---------------------------------------------------------------------------
// POST / (ensureAdmin) — record an expense against a drive.
//
// medical_record_id is optional and, when present, links this expense to
// the specific animal/medical case it was spent on (e.g. "this $80 expense
// was the vet bill for Bruno's medical_records row #14"). This is CASE
// traceability, not DONOR traceability — it does NOT connect back to any
// individual donation or donor. The two traceability chains are kept
// deliberately separate per the frozen schema notes:
//   donor -> donation -> drive        (campaign-level: who gave money to what campaign)
//   expense -> medical_record -> animal  (case-level: what the money was spent on)
// There is no single query path from a specific donor to a specific expense,
// and this route does not attempt to build one.
// ---------------------------------------------------------------------------
router.post('/', ensureAdmin, async (req, res) => {
  const b = req.body;
  const recordedBy = req.session.user.id;

  if (!b.drive_id || !b.amount || !b.expense_date || !b.category) {
    return res.status(400).json({ error: 'drive_id, amount, expense_date, and category are required' });
  }
  if (!CATEGORIES.includes(b.category)) {
    return res.status(400).json({ error: `category must be one of: ${CATEGORIES.join(', ')}` });
  }
  const amount = Number(b.amount);
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  try {
    const [[drive]] = await pool.query(`SELECT drive_id FROM donation_drives WHERE drive_id = ?`, [b.drive_id]);
    if (!drive) return res.status(404).json({ error: 'Drive not found' });

    if (b.medical_record_id) {
      const [[record]] = await pool.query(
        `SELECT record_id FROM medical_records WHERE record_id = ?`,
        [b.medical_record_id]
      );
      if (!record) return res.status(404).json({ error: 'medical_record_id does not reference an existing medical record' });
    }

    const [result] = await pool.query(
      `INSERT INTO expenses (drive_id, recorded_by, medical_record_id, description, amount, expense_date, category)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [b.drive_id, recordedBy, b.medical_record_id || null, b.description || null, amount, b.expense_date, b.category]
    );

    res.json({ success: true, expense_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /:drive_id — expenses for a drive, plus computed `spent` and
// `remaining` totals. Like raised_amount in donations.js, neither value is
// ever stored: both are derived here, at query time, from the same
// underlying rows every time this endpoint is called.
//
//   raised   = SUM(donations.amount)  WHERE drive_id = X   (see donations.js)
//   spent    = SUM(expenses.amount)   WHERE drive_id = X
//   remaining = raised - spent
// ---------------------------------------------------------------------------
router.get('/:drive_id', async (req, res) => {
  const driveId = req.params.drive_id;

  try {
    const [[drive]] = await pool.query(`SELECT drive_id FROM donation_drives WHERE drive_id = ?`, [driveId]);
    if (!drive) return res.status(404).json({ error: 'Drive not found' });

    const [rows] = await pool.query(
      `SELECT e.expense_id, e.description, e.amount, e.expense_date, e.category,
              e.medical_record_id, u.name AS recorded_by_name
       FROM expenses e
       LEFT JOIN users u ON u.user_id = e.recorded_by
       WHERE e.drive_id = ?
       ORDER BY e.expense_date DESC`,
      [driveId]
    );

    const [[{ raised }]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS raised FROM donations WHERE drive_id = ?`,
      [driveId]
    );
    const [[{ spent }]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS spent FROM expenses WHERE drive_id = ?`,
      [driveId]
    );

    res.json({
      expenses: rows,
      spent: Number(spent),
      remaining: Number(raised) - Number(spent),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
