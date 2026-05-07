import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IAPage from './IAPage';
import {
  enviarConsultaIA,
  enviarFeedbackIA,
  limpiarHistorialIA,
  listarHistorialIA,
  obtenerSugerenciasIA,
} from '../../services/ia.service';
import { useAppStore } from '../../store/useStore';
import { renderWithProviders } from '../../tests/test-utils';

vi.mock('../../services/ia.service', () => ({
  enviarConsultaIA: vi.fn(),
  enviarFeedbackIA: vi.fn(),
  limpiarHistorialIA: vi.fn(),
  listarHistorialIA: vi.fn(),
  obtenerSugerenciasIA: vi.fn(),
}));

const resetStore = () => {
  useAppStore.setState({
    user: null,
    token: null,
    sidebarOpen: true,
    loading: false,
    empresaActivaId: '1',
    empresaActiva: {
      id: 1,
      razon_social: 'Empresa A',
      rol_usuario: 'ADMIN',
    },
    iaSesionActivaId: null,
    usuarioActivo: null,
  });
};

describe('IAPage', () => {
  beforeEach(() => {
    resetStore();
    obtenerSugerenciasIA.mockResolvedValue({
      results: [
        {
          tool: 'resumen_ventas',
          label: 'Ventas de hoy',
          consulta: 'ventas de hoy',
        },
      ],
    });
    listarHistorialIA.mockResolvedValue({ results: [] });
    enviarConsultaIA.mockResolvedValue({
      sesion_id: '00000000-0000-4000-8000-000000000000',
      respuesta: 'Sin ventas registradas.',
    });
    enviarFeedbackIA.mockResolvedValue({ feedback: 'UTIL' });
    limpiarHistorialIA.mockResolvedValue({ deleted: 0 });
  });

  it('carga sugerencias dentro de la empresa activa', async () => {
    renderWithProviders(<IAPage />, { router: false });

    expect(await screen.findByRole('button', { name: /ventas de hoy/i }))
      .toBeInTheDocument();
    expect(obtenerSugerenciasIA).toHaveBeenCalledTimes(1);
  });

  it('envia consultas con sesion IA activa', async () => {
    const user = userEvent.setup();
    renderWithProviders(<IAPage />, { router: false });

    const input = screen.getByPlaceholderText(
      /pregunta por ventas, inventario, cartera/i,
    );
    await user.type(input, 'ventas de hoy');
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => {
      expect(enviarConsultaIA.mock.calls[0][0]).toEqual({
        consulta: 'ventas de hoy',
        sesionId: expect.any(String),
      });
    });
  });

  it('muestra errores controlados cuando la IA falla', async () => {
    const user = userEvent.setup();
    enviarConsultaIA.mockRejectedValueOnce({
      response: { data: { error: 'Servicio IA no disponible' } },
    });

    renderWithProviders(<IAPage />, { router: false });

    await user.type(
      screen.getByPlaceholderText(/pregunta por ventas, inventario, cartera/i),
      'ventas de hoy',
    );
    await user.click(screen.getByRole('button', { name: /enviar/i }));

    expect(
      await screen.findByText(/servicio ia no disponible/i),
    ).toBeInTheDocument();
  });

  it('envia feedback sobre mensajes persistidos y limpia la sesion', async () => {
    const user = userEvent.setup();
    listarHistorialIA.mockImplementation(({ sesionId } = {}) =>
      Promise.resolve({
        results: sesionId
          ? [
              {
                id: 11,
                sesion_id: sesionId,
                consulta: 'ventas hoy',
                respuesta: 'Sin ventas',
                herramienta_usada: 'resumen_ventas',
                tiempo_respuesta: 0.4,
                feedback: null,
                created_at: '2026-05-07T10:00:00Z',
              },
            ]
          : [
              {
                id: 11,
                sesion_id: '00000000-0000-4000-8000-000000000000',
                consulta: 'ventas hoy',
                respuesta: 'Sin ventas',
                created_at: '2026-05-07T10:00:00Z',
              },
            ],
      }),
    );

    renderWithProviders(<IAPage />, { router: false });

    await user.click(await screen.findByRole('button', { name: /^util$/i }));
    await waitFor(() => {
      expect(enviarFeedbackIA).toHaveBeenCalledWith(
        {
          mensajeId: 11,
          feedback: 'UTIL',
        },
        expect.any(Object),
      );
    });

    await user.click(screen.getByRole('button', { name: /limpiar sesion/i }));
    await waitFor(() => {
      expect(limpiarHistorialIA).toHaveBeenCalledWith(
        { sesionId: expect.any(String) },
        expect.any(Object),
      );
    });
  });
});
