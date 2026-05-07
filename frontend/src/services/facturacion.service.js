import api from './api';

const saveBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const obtenerConfiguracionFacturacion = async () => {
  const response = await api.get('/facturacion/configuracion/');
  return response.data;
};

export const actualizarConfiguracionFacturacion = async (payload) => {
  const response = await api.patch('/facturacion/configuracion/', payload);
  return response.data;
};

export const validarConexionFacturacion = async () => {
  const response = await api.post('/facturacion/validar-conexion/');
  return response.data;
};

export const sincronizarRangosFacturacion = async () => {
  const response = await api.post('/facturacion/sincronizar-rangos/');
  return response.data;
};

export const listarRangosFacturacion = async () => {
  const response = await api.get('/facturacion/rangos/');
  return response.data;
};

export const obtenerFacturaVenta = async (ventaId, { sync = false } = {}) => {
  const response = await api.get(`/ventas/${ventaId}/factura/`, {
    params: sync ? { sync: true } : undefined,
  });
  return response.data;
};

export const emitirFacturaVenta = async (ventaId) => {
  const response = await api.post(`/ventas/${ventaId}/factura/emitir/`);
  return response.data;
};

export const reintentarFacturaVenta = async (ventaId) => {
  const response = await api.post(`/ventas/${ventaId}/factura/reintentar/`);
  return response.data;
};

export const enviarFacturaVentaEmail = async (ventaId, email) => {
  const response = await api.post(`/ventas/${ventaId}/factura/enviar-email/`, {
    email,
  });
  return response.data;
};

export const crearNotaCreditoVenta = async (
  ventaId,
  { reason, conceptCode = '1' },
) => {
  const response = await api.post(`/ventas/${ventaId}/factura/nota-credito/`, {
    reason,
    concept_code: conceptCode,
  });
  return response.data;
};

export const descargarFacturaVentaPdf = async (ventaId) => {
  const response = await api.get(`/ventas/${ventaId}/factura/pdf/`, {
    responseType: 'blob',
  });
  saveBlob(response.data, `factura-${ventaId}.pdf`);
};

export const descargarFacturaVentaXml = async (ventaId) => {
  const response = await api.get(`/ventas/${ventaId}/factura/xml/`, {
    responseType: 'blob',
  });
  saveBlob(response.data, `factura-${ventaId}.xml`);
};

export default {
  obtenerConfiguracionFacturacion,
  actualizarConfiguracionFacturacion,
  validarConexionFacturacion,
  sincronizarRangosFacturacion,
  listarRangosFacturacion,
  obtenerFacturaVenta,
  emitirFacturaVenta,
  reintentarFacturaVenta,
  enviarFacturaVentaEmail,
  crearNotaCreditoVenta,
  descargarFacturaVentaPdf,
  descargarFacturaVentaXml,
};
