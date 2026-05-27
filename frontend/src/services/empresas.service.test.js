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

  it('lista empresas y retorna el payload del sistema', async () => {
    api.get.mockResolvedValueOnce({ data: { results: [{ id: 1 }] } });
    const { listarEmpresas } = await import('./empresas.service');

    const result = await listarEmpresas();

    expect(api.get).toHaveBeenCalledWith('/empresas/');
    expect(result).toEqual({ results: [{ id: 1 }] });
  });

  it('selecciona empresa usando el endpoint seguro del sistema', async () => {
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

  it('consulta la configuracion operativa de una empresa', async () => {
    api.get.mockResolvedValueOnce({ data: { tema: 'DARK' } });
    const { obtenerConfiguracionEmpresa } = await import('./empresas.service');

    const result = await obtenerConfiguracionEmpresa(8);

    expect(api.get).toHaveBeenCalledWith('/empresas/8/configuracion/');
    expect(result).toEqual({ tema: 'DARK' });
  });

  it('actualiza la configuracion operativa de una empresa', async () => {
    api.patch.mockResolvedValueOnce({ data: { tema: 'LIGHT' } });
    const { actualizarConfiguracionEmpresa } = await import(
      './empresas.service'
    );

    const result = await actualizarConfiguracionEmpresa(8, {
      tema: 'LIGHT',
    });

    expect(api.patch).toHaveBeenCalledWith(
      '/empresas/8/configuracion/',
      { tema: 'LIGHT' },
    );
    expect(result).toEqual({ tema: 'LIGHT' });
  });
});
