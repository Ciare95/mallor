import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const KEYS = {
  ACCESS: 'mallor_access_token',
  REFRESH: 'mallor_refresh_token',
  EMPRESA_ID: 'mallor_empresa_activa_id',
  TERMINAL_ID: 'mallor_terminal_id',
};

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://mallor.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshRequest: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  if (!refreshRequest) {
    refreshRequest = (async () => {
      const refresh = await SecureStore.getItemAsync(KEYS.REFRESH);
      if (!refresh) throw new Error('No refresh token');

      const response = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
      const { access, refresh: newRefresh } = response.data;

      await SecureStore.setItemAsync(KEYS.ACCESS, access);
      await SecureStore.setItemAsync(KEYS.REFRESH, newRefresh);
      return access as string;
    })().finally(() => { refreshRequest = null; });
  }
  return refreshRequest;
};

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(KEYS.ACCESS);
  const empresaId = await SecureStore.getItemAsync(KEYS.EMPRESA_ID);
  const terminalId = await SecureStore.getItemAsync(KEYS.TERMINAL_ID);

  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (empresaId) config.headers['X-Empresa-Id'] = empresaId;
  if (terminalId) config.headers['X-Terminal-Id'] = terminalId;

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = original?.url?.includes('/auth/');

    if (error.response?.status !== 401 || original?._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      const access = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch {
      await SecureStore.deleteItemAsync(KEYS.ACCESS);
      await SecureStore.deleteItemAsync(KEYS.REFRESH);
      return Promise.reject(error);
    }
  },
);

export default api;
