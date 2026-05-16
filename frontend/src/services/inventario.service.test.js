import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  defaults: {
    baseURL: 'http://localhost:8000/api',
  },
};

vi.mock('./api', () => ({
  default: api,
}));

describe('inventario.service excel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('descarga la plantilla de productos como blob', async () => {
    api.get.mockResolvedValueOnce({ data: 'blob' });
    const { descargarPlantillaProductosExcel } = await import(
      './inventario.service'
    );

    await descargarPlantillaProductosExcel();

    expect(api.get).toHaveBeenCalledWith(
      '/inventario/productos/plantilla-excel/',
      { responseType: 'blob' }
    );
  });

  it('importa productos con multipart form data', async () => {
    api.post.mockResolvedValueOnce({
      data: { success: true, imported_count: 2 },
    });
    const { importarProductosExcel } = await import(
      './inventario.service'
    );

    const archivo = new File(['demo'], 'productos.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const result = await importarProductosExcel(archivo);

    expect(api.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = api.post.mock.calls[0];
    expect(url).toBe('/inventario/productos/importar-excel/');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('archivo')).toBe(archivo);
    expect(config).toEqual({
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    expect(result).toEqual({ success: true, imported_count: 2 });
  });
});
