import axios from 'axios';

const api = axios.create({ baseURL: '' });

const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Keep token in sync when it changes (e.g. after re-login in host shell)
window.addEventListener('storage', e => {
  if (e.key === 'token') {
    if (e.newValue) {
      api.defaults.headers.common['Authorization'] = `Bearer ${e.newValue}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }
});

export default api;
