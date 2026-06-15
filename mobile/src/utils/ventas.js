export const FACTUS_NOTA_CREDITO_PENDIENTE_DIAN_CODE = 'factus_nota_credito_pendiente_dian';

export const CONSUMIDOR_FINAL = {
  id: null,
  nombre_completo: 'Consumidor Final',
  numero_documento: '222222222222',
  tipo_documento: 'CC',
  telefono: '0000000000',
  email: '',
  direccion: 'Consumidor final',
  municipio_codigo: '11001',
  persisted: false,
  esTemporal: false,
};

export const roundMoney = (value = 0) => {
  const numeric = Number.parseFloat(value || 0);
  if (Number.isNaN(numeric)) return 0;
  return Number(numeric.toFixed(2));
};

export const toDecimalString = (value = 0) => roundMoney(value).toFixed(2);

export const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) {
    return { count: payload.length, next: null, previous: null, results: payload, current_page: 1, total_pages: 1, page_size: payload.length };
  }
  if (!payload || typeof payload !== 'object') {
    return { count: 0, next: null, previous: null, results: [], current_page: 1, total_pages: 1, page_size: 0 };
  }
  return {
    count: payload.count ?? payload.results?.length ?? 0,
    next: payload.next ?? null,
    previous: payload.previous ?? null,
    results: payload.results ?? [],
    current_page: payload.current_page ?? 1,
    total_pages: payload.total_pages ?? 1,
    page_size: payload.page_size ?? payload.results?.length ?? 0,
    total_por_cobrar: payload.total_por_cobrar,
  };
};

export const extractApiError = (error, fallback = 'Ocurrió un error') => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  return fallback;
};

export const calculateLine = (item) => {
  const cantidad = roundMoney(item?.cantidad || 0);
  const precio = roundMoney(item?.precio_unitario || 0);
  const descuento = roundMoney(item?.descuento || 0);
  const ivaPercent = roundMoney(item?.producto?.iva || item?.iva_percent || 0);
  const subtotal = roundMoney(cantidad * precio);
  const impuestos = roundMoney(subtotal * (ivaPercent / 100));
  const total = Math.max(roundMoney(subtotal + impuestos - descuento), 0);
  return { cantidad, precio_unitario: precio, descuento, iva_percent: ivaPercent, subtotal, impuestos, total };
};

export const calculateVentaTotals = (draft) => {
  const items = draft?.items || [];
  const lines = items.map((item) => ({ ...item, ...calculateLine(item) }));
  const subtotal = roundMoney(lines.reduce((acc, item) => acc + item.subtotal, 0));
  const impuestos = roundMoney(lines.reduce((acc, item) => acc + item.impuestos, 0));
  const descuentoLineas = roundMoney(lines.reduce((acc, item) => acc + item.descuento, 0));
  const baseAntesDescuentoGlobal = Math.max(roundMoney(subtotal + impuestos - descuentoLineas), 0);
  const descuentoGlobalPercent = Math.min(Math.max(roundMoney(draft?.descuentoGlobal || 0), 0), 100);
  const descuentoGlobal = roundMoney(baseAntesDescuentoGlobal * (descuentoGlobalPercent / 100));
  const total = Math.max(roundMoney(baseAntesDescuentoGlobal - descuentoGlobal), 0);
  const abonoInicial = Math.min(roundMoney(draft?.abonoInicial || 0), total);
  const saldoCredito = Math.max(roundMoney(total - abonoInicial), 0);
  return { lines, subtotal, impuestos, descuentoLineas, descuentoGlobalPercent, descuentoGlobal, total, abonoInicial, saldoCredito };
};

export const createLineItem = (producto, overrides = {}) => ({
  id: overrides.id || `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  producto,
  cantidad: overrides.cantidad ?? 1,
  precio_unitario: overrides.precio_unitario ?? Number(producto?.precio_venta || 0),
  descuento: overrides.descuento ?? 0,
});

export const createTemporaryClient = (data = {}) => ({
  id: `tmp-${Date.now()}`,
  nombre_completo: data.nombre_completo || data.nombre || 'Cliente temporal',
  numero_documento: data.numero_documento || 'TEMP',
  tipo_documento: data.tipo_documento || 'CC',
  telefono: data.telefono || '',
  email: data.email || '',
  persisted: false,
  esTemporal: true,
});

export const isPersistedClient = (cliente) =>
  typeof cliente?.id === 'number' && !cliente?.esTemporal;

export const buildVentaPayload = (draft) => {
  const totals = calculateVentaTotals(draft);
  return {
    cliente: isPersistedClient(draft?.clienteSeleccionado) ? draft.clienteSeleccionado.id : undefined,
    descuento: toDecimalString(totals.descuentoGlobal || 0),
    estado: draft?.estado || 'TERMINADA',
    metodo_pago: draft?.metodoPago || 'EFECTIVO',
    factura_electronica: Boolean(draft?.facturaElectronica),
    observaciones: draft?.observaciones || '',
    detalles: totals.lines.map((item) => ({
      producto: item.producto?.es_producto_temporal ? undefined : item.producto?.id,
      cantidad: toDecimalString(item.cantidad),
      precio_unitario: toDecimalString(item.precio_unitario),
      descuento: toDecimalString(item.descuento || 0),
    })),
  };
};

export const getVentaEstadoBadge = (estado) => {
  const map = {
    TERMINADA: 'green',
    PENDIENTE: 'yellow',
    CANCELADA: 'red',
    PAGADA: 'green',
    PARCIAL: 'blue',
  };
  return map[estado] || 'yellow';
};
