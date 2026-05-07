import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
};

vi.mock('./api', () => ({
  default: api,
}));

describe('empresas.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista empresas y retorna el payload del backend', async () => {
    api.get.mockResolvedValueOnce({ data: { results: [{ id: 1 }] } });
    const { listarEmpresas } = await import('./empresas.service');

    const result = await listarEmpresas();

    expect(api.get).toHaveBeenCalledWith('/empresas/');
    expect(result).toEqual({ results: [{ id: 1 }] });
  });

  it('selecciona empresa usando el endpoint seguro del backend', async () => {
    api.post.mockResolvedValueOnce({ data: { id: 7 } });
    const { seleccionarEmpresa } = await import('./empresas.service');

    await seleccionarEmpresa(7);

    expect(api.post).toHaveBeenCalledWith('/empresas/seleccionar/', {
      empresa_id: 7,
    });
  });

  it('actualiza membresias por empresa', async () => {
    api.patch.mockResolvedValueOnce({ data: { ok: true } });
    const { actualizarUsuarioEmpresa } = await import('./empresas.service');

    const result = await actualizarUsuarioEmpresa(3, 9, { rol: 'ADMIN' });

    expect(api.patch).toHaveBeenCalledWith(
      '/empresas/3/usuarios/9/',
      { rol: 'ADMIN' },
    );
    expect(result).toEqual({ ok: true });
  });
});
