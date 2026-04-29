import api from './api';

const FABRICANTE_BASE = '/fabricante';

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );

const asArray = (value) => (Array.isArray(value) ? value : []);

const isRecipeItemChanged = (currentItem, nextItem) =>
  Number(currentItem.cantidad_necesaria) !==
    Number(nextItem.cantidad_necesaria) ||
  currentItem.unidad_medida !== nextItem.unidad_medida;

const isPresentationChanged = (currentItem, nextItem) =>
  currentItem.nombre !== nextItem.nombre ||
  Number(currentItem.cantidad_por_unidad) !==
    Number(nextItem.cantidad_por_unidad) ||
  currentItem.unidad_medida !== nextItem.unidad_medida ||
  Number(currentItem.precio_venta) !== Number(nextItem.precio_venta) ||
  Number(currentItem.precio_venta_sugerido || 0) !==
    Number(nextItem.precio_venta_sugerido || 0);

export const listarIngredientes = async (filters = {}) => {
  const response = await api.get(`${FABRICANTE_BASE}/ingredientes/`, {
    params: cleanParams(filters),
  });
  return response.data;
};

export const crearIngrediente = async (payload) => {
  const response = await api.post(`${FABRICANTE_BASE}/ingredientes/`, payload);
  return response.data;
};

export const actualizarIngrediente = async (id, payload) => {
  const response = await api.patch(
    `${FABRICANTE_BASE}/ingredientes/${id}/`,
    payload,
  );
  return response.data;
};

export const eliminarIngrediente = async (id) => {
  await api.delete(`${FABRICANTE_BASE}/ingredientes/${id}/`);
};

export const actualizarStockIngrediente = async (id, payload) => {
  const response = await api.post(
    `${FABRICANTE_BASE}/ingredientes/${id}/actualizar-stock/`,
    payload,
  );
  return response.data;
};

export const obtenerIngredientesBajoStock = async () => {
  const response = await api.get(`${FABRICANTE_BASE}/ingredientes/bajo-stock/`);
  return response.data;
};

export const listarProductosFabricados = async (filters = {}) => {
  const response = await api.get(`${FABRICANTE_BASE}/productos/`, {
    params: cleanParams(filters),
  });
  return response.data;
};

export const obtenerProductoFabricado = async (id) => {
  const response = await api.get(`${FABRICANTE_BASE}/productos/${id}/`);
  return response.data;
};

export const crearProductoFabricado = async (payload) => {
  const response = await api.post(`${FABRICANTE_BASE}/productos/`, payload);
  return response.data;
};

export const actualizarProductoFabricado = async (id, payload) => {
  const response = await api.patch(
    `${FABRICANTE_BASE}/productos/${id}/`,
    payload,
  );
  return response.data;
};

export const eliminarProductoFabricado = async (id) => {
  await api.delete(`${FABRICANTE_BASE}/productos/${id}/`);
};

export const obtenerCostosProductoFabricado = async (id) => {
  const response = await api.get(`${FABRICANTE_BASE}/productos/${id}/costos/`);
  return response.data;
};

export const calcularPrecioProductoFabricado = async (id, payload) => {
  const response = await api.post(
    `${FABRICANTE_BASE}/productos/${id}/calcular-precio/`,
    payload,
  );
  return response.data;
};

export const producirProductoFabricado = async (id, payload) => {
  const response = await api.post(
    `${FABRICANTE_BASE}/productos/${id}/producir/`,
    payload,
  );
  return response.data;
};

export const convertirProductoFabricadoAInventario = async (id) => {
  const response = await api.post(
    `${FABRICANTE_BASE}/productos/${id}/convertir-inventario/`,
  );
  return response.data;
};

export const listarRecetaProductoFabricado = async (id) => {
  const response = await api.get(`${FABRICANTE_BASE}/productos/${id}/receta/`);
  return response.data;
};

export const listarPresentacionesProductoFabricado = async (id) => {
  const response = await api.get(
    `${FABRICANTE_BASE}/productos/${id}/presentaciones/`,
  );
  return response.data;
};

export const agregarIngredienteReceta = async (id, payload) => {
  const response = await api.post(
    `${FABRICANTE_BASE}/productos/${id}/receta/`,
    payload,
  );
  return response.data;
};

