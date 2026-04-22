import { useState, useCallback } from 'react';

/**
 * Hook para gestionar notificaciones toast.
 *
 * @returns {{ toasts, toast, closeToast }}
 *
 * @example
 * const { toasts, toast, closeToast } = useToast();
 * toast.success('Usuario creado correctamente');
 * toast.error('Error al eliminar el usuario');
 */
const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
    return id;
  }, []);

  const closeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (message, duration) => addToast('success', message, duration),
    error: (message, duration) => addToast('error', message, duration),
    warning: (message, duration) => addToast('warning', message, duration),
    info: (message, duration) => addToast('info', message, duration),
  };

  return { toasts, toast, closeToast };
};

export default useToast;
