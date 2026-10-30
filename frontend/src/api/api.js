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

export default API;
