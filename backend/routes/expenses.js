const express = require('express');
const router = express.Router();
const pool = require('../db');
const { ensureAdmin } = require('../middleware/auth');

const CATEGORIES = ['medical', 'food', 'shelter', 'other'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const round2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Validates and normalises the body shared by POST and PUT.
// Returns { error } or { value }.
// `description` (the purpose of the spend) is REQUIRED at the application
// level so the public transparency list always explains what money was used
// for, even though the column itself is nullable in the schema.
// ---------------------------------------------------------------------------
function validateExpenseBody(b) {
  const description = (b.description || '').trim();
  if (!description) return { error: 'A purpose/description for the expense is required' };
  if (description.length > 255) return { error: 'Description must be 255 characters or fewer' };

  if (!b.expense_date || !DATE_RE.test(b.expense_date)) {
    return { error: 'expense_date is required in YYYY-MM-DD format' };
  }
  if (!CATEGORIES.includes(b.category)) {
    return { error: `category must be one of: ${CATEGORIES.join(', ')}` };
  }
  const amount = Number(b.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'amount must be a positive number' };
  }

  return {
    value: {
      description,
      amount: round2(amount),
      expense_date: b.expense_date,
      category: b.category,
    },
  };
}

// raised = SUM(donations), spent = SUM(expenses) for one drive. Never stored.
async function getTotals(conn, driveId) {
  const [[{ raised }]] = await conn.query(
    `SELECT COALESCE(SUM(amount), 0) AS raised FROM donations WHERE drive_id = ?`,
    [driveId]
  );
  const [[{ spent }]] = await conn.query(
    `SELECT COALESCE(SUM(amount), 0) AS spent FROM expenses WHERE drive_id = ?`,
    [driveId]
  );
  return { raised: Number(raised), spent: Number(spent) };
}

// ---------------------------------------------------------------------------
// POST / (ensureAdmin) — record an expense against a drive.
//
// Rule: total spent may never exceed total raised for the drive.
// The check + insert run inside a transaction that locks the drive row with
// SELECT ... FOR UPDATE, so two admins submitting at the same moment cannot
// both pass the check and overspend (same pattern as foster.js).
//
// medical_record_id is optional (case traceability, not donor traceability).
// ---------------------------------------------------------------------------
router.post('/', ensureAdmin, async (req, res) => {
  const b = req.body;
  const recordedBy = req.session.user.id;

  if (!b.drive_id) return res.status(400).json({ error: 'drive_id is required' });

  const parsed = validateExpenseBody(b);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const v = parsed.value;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[drive]] = await conn.query(
      `SELECT drive_id FROM donation_drives WHERE drive_id = ? FOR UPDATE`,
      [b.drive_id]
    );
    if (!drive) {
      await conn.rollback();
      return res.status(404).json({ error: 'Drive not found' });
    }

    if (b.medical_record_id) {
      const [[record]] = await conn.query(
        `SELECT record_id FROM medical_records WHERE record_id = ?`,
        [b.medical_record_id]
      );
      if (!record) {
        await conn.rollback();
        return res.status(404).json({ error: 'medical_record_id does not reference an existing medical record' });
      }
    }

    const { raised, spent } = await getTotals(conn, b.drive_id);
    const available = round2(raised - spent);
    if (v.amount > available) {
      await conn.rollback();
      return res.status(400).json({
        error: `Amount exceeds the funds remaining for this drive (available: ${available.toFixed(2)})`,
      });
    }

    const [result] = await conn.query(
      `INSERT INTO expenses (drive_id, recorded_by, medical_record_id, description, amount, expense_date, category)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [b.drive_id, recordedBy, b.medical_record_id || null, v.description, v.amount, v.expense_date, v.category]
    );

    await conn.commit();
    res.json({ success: true, expense_id: result.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------------------------
// PUT /:id (ensureAdmin) — edit an expense's description, amount, date or
// category. The drive it belongs to cannot be changed.
// The overspend check treats the expense's OLD amount as freed up:
//   available = raised - (spent - oldAmount)
// ---------------------------------------------------------------------------
router.put('/:id', ensureAdmin, async (req, res) => {
  const parsed = validateExpenseBody(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const v = parsed.value;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[existing]] = await conn.query(
      `SELECT expense_id, drive_id, amount FROM expenses WHERE expense_id = ?`,
      [req.params.id]
    );
    if (!existing) {
      await conn.rollback();
      return res.status(404).json({ error: 'Expense not found' });
    }

    await conn.query(`SELECT drive_id FROM donation_drives WHERE drive_id = ? FOR UPDATE`, [existing.drive_id]);

    const { raised, spent } = await getTotals(conn, existing.drive_id);
    const available = round2(raised - (spent - Number(existing.amount)));
    if (v.amount > available) {
      await conn.rollback();
      return res.status(400).json({
        error: `Amount exceeds the funds available for this drive (available: ${available.toFixed(2)})`,
      });
    }

    await conn.query(
      `UPDATE expenses SET description = ?, amount = ?, expense_date = ?, category = ? WHERE expense_id = ?`,
      [v.description, v.amount, v.expense_date, v.category, req.params.id]
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

// ---------------------------------------------------------------------------
// DELETE /:id (ensureAdmin) — remove an expense. Remaining is recomputed
// automatically on the next GET because nothing is stored.
// ---------------------------------------------------------------------------
router.delete('/:id', ensureAdmin, async (req, res) => {
  try {
    const [result] = await pool.query(`DELETE FROM expenses WHERE expense_id = ?`, [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Expense not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /:drive_id — public. Expense list + computed totals + per-category
// breakdown. Everything is derived at query time.
//
// Response:
//   { expenses: [...], raised, spent, remaining, by_category: [{category,total}] }
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
       ORDER BY e.expense_date DESC, e.expense_id DESC`,
      [driveId]
    );

    const [byCategory] = await pool.query(
      `SELECT category, SUM(amount) AS total
       FROM expenses
       WHERE drive_id = ?
       GROUP BY category
       ORDER BY total DESC`,
      [driveId]
    );

    const { raised, spent } = await getTotals(pool, driveId);

    res.json({
      expenses: rows,
      raised,
      spent,
      remaining: raised - spent,
      by_category: byCategory.map((r) => ({ category: r.category, total: Number(r.total) })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
