import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ChatMessage from './ChatMessage';

describe('ChatMessage', () => {
  it('copia respuestas del asistente al portapapeles', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <ChatMessage
        message={{
          id: 5,
          role: 'assistant',
          content: 'Resumen seguro',
          herramienta_usada: 'resumen_ventas',
          tiempo_respuesta: 0.35,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /copiar respuesta/i }));

    expect(writeText).toHaveBeenCalledWith('Resumen seguro');
    expect(screen.getByText('resumen_ventas')).toBeInTheDocument();
    expect(screen.getByText('0.35 s')).toBeInTheDocument();
  });

  it('envia feedback cuando el mensaje tiene id persistido', async () => {
    const user = userEvent.setup();
    const onFeedback = vi.fn();

    render(
      <ChatMessage
        message={{
          id: 9,
          role: 'assistant',
          content: 'Respuesta IA',
          feedback: 'UTIL',
        }}
        onFeedback={onFeedback}
      />,
    );

    await user.click(screen.getByRole('button', { name: /no util/i }));

    expect(onFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9 }),
      'NO_UTIL',
    );
  });
});
