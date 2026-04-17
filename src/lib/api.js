import axios from 'axios';

// In development, Vite proxies /api -> http://localhost:3001/api (avoids CORS)
// In production, use the explicit backend URL.
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' }
});

function isPublicAuthRequest(config = {}) {
  const method = String(config.method || '').toLowerCase();
  const url = String(config.url || '').split('?')[0].replace(/^\/api/, '');

  return (
    (method === 'post' && url === '/auth/login') ||
    (method === 'post' && url === '/register') ||
    (method === 'post' && url === '/dev/login')
  );
}

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('app_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If token expires, clear session without forcing a full page reload.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isPublicAuthRequest(error.config)) {
      localStorage.removeItem('app_token');
      localStorage.removeItem('app_user');
      window.dispatchEvent(new CustomEvent('app:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
