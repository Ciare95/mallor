import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useVentasKeyboardShortcuts } from './useVentasKeyboardShortcuts';

function Harness(props) {
  useVentasKeyboardShortcuts(props);
  return (
    <div>
      <button type="button">surface</button>
      <input aria-label="editable" />
    </div>
  );
}

describe('useVentasKeyboardShortcuts', () => {
  const handlers = {
    onRegistrarVenta: vi.fn(),
    onConfigurarCobro: vi.fn(),
    onNuevaPrecuenta: vi.fn(),
    onQuitarUltimoProducto: vi.fn(),
  };

  beforeEach(() => {
    Object.values(handlers).forEach((handler) => handler.mockReset());
  });

  it('dispara los atajos configurados fuera de campos editables', () => {
    render(
      <Harness
        enabled
        shortcuts={{
          registrar_venta: 'Ctrl+V',
          configurar_cobro: 'Ctrl+C',
          nueva_precuenta: 'Ctrl+N',
          quitar_ultimo_producto: 'Delete',
        }}
        {...handlers}
      />,
    );

    screen.getByRole('button', { name: 'surface' }).focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', ctrlKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));

    expect(handlers.onRegistrarVenta).toHaveBeenCalledTimes(1);
    expect(handlers.onConfigurarCobro).toHaveBeenCalledTimes(1);
    expect(handlers.onNuevaPrecuenta).toHaveBeenCalledTimes(1);
    expect(handlers.onQuitarUltimoProducto).toHaveBeenCalledTimes(1);
  });

  it('no intercepta Ctrl+C ni Ctrl+V dentro de inputs editables', () => {
    render(
      <Harness
        enabled
        shortcuts={{
          registrar_venta: 'Ctrl+V',
          configurar_cobro: 'Ctrl+C',
          nueva_precuenta: 'Ctrl+N',
          quitar_ultimo_producto: 'Delete',
        }}
        {...handlers}
      />,
    );

    const input = screen.getByLabelText('editable');
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }));

    expect(handlers.onRegistrarVenta).not.toHaveBeenCalled();
    expect(handlers.onConfigurarCobro).not.toHaveBeenCalled();
  });
});
