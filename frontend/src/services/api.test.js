import { beforeEach, describe, expect, it, vi } from 'vitest';

let requestInterceptor;
let responseErrorInterceptor;
let useAppStore;
const post = vi.fn();
const axiosInstance = vi.fn();
axiosInstance.post = post;
axiosInstance.interceptors = {
  request: {
    use: vi.fn((interceptor) => {
      requestInterceptor = interceptor;
    }),
  },
  response: {
    use: vi.fn((success, error) => {
      responseErrorInterceptor = error;
    }),
  },
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => axiosInstance),
  },
}));

describe('api service', () => {
  beforeEach(async () => {
    requestInterceptor = undefined;
    responseErrorInterceptor = undefined;
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    post.mockReset();
    axiosInstance.mockResolvedValue({ data: { ok: true } });
    await import('./api');
    useAppStore = (await import('../store/useStore')).useAppStore;
    useAppStore.setState({
      token: null,
      user: null,
      empresaActivaId: null,
      empresaActiva: null,
    });
  });

  it('configura axios para DRF con cookies CSRF', async () => {
    const axios = (await import('axios')).default;

    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://localhost:8000/api',
        withCredentials: true,
        xsrfCookieName: 'csrftoken',
        xsrfHeaderName: 'X-CSRFToken',
      }),
    );
  });

  it('inyecta Authorization Bearer y X-Empresa-Id', () => {
    useAppStore.getState().setToken('access-token');
    localStorage.setItem('mallor_empresa_activa_id', '7');

    const config = requestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer access-token');
    expect(config.headers['X-Empresa-Id']).toBe('7');
  });

  it('no envia Authorization al endpoint de refresh', () => {
    useAppStore.getState().setToken('expired-token');

    const config = requestInterceptor({
      url: '/auth/refresh/',
      headers: {
        Authorization: 'Bearer expired-token',
      },
    });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('refresca access token y reintenta una vez ante 401', async () => {
    post.mockResolvedValueOnce({
      data: {
        access: 'new-token',
        user: { username: 'admin' },
        empresa_activa: 1,
        empresas: [{ id: 1, razon_social: 'Empresa A' }],
      },
    });

    await expect(
      responseErrorInterceptor({
        response: { status: 401 },
        config: { url: '/ventas/', headers: {} },
      }),
    ).resolves.toEqual(expect.anything());

    expect(post).toHaveBeenCalledWith('/auth/refresh/');
    expect(useAppStore.getState().token).toBe('new-token');
  });

  it('comparte un solo refresh cuando varios requests fallan con 401', async () => {
    let resolveRefresh;
    post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve;
        }),
    );

    const firstRequest = responseErrorInterceptor({
      response: { status: 401 },
      config: { url: '/informes/dashboard/', headers: {} },
    });
    const secondRequest = responseErrorInterceptor({
      response: { status: 401 },
      config: { url: '/informes/ventas/', headers: {} },
    });

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/auth/refresh/');

    resolveRefresh({
      data: {
        access: 'shared-token',
        user: { username: 'admin' },
        empresa_activa: 1,
        empresas: [{ id: 1, razon_social: 'Empresa A' }],
      },
    });

    await Promise.all([firstRequest, secondRequest]);

    expect(useAppStore.getState().token).toBe('shared-token');
    expect(post).toHaveBeenCalledTimes(1);
  });
});
