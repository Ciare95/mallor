import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../tests/test-utils';
import VentaForm from './VentaForm';

const serviceMocks = vi.hoisted(() => ({
  buscarProductos: vi.fn(),
  buscarClientesVenta: vi.fn(),
  crearClientePosRapido: vi.fn(),
  autocompletarClientePos: vi.fn(),
}));

vi.mock('../../services/inventario.service', () => ({
  buscarProductos: serviceMocks.buscarProductos,
}));

vi.mock('../../services/ventas.service', () => ({
  buscarClientesVenta: serviceMocks.buscarClientesVenta,
  crearClientePosRapido: serviceMocks.crearClientePosRapido,
  autocompletarClientePos: serviceMocks.autocompletarClientePos,
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
    serviceMocks.crearClientePosRapido.mockResolvedValue({});
    serviceMocks.autocompletarClientePos.mockResolvedValue({ found: false });
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

  it('pide precio antes de agregar un producto especial', async () => {
    serviceMocks.buscarProductos.mockResolvedValue([
      {
        id: 11,
        nombre: 'Producto variable',
        codigo_interno: 'VAR-01',
        precio_venta: 0,
        iva: 0,
        es_producto_especial: true,
      },
    ]);

    renderWithProviders(<VentaForm {...baseProps} />);

    const input = screen.getByRole('combobox', { name: /buscar producto/i });
    fireEvent.change(input, { target: { value: 'variable' } });

    await waitFor(() =>
      expect(screen.getByRole('option', { name: /Producto variable/i })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('option', { name: /Producto variable/i }));
    fireEvent.change(screen.getByLabelText(/^precio$/i), {
      target: { value: '12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));

    expect(baseProps.onAddProduct).toHaveBeenCalledWith(
      expect.objectContaining({ id: 11, nombre: 'Producto variable' }),
      { precio_unitario: 12345 },
    );
  });

  it('bloquea edicion de precio para productos normales', () => {
    renderWithProviders(
      <VentaForm
        {...baseProps}
        draft={{
          ...baseProps.draft,
          items: [
            {
              id: 'line-normal',
              producto: {
                id: 5,
                nombre: 'Producto normal',
                codigo_interno: 'NOR-01',
                precio_venta: 7000,
                iva: 0,
              },
              cantidad: 1,
              precio_unitario: 7000,
              descuento: 0,
            },
          ],
        }}
      />,
    );

    expect(screen.getByLabelText(/precio fijo/i)).toBeDisabled();
  });

  it('crea un cliente real desde POS y lo selecciona', async () => {
    serviceMocks.crearClientePosRapido.mockResolvedValue({
      id: 77,
      nombre_completo: 'Cliente POS SAS',
      numero_documento: '900373913',
      persisted: true,
      esTemporal: false,
    });

    renderWithProviders(
      <VentaForm
        {...baseProps}
        draft={{
          ...baseProps.draft,
          facturaElectronica: true,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /crear cliente/i }));
    fireEvent.change(screen.getByLabelText(/tipo de documento/i), {
      target: { value: 'NIT' },
    });
    fireEvent.change(screen.getByLabelText(/numero de documento/i), {
      target: { value: '900373913' },
    });
    fireEvent.change(screen.getByLabelText(/razon social/i), {
      target: { value: 'Cliente POS SAS' },
    });
    fireEvent.change(screen.getByLabelText(/^telefono$/i), {
      target: { value: '3001234567' },
    });
    fireEvent.change(screen.getByLabelText(/^direccion$/i), {
      target: { value: 'Calle 1 # 2-3' },
    });
    fireEvent.change(screen.getByLabelText(/municipio dian/i), {
      target: { value: '11001' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: /crear y usar cliente/i }),
    );

    await waitFor(() =>
      expect(serviceMocks.crearClientePosRapido).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_documento: 'NIT',
          numero_documento: '900373913',
          razon_social: 'Cliente POS SAS',
          telefono: '3001234567',
          direccion: 'Calle 1 # 2-3',
          municipio_codigo: '11001',
        }),
      ),
    );

    expect(baseProps.onCreateQuickClient).toHaveBeenCalledWith(
      expect.objectContaining({ id: 77, persisted: true }),
    );
  });
});
