import api from './api';
import { obtenerProductosMasVendidos } from './inventario.service';
import { registrarAbonoVenta } from './abonos.service';
import {
  calculateVentaTotals,
  CONSUMIDOR_FINAL,
  buildVentaPayload,
  createTemporaryClient,
  normalizeCollection,
} from '../utils/ventas';

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

  const slashMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, first, second, year] = slashMatch;
    const firstNumber = Number(first);
    const secondNumber = Number(second);

    const month =
      firstNumber > 12 && secondNumber <= 12 ? secondNumber : firstNumber;
    const day =
      firstNumber > 12 && secondNumber <= 12 ? firstNumber : secondNumber;

    return [
      year,
      String(month).padStart(2, '0'),
      String(day).padStart(2, '0'),
    ].join('-');
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

const normalizeClients = (payload) => {
  const data = Array.isArray(payload) ? payload : payload?.results || [];
  return data.map((client) => ({
    ...client,
    persisted: typeof client.id === 'number',
    esTemporal: false,
  }));
};

export const listarVentas = async (filtros = {}) => {
  const response = await api.get('/ventas/', {
    params: cleanParams(filtros),
  });
  return normalizeCollection(response.data);
};

export const buscarVentas = async (q, filtros = {}) => {
  const response = await api.get('/ventas/buscar/', {
    params: cleanParams({ ...filtros, q }),
  });
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

  if (
    draft.metodoPago === 'EFECTIVO' &&
    draft.estado === 'TERMINADA' &&
    Number(totals.total || 0) > 0
  ) {
    await registrarAbonoVenta(venta.id, {
      monto_abonado: Number(totals.total).toFixed(2),
      metodo_pago: 'EFECTIVO',
      referencia_pago: '',
      observaciones: 'Pago total registrado automaticamente desde el POS',
    });

    return obtenerVenta(venta.id);
  }

  if (
    draft.metodoPago === 'CREDITO' &&
    draft.estado === 'TERMINADA' &&
    Number(draft.abonoInicial || 0) > 0
  ) {
    await registrarAbonoVenta(venta.id, {
      monto_abonado: Number(draft.abonoInicial).toFixed(2),
      metodo_pago: draft.metodoAbonoInicial || 'EFECTIVO',
      referencia_pago: draft.referenciaAbonoInicial || '',
      observaciones: 'Abono inicial registrado desde el POS',
    });

    return obtenerVenta(venta.id);
  }

  return venta;
};

export const actualizarVenta = async (id, datos) => {
  const response = await api.patch(`/ventas/${id}/`, datos);
  return response.data;
};

export const eliminarVenta = async (id) => {
  await api.delete(`/ventas/${id}/`);
};

export const cancelarVenta = async (id, motivo) => {
  const response = await api.post(`/ventas/${id}/cancelar/`, {
    motivo,
  });
  return response.data;
};

export const cambiarEstadoVenta = async (id, estado) => {
  const response = await api.post(`/ventas/${id}/cambiar-estado/`, {
    estado,
  });
  return response.data;
};

export const obtenerHistorialVenta = async (id) => {
  const response = await api.get(`/ventas/${id}/historial/`);
  return Array.isArray(response.data) ? response.data : response.data.results || [];
};

export const obtenerVentasPorPeriodo = async (filtros = {}) => {
  const response = await api.get('/ventas/reportes/periodo/', {
    params: cleanParams(filtros),
  });
  return normalizeCollection(response.data);
};

export const obtenerVentasPorCliente = async (clienteId) => {
  const response = await api.get(`/ventas/reportes/cliente/${clienteId}/`);
  return normalizeCollection(response.data);
};

export const obtenerVentasPorProducto = async (productoId, filtros = {}) => {
  const response = await api.get(`/ventas/reportes/producto/${productoId}/`, {
    params: cleanParams(filtros),
  });
  return normalizeCollection(response.data);
};

export const obtenerCuentasPorCobrar = async (filtros = {}) => {
  const response = await api.get('/ventas/reportes/cuentas-por-cobrar/', {
    params: cleanParams(filtros),
  });
  return normalizeCollection(response.data);
};

export const obtenerEstadisticasVentas = async (filtros = {}) => {
  const response = await api.get('/ventas/reportes/estadisticas/', {
    params: cleanParams(filtros),
  });
  return response.data;
};

export const obtenerProductosTopVentas = async (filtros = {}) => {
  try {
    return await obtenerProductosMasVendidos(filtros);
  } catch {
    return [];
  }
};

export const buscarClientesVenta = async (query = '', temporales = []) => {
  try {
    const response = await api.get('/clientes/', {
      params: cleanParams({
        q: query,
        activo: true,
        page_size: 8,
      }),
    });

    const serverClients = normalizeClients(response.data);
    const extraClients = temporales.filter((client) => {
      const hayEnServidor = serverClients.some(
        (item) => item.numero_documento === client.numero_documento,
      );
      return !hayEnServidor;
    });

    return [CONSUMIDOR_FINAL, ...extraClients, ...serverClients];
  } catch {
    const lowered = query.trim().toLowerCase();
    const localMatches = temporales.filter((cliente) =>
      [cliente.nombre_completo, cliente.numero_documento, cliente.telefono]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(lowered)),
    );

    if (!lowered) {
      return [CONSUMIDOR_FINAL, ...localMatches];
    }

    const defaultMatches = [CONSUMIDOR_FINAL].filter((cliente) =>
      [cliente.nombre_completo, cliente.numero_documento]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(lowered)),
    );

    return [...defaultMatches, ...localMatches];
  }
};

export const crearClienteTemporal = async (data) => createTemporaryClient(data);

export default {
  listarVentas,
  buscarVentas,
  obtenerVenta,
  crearVenta,
  crearVentaCompleta,
  actualizarVenta,
  eliminarVenta,
  cancelarVenta,
  cambiarEstadoVenta,
  obtenerHistorialVenta,
  obtenerVentasPorPeriodo,
  obtenerVentasPorCliente,
  obtenerVentasPorProducto,
  obtenerCuentasPorCobrar,
  obtenerEstadisticasVentas,
  obtenerProductosTopVentas,
  buscarClientesVenta,
  crearClienteTemporal,
};
