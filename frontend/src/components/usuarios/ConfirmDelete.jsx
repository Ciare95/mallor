import { useEffect, useRef } from 'react';
import { Trash2, AlertTriangle, X, Loader2, User, Shield, ShieldOff } from 'lucide-react';

/**
 * Modal de confirmación para eliminar un usuario.
 *
 * Muestra un diálogo modal con información del usuario y botones
 * de confirmación/cancelación. Cierra con Escape o clic fuera.
 *
 * @param {Object} props
 * @param {Object} props.usuario - Usuario a eliminar
 * @param {Function} props.onConfirm - Callback al confirmar la eliminación
 * @param {Function} props.onCancel - Callback al cancelar
 * @param {boolean} props.isLoading - Estado de carga mientras se elimina
 * @returns {JSX.Element}
 */
const ConfirmDelete = ({ usuario, onConfirm, onCancel, isLoading }) => {
  const modalRef = useRef(null);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, onCancel]);

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Foco al modal al abrir
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  // Clic en backdrop cierra el modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onCancel();
    }
  };

  if (!usuario) return null;

  const esAdmin = usuario.role === 'ADMIN';
  const nombreCompleto = `${usuario.first_name} ${usuario.last_name}`.trim() || usuario.username;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-delete-title"
    >
      {/* Backdrop con blur */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto outline-none animate-in fade-in slide-in-from-bottom-4 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mr-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 id="confirm-delete-title" className="text-lg font-bold text-gray-900">
              Eliminar usuario
            </h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Contenido */}
        <div className="px-6 py-5">
          <p className="text-gray-600 text-sm mb-5">
            Esta acción desactivará la cuenta del usuario. El usuario no podrá iniciar sesión,
            pero sus datos se conservarán en el sistema.
          </p>

          {/* Card del usuario a eliminar */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${esAdmin ? 'bg-gradient-to-br from-violet-500 to-purple-700' : 'bg-gradient-to-br from-blue-400 to-indigo-600'}`}>
              {(usuario.first_name?.[0] || usuario.username?.[0] || '?').toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate">{nombreCompleto}</div>
              <div className="text-sm text-gray-500 truncate">@{usuario.username}</div>
              <div className="text-xs text-gray-400 truncate">{usuario.email}</div>
            </div>
            <span className={`ml-auto flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${esAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
              {esAdmin ? <Shield className="w-3 h-3 mr-1" /> : <ShieldOff className="w-3 h-3 mr-1" />}
              {esAdmin ? 'Admin' : 'Empleado'}
            </span>
          </div>

          {/* Advertencia adicional para admins */}
          {esAdmin && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  <strong>Atención:</strong> Estás eliminando una cuenta de administrador. Asegúrate
                  de que existan otros administradores activos en el sistema.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-5 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(usuario)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition shadow text-sm disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Sí, eliminar usuario
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDelete;
