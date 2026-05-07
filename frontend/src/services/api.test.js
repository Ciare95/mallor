import { beforeEach, describe, expect, it, vi } from 'vitest';

let requestInterceptor;
const axiosInstance = {
  interceptors: {
    request: {
      use: vi.fn((interceptor) => {
        requestInterceptor = interceptor;
      }),
    },
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
    vi.resetModules();
    localStorage.clear();
    await import('./api');
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

  it('inyecta Authorization Basic y X-Empresa-Id desde localStorage', () => {
    localStorage.setItem('token', 'Basic admin:secret');
    localStorage.setItem('mallor_empresa_activa_id', '7');

    const config = requestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBe('Basic admin:secret');
    expect(config.headers['X-Empresa-Id']).toBe('7');
  });

  it('normaliza tokens dev sin prefijo a Basic', () => {
    localStorage.setItem('token', 'admin:secret');

    const config = requestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBe('Basic admin:secret');
  });
});
