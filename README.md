# PawTrack

A database-driven platform for campus animal welfare — sighting reports, medical care, fostering, adoption, and transparent donation tracking, backed by a normalized MySQL schema.

## 1. Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** MySQL 8+ (InnoDB), accessed via `mysql2` (promise pool)
- **Sessions:** `express-session` + `express-mysql-session` (stored in MySQL, not memory)

## 2. Main Database Tables

`users` · `animals` · `sightings` · `medical_records` · `foster_placements` · `adoption_requests` · `donation_drives` · `donations` · `expenses`

## 3. How It Was Implemented (brief)

Built as a MySQL/InnoDB redesign of an existing SQLite prototype (CampusPaws), reusing the React frontend and rebuilding the database layer from scratch. Key decisions: a single `current_status` enum drives each animal's lifecycle instead of scattered flags; foreign keys use `RESTRICT` on animal/drive history so records are archived via status rather than deleted; donation totals and campaign expenses are **never stored** — they're computed live with `SUM()` on every request; and adoption approval runs inside a database transaction that atomically marks the animal adopted and auto-rejects every other pending applicant.

## 4. Install & Setup

```bash
npm run install:all          # installs backend + frontend dependencies
```

Create `backend/.env` (see `backend/.env.example`):

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=pawtrack
SESSION_SECRET=any-random-string
FRONTEND_URL=http://localhost:5173
PORT=4000
NODE_ENV=development
```

## 5–7. Initialize MySQL & Start the App

```sql
CREATE DATABASE pawtrack;
```

No separate migration step — `backend/db.js` creates all 9 tables and seed data automatically the first time the server starts.

```bash
npm run dev:backend     # http://localhost:4000
npm run dev:frontend    # http://localhost:5173
```

## 8. Demo Sequence (5–10 min)

1. **Log in as a user** (see test accounts below) → browse `/home/animals`.
2. **Report a sighting** of a new animal from an animal's page, or via the "History" panel in admin.
3. **Log in as moderator** → Admin Dashboard → open an animal's **History** panel → verify the sighting, assign it to a moderator.
4. **Medical tab** → add a checkup and a vaccination record (with a due date) → note the "Vaccinations due" stat on the dashboard update.
5. **Foster tab** → start a placement → try starting a second one for the same animal (blocked) → complete the first, then start a new one (allowed).
6. **Adoption** → as two different users, submit adoption requests for the same animal → as moderator, approve one on the **Requests** page → the other auto-rejects and the animal flips to "adopted".
7. **Donations** → open a campaign, donate as a user → watch the raised amount update live.
8. **Transparency** → on the same campaign page, view the **Transparency** section showing raised / spent / remaining (spent comes from recorded expenses via the API).

## 9. USER vs MODERATOR

| Capability | User | Moderator |
|---|---|---|
| Report sightings, apply for adoption, donate | ✅ | ✅ |
| Verify/assign sightings, manage animals | ❌ | ✅ |
| Add medical records, foster placements | ❌ | ✅ |
| Approve/reject adoption requests | ❌ | ✅ |
| Manage donation drives, record expenses | ❌ | ✅ |
| View admin dashboard | ❌ | ✅ |

## 10. Database Concepts Demonstrated

- **Referential integrity with intentional delete rules** — `RESTRICT` preserves animal/campaign history; `SET NULL` anonymizes a deleted user's past actions without destroying records.
- **Transactions** — adoption approval and foster-placement creation both use multi-statement transactions (`BEGIN`/`COMMIT`/`ROLLBACK`) to guarantee atomicity and prevent race conditions.
- **Query-time aggregation over stored derived values** — donation totals, spent amounts, and remaining balances are always `SUM()`ed fresh, never cached, so they can never drift out of sync.
- **Joins & role-based access control** — moderator-only routes are gated by a `role` column checked server-side, not just hidden in the UI.

## 11. Test Accounts

| Role | Email | Password |
|---|---|---|
| Moderator | `admin@campuspaws.test` | `Admin@123` |
| User | `demo@student.test` | `Demo@123` |
