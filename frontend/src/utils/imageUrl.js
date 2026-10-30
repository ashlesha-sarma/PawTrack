// VITE_API_BASE_URL is injected at build time by Vite from the appropriate
// .env file:
//   .env.development  → http://localhost:4000/api   (npm run dev)
//   .env.production   → https://pawtrack-backend-6n0t.onrender.com/api  (npm run build)
//
// The fallback to localhost:4000 is a last-resort safety net so that
// the helper still produces a working URL in local dev even if the env
// file is absent (e.g. a fresh clone before running setup instructions).
// It is NEVER used in production because Render always injects the var
// at build time via render.yaml / Render dashboard.
const rawBaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'http://localhost:4000/api';

// Strip the trailing /api segment to get the bare origin, e.g.
//   "http://localhost:4000/api"                          → "http://localhost:4000"
//   "https://pawtrack-backend-6n0t.onrender.com/api"     → "https://pawtrack-backend-6n0t.onrender.com"
const backendOrigin = rawBaseUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');

/**
 * Resolves an image path stored in the database to a full, usable URL.
 *
 * Handles all path forms written by the upload routes:
 *   /uploads/filename.jpg   → <backendOrigin>/uploads/filename.jpg
 *   uploads/filename.jpg    → <backendOrigin>/uploads/filename.jpg
 *   filename.jpg            → <backendOrigin>/uploads/filename.jpg
 *
 * Absolute URLs (http/https/data/blob) are returned unchanged.
 * Null / empty / explicit placeholder paths return '/placeholder.png'.
 *
 * @param {string|null|undefined} imagePath - Raw image_path from the DB or API
 * @returns {string} Fully-qualified URL or '/placeholder.png'
 */
export function getImageUrl(imagePath) {
  // Nothing stored → use placeholder
  if (!imagePath || typeof imagePath !== 'string') {
    return '/placeholder.png';
  }

  const trimmed = imagePath.trim();

  // Explicit placeholder values → use placeholder
  if (!trimmed || trimmed === '/placeholder.png' || trimmed === 'placeholder.png') {
    return '/placeholder.png';
  }

  // Already an absolute URL — return as-is (covers https:// links and blob:/data: previews)
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Vite bundled assets — served by the frontend directly, no backend needed
  if (trimmed.startsWith('/assets/')) {
    return trimmed;
  }

  // All other paths are relative upload paths. Normalise to always start with
  // /uploads/ so we handle all three DB path styles:
  //   /uploads/foo.jpg  → already correct
  //   uploads/foo.jpg   → needs leading slash
  //   foo.jpg           → needs /uploads/ prefix
  let normalizedPath;
  if (trimmed.startsWith('/uploads/')) {
    normalizedPath = trimmed;                       // e.g. /uploads/buddy.jpg
  } else if (trimmed.startsWith('uploads/')) {
    normalizedPath = `/${trimmed}`;                 // e.g. uploads/buddy.jpg → /uploads/buddy.jpg
  } else {
    normalizedPath = `/uploads/${trimmed}`;         // e.g. buddy.jpg → /uploads/buddy.jpg
  }

  return `${backendOrigin}${normalizedPath}`;
}

export default getImageUrl;
