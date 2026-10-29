const rawBaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'http://localhost:4000/api';

const backendOrigin = rawBaseUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');

/**
 * Resolves an image path to an absolute backend URL or appropriate fallback asset.
 *
 * @param {string|null|undefined} path - The relative or absolute image path
 * @returns {string} The resolved image URL
 */
export function getImageUrl(path) {
  if (!path || typeof path !== 'string') {
    return '/placeholder.png';
  }

  const trimmed = path.trim();
  if (!trimmed || trimmed === '/placeholder.png' || trimmed === 'placeholder.png') {
    return '/placeholder.png';
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  if (trimmed.startsWith('/assets/')) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${backendOrigin}${normalizedPath}`;
}

export default getImageUrl;
