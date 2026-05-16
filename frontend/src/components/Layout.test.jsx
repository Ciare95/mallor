import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Layout from './Layout';
import { listarEmpresas, seleccionarEmpresa } from '../services/empresas.service';
import { logout } from '../services/auth.service';
import { useAppStore } from '../store/useStore';
import { renderWithProviders } from '../tests/test-utils';

vi.mock('../services/empresas.service', () => ({
  listarEmpresas: vi.fn(),
  seleccionarEmpresa: vi.fn(),
}));

vi.mock('../services/auth.service', () => ({
  logout: vi.fn(),
}));

const resetStore = () => {
  useAppStore.setState({
    user: null,
    token: 'access-token',
    authReady: true,
    sidebarOpen: true,
    loading: false,
    empresaActiva: null,
    empresaActivaId: null,
    iaSesionActivaId: null,
    usuarioActivo: null,
  });
};

describe('Layout', () => {
  beforeEach(() => {
    resetStore();
    useAppStore.getState().setUser({
      username: 'empleado',
      is_staff: false,
      is_superuser: false,
    });
    listarEmpresas.mockResolvedValue({
      empresa_activa: 1,
      results: [
        {
          id: 1,
          razon_social: 'Empresa A',
          nombre_comercial: 'Empresa A',
          rol_usuario: 'EMPLEADO',
        },
      ],
    });
    seleccionarEmpresa.mockResolvedValue({
      id: 1,
      razon_social: 'Empresa A',
      rol_usuario: 'EMPLEADO',
    });
  });

  it('oculta modulos restringidos para EMPLEADO', async () => {
    renderWithProviders(<Layout />);

    expect(await screen.findAllByRole('link', { name: /ventas/i }))
      .not.toHaveLength(0);

    await waitFor(() => {
      expect(screen.queryAllByRole('link', { name: /inicio/i }))
        .toHaveLength(0);
      expect(screen.queryAllByRole('link', { name: /facturacion/i }))
        .toHaveLength(0);
      expect(screen.queryAllByRole('link', { name: /usuarios/i }))
        .toHaveLength(0);
      expect(screen.queryAllByRole('link', { name: /fabricante/i }))
        .toHaveLength(0);
      expect(screen.queryAllByRole('link', { name: /informes/i }))
        .toHaveLength(0);
      expect(screen.queryAllByRole('link', { name: /^ia$/i }))
        .toHaveLength(0);
    });
  });

  it('muestra administracion de empresa para rol ADMIN', async () => {
    listarEmpresas.mockResolvedValueOnce({
      empresa_activa: 1,
      results: [
        {
          id: 1,
          razon_social: 'Empresa A',
          nombre_comercial: 'Empresa A',
          rol_usuario: 'ADMIN',
        },
      ],
    });

    renderWithProviders(<Layout />);

    expect(await screen.findAllByRole('link', { name: /facturacion/i }))
      .not.toHaveLength(0);
    expect(screen.getAllByRole('link', { name: /usuarios/i }))
      .not.toHaveLength(0);
  });

  it('muestra modulo contadores y oculta administracion para CONTADOR', async () => {
    listarEmpresas.mockResolvedValueOnce({
      empresa_activa: 1,
      results: [
        {
          id: 1,
          razon_social: 'Empresa A',
          nombre_comercial: 'Empresa A',
          rol_usuario: 'CONTADOR',
        },
      ],
    });

    renderWithProviders(<Layout />);

    expect(await screen.findAllByRole('link', { name: /contadores/i }))
      .not.toHaveLength(0);
    expect(screen.queryAllByRole('link', { name: /facturacion/i }))
      .toHaveLength(0);
    expect(screen.queryAllByRole('link', { name: /usuarios/i }))
      .toHaveLength(0);
  });

  it('permite cambiar la empresa activa desde el selector', async () => {
    const user = userEvent.setup();

    listarEmpresas.mockResolvedValueOnce({
      empresa_activa: 1,
      results: [
        {
          id: 1,
          razon_social: 'Empresa A',
          nombre_comercial: 'Empresa A',
          rol_usuario: 'ADMIN',
        },
        {
          id: 2,
          razon_social: 'Empresa B',
          nombre_comercial: 'Empresa B',
          rol_usuario: 'ADMIN',
        },
      ],
    });
    seleccionarEmpresa.mockResolvedValueOnce({
      id: 2,
      razon_social: 'Empresa B',
      rol_usuario: 'ADMIN',
    });

    renderWithProviders(<Layout />);

    await screen.findByRole('option', { name: /empresa b/i });
    const selector = await screen.findByRole('combobox');
    await user.selectOptions(selector, '2');

    await waitFor(() => {
      expect(seleccionarEmpresa).toHaveBeenCalledWith(
        '2',
        expect.any(Object),
      );
    });
  });

  it('cierra sesion limpiando estado local sensible', async () => {
    const user = userEvent.setup();
    logout.mockResolvedValueOnce();

    renderWithProviders(<Layout />);

    await user.click(screen.getByRole('button', { name: /cerrar sesion/i }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
      expect(useAppStore.getState().token).toBeNull();
    });
  });
});
