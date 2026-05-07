import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const empresaId = localStorage.getItem('mallor_empresa_activa_id');

  if (token) {
    config.headers.Authorization = token.startsWith('Basic ')
      ? token
      : `Basic ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  if (empresaId) {
    config.headers['X-Empresa-Id'] = empresaId;
  }
  return config;
});

export default api;
