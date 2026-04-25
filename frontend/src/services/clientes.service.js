import api from './api';
import { normalizeCollection } from '../utils/clientes';

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );

export const listarClientes = async (filtros = {}) => {
  const response = await api.get('/clientes/', {
    params: cleanParams(filtros),
  });
  return normalizeCollection(response.data);
};

export const buscarClientes = async (q, filtros = {}) => {
  const response = await api.get('/clientes/buscar/', {
    params: cleanParams({ ...filtros, q }),
  });
  return normalizeCollection(response.data);
};

export const obtenerCliente = async (id) => {
  const response = await api.get(`/clientes/${id}/`);
  return response.data;
};

export const crearCliente = async (datos) => {
  const response = await api.post('/clientes/', datos);
  return response.data;
};

export const actualizarCliente = async (id, datos) => {
  const response = await api.patch(`/clientes/${id}/`, datos);
  return response.data;
};

export const eliminarCliente = async (id) => {
  await api.delete(`/clientes/${id}/`);
};

export const cambiarEstadoCliente = async (id, activo) => {
  const response = await api.patch(`/clientes/${id}/`, { activo });
  return response.data;
};

export const obtenerHistorialCliente = async (id, filtros = {}) => {
  const response = await api.get(`/clientes/${id}/historial/`, {
    params: cleanParams(filtros),
  });
  return normalizeCollection(response.data);
};

export const obtenerCarteraCliente = async (id) => {
  const response = await api.get(`/clientes/${id}/cartera/`);
  return normalizeCollection(response.data);
};

export const obtenerEstadisticasCliente = async (id) => {
  const response = await api.get(`/clientes/${id}/estadisticas/`);
  return response.data;
};

export const obtenerMejoresClientes = async (limite = 10) => {
  const response = await api.get('/clientes/mejores/', {
    params: { limite },
  });
  return normalizeCollection(response.data);
};

export const obtenerClientesMorosos = async () => {
  const response = await api.get('/clientes/morosos/');
  return normalizeCollection(response.data);
};

export const validarDocumentoCliente = async ({
  tipoDocumento,
  numeroDocumento,
  clienteId,
}) => {
  if (!tipoDocumento || !numeroDocumento) {
    return { duplicate: false };
  }

  const data = await buscarClientes(numeroDocumento, {
    page_size: 10,
  });
  const duplicate = data.results.some(
    (cliente) =>
      cliente.numero_documento === numeroDocumento &&
      cliente.tipo_documento === tipoDocumento &&
      cliente.id !== clienteId,
  );

  return { duplicate, matches: data.results };
};

export default {
  listarClientes,
  buscarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  cambiarEstadoCliente,
  obtenerHistorialCliente,
  obtenerCarteraCliente,
  obtenerEstadisticasCliente,
  obtenerMejoresClientes,
  obtenerClientesMorosos,
  validarDocumentoCliente,
};
