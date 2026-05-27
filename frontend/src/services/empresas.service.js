import api from './api';

const resolveApiOrigin = () => {
  const browserOrigin = globalThis.window?.location?.origin || 'http://localhost:8000';
  return new URL(api.defaults?.baseURL || '/api', browserOrigin).origin;
};

const API_ORIGIN = resolveApiOrigin();

const normalizeImageUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return value || '';
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith('/')) {
    return `${API_ORIGIN}${value}`;
  }

  return `${API_ORIGIN}/${value}`;
};

const normalizeEmpresaResponse = (empresa) => {
  if (!empresa || typeof empresa !== 'object') {
    return empresa;
  }

  return {
    ...empresa,
    ...(Object.prototype.hasOwnProperty.call(empresa, 'logo')
      ? { logo: normalizeImageUrl(empresa.logo) }
      : {}),
  };
};

const toEmpresaRequestBody = (datos = {}) => {
  const payload = { ...datos };
  const hasLogoFile = payload.logo instanceof File;

  if (!hasLogoFile) {
    if (typeof payload.logo === 'string' || payload.logo === null) {
      delete payload.logo;
    }
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
    return {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
  }
  return undefined;
};

export const listarEmpresas = async () => {
  const response = await api.get('/empresas/');
  return {
    ...response.data,
    results: Array.isArray(response.data?.results)
      ? response.data.results.map(normalizeEmpresaResponse)
      : response.data?.results,
  };
};

export const listarEmpresasAdmin = async () => {
  const response = await api.get('/empresas/admin/');
  return response.data;
};

export const crearEmpresaAdmin = async (payload) => {
  const response = await api.post('/empresas/admin/', payload);
  return normalizeEmpresaResponse(response.data);
};

export const actualizarEmpresaAdmin = async (empresaId, payload) => {
  const response = await api.patch(`/empresas/admin/${empresaId}/`, payload);
  return normalizeEmpresaResponse(response.data);
};

export const obtenerCredencialesFactusEmpresa = async (
  empresaId,
  environment = 'SANDBOX',
) => {
  const response = await api.get(
    `/empresas/${empresaId}/facturacion/credenciales/`,
    { params: { environment } },
  );
  return response.data;
};

export const guardarCredencialesFactusEmpresa = async (
  empresaId,
  payload,
) => {
  const method = payload?.id ? 'patch' : 'post';
  const response = await api[method](
    `/empresas/${empresaId}/facturacion/credenciales/`,
    payload,
  );
  return response.data;
};

export const validarConexionFactusEmpresa = async (empresaId, environment) => {
  const response = await api.post(
    `/empresas/${empresaId}/facturacion/validar-conexion/`,
    { environment },
  );
  return response.data;
};

export const sincronizarRangosFactusEmpresa = async (empresaId, environment) => {
  const response = await api.post(
    `/empresas/${empresaId}/facturacion/sincronizar-rangos/`,
    { environment },
  );
  return response.data;
};

export const listarRangosFactusEmpresa = async (empresaId) => {
  const response = await api.get(`/empresas/${empresaId}/facturacion/rangos/`);
  return response.data;
};

export const obtenerEmpresa = async (empresaId) => {
  const response = await api.get(`/empresas/${empresaId}/`);
  return normalizeEmpresaResponse(response.data);
};

export const seleccionarEmpresa = async (empresaId) => {
  const response = await api.post('/empresas/seleccionar/', {
    empresa_id: empresaId,
  });
  return normalizeEmpresaResponse(response.data);
};

export const actualizarEmpresa = async (empresaId, payload) => {
  const body = toEmpresaRequestBody(payload);
  const response = await api.patch(
    `/empresas/${empresaId}/`,
    body,
    requestConfigForBody(body),
  );
  return normalizeEmpresaResponse(response.data);
};

export const obtenerConfiguracionEmpresa = async (empresaId) => {
  const response = await api.get(`/empresas/${empresaId}/configuracion/`);
  return response.data;
};

export const actualizarConfiguracionEmpresa = async (empresaId, payload) => {
  const response = await api.patch(
    `/empresas/${empresaId}/configuracion/`,
    payload,
  );
  return response.data;
};

export const listarUsuariosEmpresa = async (empresaId) => {
  const response = await api.get(`/empresas/${empresaId}/usuarios/`);
  return response.data;
};

export const crearUsuarioEmpresa = async (empresaId, payload) => {
  const response = await api.post(`/empresas/${empresaId}/usuarios/`, payload);
  return response.data;
};

export const actualizarUsuarioEmpresa = async (
  empresaId,
  membresiaId,
  payload,
) => {
  const response = await api.patch(
    `/empresas/${empresaId}/usuarios/${membresiaId}/`,
    payload,
  );
  return response.data;
};

export default {
  listarEmpresas,
  listarEmpresasAdmin,
  crearEmpresaAdmin,
  actualizarEmpresaAdmin,
  obtenerCredencialesFactusEmpresa,
  guardarCredencialesFactusEmpresa,
  validarConexionFactusEmpresa,
  sincronizarRangosFactusEmpresa,
  listarRangosFactusEmpresa,
  obtenerEmpresa,
  seleccionarEmpresa,
  actualizarEmpresa,
  obtenerConfiguracionEmpresa,
  actualizarConfiguracionEmpresa,
  listarUsuariosEmpresa,
  crearUsuarioEmpresa,
  actualizarUsuarioEmpresa,
};
