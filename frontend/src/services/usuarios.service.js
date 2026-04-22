import api from './api';

/**
 * Servicio para gestionar operaciones CRUD de usuarios.
 * 
 * Este servicio proporciona métodos para interactuar con la API de usuarios
 * del backend Django REST Framework. Incluye todas las operaciones CRUD
 * y endpoints especiales como cambiar contraseña.
 * 
 * Utiliza axios para las peticiones HTTP y maneja errores de forma consistente.
 * 
 * @module servicios/usuarios
 */

/**
 * Obtiene la lista de usuarios con filtros opcionales.
 * 
 * @param {Object} filtros - Filtros de búsqueda (opcional)
 * @param {string} filtros.role - Rol del usuario (ADMIN, EMPLEADO)
 * @param {string} filtros.email__icontains - Búsqueda parcial en email
 * @param {string} filtros.username__icontains - Búsqueda parcial en username
 * @param {string} filtros.first_name__icontains - Búsqueda parcial en nombre
 * @param {string} filtros.last_name__icontains - Búsqueda parcial en apellido
 * @param {string} filtros.orden - Campo para ordenar (username, email, first_name, last_name, date_joined, role)
 * @param {number} filtros.page - Número de página para paginación
 * @param {number} filtros.page_size - Tamaño de página (default: 10)
 * @returns {Promise<Object>} Respuesta con datos paginados
 * @throws {Error} Si la petición falla
 */
export const listarUsuarios = async (filtros = {}) => {
  try {
    const response = await api.get('/usuarios/', { params: filtros });
    return response.data;
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    throw error;
  }
};

/**
 * Obtiene un usuario específico por ID.
 * 
 * @param {number} id - ID del usuario
 * @returns {Promise<Object>} Datos del usuario
 * @throws {Error} Si el usuario no existe o la petición falla
 */
export const obtenerUsuario = async (id) => {
  try {
    const response = await api.get(`/usuarios/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener usuario ${id}:`, error);
    throw error;
  }
};

/**
 * Crea un nuevo usuario.
 * 
 * @param {Object} datos - Datos del usuario a crear
 * @param {string} datos.username - Nombre de usuario (único)
 * @param {string} datos.email - Email (único)
 * @param {string} datos.password - Contraseña (mínimo 8 caracteres)
 * @param {string} datos.first_name - Nombre
 * @param {string} datos.last_name - Apellido
 * @param {string} datos.role - Rol (ADMIN, EMPLEADO)
 * @param {string} datos.phone - Teléfono (opcional)
 * @returns {Promise<Object>} Usuario creado
 * @throws {Error} Si los datos son inválidos o la petición falla
 */
export const crearUsuario = async (datos) => {
  try {
    const response = await api.post('/usuarios/', datos);
    return response.data;
  } catch (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }
};

/**
 * Actualiza un usuario existente.
 * 
 * @param {number} id - ID del usuario a actualizar
 * @param {Object} datos - Datos a actualizar (parciales o completos)
 * @returns {Promise<Object>} Usuario actualizado
 * @throws {Error} Si el usuario no existe o los datos son inválidos
 */
export const actualizarUsuario = async (id, datos) => {
  try {
    const response = await api.put(`/usuarios/${id}/`, datos);
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar usuario ${id}:`, error);
    throw error;
  }
};

/**
 * Actualiza parcialmente un usuario existente.
 * 
 * @param {number} id - ID del usuario a actualizar
 * @param {Object} datos - Datos a actualizar (parciales)
 * @returns {Promise<Object>} Usuario actualizado
 * @throws {Error} Si el usuario no existe o los datos son inválidos
 */
export const actualizarUsuarioParcial = async (id, datos) => {
  try {
    const response = await api.patch(`/usuarios/${id}/`, datos);
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar parcialmente usuario ${id}:`, error);
    throw error;
  }
};

/**
 * Elimina un usuario (soft delete).
 * 
 * @param {number} id - ID del usuario a eliminar
 * @returns {Promise<void>}
 * @throws {Error} Si el usuario no existe o no se puede eliminar
 */
export const eliminarUsuario = async (id) => {
  try {
    await api.delete(`/usuarios/${id}/`);
  } catch (error) {
    console.error(`Error al eliminar usuario ${id}:`, error);
    throw error;
  }
};

/**
 * Cambia la contraseña de un usuario.
 * 
 * @param {number} id - ID del usuario
 * @param {string} oldPassword - Contraseña actual
 * @param {string} newPassword - Nueva contraseña
 * @returns {Promise<Object>} Respuesta de éxito
 * @throws {Error} Si las contraseñas son incorrectas o la petición falla
 */
export const cambiarPassword = async (id, oldPassword, newPassword) => {
  try {
    const response = await api.post(`/usuarios/${id}/cambiar_password/`, {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  } catch (error) {
    console.error(`Error al cambiar contraseña del usuario ${id}:`, error);
    throw error;
  }
};

/**
 * Obtiene la información del usuario actualmente autenticado.
 * 
 * @returns {Promise<Object>} Datos del usuario actual
 * @throws {Error} Si no hay usuario autenticado o la petición falla
 */
export const obtenerUsuarioActual = async () => {
  try {
    const response = await api.get('/usuarios/me/');
    return response.data;
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    throw error;
  }
};

/**
 * Hook personalizado para operaciones de usuarios con React Query.
 * 
 * Este hook proporciona métodos preconfigurados con React Query
 * para manejar caché, estado de carga y errores automáticamente.
 * 
 * @returns {Object} Métodos de usuarios con React Query
 */
export const useUsuariosService = () => {
  // Nota: Este hook debe ser implementado en el componente que use React Query
  // Se proporciona como plantilla para consistencia
  return {
    listarUsuarios,
    obtenerUsuario,
    crearUsuario,
    actualizarUsuario,
    actualizarUsuarioParcial,
    eliminarUsuario,
    cambiarPassword,
    obtenerUsuarioActual,
  };
};

export default {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  actualizarUsuarioParcial,
  eliminarUsuario,
  cambiarPassword,
  obtenerUsuarioActual,
  useUsuariosService,
};