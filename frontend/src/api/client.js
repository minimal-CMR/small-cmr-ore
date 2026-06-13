import axios from 'axios';

const api = axios.create({ baseURL: '' });

// Legge il token ad ogni request: gestisce user-switching senza reload
// del modulo federato (lo storage event non triggera nello stesso tab).
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
