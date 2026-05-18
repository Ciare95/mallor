import api from './api';

const getTerminalId = () => localStorage.getItem('mallor_terminal_id') || '';

export const setTerminalId = (terminalId) => {
  if (terminalId) {
    localStorage.setItem('mallor_terminal_id', String(terminalId));
  } else {
    localStorage.removeItem('mallor_terminal_id');
  }
};

export const obtenerEstadoOffline = async () => {
  const terminalId = getTerminalId();
  const response = await api.get('/offline/status/', {
    params: terminalId ? { terminal_id: terminalId } : undefined,
  });
  if (response.data?.terminal?.id && !terminalId) {
    setTerminalId(response.data.terminal.id);
  }
  return response.data;
};

export const listarTerminales = async () => {
  const response = await api.get('/offline/terminales/');
  return response.data;
};

export const crearTerminal = async (payload) => {
  const response = await api.post('/offline/terminales/', payload);
  setTerminalId(response.data.id);
  return response.data;
};

export const abrirCaja = async ({ terminalId = getTerminalId(), efectivoInicial = '0.00' } = {}) => {
  const response = await api.post('/offline/caja/abrir/', {
    terminal_id: terminalId ? Number(terminalId) : undefined,
    efectivo_inicial: efectivoInicial,
  });
  return response.data;
};

export const cerrarCaja = async ({
  cajaSesionId,
  terminalId = getTerminalId(),
  efectivoFinal,
  observaciones = '',
}) => {
  const response = await api.post('/offline/caja/cerrar/', {
    caja_sesion_id: cajaSesionId,
    terminal_id: terminalId ? Number(terminalId) : undefined,
    efectivo_final: efectivoFinal,
    observaciones,
  });
  return response.data;
};

export const listarOutbox = async () => {
  const response = await api.get('/offline/sync/outbox/');
  return response.data;
};

export const reintentarSync = async () => {
  const response = await api.post('/offline/sync/retry/');
  return response.data;
};

export const reintentarFacturacionOffline = async () => {
  const response = await api.post('/offline/facturacion/retry/');
  return response.data;
};

export default {
  obtenerEstadoOffline,
  listarTerminales,
  crearTerminal,
  abrirCaja,
  cerrarCaja,
  listarOutbox,
  reintentarSync,
  reintentarFacturacionOffline,
  setTerminalId,
};
