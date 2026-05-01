import api from './api';
import { normalizeCollection } from '../utils/ventas';

const INFORMES_BASE = '/informes';
const ESTADISTICAS_BASE = `${INFORMES_BASE}/estadisticas`;
const CIERRES_BASE = `${INFORMES_BASE}/cierres`;
const REPORTES_BASE = `${INFORMES_BASE}/reportes`;

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

export const listarCierresCaja = async (filtros = {}) => {
  const response = await api.get(`${CIERRES_BASE}/`, {
    params: cleanParams(filtros),
  });
  return normalizeCollection(response.data);
};

export const obtenerCierreCaja = async (id) => {
  const response = await api.get(`${CIERRES_BASE}/${id}/`);
  return response.data;
};

export const generarCierreCaja = async (datos) => {
  const response = await api.post(`${CIERRES_BASE}/generar/`, datos);
  return response.data;
};

export const actualizarCierreCaja = async (id, datos) => {
  const response = await api.put(`${CIERRES_BASE}/${id}/`, datos);
  return response.data;
};

export const generarReporteInforme = async (datos) => {
  const response = await api.post(`${REPORTES_BASE}/generar/`, datos);
  return response.data;
};

export const listarReportesInforme = async (filtros = {}) => {
  const response = await api.get(`${REPORTES_BASE}/`, {
    params: cleanParams(filtros),
  });
  return normalizeCollection(response.data);
};

export const obtenerReporteInforme = async (reporteId) => {
  const response = await api.get(`${REPORTES_BASE}/${reporteId}/`);
  return response.data;
};

export const descargarReportePdf = async (reporteId) =>
  api.get(`${REPORTES_BASE}/${reporteId}/descargar-pdf/`, {
    responseType: 'blob',
  });

export const descargarReporteExcel = async (reporteId) =>
  api.get(`${REPORTES_BASE}/${reporteId}/descargar-excel/`, {
    responseType: 'blob',
  });

const readFilenameFromDisposition = (headerValue) => {
  if (!headerValue) {
    return '';
  }

  const match = headerValue.match(/filename="?([^"]+)"?/i);
  return match?.[1] || '';
};

export const triggerBrowserDownload = (response, fallbackName) => {
  if (!response?.data) {
    return;
  }

  const filename =
    readFilenameFromDisposition(response.headers?.['content-disposition']) ||
    fallbackName;
  const href = URL.createObjectURL(response.data);
  const link = document.createElement('a');

  link.href = href;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(href);
};

export default {
  obtenerDashboardEstadisticas,
  obtenerEstadisticasVentasInforme,
  obtenerEstadisticasProductosInforme,
  obtenerEstadisticasClientesInforme,
  obtenerEstadisticasFinancierasInforme,
  listarCierresCaja,
  obtenerCierreCaja,
  generarCierreCaja,
  actualizarCierreCaja,
  generarReporteInforme,
  listarReportesInforme,
  obtenerReporteInforme,
  descargarReportePdf,
  descargarReporteExcel,
  triggerBrowserDownload,
};
