export const DOCUMENTO_PROVEEDOR_LABELS = {
  NIT: 'NIT',
  CC: 'CC',
  CE: 'CE',
};

export const FORMA_PAGO_PROVEEDOR_LABELS = {
  CONTADO: 'Contado',
  CREDITO_15: 'Credito 15 dias',
  CREDITO_30: 'Credito 30 dias',
  CREDITO_60: 'Credito 60 dias',
};

export const FACTURA_ESTADO_LABELS = {
  PENDIENTE: 'Pendiente',
  PROCESADA: 'Procesada',
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

export const getProveedorNombre = (proveedor) =>
  proveedor?.nombre_completo ||
  proveedor?.nombre_comercial ||
  proveedor?.razon_social ||
  'Proveedor';

export const getProveedorStatusMeta = (proveedor) => {
  const activo = Boolean(proveedor?.activo ?? true);
  const totalCompras = Number(proveedor?.total_compras || 0);

  if (!activo) {
    return {
      label: 'Inactivo',
      classes: 'border-app bg-white/70 text-soft',
    };
  }

  if (totalCompras > 0) {
    return {
      label: 'Activo comercial',
      classes: 'border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)] text-[var(--info-text)]',
    };
  }

  return {
    label: 'Nuevo',
    classes: 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]',
  };
};

export const getFacturaCompraStatusMeta = (factura) => {
  if (factura?.estado === 'PROCESADA') {
    return {
      label: 'Procesada',
      classes: 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]',
    };
  }

  return {
    label: 'Pendiente',
    classes: 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] text-[var(--warning-text)]',
  };
};

export const buildProveedorPayload = (form) => ({
  tipo_documento: form.tipo_documento,
  numero_documento: form.numero_documento.trim(),
  razon_social: form.razon_social.trim(),
  nombre_comercial: form.nombre_comercial.trim(),
  nombre_contacto: form.nombre_contacto.trim(),
  email: form.email.trim(),
  telefono: form.telefono.trim(),
  celular: form.celular.trim(),
  direccion: form.direccion.trim(),
  ciudad: form.ciudad.trim(),
  departamento: form.departamento.trim(),
  tipo_productos: form.tipo_productos.trim(),
  forma_pago: form.forma_pago,
  cuenta_bancaria: form.cuenta_bancaria.trim(),
  banco: form.banco.trim(),
  observaciones: form.observaciones.trim(),
  activo: Boolean(form.activo),
});

export const createProveedorFormState = (proveedor) => ({
  tipo_documento: proveedor?.tipo_documento || 'NIT',
  numero_documento: proveedor?.numero_documento || '',
  razon_social: proveedor?.razon_social || '',
  nombre_comercial: proveedor?.nombre_comercial || '',
  nombre_contacto: proveedor?.nombre_contacto || '',
  email: proveedor?.email || '',
  telefono: proveedor?.telefono || '',
  celular: proveedor?.celular || '',
  direccion: proveedor?.direccion || '',
  ciudad: proveedor?.ciudad || '',
  departamento: proveedor?.departamento || '',
  tipo_productos: proveedor?.tipo_productos || '',
  forma_pago: proveedor?.forma_pago || 'CONTADO',
  cuenta_bancaria: proveedor?.cuenta_bancaria || '',
  banco: proveedor?.banco || '',
  observaciones: proveedor?.observaciones || '',
  activo: Boolean(proveedor?.activo ?? true),
});

export const validateProveedorForm = ({
  form,
  duplicateDocument,
}) => {
  const errors = {};

  if (!form.numero_documento.trim()) {
    errors.numero_documento = 'El documento es obligatorio.';
  }

  if (duplicateDocument) {
    errors.numero_documento =
      'Ya existe un proveedor con este numero de documento.';
  }

  if (!form.razon_social.trim()) {
    errors.razon_social = 'La razon social es obligatoria.';
  }

  if (!form.nombre_contacto.trim()) {
    errors.nombre_contacto = 'El nombre de contacto es obligatorio.';
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

  if (!form.tipo_productos.trim()) {
    errors.tipo_productos = 'El tipo de productos es obligatorio.';
  }

  if (!form.email.trim()) {
    errors.email = 'El correo es obligatorio.';
  } else if (!/\S+@\S+\.\S+/.test(form.email.trim())) {
    errors.email = 'El correo no es valido.';
  }

  return errors;
};

export const groupFacturasByMonth = (facturas = []) => {
  const buckets = new Map();

  facturas.forEach((factura) => {
    const date = new Date(factura.fecha_factura);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const label = new Intl.DateTimeFormat('es-CO', {
      month: 'short',
      year: '2-digit',
    }).format(date);

    const current = buckets.get(label) || 0;
    buckets.set(label, current + Number(factura.total || 0));
  });

  return Array.from(buckets.entries())
    .map(([label, value]) => ({ label, value }))
    .slice(-6);
};
