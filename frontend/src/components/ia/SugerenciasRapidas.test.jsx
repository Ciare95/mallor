import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SugerenciasRapidas from './SugerenciasRapidas';

describe('SugerenciasRapidas', () => {
  it('no renderiza cuando no hay sugerencias', () => {
    const { container } = render(<SugerenciasRapidas suggestions={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('ejecuta la consulta sugerida seleccionada', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <SugerenciasRapidas
        suggestions={[
          {
            tool: 'resumen_ventas',
            label: 'Ventas de hoy',
            consulta: 'ventas de hoy',
          },
        ]}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole('button', { name: /ventas de hoy/i }));

    expect(onSelect).toHaveBeenCalledWith('ventas de hoy');
  });
});
