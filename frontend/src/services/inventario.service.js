import api from './api';

const INVENTARIO_BASE = '/inventario';
const BACKEND_ORIGIN = new URL(api.defaults.baseURL).origin;

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

const normalizeProductPayload = (datos = {}) => {
  const payload = { ...datos };
  if ('categoria_id' in payload) {
    payload.categoria = payload.categoria_id || null;
    delete payload.categoria_id;
  }
  return payload;
};

const normalizeImageUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return value || '';
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith('/')) {
    return `${BACKEND_ORIGIN}${value}`;
  }

  return `${BACKEND_ORIGIN}/${value}`;
};

const normalizeProductResponse = (producto) => {
  if (!producto || typeof producto !== 'object') {
    return producto;
  }

  return {
    ...producto,
    imagen: normalizeImageUrl(producto.imagen),
  };
};

const normalizeProductCollection = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeProductResponse);
  }

  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.results)) {
    return payload;
  }

  return {
    ...payload,
    results: payload.results.map(normalizeProductResponse),
  };
};

const toProductRequestBody = (datos = {}) => {
  const payload = normalizeProductPayload(datos);
  const hasImageFile = payload.imagen instanceof File;

  if (!hasImageFile) {
    delete payload.imagen;
    return payload;
  }

  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, value);
    }
  });
  return formData;
};

const requestConfigForBody = (body) => {
  if (body instanceof FormData) {
    return { headers: { 'Content-Type': 'multipart/form-data' } };
  }
  return undefined;
};

export const listarProductos = async (filtros = {}) => {
  const response = await api.get(`${INVENTARIO_BASE}/productos/`, {
    params: cleanParams(filtros),
  });
  return normalizeProductCollection(response.data);
};

export const buscarProductos = async (q) => {
  const response = await api.get(`${INVENTARIO_BASE}/productos/buscar/`, {
    params: cleanParams({ q }),
  });
  return normalizeProductCollection(response.data);
};

export const obtenerProducto = async (id) => {
  const response = await api.get(`${INVENTARIO_BASE}/productos/${id}/`);
  return normalizeProductResponse(response.data);
};

export const crearProducto = async (datos) => {
  const body = toProductRequestBody(datos);
  const response = await api.post(
    `${INVENTARIO_BASE}/productos/`,
    body,
    requestConfigForBody(body)
  );
  return normalizeProductResponse(response.data);
};

export const actualizarProducto = async (id, datos) => {
  const body = toProductRequestBody(datos);
  const response = await api.patch(
    `${INVENTARIO_BASE}/productos/${id}/`,
    body,
    requestConfigForBody(body)
  );
  return normalizeProductResponse(response.data);
};

export const eliminarProducto = async (id) => {
  await api.delete(`${INVENTARIO_BASE}/productos/${id}/`);
};

export const ajustarStock = async (id, datos) => {
  const response = await api.post(`${INVENTARIO_BASE}/productos/${id}/ajustar-stock/`, datos);
  return response.data;
};

export const obtenerHistorialProducto = async (id, filtros = {}) => {
  const response = await api.get(`${INVENTARIO_BASE}/productos/${id}/historial/`, {
    params: cleanParams(filtros),
  });
  return response.data;
};

export const listarCategorias = async (filtros = {}) => {
  const response = await api.get(`${INVENTARIO_BASE}/categorias/`, {
    params: cleanParams(filtros),
  });
  return response.data;
};

export const crearCategoria = async (datos) => {
  const response = await api.post(`${INVENTARIO_BASE}/categorias/`, datos);
  return response.data;
};

export const actualizarCategoria = async (id, datos) => {
  const response = await api.patch(`${INVENTARIO_BASE}/categorias/${id}/`, datos);
  return response.data;
};

export const eliminarCategoria = async (id) => {
  await api.delete(`${INVENTARIO_BASE}/categorias/${id}/`);
};

export const listarFacturasCompra = async (filtros = {}) => {
  const response = await api.get(`${INVENTARIO_BASE}/facturas/`, {
    params: cleanParams(filtros),
  });
  return response.data;
};

export const registrarFacturaCompra = async (datos) => {
  const response = await api.post(`${INVENTARIO_BASE}/facturas/`, datos);
  return response.data;
};

export const obtenerFacturaCompra = async (id) => {
  const response = await api.get(`${INVENTARIO_BASE}/facturas/${id}/`);
  return response.data;
};

export const procesarFacturaCompra = async (input) => {
  const payload =
    typeof input === 'object' && input !== null ? input : { id: input };
  const { id, ...body } = payload;
  const response = await api.post(
    `${INVENTARIO_BASE}/facturas/${id}/procesar/`,
    body
  );
  return response.data;
};

export const obtenerValorTotalInventario = async () => {
  const response = await api.get(`${INVENTARIO_BASE}/reportes/valor-total/`);
  return response.data;
};

export const obtenerProductosBajoStock = async (minimo = 10) => {
  const response = await api.get(`${INVENTARIO_BASE}/reportes/bajo-stock/`, {
    params: { minimo },
  });
  return response.data;
};

export const obtenerProductosMasVendidos = async (filtros = {}) => {
  const response = await api.get(`${INVENTARIO_BASE}/reportes/mas-vendidos/`, {
    params: cleanParams(filtros),
  });
  return response.data;
};

export const exportarInventarioExcel = async () => {
  const response = await api.get(`${INVENTARIO_BASE}/exportar/excel/`, {
    responseType: 'blob',
  });
  return response;
};

export default {
  listarProductos,
  buscarProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  ajustarStock,
  obtenerHistorialProducto,
  listarCategorias,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  listarFacturasCompra,
  registrarFacturaCompra,
  obtenerFacturaCompra,
  procesarFacturaCompra,
  obtenerValorTotalInventario,
  obtenerProductosBajoStock,
  obtenerProductosMasVendidos,
  exportarInventarioExcel,
};
