import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from './HomePage';
import { renderWithProviders } from '../tests/test-utils';
import {
  obtenerDashboardEstadisticas,
  obtenerEstadisticasVentasInforme,
} from '../services/informes.service';

vi.mock('../services/informes.service', () => ({
  obtenerDashboardEstadisticas: vi.fn(),
  obtenerEstadisticasVentasInforme: vi.fn(),
}));

describe('HomePage', () => {
  it('muestra accesos principales y el informe basico del mes actual', async () => {
    obtenerDashboardEstadisticas.mockResolvedValueOnce({
      ventas: {
        resumen: {
          total_ventas: 540000,
          cantidad_ventas: 18,
          ticket_promedio: 30000,
        },
      },
    });

    obtenerEstadisticasVentasInforme.mockResolvedValueOnce({
      serie_diaria: {
        series: [
          { fecha: '2026-05-01', total_ventas: 25000 },
          { fecha: '2026-05-02', total_ventas: 48000 },
          { fecha: '2026-05-03', total_ventas: 32000 },
        ],
      },
    });

    obtenerEstadisticasVentasInforme.mockResolvedValueOnce({
      serie_diaria: {
        series: [
          { fecha: '2025-05-01', total_ventas: 21000 },
          { fecha: '2025-05-02', total_ventas: 30000 },
          { fecha: '2025-05-03', total_ventas: 28000 },
        ],
      },
    });

    renderWithProviders(<HomePage />);

    expect(
      screen.queryByText(/ventas, inventario y cartera en una interfaz/i),
    ).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: /ventas pos/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /informes dashboard y reportes del negocio/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /inventario/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /ia asistente y consultas operativas/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver informes/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Informe basico')).toBeInTheDocument();
      expect(screen.getByText('Ventas por dia')).toBeInTheDocument();
      expect(
        screen.getByRole('img', { name: /grafico de lineas de ventas por dia/i }),
      ).toBeInTheDocument();
      expect(screen.getAllByText(/mes actual/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/mismo mes 2025/i)).toBeInTheDocument();
      expect(
        screen.getByText((content) => content.replace(/\s/g, '').includes('$540.000')),
      ).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
      expect(
        screen.getAllByText((content) => content.replace(/\s/g, '').includes('$30.000'))
          .length,
      ).toBeGreaterThan(0);
    });
  });
});
