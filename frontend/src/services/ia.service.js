import api from './api';

const IA_BASE = '/ia';

export const enviarConsultaIA = async ({ consulta, sesionId }) => {
  const payload = { consulta };
  if (sesionId) {
    payload.sesion_id = sesionId;
  }
  const response = await api.post(`${IA_BASE}/chat/`, payload);
  return response.data;
};

export const listarHistorialIA = async ({ sesionId, page = 1 } = {}) => {
  const response = await api.get(`${IA_BASE}/historial/`, {
    params: {
      sesion_id: sesionId || undefined,
      page,
    },
  });
  return response.data;
};

export const limpiarHistorialIA = async ({ sesionId } = {}) => {
  const response = await api.delete(`${IA_BASE}/historial/`, {
    params: {
      sesion_id: sesionId || undefined,
    },
  });
  return response.data;
};

export const obtenerSugerenciasIA = async () => {
  const response = await api.get(`${IA_BASE}/sugerencias/`);
  return response.data;
};

export const enviarFeedbackIA = async ({ mensajeId, feedback, comentario = '' }) => {
  const response = await api.post(`${IA_BASE}/feedback/`, {
    mensaje_id: mensajeId,
    feedback,
    comentario,
  });
  return response.data;
};

export default {
  enviarConsultaIA,
  listarHistorialIA,
  limpiarHistorialIA,
  obtenerSugerenciasIA,
  enviarFeedbackIA,
};
