const express = require('express');
const router = express.Router();
const pool = require('../db');
const { ensureAdmin } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// GET /stats (ensureAdmin)
//
// Rewritten from a 6-level nested-callback pyramid to parallel async/await
// queries via Promise.all — same data, same total round trips, much easier
// to read and extend.
//
// Stats dropped: total_posts (posts feature removed entirely).
// Stats added, all enabled by the new schema:
//   - animals_by_status: counts grouped by current_status (replaces the old
//     single up_for_adoption / needs_treatment text-match counts with the
//     real 5-value status breakdown)
//   - active_foster_placements: COUNT from foster_placements WHERE status='active'
//   - vaccinations_due_count: reuses the same due-date logic as
//     GET /medical/vaccinations/due (overdue or due within 30 days)
//   - total_expenses: SUM(expenses.amount) across all drives
//
// available_animals and needs_treatment are kept (derived from
// animals_by_status) purely so AdminDashboard.jsx's existing stat cards for
// those two values keep working without a rewrite.
// ---------------------------------------------------------------------------
router.get('/stats', ensureAdmin, async (req, res) => {
  try {
    const [
      [[{ total: total_animals }]],
      [statusRows],
      [[{ total: total_users }]],
      [[{ total: total_donations }]],
      [[{ total: pending_requests }]],
      [[{ total: approved_adoptions }]],
      [[{ total: active_foster_placements }]],
      [[{ total: vaccinations_due_count }]],
      [[{ total: total_expenses }]],
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM animals`),
      pool.query(`SELECT current_status, COUNT(*) AS total FROM animals GROUP BY current_status`),
      pool.query(`SELECT COUNT(*) AS total FROM users WHERE role = 'user'`),
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM donations`),
      pool.query(`SELECT COUNT(*) AS total FROM adoption_requests WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*) AS total FROM adoption_requests WHERE status = 'approved'`),
      pool.query(`SELECT COUNT(*) AS total FROM foster_placements WHERE status = 'active'`),
      pool.query(
        `SELECT COUNT(*) AS total FROM medical_records
         WHERE record_type = 'vaccination'
           AND next_due_date IS NOT NULL
           AND next_due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)`
      ),
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM expenses`),
    ]);

    const animals_by_status = {};
    for (const row of statusRows) animals_by_status[row.current_status] = row.total;

    res.json({
      total_animals,
      available_animals: animals_by_status.available || 0,
      needs_treatment: animals_by_status.under_care || 0,
      animals_by_status,
      total_users,
      total_donations,
      pending_requests,
      approved_adoptions,
      active_foster_placements,
      vaccinations_due_count,
      total_expenses,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /recent-activity — unchanged shape (type/date/actor/subject), rewritten
// for the new column names (user_id, animal_id, drive_id are now the real
// PKs rather than "id").
router.get('/recent-activity', ensureAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 'adoption' AS type, ar.created_at AS date, u.name AS actor, a.name AS subject
       FROM adoption_requests ar
       JOIN users u ON ar.user_id = u.user_id
       JOIN animals a ON ar.animal_id = a.animal_id
       UNION ALL
       SELECT 'donation' AS type, d.donated_at AS date, u.name AS actor, dd.title AS subject
       FROM donations d
       JOIN users u ON d.user_id = u.user_id
       JOIN donation_drives dd ON d.drive_id = dd.drive_id
       ORDER BY date DESC
       LIMIT 10`
    );
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
