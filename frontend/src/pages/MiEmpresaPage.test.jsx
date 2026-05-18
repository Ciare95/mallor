import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../tests/test-utils';
import MiEmpresaPage from './MiEmpresaPage';
import MiEmpresaConfiguracionPage from './MiEmpresaConfiguracionPage';
import { useAppStore } from '../store/useStore';

const serviceMocks = vi.hoisted(() => ({
  actualizarEmpresa: vi.fn(),
  actualizarConfiguracionEmpresa: vi.fn(),
}));

vi.mock('../services/empresas.service', () => ({
  actualizarEmpresa: serviceMocks.actualizarEmpresa,
  actualizarConfiguracionEmpresa: serviceMocks.actualizarConfiguracionEmpresa,
}));

describe('MiEmpresa modules', () => {
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
          ticket_paper_width: '80',
          ticket_show_logo: true,
          ticket_copies: 1,
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
        ticket_paper_width: '80',
        ticket_show_logo: true,
        ticket_copies: 1,
      },
      temaActual: 'LIGHT',
    });
  });

  it('renderiza el modulo de informacion y guarda datos de empresa', async () => {
    const user = userEvent.setup();
    serviceMocks.actualizarEmpresa.mockResolvedValue({
      nombre_comercial: 'Empresa Demo Editada',
      telefono: '3009990000',
    });

    renderWithProviders(<MiEmpresaPage />, { route: '/mi-empresa' });

    expect(screen.getByText(/informacion de empresa/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /configuracion operativa/i }),
    ).toBeInTheDocument();

    await user.clear(screen.getByRole('textbox', { name: /nombre comercial/i }));
    await user.type(
      screen.getByRole('textbox', { name: /nombre comercial/i }),
      'Empresa Demo Editada',
    );
    await user.clear(screen.getByRole('textbox', { name: /telefono/i }));
    await user.type(
      screen.getByRole('textbox', { name: /telefono/i }),
      '3009990000',
    );
    await user.click(screen.getByRole('button', { name: /guardar empresa/i }));

    await waitFor(() =>
      expect(serviceMocks.actualizarEmpresa).toHaveBeenCalledWith(
        12,
        expect.objectContaining({
          nombre_comercial: 'Empresa Demo Editada',
          telefono: '3009990000',
        }),
      ),
    );
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
      ticket_paper_width: '58',
      ticket_show_logo: false,
      ticket_copies: 2,
    });

    renderWithProviders(<MiEmpresaConfiguracionPage />, {
      route: '/mi-empresa/configuracion',
    });

    expect(screen.getByText(/configuracion operativa/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /modo oscuro/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    await user.selectOptions(
      screen.getByRole('combobox', { name: /papel por defecto/i }),
      '58',
    );
    const copiesInput = screen.getByRole('spinbutton', {
      name: /copias por defecto/i,
    });
    fireEvent.change(copiesInput, { target: { value: '2' } });
    await user.click(
      screen.getByRole('button', { name: /mostrar logo en tirilla/i }),
    );

    const shortcutInput = screen.getByDisplayValue('Ctrl+V');
    shortcutInput.focus();
    await user.keyboard('{Control>}{Shift>}r{/Shift}{/Control}');
    await user.click(
      screen.getByRole('button', { name: /guardar configuracion/i }),
    );

    await waitFor(() =>
      expect(serviceMocks.actualizarConfiguracionEmpresa).toHaveBeenCalledWith(
        12,
        expect.objectContaining({
          tema: 'DARK',
          ticket_paper_width: '58',
          ticket_show_logo: false,
          ticket_copies: 2,
          atajos_ventas: expect.objectContaining({
            registrar_venta: 'Ctrl+Shift+R',
          }),
        }),
      ),
    );
  });
});
