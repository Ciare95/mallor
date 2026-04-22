import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

/**
 * Componente de notificación Toast individual.
 *
 * @param {Object} props
 * @param {string} props.id - ID único del toast
 * @param {string} props.type - Tipo: 'success' | 'error' | 'warning' | 'info'
 * @param {string} props.message - Mensaje a mostrar
 * @param {number} props.duration - Duración en ms (default 4000)
 * @param {Function} props.onClose - Callback para cerrar el toast
 */
const Toast = ({ id, type = 'info', message, duration = 4000, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Entrada con pequeña demora para la animación
    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [id, duration, onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  const configs = {
    success: {
      bg: 'bg-green-50 border-green-200',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      text: 'text-green-800',
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      text: 'text-red-800',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200',
      icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
      text: 'text-amber-800',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: <Info className="w-5 h-5 text-blue-600" />,
      text: 'text-blue-800',
    },
  };

  const config = configs[type] || configs.info;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border rounded-xl shadow-lg max-w-sm transition-all duration-300 ${config.bg} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
    >
      <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
      <p className={`flex-1 text-sm font-medium leading-snug ${config.text}`}>{message}</p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition ml-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Contenedor de toasts. Se renderiza en la esquina inferior derecha.
 *
 * @param {Object} props
 * @param {Array} props.toasts - Lista de toasts activos
 * @param {Function} props.onClose - Callback para eliminar un toast por ID
 */
export const ToastContainer = ({ toasts, onClose }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
};

export default Toast;
