import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';
import { login } from '../services/auth.service';
import { useAppStore } from '../store/useStore';
import { renderWithProviders } from '../tests/test-utils';

vi.mock('../services/auth.service', () => ({
  login: vi.fn(),
}));

const mockedNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      user: null,
      token: null,
      empresaActiva: null,
      empresaActivaId: null,
      authReady: false,
    });
  });

  it('envia remember_me y guarda access en memoria', async () => {
    const user = userEvent.setup();
    login.mockResolvedValueOnce({
      access: 'access-token',
      user: { username: 'admin' },
      empresa_activa: 1,
      empresas: [
        {
          id: 1,
          razon_social: 'Empresa A',
          rol_usuario: 'ADMIN',
        },
      ],
    });

    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.type(screen.getByLabelText(/usuario/i), 'admin');
    await user.type(
      screen.getByLabelText(/contrasena/i, { selector: 'input' }),
      'Secret123',
    );
    await user.click(screen.getByRole('checkbox', { name: /recordarme/i }));
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'admin',
          password: 'Secret123',
          rememberMe: true,
        }),
      );
      expect(useAppStore.getState().token).toBe('access-token');
      expect(localStorage.getItem('token')).toBeNull();
      expect(mockedNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('redirige a ventas cuando entra un EMPLEADO', async () => {
    const user = userEvent.setup();
    login.mockResolvedValueOnce({
      access: 'access-token',
      user: { username: 'empleado' },
      empresa_activa: 1,
      empresas: [
        {
          id: 1,
          razon_social: 'Empresa A',
          rol_usuario: 'EMPLEADO',
        },
      ],
    });

    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.type(screen.getByLabelText(/usuario/i), 'empleado');
    await user.type(
      screen.getByLabelText(/contrasena/i, { selector: 'input' }),
      'Secret123',
    );
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/ventas', { replace: true });
    });
  });

  it('permite mostrar y ocultar la contrasena', async () => {
    const user = userEvent.setup();

    renderWithProviders(<LoginPage />, { route: '/login' });

    const passwordInput = screen.getByLabelText(/contrasena/i, {
      selector: 'input',
    });
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /mostrar contrasena/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /ocultar contrasena/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
