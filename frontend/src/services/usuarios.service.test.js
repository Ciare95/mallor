import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('./api', () => ({
  default: api,
}));

describe('usuarios.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista usuarios con filtros', async () => {
    api.get.mockResolvedValueOnce({ data: { results: [] } });
    const { listarUsuarios } = await import('./usuarios.service');

    await listarUsuarios({ role: 'ADMIN', page: 2 });

    expect(api.get).toHaveBeenCalledWith('/usuarios/', {
      params: { role: 'ADMIN', page: 2 },
    });
  });

  it('actualiza un usuario con PUT', async () => {
    api.put.mockResolvedValueOnce({ data: { id: 4 } });
    const { actualizarUsuario } = await import('./usuarios.service');

    const result = await actualizarUsuario(4, { first_name: 'Ana' });

    expect(api.put).toHaveBeenCalledWith('/usuarios/4/', {
      first_name: 'Ana',
    });
    expect(result).toEqual({ id: 4 });
  });

  it('cambia la contrasena por endpoint dedicado', async () => {
    api.post.mockResolvedValueOnce({ data: { message: 'ok' } });
    const { cambiarPassword } = await import('./usuarios.service');

    await cambiarPassword(6, 'OldSecret123', 'NewSecret123');

    expect(api.post).toHaveBeenCalledWith('/usuarios/6/cambiar_password/', {
      old_password: 'OldSecret123',
      new_password: 'NewSecret123',
    });
  });
});
