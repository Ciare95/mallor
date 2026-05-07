import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = {
  post: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock('./api', () => ({
  default: api,
}));

describe('ia.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('envia consulta con sesion_id sin exponer estado de otro modulo', async () => {
    api.post.mockResolvedValueOnce({ data: { respuesta: 'ok' } });
    const { enviarConsultaIA } = await import('./ia.service');

    const result = await enviarConsultaIA({
      consulta: 'ventas de hoy',
      sesionId: 'sesion-1',
    });

    expect(api.post).toHaveBeenCalledWith('/ia/chat/', {
      consulta: 'ventas de hoy',
      sesion_id: 'sesion-1',
    });
    expect(result).toEqual({ respuesta: 'ok' });
  });

  it('consulta historial filtrado por sesion', async () => {
    api.get.mockResolvedValueOnce({ data: { results: [] } });
    const { listarHistorialIA } = await import('./ia.service');

    await listarHistorialIA({ sesionId: 'sesion-1', page: 2 });

    expect(api.get).toHaveBeenCalledWith('/ia/historial/', {
      params: {
        sesion_id: 'sesion-1',
        page: 2,
      },
    });
  });

  it('envia feedback con comentario opcional', async () => {
    api.post.mockResolvedValueOnce({ data: { feedback: 'UTIL' } });
    const { enviarFeedbackIA } = await import('./ia.service');

    await enviarFeedbackIA({
      mensajeId: 4,
      feedback: 'UTIL',
      comentario: 'claro',
    });

    expect(api.post).toHaveBeenCalledWith('/ia/feedback/', {
      mensaje_id: 4,
      feedback: 'UTIL',
      comentario: 'claro',
    });
  });
});
