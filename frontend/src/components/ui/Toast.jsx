import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ id, type = 'info', message, duration = 4000, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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
      bg: 'border-[var(--accent-line)] bg-[var(--accent-soft)]',
      icon: <CheckCircle className="h-4 w-4 text-[var(--accent)]" />,
      text: 'text-[var(--accent)]',
    },
    error: {
      bg: 'border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)]',
      icon: <XCircle className="h-4 w-4 text-[var(--danger-text)]" />,
      text: 'text-[var(--danger-text)]',
    },
    warning: {
      bg: 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)]',
      icon: <AlertCircle className="h-4 w-4 text-[var(--warning-text)]" />,
      text: 'text-[var(--warning-text)]',
    },
    info: {
      bg: 'border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)]',
      icon: <Info className="h-4 w-4 text-[var(--info-text)]" />,
      text: 'text-[var(--info-text)]',
    },
  };

  const config = configs[type] || configs.info;

  return (
    <div
      className={`flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 transition-all duration-300 ${config.bg} ${visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
    >
      <div className="mt-0.5 flex-shrink-0">{config.icon}</div>
      <p className={`flex-1 text-[13px] font-medium leading-snug ${config.text}`}>{message}</p>
      <button
        onClick={handleClose}
        className="ml-1 flex-shrink-0 text-muted transition hover:text-main"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const ToastContainer = ({ toasts, onClose }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
};

export default Toast;
