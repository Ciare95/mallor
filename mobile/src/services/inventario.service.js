import api from './api';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://mallor.onrender.com/api';

export function buildImageUrl(relativePath) {
  if (!relativePath) return null;
  if (relativePath.startsWith('http')) return relativePath;
  const base = BASE_URL.replace(/\/api\/?$/, '');
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${base}${path}`;
}

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );

export const listarProductos = async (filtros = {}) => {
  const response = await api.get('/inventario/productos/', {
    params: cleanParams(filtros),
  });
  return response.data;
};

export const obtenerProducto = async (id) => {
  const response = await api.get(`/inventario/productos/${id}/`);
  return response.data;
};

export const listarCategorias = async (filtros = {}) => {
  const response = await api.get('/inventario/categorias/', {
    params: cleanParams(filtros),
  });
  return response.data;
};

export default { listarProductos, obtenerProducto, listarCategorias, buildImageUrl };