export const crearPresentacionProductoFabricado = async (id, payload) => {
  const response = await api.post(
    `${FABRICANTE_BASE}/productos/${id}/presentaciones/`,
    payload,
  );
  return response.data;
};

export const eliminarIngredienteReceta = async (productId, ingredientId) => {
  await api.delete(
    `${FABRICANTE_BASE}/productos/${productId}/receta/${ingredientId}/`,
  );
};

export const actualizarPresentacionProductoFabricado = async (
  productId,
  presentationId,
  payload,
) => {
  const response = await api.patch(
    `${FABRICANTE_BASE}/productos/${productId}/presentaciones/${presentationId}/`,
    payload,
  );
  return response.data;
};

export const eliminarPresentacionProductoFabricado = async (
  productId,
  presentationId,
) => {
  await api.delete(
    `${FABRICANTE_BASE}/productos/${productId}/presentaciones/${presentationId}/`,
  );
};

export const empacarPresentacionProductoFabricado = async (
  productId,
  presentationId,
  payload,
) => {
  const response = await api.post(
    `${FABRICANTE_BASE}/productos/${productId}/presentaciones/${presentationId}/empacar/`,
    payload,
  );
  return response.data;
};

export const actualizarProductoFabricadoConReceta = async ({
  id,
  payload,
  currentRecipe,
  currentPresentations,
}) => {
  const {
    receta = [],
    presentaciones = [],
    ...productPayload
  } = payload;
  await actualizarProductoFabricado(id, productPayload);

  const currentMap = new Map(
    asArray(currentRecipe).map((item) => [
      item.ingrediente_id || item.ingrediente?.id,
      item,
    ]),
  );
  const nextMap = new Map(
    asArray(receta).map((item) => [item.ingrediente_id, item]),
  );

  for (const [ingredientId, currentItem] of currentMap.entries()) {
    const nextItem = nextMap.get(ingredientId);
    if (!nextItem || isRecipeItemChanged(currentItem, nextItem)) {
      await eliminarIngredienteReceta(id, ingredientId);
    }
  }

  for (const [ingredientId, nextItem] of nextMap.entries()) {
    const currentItem = currentMap.get(ingredientId);
    if (!currentItem || isRecipeItemChanged(currentItem, nextItem)) {
      await agregarIngredienteReceta(id, nextItem);
    }
  }

  const currentPresentationsMap = new Map(
    asArray(currentPresentations).map((item) => [
      item.id || item.local_id,
      item,
    ]),
  );
  const nextPresentationsMap = new Map(
    asArray(presentaciones).map((item) => [item.id || item.local_id, item]),
  );

  for (const [presentationKey, currentItem] of currentPresentationsMap.entries()) {
    const nextItem = nextPresentationsMap.get(presentationKey);
    if (!nextItem) {
      if (currentItem.id) {
        await eliminarPresentacionProductoFabricado(id, currentItem.id);
      }
      continue;
    }

    if (currentItem.id && isPresentationChanged(currentItem, nextItem)) {
      await actualizarPresentacionProductoFabricado(
        id,
        currentItem.id,
        nextItem,
      );
    }
  }

  for (const nextItem of asArray(presentaciones)) {
    if (!nextItem.id) {
      await crearPresentacionProductoFabricado(id, nextItem);
    }
  }

  return obtenerProductoFabricado(id);
};

export default {
  listarIngredientes,
  crearIngrediente,
  actualizarIngrediente,
  eliminarIngrediente,
  actualizarStockIngrediente,
  obtenerIngredientesBajoStock,
  listarProductosFabricados,
  obtenerProductoFabricado,
  crearProductoFabricado,
  actualizarProductoFabricado,
  actualizarProductoFabricadoConReceta,
  eliminarProductoFabricado,
  obtenerCostosProductoFabricado,
  calcularPrecioProductoFabricado,
  producirProductoFabricado,
  convertirProductoFabricadoAInventario,
  listarRecetaProductoFabricado,
  listarPresentacionesProductoFabricado,
  agregarIngredienteReceta,
  eliminarIngredienteReceta,
  crearPresentacionProductoFabricado,
  actualizarPresentacionProductoFabricado,
  eliminarPresentacionProductoFabricado,
  empacarPresentacionProductoFabricado,
};
