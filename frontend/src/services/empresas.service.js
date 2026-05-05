import api from './api';

export const listarEmpresas = async () => {
  const response = await api.get('/empresas/');
  return response.data;
};

export const seleccionarEmpresa = async (empresaId) => {
  const response = await api.post('/empresas/seleccionar/', {
    empresa_id: empresaId,
  });
  return response.data;
};

export const actualizarEmpresa = async (empresaId, payload) => {
  const response = await api.patch(`/empresas/${empresaId}/`, payload);
  return response.data;
};

export default {
  listarEmpresas,
  seleccionarEmpresa,
  actualizarEmpresa,
};
