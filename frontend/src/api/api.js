import axios from 'axios';

let baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

// Ensure the URL ends with /api correctly
if (baseURL.endsWith('/')) {
  baseURL = baseURL.slice(0, -1);
}

const API = axios.create({
  baseURL,
  withCredentials: true,
});

// If the server says the session is gone (401 "Login required"), tell the app
// so it can drop the stale "logged in" UI state instead of pretending the
// user is still signed in.
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.includes('/auth/')) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(err);
  }
);

export default API;
