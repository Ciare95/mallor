import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../tests/test-utils';
import ProductoForm from './ProductoForm';

const serviceMocks = vi.hoisted(() => ({
  listarCategorias: vi.fn(),
}));

vi.mock('../../services/inventario.service', () => ({
  listarCategorias: serviceMocks.listarCategorias,
}));

describe('ProductoForm', () => {
  beforeEach(() => {
    serviceMocks.listarCategorias.mockResolvedValue({ results: [] });
  });

  it('limpia los valores default y mantiene enteros en existencias, stock minimo e IVA al crear', () => {
    renderWithProviders(
      <ProductoForm
        producto={null}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isLoading={false}
        error={null}
      />,
    );

    const existenciasInput = screen.getByLabelText(/existencias/i);
    const stockMinimoInput = screen.getByLabelText(/stock minimo/i);
    const ivaInput = screen.getByLabelText(/iva %/i);

    expect(existenciasInput).toHaveValue(0);
    expect(stockMinimoInput).toHaveValue(10);
    expect(ivaInput).toHaveValue(0);

    fireEvent.focus(existenciasInput);
    fireEvent.focus(stockMinimoInput);
    fireEvent.focus(ivaInput);

    expect(existenciasInput).toHaveValue(null);
    expect(stockMinimoInput).toHaveValue(null);
    expect(ivaInput).toHaveValue(null);

    fireEvent.change(existenciasInput, { target: { value: '12.5' } });
    fireEvent.change(stockMinimoInput, { target: { value: '7.9' } });
    fireEvent.change(ivaInput, { target: { value: '19.8' } });

    expect(existenciasInput).toHaveValue(12);
    expect(stockMinimoInput).toHaveValue(7);
    expect(ivaInput).toHaveValue(19);
  });
});
