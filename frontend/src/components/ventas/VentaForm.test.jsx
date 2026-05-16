import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../tests/test-utils';
import VentaForm from './VentaForm';

const serviceMocks = vi.hoisted(() => ({
  buscarProductos: vi.fn(),
  buscarClientesVenta: vi.fn(),
  crearClienteTemporal: vi.fn(),
}));

vi.mock('../../services/inventario.service', () => ({
  buscarProductos: serviceMocks.buscarProductos,
}));

vi.mock('../../services/ventas.service', () => ({
  buscarClientesVenta: serviceMocks.buscarClientesVenta,
  crearClienteTemporal: serviceMocks.crearClienteTemporal,
}));

const baseProps = {
  draft: {
    ventaId: null,
    clienteSeleccionado: null,
    items: [],
    descuentoGlobal: 0,
    metodoPago: 'EFECTIVO',
    estado: 'TERMINADA',
    facturaElectronica: false,
    imprimirTicket: false,
    efectivoRecibido: '',
    abonoInicial: '',
    metodoAbonoInicial: 'EFECTIVO',
    referenciaAbonoInicial: '',
    observaciones: '',
    ticketPaperWidth: '80',
    ticketShowLogo: true,
    ticketCopies: 1,
  },
  localClients: [],
  isLoading: false,
  error: null,
  onChangeField: vi.fn(),
  onAddProduct: vi.fn(),
  onUpdateItem: vi.fn(),
  onRemoveItem: vi.fn(),
  onSelectClient: vi.fn(),
  onCreateQuickClient: vi.fn(),
  onReset: vi.fn(),
  onSubmit: vi.fn(),
};

describe('VentaForm keyboard search', () => {
  beforeEach(() => {
    serviceMocks.buscarClientesVenta.mockResolvedValue([]);
    serviceMocks.crearClienteTemporal.mockResolvedValue({});
    Object.values(baseProps).forEach((value) => {
      if (typeof value?.mockReset === 'function') {
        value.mockReset();
      }
    });
  });

  it('permite navegar resultados con flechas y seleccionar con Enter', async () => {
    serviceMocks.buscarProductos.mockResolvedValue([
      {
        id: 1,
        nombre: 'Cafe molido',
        codigo_interno: 'CAF-01',
        precio_venta: 12000,
        iva: 0,
      },
      {
        id: 2,
        nombre: 'Cafe premium',
        codigo_interno: 'CAF-02',
        precio_venta: 18000,
        iva: 19,
      },
    ]);

    renderWithProviders(<VentaForm {...baseProps} />);

    const input = screen.getByRole('combobox', { name: /buscar producto/i });
    fireEvent.change(input, { target: { value: 'cafe' } });

    await waitFor(() =>
      expect(screen.getByRole('option', { name: /Cafe molido/i })).toBeInTheDocument(),
    );

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(baseProps.onAddProduct).toHaveBeenCalledWith(
      expect.objectContaining({ id: 2, nombre: 'Cafe premium' }),
    );
  });

  it('agrega el unico resultado visible con Enter sin usar mouse', async () => {
    serviceMocks.buscarProductos.mockResolvedValue([
      {
        id: 9,
        nombre: 'Pan tajado',
        codigo_interno: 'PAN-01',
        precio_venta: 6500,
        iva: 0,
      },
    ]);

    renderWithProviders(<VentaForm {...baseProps} />);

    const input = screen.getByRole('combobox', { name: /buscar producto/i });
    fireEvent.change(input, { target: { value: 'pan' } });

    await waitFor(() =>
      expect(screen.getByRole('option', { name: /Pan tajado/i })).toBeInTheDocument(),
    );

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(baseProps.onAddProduct).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9, nombre: 'Pan tajado' }),
    );
  });
});
