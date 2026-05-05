import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic YWRtaW4yOkFkbWluMTIzNA==', // admin2:Admin1234 (solo desarrollo)
  },
});

api.interceptors.request.use((config) => {
  const empresaId = localStorage.getItem('mallor_empresa_activa_id');
  if (empresaId) {
    config.headers['X-Empresa-Id'] = empresaId;
  }
  return config;
});

export default api;
