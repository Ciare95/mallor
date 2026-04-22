import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import UsuariosList from './UsuariosList';
import UsuarioForm from './UsuarioForm';
import UsuarioDetail from './UsuarioDetail';
import ConfirmDelete from './ConfirmDelete';
import CambiarPasswordModal from './CambiarPasswordModal';
import { ToastContainer } from '../ui/Toast';
import useToast from '../../hooks/useToast';
import {
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} from '../../services/usuarios.service';

/**
 * Vistas posibles de la interfaz de gestión de usuarios.
 */
const VISTAS = {
  LISTA: 'lista',
  CREAR: 'crear',
  EDITAR: 'editar',
  DETALLE: 'detalle',
};

/**
 * Página principal de gestión de usuarios.
 *
 * Orquesta todos los componentes de usuarios:
 * - UsuariosList: listado con filtros y paginación
 * - UsuarioForm: formulario de creación/edición
 * - UsuarioDetail: vista de detalle
 * - ConfirmDelete: modal de confirmación de eliminación
 * - CambiarPasswordModal: modal para cambiar contraseña
 *
 * Maneja el estado de navegación entre vistas, las mutaciones
 * de la API y el sistema de notificaciones.
 *
 * @returns {JSX.Element}
 */
const UsuariosPage = () => {
  const [vistaActual, setVistaActual] = useState(VISTAS.LISTA);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);
  const [usuarioCambiarPassword, setUsuarioCambiarPassword] = useState(null);
  const { toasts, toast, closeToast } = useToast();
  const queryClient = useQueryClient();

  // ─── Mutación: Crear usuario ────────────────────────────────────────────────
  const crearMutation = useMutation({
    mutationFn: crearUsuario,
    onSuccess: (nuevoUsuario) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success(`Usuario @${nuevoUsuario.username} creado correctamente`);
      setVistaActual(VISTAS.LISTA);
    },
    onError: (error) => {
      const msg = extractApiError(error, 'Error al crear el usuario');
      toast.error(msg);
    },
  });

  // ─── Mutación: Actualizar usuario ───────────────────────────────────────────
  const actualizarMutation = useMutation({
    mutationFn: ({ id, datos }) => actualizarUsuario(id, datos),
    onSuccess: (usuarioActualizado) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['usuario', usuarioActualizado.id] });
      toast.success(`Usuario @${usuarioActualizado.username} actualizado correctamente`);
      setVistaActual(VISTAS.LISTA);
      setUsuarioSeleccionado(null);
    },
    onError: (error) => {
      const msg = extractApiError(error, 'Error al actualizar el usuario');
      toast.error(msg);
    },
  });

  // ─── Mutación: Eliminar usuario ─────────────────────────────────────────────
  const eliminarMutation = useMutation({
    mutationFn: (id) => eliminarUsuario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario eliminado correctamente');
      setUsuarioAEliminar(null);
      if (vistaActual === VISTAS.DETALLE) {
        setVistaActual(VISTAS.LISTA);
        setUsuarioSeleccionado(null);
      }
    },
    onError: (error) => {
      const msg = extractApiError(error, 'Error al eliminar el usuario');
      toast.error(msg);
      setUsuarioAEliminar(null);
    },
  });

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const extractApiError = (error, fallback) => {
    if (!error?.response?.data) return fallback;
    const data = error.response.data;
    if (data.detail) return data.detail;
    if (typeof data === 'object') {
      const firstKey = Object.keys(data)[0];
      if (firstKey) {
        const val = data[firstKey];
        return `${firstKey}: ${Array.isArray(val) ? val[0] : val}`;
      }
    }
    return fallback;
  };

  // ─── Handlers de navegación ─────────────────────────────────────────────────
  const handleVerDetalle = useCallback((usuario) => {
    setUsuarioSeleccionado(usuario);
    setVistaActual(VISTAS.DETALLE);
  }, []);

  const handleEditar = useCallback((usuario) => {
    setUsuarioSeleccionado(usuario);
    setVistaActual(VISTAS.EDITAR);
  }, []);

  const handleEliminar = useCallback((usuario) => {
    setUsuarioAEliminar(usuario);
  }, []);

  const handleCambiarPassword = useCallback((usuario) => {
    setUsuarioCambiarPassword(usuario);
  }, []);

  const handleCrear = useCallback(() => {
    setUsuarioSeleccionado(null);
    setVistaActual(VISTAS.CREAR);
  }, []);

  const handleVolverAlListado = useCallback(() => {
    setVistaActual(VISTAS.LISTA);
    setUsuarioSeleccionado(null);
  }, []);

  // ─── Handlers de formulario ─────────────────────────────────────────────────
  const handleFormSubmit = useCallback(
    (datos) => {
      if (vistaActual === VISTAS.CREAR) {
        crearMutation.mutate(datos);
      } else if (vistaActual === VISTAS.EDITAR && usuarioSeleccionado) {
        actualizarMutation.mutate({ id: usuarioSeleccionado.id, datos });
      }
    },
    [vistaActual, usuarioSeleccionado, crearMutation, actualizarMutation]
  );

  const handleConfirmarEliminar = useCallback(
    (usuario) => {
      eliminarMutation.mutate(usuario.id);
    },
    [eliminarMutation]
  );

  const handlePasswordSuccess = useCallback(() => {
    setUsuarioCambiarPassword(null);
    toast.success('Contraseña cambiada correctamente');
  }, [toast]);

  const getFormError = () => {
    const mutation = vistaActual === VISTAS.CREAR ? crearMutation : actualizarMutation;
    if (!mutation.isError) return null;
    return extractApiError(mutation.error, 'Error al guardar el usuario');
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full">
      {/* Contenido principal según la vista actual */}
      {vistaActual === VISTAS.LISTA && (
        <UsuariosList
          onView={handleVerDetalle}
          onEdit={handleEditar}
          onDelete={handleEliminar}
          onCreate={handleCrear}
        />
      )}

      {(vistaActual === VISTAS.CREAR || vistaActual === VISTAS.EDITAR) && (
        <UsuarioForm
          usuario={vistaActual === VISTAS.EDITAR ? usuarioSeleccionado : null}
          onSubmit={handleFormSubmit}
          onCancel={handleVolverAlListado}
          isLoading={crearMutation.isPending || actualizarMutation.isPending}
          error={getFormError()}
        />
      )}

      {vistaActual === VISTAS.DETALLE && usuarioSeleccionado && (
        <UsuarioDetail
          usuarioId={usuarioSeleccionado.id}
          onEdit={handleEditar}
          onDelete={handleEliminar}
          onChangePassword={handleCambiarPassword}
          onBack={handleVolverAlListado}
        />
      )}

      {/* Modal de confirmación de eliminación */}
      {usuarioAEliminar && (
        <ConfirmDelete
          usuario={usuarioAEliminar}
          onConfirm={handleConfirmarEliminar}
          onCancel={() => setUsuarioAEliminar(null)}
          isLoading={eliminarMutation.isPending}
        />
      )}

      {/* Modal para cambiar contraseña */}
      {usuarioCambiarPassword && (
        <CambiarPasswordModal
          usuario={usuarioCambiarPassword}
          onSuccess={handlePasswordSuccess}
          onCancel={() => setUsuarioCambiarPassword(null)}
        />
      )}

      {/* Sistema de notificaciones */}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
};

export default UsuariosPage;
