import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Loader2, PencilLine, Save, UserPlus, X } from 'lucide-react';
import {
  actualizarUsuarioEmpresa,
  crearUsuarioEmpresa,
  listarUsuariosEmpresa,
} from '../../services/empresas.service';
import { actualizarUsuarioParcial } from '../../services/usuarios.service';
import { useAppStore } from '../../store/useStore';
import useToast from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
import { EmptyState, SectionShell, StatusBadge } from '../../components/ventas/shared';
import { extractApiError } from '../../utils/ventas';

const EMPTY_USER = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  confirm_password: '',
  phone: '',
};

const ROLE_OPTIONS = [
  ['Empleado', 'EMPLEADO'],
  ['Contador', 'CONTADOR'],
  ['Administrador', 'ADMIN'],
  ['Propietario', 'PROPIETARIO'],
];

const buildEditForm = (membresia) => {
  const nameParts = String(membresia?.usuario_nombre || '').trim().split(/\s+/);
  return {
    username: membresia?.usuario_username || '',
    email: membresia?.usuario_email || '',
    first_name: nameParts[0] || '',
    last_name: nameParts.slice(1).join(' '),
    phone: membresia?.usuario_phone || '',
  };
};

export default function EmpresaUsuariosPage() {
  const queryClient = useQueryClient();
  const empresaActiva = useAppStore((state) => state.empresaActiva);
  const currentUser = useAppStore((state) => state.user);
  const currentUserIsSuperuser = Boolean(currentUser?.is_superuser || currentUser?.is_staff);
  const { toasts, toast, closeToast } = useToast();
  const [form, setForm] = useState(EMPTY_USER);
  const [rol, setRol] = useState('EMPLEADO');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMembership, setEditingMembership] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_USER);
  const [editRol, setEditRol] = useState('EMPLEADO');

  const empresaId = empresaActiva?.id;
  const usuariosQuery = useQuery({
    queryKey: ['empresas', empresaId, 'usuarios'],
    queryFn: () => listarUsuariosEmpresa(empresaId),
    enabled: Boolean(empresaId),
  });

  const membresias = usuariosQuery.data?.results || [];

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ['empresas', empresaId, 'usuarios'],
    });
  };

  const crearMutation = useMutation({
    mutationFn: (payload) => crearUsuarioEmpresa(empresaId, payload),
    onSuccess: () => {
      invalidate();
      setForm(EMPTY_USER);
      setRol('EMPLEADO');
      setShowCreateModal(false);
      toast.success('Usuario agregado a la empresa');
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible crear el usuario'));
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ membresiaId, payload }) =>
      actualizarUsuarioEmpresa(empresaId, membresiaId, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Membresia actualizada');
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible actualizar usuario'));
    },
  });

  const editarMutation = useMutation({
    mutationFn: async ({ membresia, usuarioPayload, membresiaPayload }) => {
      await actualizarUsuarioParcial(membresia.usuario, usuarioPayload);
      return actualizarUsuarioEmpresa(
        empresaId,
        membresia.id,
        membresiaPayload,
      );
    },
    onSuccess: () => {
      invalidate();
      setEditingMembership(null);
      setEditForm(EMPTY_USER);
      setEditRol('EMPLEADO');
      toast.success('Usuario actualizado');
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible editar el usuario'));
    },
  });

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setEditField = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }));
  };

  const openEditModal = (membresia) => {
    setEditingMembership(membresia);
    setEditForm(buildEditForm(membresia));
    setEditRol(membresia.rol || 'EMPLEADO');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    crearMutation.mutate({
      rol,
      activo: true,
      usuario: form,
    });
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();
    if (!editingMembership) {
      return;
    }

    const usuarioPayload = {
      username: editForm.username,
      email: editForm.email,
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      phone: editForm.phone || '',
    };
    if (editForm.password) {
      usuarioPayload.password = editForm.password;
    }
    editarMutation.mutate({
      membresia: editingMembership,
      usuarioPayload,
      membresiaPayload: {
        rol: editRol,
        activo: editingMembership.activo,
      },
    });
  };

  if (!empresaActiva) {
    return (
      <SectionShell
        eyebrow="Configuracion"
        title="Usuarios"
        description="Selecciona una empresa activa para administrar usuarios."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionShell
        eyebrow="Equipo"
        title="Usuarios de la empresa"
        description="Gestiona membresias y roles dentro de la empresa activa. No afecta otras empresas a las que pertenezca el mismo usuario."
        actions={
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="app-button-primary min-h-10"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo usuario
          </button>
        }
      >
        <div className="rounded-xl border border-app bg-white/70 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryItem label="Empresa activa" value={empresaActiva.nombre_comercial || empresaActiva.razon_social} />
            <SummaryItem label="Usuarios activos" value={membresias.filter((item) => item.activo).length} />
            <SummaryItem label="Alta" value="Desde modal" />
          </div>
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Membresias"
        title={empresaActiva.nombre_comercial || empresaActiva.razon_social}
        description="Debe existir al menos un propietario activo."
      >
        {usuariosQuery.isLoading && (
          <div className="flex min-h-[180px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-soft" />
          </div>
        )}
        {usuariosQuery.isError && (
          <EmptyState
            title="No fue posible cargar usuarios"
            description="Verifica permisos o intenta nuevamente."
          />
        )}
        {!usuariosQuery.isLoading && !usuariosQuery.isError && (
          <div className="grid gap-3">
            {membresias
              .filter((membresia) => currentUserIsSuperuser || !membresia.usuario_is_superuser)
              .map((membresia) => {
                const esSuperusuario = Boolean(membresia.usuario_is_superuser);
                return (
                  <article
                    key={membresia.id}
                    className="grid gap-3 rounded-xl border border-app bg-white/75 p-4 lg:grid-cols-[1fr_0.4fr_0.4fr_auto]"
                  >
                    <div>
                      <div className="text-[14px] font-semibold text-main">
                        {membresia.usuario_nombre || membresia.usuario_username}
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        {membresia.usuario_email}
                      </div>
                    </div>
                    <div className="app-field">
                      <span className="app-field-label">Rol</span>
                      {esSuperusuario ? (
                        <div className="app-select min-h-10 flex items-center text-[13px] font-semibold text-main">
                          Superusuario
                        </div>
                      ) : (
                        <select
                          value={membresia.rol}
                          onChange={(event) =>
                            actualizarMutation.mutate({
                              membresiaId: membresia.id,
                              payload: { rol: event.target.value },
                            })
                          }
                          className="app-select min-h-10"
                        >
                          {ROLE_OPTIONS.map(([label, value]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="flex items-center">
                      <StatusBadge status={membresia.activo ? 'ACTIVO' : 'INACTIVO'} />
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {!esSuperusuario && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(membresia)}
                            className="app-button-secondary min-h-10"
                          >
                            <PencilLine className="h-4 w-4" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              actualizarMutation.mutate({
                                membresiaId: membresia.id,
                                payload: { activo: !membresia.activo },
                              })
                            }
                            className="app-button-secondary min-h-10"
                            disabled={actualizarMutation.isPending}
                          >
                            <Save className="h-4 w-4" />
                            {membresia.activo ? 'Inactivar' : 'Activar'}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
          </div>
        )}
      </SectionShell>

      {showCreateModal && (
        <UserModal
          title="Nuevo usuario"
          eyebrow="Alta de equipo"
          submitLabel="Crear usuario"
          form={form}
          role={rol}
          onRoleChange={setRol}
          onFieldChange={setField}
          onClose={() => {
            if (!crearMutation.isPending) {
              setShowCreateModal(false);
            }
          }}
          onSubmit={handleSubmit}
          isPending={crearMutation.isPending}
          includePassword
        />
      )}

      {editingMembership && (
        <UserModal
          title="Editar usuario"
          eyebrow="Membresia activa"
          submitLabel="Guardar cambios"
          form={editForm}
          role={editRol}
          onRoleChange={setEditRol}
          onFieldChange={setEditField}
          onClose={() => {
            if (!editarMutation.isPending) {
              setEditingMembership(null);
            }
          }}
          onSubmit={handleEditSubmit}
          isPending={editarMutation.isPending}
          allowPasswordChange
        />
      )}

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
        {label}
      </div>
      <div className="mt-2 text-[14px] font-semibold text-main">
        {value || '-'}
      </div>
    </div>
  );
}

function UserModal({
  title,
  eyebrow,
  submitLabel,
  form,
  role,
  onRoleChange,
  onFieldChange,
  onClose,
  onSubmit,
  isPending,
  includePassword = false,
  allowPasswordChange = false,
}) {
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const showPassword = includePassword || showPasswordFields;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-app bg-[var(--panel)] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-app bg-[var(--panel)] px-5 py-4">
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h3 className="mt-1 text-[18px] font-semibold text-main">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-button-secondary min-h-10 px-3"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="space-y-5 p-5" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Usuario"
              value={form.username}
              required
              onChange={(value) => onFieldChange('username', value)}
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              required
              onChange={(value) => onFieldChange('email', value)}
            />
            <Field
              label="Nombre"
              value={form.first_name}
              onChange={(value) => onFieldChange('first_name', value)}
            />
            <Field
              label="Apellido"
              value={form.last_name}
              onChange={(value) => onFieldChange('last_name', value)}
            />
            <Field
              label="Telefono"
              value={form.phone}
              onChange={(value) => onFieldChange('phone', value)}
            />
            <label className="app-field">
              <span className="app-field-label">Rol empresa</span>
              <select
                value={role}
                onChange={(event) => onRoleChange(event.target.value)}
                className="app-select min-h-11"
              >
                {ROLE_OPTIONS.map(([label, value]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {allowPasswordChange && !includePassword && (
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordFields((v) => !v);
                    onFieldChange('password', '');
                    onFieldChange('confirm_password', '');
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-soft hover:text-main transition"
                >
                  <KeyRound className="h-4 w-4" />
                  {showPasswordFields ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña'}
                </button>
              </div>
            )}
            {showPassword && (
              <>
                <Field
                  label="Nueva contraseña"
                  type="password"
                  value={form.password}
                  required={includePassword}
                  onChange={(value) => onFieldChange('password', value)}
                />
                <Field
                  label="Confirmar contraseña"
                  type="password"
                  value={form.confirm_password}
                  required={includePassword}
                  onChange={(value) =>
                    onFieldChange('confirm_password', value)
                  }
                />
              </>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-app pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="app-button-secondary min-h-11"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="app-button-primary min-h-11"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label className="app-field">
      <span className="app-field-label">{label}</span>
      <input
        type={type}
        required={required}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        className="app-input min-h-11"
      />
    </label>
  );
}
