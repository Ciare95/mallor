import api from './api';
import { autocompletarCliente, crearCliente } from './clientes.service';
import {
  calculateVentaTotals,
  CONSUMIDOR_FINAL,
  buildVentaPayload,
  createTemporaryClient,
  normalizeCollection,
} from '../utils/ventas';

const normalizeDateParam = (value) => {
  if (value === undefined || value === null || value === '') return value;
  const normalized = String(value).trim();
  if (!normalized) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  const slashMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, first, second, year] = slashMatch;
    const firstNumber = Number(first);
    const secondNumber = Number(second);
    const month = firstNumber > 12 && secondNumber <= 12 ? secondNumber : firstNumber;
    const day = firstNumber > 12 && secondNumber <= 12 ? firstNumber : secondNumber;
    return [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
  }
  return normalized;
};

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params)
      .map(([key, value]) => [
        key,
        key === 'fecha_inicio' || key === 'fecha_fin' ? normalizeDateParam(value) : value,
      ])
      .filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );

const normalizeClients = (payload) => {
  const data = Array.isArray(payload) ? payload : payload?.results || [];
  return data.map((client) => ({
    ...client,
    persisted: typeof client.id === 'number',
    esTemporal: false,
  }));
};

const registrarAbonoVenta = async (ventaId, datos) => {
  const response = await api.post(`/ventas/${ventaId}/abonos/`, datos);
  return response.data;
};

export const listarVentas = async (filtros = {}) => {
  const response = await api.get('/ventas/', { params: cleanParams(filtros) });
  return normalizeCollection(response.data);
};

export const buscarVentas = async (q, filtros = {}) => {
  const response = await api.get('/ventas/buscar/', { params: cleanParams({ ...filtros, q }) });
  return normalizeCollection(response.data);
};

export const obtenerVenta = async (id) => {
  const response = await api.get(`/ventas/${id}/`);
  return response.data;
};

export const crearVenta = async (datos) => {
  const response = await api.post('/ventas/', datos);
  return response.data;
};

export const crearVentaCompleta = async (draft) => {
  const payload = buildVentaPayload(draft);
  const totals = calculateVentaTotals(draft);
  const venta = await crearVenta(payload);

  if (draft.metodoPago === 'EFECTIVO' && draft.estado === 'TERMINADA' && Number(totals.total || 0) > 0) {
    await registrarAbonoVenta(venta.id, {
      monto_abonado: Number(totals.total).toFixed(2),
      metodo_pago: 'EFECTIVO',
      referencia_pago: '',
      observaciones: 'Pago total registrado desde mobile',
    });
    return obtenerVenta(venta.id);
  }

  if (draft.metodoPago === 'CREDITO' && draft.estado === 'TERMINADA' && Number(draft.abonoInicial || 0) > 0) {
    await registrarAbonoVenta(venta.id, {
      monto_abonado: Number(draft.abonoInicial).toFixed(2),
      metodo_pago: draft.metodoAbonoInicial || 'EFECTIVO',
      referencia_pago: draft.referenciaAbonoInicial || '',
      observaciones: 'Abono inicial registrado desde mobile',
    });
    return obtenerVenta(venta.id);
  }

  if (draft.facturaElectronica && draft.estado === 'TERMINADA') {
    return obtenerVenta(venta.id);
  }

  return venta;
};

export const cancelarVenta = async (id, motivo) => {
  const response = await api.post(`/ventas/${id}/cancelar/`, { motivo });
  return response.data;
};

export const buscarClientesVenta = async (query = '') => {
  try {
    const response = await api.get('/clientes/', {
      params: cleanParams({ q: query, activo: true, page_size: 8 }),
    });
    return [CONSUMIDOR_FINAL, ...normalizeClients(response.data)];
  } catch {
    return [CONSUMIDOR_FINAL];
  }
};

export const crearClienteTemporal = (data) => createTemporaryClient(data);

export const crearClientePosRapido = async (data) => {
  const cliente = await crearCliente(data);
  return { ...cliente, persisted: true, esTemporal: false };
};

export const autocompletarClientePos = ({ tipoDocumento, numeroDocumento }) =>
  autocompletarCliente({ tipoDocumento, numeroDocumento });

export const buscarProductos = async (q = '') => {
  const response = await api.get('/inventario/productos/', {
    params: cleanParams({ q, activo: true, page_size: 20 }),
  });
  return normalizeCollection(response.data);
};
