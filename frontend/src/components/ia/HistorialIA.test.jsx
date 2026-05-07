import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HistorialIA from './HistorialIA';

describe('HistorialIA', () => {
  it('muestra estado vacio cuando no hay sesiones', () => {
    render(<HistorialIA sessions={[]} activeSessionId={null} />);

    expect(screen.getByText(/sin historial todavia/i)).toBeInTheDocument();
    expect(
      screen.getByText(/se guardan solo para la empresa activa/i),
    ).toBeInTheDocument();
  });

  it('permite seleccionar, crear y limpiar una sesion', async () => {
    const user = userEvent.setup();
    const onSelectSession = vi.fn();
    const onNewSession = vi.fn();
    const onClearSession = vi.fn();

    render(
      <HistorialIA
        sessions={[
          {
            sesion_id: 's1',
            title: 'Ventas de hoy',
            count: 3,
            dateLabel: 'may 07',
          },
        ]}
        activeSessionId="s1"
        onSelectSession={onSelectSession}
        onNewSession={onNewSession}
        onClearSession={onClearSession}
      />,
    );

    await user.click(screen.getByRole('button', { name: /ventas de hoy/i }));
    await user.click(screen.getByRole('button', { name: /nueva sesion/i }));
    await user.click(screen.getByRole('button', { name: /limpiar sesion/i }));

    expect(onSelectSession).toHaveBeenCalledWith('s1');
    expect(onNewSession).toHaveBeenCalledTimes(1);
    expect(onClearSession).toHaveBeenCalledTimes(1);
  });
});
