import api from './api';

export const login = async ({ username, password, rememberMe, empresaId, turnstileToken }) => {
  const response = await api.post('/auth/login/', {
    username,
    password,
    remember_me: rememberMe,
    empresa_id: empresaId || undefined,
    cf_turnstile_response: turnstileToken || '',
  });
  return response.data;
};

export const refreshSession = async () => {
  const response = await api.post('/auth/refresh/');
  return response.data;
};

export const logout = async () => {
  await api.post('/auth/logout/');
};

export const obtenerSesionActual = async () => {
  const response = await api.get('/auth/me/');
  return response.data;
};

export const forgotPassword = async (username) => {
  const response = await api.post('/auth/forgot-password/', { username });
  return response.data;
};

export const resetPassword = async ({ uid, token, newPassword }) => {
  const response = await api.post('/auth/reset-password/', {
    uid,
    token,
    new_password: newPassword,
  });
  return response.data;
};

export default {
  login,
  refreshSession,
  logout,
  obtenerSesionActual,
  forgotPassword,
  resetPassword,
};
