import api from './api';
import { normalizeCollection } from '../utils/ventas';

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );

export const listarAbonos = async (filtros = {}) => {
  const response = await api.get('/abonos/', {
    params: cleanParams(filtros),
  });
  return normalizeCollection(response.data);
};

export const obtenerAbono = async (id) => {
  const response = await api.get(`/abonos/${id}/`);
  return response.data;
};

export const listarAbonosVenta = async (ventaId) => {
  const response = await api.get(`/ventas/${ventaId}/abonos/`);
  return Array.isArray(response.data) ? response.data : response.data.results || [];
};

export const registrarAbonoVenta = async (ventaId, datos) => {
  const response = await api.post(`/ventas/${ventaId}/abonos/`, datos);
  return response.data;
};

export default {
  listarAbonos,
  obtenerAbono,
  listarAbonosVenta,
  registrarAbonoVenta,
};
