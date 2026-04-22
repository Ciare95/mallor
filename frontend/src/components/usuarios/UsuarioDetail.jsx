import { useQuery } from '@tanstack/react-query';
import {
  User, Mail, Phone, Shield, ShieldOff, Calendar, Clock,
  Edit, Trash2, Key, ArrowLeft, Loader2, AlertCircle,
  CheckCircle, XCircle
} from 'lucide-react';
import { obtenerUsuario } from '../../services/usuarios.service';

/**
 * Componente para mostrar el detalle completo de un usuario.
 *
 * Muestra toda la información del usuario con acciones disponibles:
 * editar, eliminar, cambiar contraseña y volver al listado.
 *
 * @param {Object} props
 * @param {number} props.usuarioId - ID del usuario a mostrar
 * @param {Function} props.onEdit - Callback al hacer clic en editar
 * @param {Function} props.onDelete - Callback al hacer clic en eliminar
 * @param {Function} props.onChangePassword - Callback al hacer clic en cambiar contraseña
 * @param {Function} props.onBack - Callback al hacer clic en volver
 * @returns {JSX.Element}
 */
const UsuarioDetail = ({ usuarioId, onEdit, onDelete, onChangePassword, onBack }) => {
  const { data: usuario, isLoading, isError, error } = useQuery({
    queryKey: ['usuario', usuarioId],
    queryFn: () => obtenerUsuario(usuarioId),
    enabled: !!usuarioId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 text-sm">Cargando información del usuario...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error al cargar usuario</h3>
        <p className="text-red-600">{error?.message || 'Error desconocido'}</p>
        <button
          onClick={onBack}
          className="mt-6 px-5 py-2.5 border border-red-300 text-red-700 rounded-xl hover:bg-red-100 transition text-sm font-medium"
        >
          Volver al listado
        </button>
      </div>
    );
  }

  if (!usuario) return null;

  const esAdmin = usuario.role === 'ADMIN';
  const formatFecha = (fecha) =>
    fecha
      ? new Date(fecha).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : '—';

  const formatFechaHora = (fecha) =>
    fecha
      ? new Date(fecha).toLocaleString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  return (
    <div className="space-y-6">
      {/* Botón de regreso */}
      <button
        onClick={onBack}
        className="flex items-center text-gray-500 hover:text-gray-800 transition text-sm font-medium group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Volver al listado
      </button>

      {/* Header del perfil */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Banner */}
        <div className={`h-28 ${esAdmin ? 'bg-gradient-to-r from-violet-600 to-purple-700' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`} />

        <div className="px-8 pb-8">
          {/* Avatar y badge de rol */}
          <div className="flex flex-col md:flex-row md:items-end justify-between -mt-12 gap-4">
            <div className="flex items-end gap-4">
              <div className={`w-24 h-24 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white text-3xl font-bold ${esAdmin ? 'bg-gradient-to-br from-violet-500 to-purple-700' : 'bg-gradient-to-br from-blue-400 to-indigo-600'}`}>
                {(usuario.first_name?.[0] || usuario.username?.[0] || '?').toUpperCase()}
              </div>
              <div className="mb-1">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${esAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                  {esAdmin ? (
                    <><Shield className="w-3 h-3 mr-1" /> Administrador</>
                  ) : (
                    <><ShieldOff className="w-3 h-3 mr-1" /> Empleado</>
                  )}
                </span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onChangePassword(usuario)}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
              >
                <Key className="w-4 h-4 mr-2" />
                Cambiar contraseña
              </button>
              <button
                onClick={() => onEdit(usuario)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition shadow"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </button>
              <button
                onClick={() => onDelete(usuario)}
                className="flex items-center px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 border border-red-200 transition"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </button>
            </div>
          </div>

          {/* Nombre completo y username */}
          <div className="mt-5">
            <h2 className="text-2xl font-bold text-gray-900">
              {usuario.first_name} {usuario.last_name}
            </h2>
            <p className="text-gray-500 mt-1">@{usuario.username}</p>
          </div>
        </div>
      </div>

      {/* Tarjetas de información */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información de contacto */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-5 flex items-center">
            <Mail className="w-4 h-4 mr-2 text-blue-500" />
            Información de contacto
          </h3>
          <dl className="space-y-4">
            <div className="flex items-start">
              <dt className="w-28 text-xs font-medium text-gray-500 uppercase tracking-wide pt-0.5">Email</dt>
              <dd className="flex-1 text-sm text-gray-900 break-all">{usuario.email}</dd>
            </div>
            <div className="flex items-start">
              <dt className="w-28 text-xs font-medium text-gray-500 uppercase tracking-wide pt-0.5">Teléfono</dt>
              <dd className="flex-1 text-sm text-gray-900">
                {usuario.phone ? (
                  <span className="flex items-center">
                    <Phone className="w-3.5 h-3.5 mr-1 text-gray-400" />
                    {usuario.phone}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">No registrado</span>
                )}
              </dd>
            </div>
            <div className="flex items-start">
              <dt className="w-28 text-xs font-medium text-gray-500 uppercase tracking-wide pt-0.5">Usuario</dt>
              <dd className="flex-1 text-sm text-gray-900 font-mono bg-gray-50 px-2 py-0.5 rounded w-fit">@{usuario.username}</dd>
            </div>
          </dl>
        </div>

        {/* Estado de la cuenta */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-5 flex items-center">
            <Shield className="w-4 h-4 mr-2 text-blue-500" />
            Estado de la cuenta
          </h3>
          <dl className="space-y-4">
            <div className="flex items-center justify-between">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</dt>
              <dd>
                {usuario.is_active !== false ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" /> Activo
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 mr-1" /> Inactivo
                  </span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rol</dt>
              <dd>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${esAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                  {esAdmin ? <Shield className="w-3 h-3 mr-1" /> : <ShieldOff className="w-3 h-3 mr-1" />}
                  {esAdmin ? 'Administrador' : 'Empleado'}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID</dt>
              <dd className="text-sm text-gray-900 font-mono text-xs bg-gray-50 px-2 py-0.5 rounded">#{usuario.id}</dd>
            </div>
          </dl>
        </div>

        {/* Fechas */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:col-span-2">
          <h3 className="text-base font-semibold text-gray-800 mb-5 flex items-center">
            <Calendar className="w-4 h-4 mr-2 text-blue-500" />
            Actividad
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Miembro desde
              </div>
              <div className="text-sm font-semibold text-gray-900">{formatFecha(usuario.date_joined)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Último acceso
              </div>
              <div className="text-sm font-semibold text-gray-900">{formatFechaHora(usuario.last_login)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center text-gray-500 text-xs font-medium uppercase tracking-wide mb-2">
                <User className="w-3.5 h-3.5 mr-1.5" />
                Nombre completo
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {usuario.first_name} {usuario.last_name}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsuarioDetail;
