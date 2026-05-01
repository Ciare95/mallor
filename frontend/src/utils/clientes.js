const DAY_MS = 86400000;

export const DOCUMENTO_LABELS = {
  CC: 'CC',
  NIT: 'NIT',
  CE: 'CE',
  PASAPORTE: 'Pasaporte',
};

export const TIPO_CLIENTE_LABELS = {
  NATURAL: 'Natural',
  JURIDICO: 'Juridico',
};

export const REGIMEN_LABELS = {
  '': 'Sin regimen',
  SIMPLIFICADO: 'Simplificado',
  COMUN: 'Comun',
};

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

export const getClienteNombre = (cliente) =>
  cliente?.nombre_completo ||
  cliente?.razon_social ||
  cliente?.nombre ||
  cliente?.nombre_comercial ||
  'Cliente';

export const getClienteStatusMeta = (cliente) => {
  const saldo = Number(cliente?.saldo_pendiente || 0);
  const total = Number(cliente?.total_compras || 0);
  const activo = Boolean(cliente?.activo ?? true);

  if (!activo) {
    return {
      label: 'Inactivo',
      classes: 'border-app bg-white/70 text-soft',
    };
  }

  if (saldo > 0) {
    return {
      label: 'Moroso',
      classes: 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] text-[var(--warning-text)]',
    };
  }

  if (total > 0) {
    return {
      label: 'Buen cliente',
      classes: 'border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)] text-[var(--info-text)]',
    };
  }

  return {
    label: 'Nuevo',
    classes: 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]',
  };
};

export const calculateDaysPastDue = (venta, diasPlazo = 0) => {
  const fecha = venta?.fecha_venta ? new Date(venta.fecha_venta) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) {
    return 0;
  }

  const now = new Date();
  const age = Math.floor((now.getTime() - fecha.getTime()) / DAY_MS);
  return Math.max(age - Number(diasPlazo || 0), 0);
};

export const buildClientePayload = (form) => ({
  tipo_documento: form.tipo_documento,
  numero_documento: form.numero_documento.trim(),
  nombre: form.nombre.trim(),
  razon_social: form.razon_social.trim(),
  nombre_comercial: form.nombre_comercial.trim(),
  email: form.email.trim(),
  telefono: form.telefono.trim(),
  celular: form.celular.trim(),
  direccion: form.direccion.trim(),
  ciudad: form.ciudad.trim(),
  departamento: form.departamento.trim(),
  codigo_postal: form.codigo_postal.trim(),
  tipo_cliente: form.tipo_cliente,
  regimen_tributario: form.regimen_tributario,
  responsable_iva: Boolean(form.responsable_iva),
  limite_credito: Number(form.limite_credito || 0).toFixed(2),
  dias_plazo: Number(form.dias_plazo || 0),
  observaciones: form.observaciones.trim(),
  activo: Boolean(form.activo),
});

export const createClienteFormState = (cliente) => ({
  tipo_documento: cliente?.tipo_documento || 'CC',
  numero_documento: cliente?.numero_documento || '',
  nombre: cliente?.nombre || '',
  razon_social: cliente?.razon_social || '',
  nombre_comercial: cliente?.nombre_comercial || '',
  email: cliente?.email || '',
  telefono: cliente?.telefono || '',
  celular: cliente?.celular || '',
  direccion: cliente?.direccion || '',
  ciudad: cliente?.ciudad || '',
  departamento: cliente?.departamento || '',
  codigo_postal: cliente?.codigo_postal || '',
  tipo_cliente: cliente?.tipo_cliente || 'NATURAL',
  regimen_tributario: cliente?.regimen_tributario || '',
  responsable_iva: Boolean(cliente?.responsable_iva),
  limite_credito: Number(cliente?.limite_credito || 0),
  dias_plazo: Number(cliente?.dias_plazo || 0),
  observaciones: cliente?.observaciones || '',
  activo: Boolean(cliente?.activo ?? true),
});

export const validateClienteForm = ({
  form,
  duplicateDocument,
  saldoPendiente = 0,
}) => {
  const errors = {};

  if (!form.numero_documento.trim()) {
    errors.numero_documento = 'El documento es obligatorio.';
  }

  if (duplicateDocument) {
    errors.numero_documento =
      'Ya existe un cliente con este tipo y numero de documento.';
  }

  if (form.tipo_cliente === 'NATURAL' && !form.nombre.trim()) {
    errors.nombre = 'El nombre es obligatorio.';
  }

  if (
    form.tipo_cliente === 'JURIDICO' &&
    !form.razon_social.trim()
  ) {
    errors.razon_social = 'La razon social es obligatoria.';
  }

  if (!form.telefono.trim()) {
    errors.telefono = 'El telefono es obligatorio.';
  }

  if (!form.direccion.trim()) {
    errors.direccion = 'La direccion es obligatoria.';
  }

  if (!form.ciudad.trim()) {
    errors.ciudad = 'La ciudad es obligatoria.';
  }

  if (!form.departamento.trim()) {
    errors.departamento = 'El departamento es obligatorio.';
  }

  if (form.email.trim() && !/\S+@\S+\.\S+/.test(form.email.trim())) {
    errors.email = 'El correo no es valido.';
  }

  if (Number(form.limite_credito || 0) < Number(saldoPendiente || 0)) {
    errors.limite_credito =
      'El limite no puede ser menor al saldo pendiente.';
  }

  if (Number(form.dias_plazo || 0) < 0) {
    errors.dias_plazo = 'Los dias de plazo no pueden ser negativos.';
  }

  return errors;
};

export const groupVentasByMonth = (ventas = []) => {
  const buckets = new Map();

  ventas.forEach((venta) => {
    const date = new Date(venta.fecha_venta);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const label = new Intl.DateTimeFormat('es-CO', {
      month: 'short',
      year: '2-digit',
    }).format(date);

    const current = buckets.get(label) || 0;
    buckets.set(label, current + Number(venta.total || 0));
  });

  return Array.from(buckets.entries())
    .map(([label, value]) => ({ label, value }))
    .slice(-6);
};
