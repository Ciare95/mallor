import api from './api';

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value != null),
  );
}

export async function obtenerResumenContador(params) {
  const response = await api.get('/contador/resumen/', {
    params: cleanParams(params),
  });
  return response.data;
}

export async function obtenerRiesgosDian(params) {
  const response = await api.get('/contador/riesgos-dian/', {
    params: cleanParams(params),
  });
  return response.data;
}

export async function listarFacturasContador(params) {
  const response = await api.get('/contador/facturas/', {
    params: cleanParams(params),
  });
  return response.data;
}

export async function obtenerImpuestosContador(params) {
  const response = await api.get('/contador/impuestos/', {
    params: cleanParams(params),
  });
  return response.data;
}

export async function obtenerCarteraContador(params) {
  const response = await api.get('/contador/cartera/', {
    params: cleanParams(params),
  });
  return response.data;
}

export async function obtenerInventarioValorizado() {
  const response = await api.get('/contador/inventario-valorizado/');
  return response.data;
}

export async function listarSoportesContador(params) {
  const response = await api.get('/contador/soportes/', {
    params: cleanParams(params),
  });
  return response.data;
}
