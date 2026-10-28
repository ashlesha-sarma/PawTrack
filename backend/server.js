require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const path = require('path');

const pool = require('./db');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    // Flexible check: includes and startsWith
    const isAllowed = allowedOrigins.some(ao => origin.startsWith(ao));
    if (isAllowed) {
      return callback(null, true);
    } else {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isProd = process.env.NODE_ENV === 'production';

// Session store: reuses the same MySQL connection pool db.js already
// maintains, so sessions live in the same database as everything else
// (a "sessions" table is auto-created by express-mysql-session on startup).
// No second datastore, no extra service to run or configure.
const sessionStore = new MySQLStore({}, pool);

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'pawtrack-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  proxy: isProd, // Required for secure cookies on Render
  cookie: {
    secure: isProd, // true in production
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax', // Use 'none' for cross-domain sessions
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/animals', require('./routes/animals'));
app.use('/api/sightings', require('./routes/sightings'));
app.use('/api/medical', require('./routes/medical'));
app.use('/api/foster', require('./routes/foster'));
app.use('/api/adoptions', require('./routes/adoptions'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/admin', require('./routes/admin'));

// ---------------------------------------------------------------------------
// Production error handler — must be registered AFTER all routes.
// Returns a generic message so internal details (stack traces, DB errors)
// are never sent to clients. The full error is logged server-side only.
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: isProd ? 'Internal server error' : err.message });
});

// Bind to 0.0.0.0 so Render's proxy can reach the process on any interface.
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => console.log(`🐾 PawTrack backend running on port ${PORT}`));
