import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, UserPlus, Edit, Trash2, Eye, ChevronLeft, ChevronRight, User, Mail, Phone, Shield, ShieldOff, Loader2 } from 'lucide-react';
import { listarUsuarios } from '../../services/usuarios.service';

/**
 * Componente para listar usuarios en una tabla con funcionalidades de búsqueda,
 * filtros y paginación.
 * 
 * Características:
 * - Búsqueda por email, username, nombre, apellido
 * - Filtros por rol (ADMIN/EMPLEADO)
 * - Paginación con navegación
 * - Acciones: ver, editar, eliminar
 * - Estado visual de carga y errores
 * - Diseño responsive
 * 
 * @param {Object} props
 * @param {Function} props.onView - Callback al hacer clic en ver
 * @param {Function} props.onEdit - Callback al hacer clic en editar
 * @param {Function} props.onDelete - Callback al hacer clic en eliminar
 * @param {Function} props.onCreate - Callback al hacer clic en crear nuevo
 * @returns {JSX.Element} Componente de lista de usuarios
 */
const UsuariosList = ({ onView, onEdit, onDelete, onCreate }) => {
  // Estado para filtros y búsqueda
  const [filtros, setFiltros] = useState({
    search: '',
    role: undefined,
    page: 1,
    page_size: 10,
    orden: '-date_joined',
  });

  // Consulta de usuarios con React Query
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['usuarios', filtros],
    queryFn: () => listarUsuarios(filtros),
    keepPreviousData: true,
  });

  // Manejar cambios en los filtros
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setFiltros(prev => ({
      ...prev,
      search: value,
      email__icontains: value || undefined,
      username__icontains: value || undefined,
      first_name__icontains: value || undefined,
      last_name__icontains: value || undefined,
      page: 1, // Resetear a primera página
    }));
  };

  const handleRoleChange = (e) => {
    const value = e.target.value;
    setFiltros(prev => ({
      ...prev,
      role: value || undefined,
      page: 1,
    }));
  };

  const handleOrdenChange = (campo) => {
    setFiltros(prev => ({
      ...prev,
      orden: prev.orden === campo ? `-${campo}` : campo,
    }));
  };

  // Navegación de paginación
  const handleNextPage = () => {
    if (data?.next) {
      setFiltros(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const handlePrevPage = () => {
    if (data?.previous) {
      setFiltros(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };

  // Formatear fecha
  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Estado de carga
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">Cargando usuarios...</p>
      </div>
    );
  }

  // Estado de error
  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
            <span className="text-red-600 font-bold">!</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-800">Error al cargar usuarios</h3>
            <p className="text-red-600">{error?.message || 'Error desconocido'}</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const usuarios = data?.results || [];
  const totalUsuarios = data?.count || 0;
  const totalPaginas = data?.total_pages || 1;
  const paginaActual = data?.current_page || 1;

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header con controles */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
            <p className="text-gray-600 mt-1">
              {totalUsuarios} usuario{totalUsuarios !== 1 ? 's' : ''} en el sistema
            </p>
          </div>
          
          <button
            onClick={onCreate}
            className="flex items-center justify-center px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-md"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Nuevo Usuario
          </button>
        </div>

        {/* Filtros y búsqueda */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por email, nombre, usuario..."
              value={filtros.search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filtros.role || ''}
              onChange={handleRoleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition appearance-none"
            >
              <option value="">Todos los roles</option>
              <option value="ADMIN">Administrador</option>
              <option value="EMPLEADO">Empleado</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-700 font-medium">Ordenar por:</span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleOrdenChange('username')}
                className={`px-3 py-2 rounded-lg transition ${filtros.orden.includes('username') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Usuario {filtros.orden === 'username' ? '↑' : filtros.orden === '-username' ? '↓' : ''}
              </button>
              <button
                onClick={() => handleOrdenChange('date_joined')}
                className={`px-3 py-2 rounded-lg transition ${filtros.orden.includes('date_joined') ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Fecha {filtros.orden === 'date_joined' ? '↑' : filtros.orden === '-date_joined' ? '↓' : ''}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Usuario
              </th>
              <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Contacto
              </th>
              <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Rol
              </th>
              <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Registro
              </th>
              <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <User className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron usuarios</h3>
                    <p className="text-gray-600 max-w-md">
                      {filtros.search || filtros.role
                        ? 'Intenta con otros términos de búsqueda o filtros'
                        : 'No hay usuarios registrados en el sistema'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              usuarios.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50 transition">
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${usuario.role === 'ADMIN' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                        {usuario.role === 'ADMIN' ? (
                          <Shield className="w-5 h-5 text-purple-600" />
                        ) : (
                          <User className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {usuario.first_name} {usuario.last_name}
                        </div>
                        <div className="text-sm text-gray-500">@{usuario.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      <div className="flex items-center text-gray-700">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="text-sm">{usuario.email}</span>
                      </div>
                      {usuario.phone && (
                        <div className="flex items-center text-gray-700">
                          <Phone className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-sm">{usuario.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${usuario.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {usuario.role === 'ADMIN' ? (
                        <>
                          <Shield className="w-3 h-3 mr-1" />
                          Administrador
                        </>
                      ) : (
                        <>
                          <ShieldOff className="w-3 h-3 mr-1" />
                          Empleado
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-700">
                    {formatFecha(usuario.date_joined)}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onView(usuario)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Ver detalles"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onEdit(usuario)}
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onDelete(usuario)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {usuarios.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-gray-700">
              Mostrando <span className="font-semibold">{(paginaActual - 1) * filtros.page_size + 1}</span> a{' '}
              <span className="font-semibold">{Math.min(paginaActual * filtros.page_size, totalUsuarios)}</span> de{' '}
              <span className="font-semibold">{totalUsuarios}</span> usuarios
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevPage}
                disabled={!data?.previous}
                className={`p-2 rounded-lg transition ${data?.previous ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  let pagina;
                  if (totalPaginas <= 5) {
                    pagina = i + 1;
                  } else if (paginaActual <= 3) {
                    pagina = i + 1;
                  } else if (paginaActual >= totalPaginas - 2) {
                    pagina = totalPaginas - 4 + i;
                  } else {
                    pagina = paginaActual - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pagina}
                      onClick={() => setFiltros(prev => ({ ...prev, page: pagina }))}
                      className={`w-10 h-10 rounded-lg transition ${pagina === paginaActual ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      {pagina}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={handleNextPage}
                disabled={!data?.next}
                className={`p-2 rounded-lg transition ${data?.next ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosList;