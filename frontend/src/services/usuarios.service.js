import api from './api';

export const listarUsuarios = async (filtros = {}) => {
  try {
    const response = await api.get('/usuarios/', { params: filtros });
    return response.data;
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    throw error;
  }
};

export const obtenerUsuario = async (id) => {
  try {
    const response = await api.get(`/usuarios/${id}/`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener usuario ${id}:`, error);
    throw error;
  }
};

export const crearUsuario = async (datos) => {
  try {
    const response = await api.post('/usuarios/', datos);
    return response.data;
  } catch (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }
};

export const actualizarUsuario = async (id, datos) => {
  try {
    const response = await api.put(`/usuarios/${id}/`, datos);
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar usuario ${id}:`, error);
    throw error;
  }
};

export const actualizarUsuarioParcial = async (id, datos) => {
  try {
    const response = await api.patch(`/usuarios/${id}/`, datos);
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar parcialmente usuario ${id}:`, error);
    throw error;
  }
};

export const eliminarUsuario = async (id) => {
  try {
    await api.delete(`/usuarios/${id}/`);
  } catch (error) {
    console.error(`Error al eliminar usuario ${id}:`, error);
    throw error;
  }
};

export const cambiarPassword = async (id, oldPassword, newPassword) => {
  try {
    const response = await api.post(`/usuarios/${id}/cambiar_password/`, {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  } catch (error) {
    console.error(`Error al cambiar contrasea del usuario ${id}:`, error);
    throw error;
  }
};

export const obtenerUsuarioActual = async () => {
  try {
    const response = await api.get('/usuarios/me/');
    return response.data;
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    throw error;
  }
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
};
