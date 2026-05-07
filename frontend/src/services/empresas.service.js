import api from './api';

export const listarEmpresas = async () => {
  const response = await api.get('/empresas/');
  return response.data;
};

export const listarEmpresasAdmin = async () => {
  const response = await api.get('/empresas/admin/');
  return response.data;
};

export const crearEmpresaAdmin = async (payload) => {
  const response = await api.post('/empresas/admin/', payload);
  return response.data;
};

export const actualizarEmpresaAdmin = async (empresaId, payload) => {
  const response = await api.patch(`/empresas/admin/${empresaId}/`, payload);
  return response.data;
};

export const obtenerEmpresa = async (empresaId) => {
  const response = await api.get(`/empresas/${empresaId}/`);
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

export const listarUsuariosEmpresa = async (empresaId) => {
  const response = await api.get(`/empresas/${empresaId}/usuarios/`);
  return response.data;
};

export const crearUsuarioEmpresa = async (empresaId, payload) => {
  const response = await api.post(`/empresas/${empresaId}/usuarios/`, payload);
  return response.data;
};

export const actualizarUsuarioEmpresa = async (
  empresaId,
  membresiaId,
  payload,
) => {
  const response = await api.patch(
    `/empresas/${empresaId}/usuarios/${membresiaId}/`,
    payload,
  );
  return response.data;
};

export default {
  listarEmpresas,
  listarEmpresasAdmin,
  crearEmpresaAdmin,
  actualizarEmpresaAdmin,
  obtenerEmpresa,
  seleccionarEmpresa,
  actualizarEmpresa,
  listarUsuariosEmpresa,
  crearUsuarioEmpresa,
  actualizarUsuarioEmpresa,
};
