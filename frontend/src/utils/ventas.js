import { formatCurrency } from './formatters';

export const CONSUMIDOR_FINAL = {
  id: null,
  nombre_completo: 'Consumidor Final',
  numero_documento: '222222222222',
  tipo_documento: 'CC',
  telefono: '',
  email: '',
  persisted: false,
  esTemporal: false,
};

export const roundMoney = (value = 0) => {
  const numeric = Number.parseFloat(value || 0);
  if (Number.isNaN(numeric)) {
    return 0;
  }
  return Number(numeric.toFixed(2));
};

export const toDecimalString = (value = 0) => roundMoney(value).toFixed(2);

export const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      next: null,
      previous: null,
      results: payload,
      current_page: 1,
      total_pages: 1,
      page_size: payload.length,
    };
  }

  if (!payload || typeof payload !== 'object') {
    return {
      count: 0,
      next: null,
      previous: null,
      results: [],
      current_page: 1,
      total_pages: 1,
      page_size: 0,
    };
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

export const extractApiError = (error, fallback = 'Ocurrio un error') => {
  const data = error?.response?.data;
  if (!data) {
    return fallback;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (data.detail) {
    return data.detail;
  }

  if (data.error) {
    return data.error;
  }

  if (data.errors) {
    const firstKey = Object.keys(data.errors)[0];
    const value = data.errors[firstKey];
    return `${firstKey}: ${Array.isArray(value) ? value[0] : value}`;
  }

  const firstKey = Object.keys(data)[0];
  if (!firstKey) {
    return fallback;
  }

  const firstValue = data[firstKey];
  return `${firstKey}: ${Array.isArray(firstValue) ? firstValue[0] : firstValue}`;
};

export const calculateLine = (item) => {
  const cantidad = roundMoney(item?.cantidad || 0);
  const precio = roundMoney(item?.precio_unitario || 0);
  const descuento = roundMoney(item?.descuento || 0);
  const ivaPercent = roundMoney(item?.producto?.iva || item?.iva_percent || 0);
  const subtotal = roundMoney(cantidad * precio);
  const impuestos = roundMoney(subtotal * (ivaPercent / 100));
  const total = Math.max(roundMoney(subtotal + impuestos - descuento), 0);

  return {
    cantidad,
    precio_unitario: precio,
    descuento,
    iva_percent: ivaPercent,
    subtotal,
    impuestos,
    total,
  };
};

export const calculateVentaTotals = (draft) => {
  const items = draft?.items || [];
  const lines = items.map((item) => ({
    ...item,
    ...calculateLine(item),
  }));

  const subtotal = roundMoney(
    lines.reduce((acc, item) => acc + item.subtotal, 0),
  );
  const impuestos = roundMoney(
    lines.reduce((acc, item) => acc + item.impuestos, 0),
  );
  const descuentoLineas = roundMoney(
    lines.reduce((acc, item) => acc + item.descuento, 0),
  );
  const descuentoGlobal = roundMoney(draft?.descuentoGlobal || 0);
  const total = Math.max(
    roundMoney(subtotal + impuestos - descuentoLineas - descuentoGlobal),
    0,
  );
  const efectivoRecibido = roundMoney(draft?.efectivoRecibido || 0);
  const abonoInicial = Math.min(
    roundMoney(draft?.abonoInicial || 0),
    total,
  );
  const cambio = Math.max(roundMoney(efectivoRecibido - total), 0);
  const saldoCredito = Math.max(roundMoney(total - abonoInicial), 0);

  return {
    lines,
    subtotal,
    impuestos,
    descuentoLineas,
    descuentoGlobal,
    total,
    efectivoRecibido,
    cambio,
    abonoInicial,
    saldoCredito,
  };
};

export const createLineItem = (producto, overrides = {}) => ({
  id:
    overrides.id ||
    `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  producto,
  cantidad: overrides.cantidad ?? 1,
  precio_unitario:
    overrides.precio_unitario ?? Number(producto?.precio_venta || 0),
  descuento: overrides.descuento ?? 0,
});

export const isPersistedClient = (cliente) =>
  typeof cliente?.id === 'number' && !cliente?.esTemporal;

export const createTemporaryClient = (data = {}) => ({
  id: `tmp-${Date.now()}`,
  nombre_completo: data.nombre_completo || data.nombre || 'Cliente temporal',
  numero_documento: data.numero_documento || 'TEMP',
  tipo_documento: data.tipo_documento || 'CC',
  telefono: data.telefono || '',
  email: data.email || '',
  persisted: false,
  esTemporal: true,
  observaciones: data.observaciones || '',
});

export const buildVentaPayload = (draft) => {
  const totals = calculateVentaTotals(draft);
  const observaciones = [draft?.observaciones || ''];

  if (draft?.clienteSeleccionado?.esTemporal) {
    observaciones.push(
      `Cliente temporal: ${draft.clienteSeleccionado.nombre_completo} / ${draft.clienteSeleccionado.numero_documento}`,
    );
  }

  return {
    cliente: isPersistedClient(draft?.clienteSeleccionado)
      ? draft.clienteSeleccionado.id
      : undefined,
    descuento: toDecimalString(draft?.descuentoGlobal || 0),
    estado: draft?.estado || 'TERMINADA',
    metodo_pago: draft?.metodoPago || 'EFECTIVO',
    factura_electronica: Boolean(draft?.facturaElectronica),
    observaciones: observaciones.filter(Boolean).join('\n'),
    detalles: totals.lines.map((item) => ({
      producto: item.producto.id,
      cantidad: toDecimalString(item.cantidad),
      precio_unitario: toDecimalString(item.precio_unitario),
      descuento: toDecimalString(item.descuento || 0),
    })),
  };
};

export const getVentaEstadoTone = (estado) => {
  const map = {
    TERMINADA: 'success',
    PENDIENTE: 'warning',
    CANCELADA: 'danger',
    PAGADA: 'success',
    PARCIAL: 'accent',
  };
  return map[estado] || 'neutral';
};

export const getToneClasses = (tone) => {
  const map = {
    success: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200',
    warning: 'border-amber-500/30 bg-amber-500/12 text-amber-200',
    danger: 'border-rose-500/30 bg-rose-500/12 text-rose-200',
    accent: 'border-cyan-500/30 bg-cyan-500/12 text-cyan-200',
    neutral: 'border-white/10 bg-white/5 text-slate-200',
  };
  return map[tone] || map.neutral;
};

export const downloadSpreadsheet = (rows, filename = 'ventas.xls') => {
  if (!rows?.length) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const table = [
    '<table><thead><tr>',
    ...headers.map((header) => `<th>${header}</th>`),
    '</tr></thead><tbody>',
    ...rows.map(
      (row) => (
        `<tr>${headers.map((header) => `<td>${row[header] ?? ''}</td>`).join('')}</tr>`
      ),
    ),
    '</tbody></table>',
  ].join('');

  const blob = new Blob([table], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const printVentasDocument = ({
  title,
  subtitle,
  rows,
  totals = [],
}) => {
  const popup = window.open('', '_blank', 'width=980,height=760');
  if (!popup) {
    return;
  }

  const headers = rows.length ? Object.keys(rows[0]) : [];
  const totalMarkup = totals
    .map((item) => `<div><strong>${item.label}:</strong> ${item.value}</div>`)
    .join('');
  const tableMarkup = rows.length
    ? `
      <table>
        <thead>
          <tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr>${headers.map((header) => `<td>${row[header] ?? ''}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    `
    : '<p>Sin datos para imprimir.</p>';

  popup.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
          h1 { margin: 0 0 8px; }
          p { margin: 0 0 24px; color: #475569; }
          .totals { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 12px; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>${subtitle || ''}</p>
        <div class="totals">${totalMarkup}</div>
        ${tableMarkup}
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
};

export const printVentaTicket = (venta) => {
  const popup = window.open('', '_blank', 'width=420,height=720');
  if (!popup || !venta) {
    return;
  }

  const details = (venta.detalles || [])
    .map(
      (item) => `
        <tr>
          <td>${item.producto?.nombre || 'Producto'}</td>
          <td>${item.cantidad}</td>
          <td>${formatCurrency(item.total)}</td>
        </tr>
      `,
    )
    .join('');

  popup.document.write(`
    <html>
      <head>
        <title>Ticket ${venta.numero_venta}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; color: #0f172a; }
          h1, h2, p { margin: 0; text-align: center; }
          .meta { margin: 12px 0 18px; text-align: left; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          td { padding: 6px 0; border-bottom: 1px dashed #94a3b8; }
          .total { margin-top: 18px; font-size: 14px; font-weight: bold; text-align: right; }
        </style>
      </head>
      <body>
        <h1>Mallor</h1>
        <h2>Ticket de venta</h2>
        <div class="meta">
          <div>Venta: ${venta.numero_venta}</div>
          <div>Fecha: ${venta.fecha_venta}</div>
          <div>Cliente: ${venta.cliente?.nombre_completo || 'Consumidor Final'}</div>
          <div>Pago: ${venta.metodo_pago}</div>
        </div>
        <table>
          <tbody>${details}</tbody>
        </table>
        <div class="total">Total: ${formatCurrency(venta.total)}</div>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
};
