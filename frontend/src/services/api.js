import axios from 'axios';
import { useAppStore } from '../store/useStore';

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
  const token = useAppStore.getState().token;
  const empresaId = localStorage.getItem('mallor_empresa_activa_id');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  if (empresaId) {
    config.headers['X-Empresa-Id'] = empresaId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = original?.url?.startsWith('/auth/');
    if (
      error.response?.status !== 401
      || original?._retry
      || isAuthEndpoint
    ) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      const response = await api.post('/auth/refresh/');
      const { access, user, empresa_activa: empresaActiva, empresas } = response.data;
      const store = useAppStore.getState();
      store.setToken(access);
      store.setUser(user);
      sessionStorage.setItem('mallor_user', JSON.stringify(user));
      const empresa = empresas?.find(
        (item) => String(item.id) === String(empresaActiva),
      );
      if (empresa) {
        store.setEmpresaActiva(empresa);
      }
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch (refreshError) {
      const store = useAppStore.getState();
      store.reset();
      sessionStorage.removeItem('mallor_user');
      localStorage.removeItem('mallor_empresa_activa_id');
      window.location.assign('/login');
      return Promise.reject(refreshError);
    }
  },
);

export default api;
