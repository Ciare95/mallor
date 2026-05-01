import api from './api';
import { normalizeCollection } from '../utils/proveedores';

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );

export const listarProveedores = async (filtros = {}) => {
  const response = await api.get('/proveedores/', {
    params: cleanParams(filtros),
  });
  return normalizeCollection(response.data);
};

export const buscarProveedores = async (q, filtros = {}) => {
  const response = await api.get('/proveedores/buscar/', {
    params: cleanParams({ ...filtros, q }),
  });
  return normalizeCollection(response.data);
};

export const obtenerProveedor = async (id) => {
  const response = await api.get(`/proveedores/${id}/`);
  return response.data;
};

export const crearProveedor = async (datos) => {
  const response = await api.post('/proveedores/', datos);
  return response.data;
};

export const actualizarProveedor = async (id, datos) => {
  const response = await api.patch(`/proveedores/${id}/`, datos);
  return response.data;
};

export const eliminarProveedor = async (id) => {
  await api.delete(`/proveedores/${id}/`);
};

export const obtenerHistorialProveedor = async (id, filtros = {}) => {
  const response = await api.get(`/proveedores/${id}/historial/`, {
    params: cleanParams(filtros),
  });
  return normalizeCollection(response.data);
};

export const obtenerEstadisticasProveedor = async (id) => {
  const response = await api.get(`/proveedores/${id}/estadisticas/`);
  return response.data;
};

export const validarDocumentoProveedor = async ({
  numeroDocumento,
  proveedorId,
}) => {
  if (!numeroDocumento) {
    return { duplicate: false };
  }

  const data = await buscarProveedores(numeroDocumento, {
    page_size: 10,
  });
  const duplicate = data.results.some(
    (proveedor) =>
      proveedor.numero_documento === numeroDocumento &&
      proveedor.id !== proveedorId,
  );

  return { duplicate, matches: data.results };
};

export default {
  listarProveedores,
  buscarProveedores,
  obtenerProveedor,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  obtenerHistorialProveedor,
  obtenerEstadisticasProveedor,
  validarDocumentoProveedor,
};
