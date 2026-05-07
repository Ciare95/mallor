import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, UserPlus } from 'lucide-react';
import {
  actualizarUsuarioEmpresa,
  crearUsuarioEmpresa,
  listarUsuariosEmpresa,
} from '../../services/empresas.service';
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

export default function EmpresaUsuariosPage() {
  const queryClient = useQueryClient();
  const empresaActiva = useAppStore((state) => state.empresaActiva);
  const { toasts, toast, closeToast } = useToast();
  const [form, setForm] = useState(EMPTY_USER);
  const [rol, setRol] = useState('EMPLEADO');

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

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    crearMutation.mutate({
      rol,
      activo: true,
      usuario: form,
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
      >
        <form className="grid gap-4 xl:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field
              label="Usuario"
              value={form.username}
              required
              onChange={(value) => setField('username', value)}
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              required
              onChange={(value) => setField('email', value)}
            />
            <Field
              label="Nombre"
              value={form.first_name}
              onChange={(value) => setField('first_name', value)}
            />
            <Field
              label="Apellido"
              value={form.last_name}
              onChange={(value) => setField('last_name', value)}
            />
            <Field
              label="Password"
              type="password"
              value={form.password}
              required
              onChange={(value) => setField('password', value)}
            />
            <Field
              label="Confirmar password"
              type="password"
              value={form.confirm_password}
              required
              onChange={(value) => setField('confirm_password', value)}
            />
            <Field
              label="Telefono"
              value={form.phone}
              onChange={(value) => setField('phone', value)}
            />
            <label className="app-field">
              <span className="app-field-label">Rol empresa</span>
              <select
                value={rol}
                onChange={(event) => setRol(event.target.value)}
                className="app-select min-h-11"
              >
                <option value="EMPLEADO">Empleado</option>
                <option value="ADMIN">Administrador</option>
                <option value="PROPIETARIO">Propietario</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            disabled={crearMutation.isPending}
            className="app-button-primary min-h-11 self-end"
          >
            <UserPlus className="h-4 w-4" />
            Crear
          </button>
        </form>
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
            {membresias.map((membresia) => (
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
                <label className="app-field">
                  <span className="app-field-label">Rol</span>
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
                    <option value="EMPLEADO">Empleado</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="PROPIETARIO">Propietario</option>
                  </select>
                </label>
                <div className="flex items-center">
                  <StatusBadge status={membresia.activo ? 'ACTIVO' : 'INACTIVO'} />
                </div>
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
              </article>
            ))}
          </div>
        )}
      </SectionShell>

      <ToastContainer toasts={toasts} onClose={closeToast} />
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
