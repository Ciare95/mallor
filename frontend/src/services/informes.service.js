import api from './api';

const INFORMES_BASE = '/informes';
const ESTADISTICAS_BASE = `${INFORMES_BASE}/estadisticas`;

const normalizeDateParam = (value) => {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  return normalized;
};

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params)
      .map(([key, value]) => [
        key,
        key === 'fecha_inicio' || key === 'fecha_fin'
          ? normalizeDateParam(value)
          : value,
      ])
      .filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );

export const obtenerDashboardEstadisticas = async (filtros = {}) => {
  const response = await api.get(`${ESTADISTICAS_BASE}/dashboard/`, {
    params: cleanParams(filtros),
  });
  return response.data;
};

export const obtenerEstadisticasVentasInforme = async (filtros = {}) => {
  const response = await api.get(`${ESTADISTICAS_BASE}/ventas/`, {
    params: cleanParams(filtros),
  });
  return response.data;
};

export const obtenerEstadisticasProductosInforme = async (filtros = {}) => {
  const response = await api.get(`${ESTADISTICAS_BASE}/productos/`, {
    params: cleanParams(filtros),
  });
  return response.data;
};

export const obtenerEstadisticasClientesInforme = async (filtros = {}) => {
  const response = await api.get(`${ESTADISTICAS_BASE}/clientes/`, {
    params: cleanParams(filtros),
  });
  return response.data;
};

export const obtenerEstadisticasFinancierasInforme = async (filtros = {}) => {
  const response = await api.get(`${ESTADISTICAS_BASE}/financiero/`, {
    params: cleanParams(filtros),
  });
  return response.data;
};

export default {
  obtenerDashboardEstadisticas,
  obtenerEstadisticasVentasInforme,
  obtenerEstadisticasProductosInforme,
  obtenerEstadisticasClientesInforme,
  obtenerEstadisticasFinancierasInforme,
};
