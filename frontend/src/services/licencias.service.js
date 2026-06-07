import api from './api';

export const activarLicencia = async (license_key) => {
  const response = await api.post('/offline/activar/', { license_key });
  return response.data;
};

export const obtenerLicencia = async () => {
  const response = await api.get('/offline/licencia/');
  return response.data;
};

export const completarWizardLocal = async () => {
  const response = await api.post('/offline/wizard/completar/');
  return response.data;
};

// Admin (cloud staff only)
export const listarLicenciasAdmin = async () => {
  const response = await api.get('/offline/admin/licenses/');
  return response.data;
};

export const crearLicenciaAdmin = async (data) => {
  const response = await api.post('/offline/admin/licenses/', data);
  return response.data;
};

export const actualizarLicenciaAdmin = async (id, data) => {
  const response = await api.patch(`/offline/admin/licenses/${id}/`, data);
  return response.data;
};

export const revocarLicenciaAdmin = async (id) => {
  const response = await api.post(`/offline/admin/licenses/${id}/revocar/`);
  return response.data;
};
