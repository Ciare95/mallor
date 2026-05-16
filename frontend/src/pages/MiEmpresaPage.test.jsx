import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../tests/test-utils';
import MiEmpresaPage from './MiEmpresaPage';
import { useAppStore } from '../store/useStore';

const serviceMocks = vi.hoisted(() => ({
  actualizarEmpresa: vi.fn(),
  actualizarConfiguracionEmpresa: vi.fn(),
}));

vi.mock('../services/empresas.service', () => ({
  actualizarEmpresa: serviceMocks.actualizarEmpresa,
  actualizarConfiguracionEmpresa: serviceMocks.actualizarConfiguracionEmpresa,
}));

describe('MiEmpresaPage', () => {
  beforeEach(() => {
    serviceMocks.actualizarEmpresa.mockReset();
    serviceMocks.actualizarConfiguracionEmpresa.mockReset();
    useAppStore.setState({
      user: { is_superuser: false },
      empresaActiva: {
        id: 12,
        rol_usuario: 'ADMIN',
        nit: '900123123',
        razon_social: 'Empresa Demo SAS',
        nombre_comercial: 'Empresa Demo',
        email: 'demo@mallor.test',
        telefono: '3001234567',
        direccion: 'Calle 10',
        municipio_codigo: '11001',
        ambiente_facturacion: 'SANDBOX',
        configuracion_operativa: {
          tema: 'LIGHT',
          permitir_stock_negativo_ventas: false,
          atajos_ventas_activos: true,
          atajos_ventas: {
            registrar_venta: 'Ctrl+V',
            configurar_cobro: 'Ctrl+C',
            nueva_precuenta: 'Ctrl+N',
            quitar_ultimo_producto: 'Delete',
          },
        },
      },
      empresaActivaId: '12',
      configuracionOperativa: {
        tema: 'LIGHT',
        permitir_stock_negativo_ventas: false,
        atajos_ventas_activos: true,
        atajos_ventas: {
          registrar_venta: 'Ctrl+V',
          configurar_cobro: 'Ctrl+C',
          nueva_precuenta: 'Ctrl+N',
          quitar_ultimo_producto: 'Delete',
        },
      },
      temaActual: 'LIGHT',
    });
  });

  it('renderiza la configuracion operativa y guarda preferencias', async () => {
    const user = userEvent.setup();
    serviceMocks.actualizarConfiguracionEmpresa.mockResolvedValue({
      tema: 'DARK',
      permitir_stock_negativo_ventas: true,
      atajos_ventas_activos: true,
      atajos_ventas: {
        registrar_venta: 'Ctrl+Shift+R',
        configurar_cobro: 'Ctrl+C',
        nueva_precuenta: 'Ctrl+N',
        quitar_ultimo_producto: 'Delete',
      },
    });

    renderWithProviders(<MiEmpresaPage />, { router: false });

    await user.click(screen.getByRole('button', { name: /Modo oscuro/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    const shortcutInput = screen.getByDisplayValue('Ctrl+V');
    shortcutInput.focus();
    await user.keyboard('{Control>}{Shift>}r{/Shift}{/Control}');
    await user.click(
      screen.getByRole('button', { name: /Guardar configuracion/i }),
    );

    await waitFor(() =>
      expect(serviceMocks.actualizarConfiguracionEmpresa).toHaveBeenCalledWith(
        12,
        expect.objectContaining({
          tema: 'DARK',
          permitir_stock_negativo_ventas: false,
          atajos_ventas: expect.objectContaining({
            registrar_venta: 'Ctrl+Shift+R',
          }),
        }),
      ),
    );
  });

  it('mantiene activo el toggle cuando el tema local es oscuro', () => {
    useAppStore.setState({
      temaActual: 'DARK',
      configuracionOperativa: {
        tema: 'DARK',
        permitir_stock_negativo_ventas: false,
        atajos_ventas_activos: true,
        atajos_ventas: {
          registrar_venta: 'Ctrl+V',
          configurar_cobro: 'Ctrl+C',
          nueva_precuenta: 'Ctrl+N',
          quitar_ultimo_producto: 'Delete',
        },
      },
    });
    document.documentElement.setAttribute('data-theme', 'dark');

    renderWithProviders(<MiEmpresaPage />, { router: false });

    expect(screen.getByRole('button', { name: /Modo oscuro/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('mantiene el toggle de stock negativo al volver a renderizar la pagina', async () => {
    const user = userEvent.setup();
    serviceMocks.actualizarConfiguracionEmpresa.mockResolvedValue({
      tema: 'LIGHT',
      permitir_stock_negativo_ventas: true,
      atajos_ventas_activos: true,
      atajos_ventas: {
        registrar_venta: 'Ctrl+V',
        configurar_cobro: 'Ctrl+C',
        nueva_precuenta: 'Ctrl+N',
        quitar_ultimo_producto: 'Delete',
      },
    });
    const { unmount } = renderWithProviders(<MiEmpresaPage />, {
      router: false,
    });

    await user.click(
      screen.getByRole('button', { name: /Stock negativo en ventas/i }),
    );

    expect(
      useAppStore.getState().configuracionOperativa
        .permitir_stock_negativo_ventas,
    ).toBe(true);
    await waitFor(() =>
      expect(serviceMocks.actualizarConfiguracionEmpresa).toHaveBeenCalledWith(
        12,
        expect.objectContaining({
          permitir_stock_negativo_ventas: true,
        }),
      ),
    );

    unmount();
    renderWithProviders(<MiEmpresaPage />, { router: false });

    expect(
      screen.getByRole('button', { name: /Stock negativo en ventas/i }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
