import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Plus, Save } from 'lucide-react';
import {
  actualizarEmpresaAdmin,
  crearEmpresaAdmin,
  listarEmpresasAdmin,
} from '../services/empresas.service';
import { SectionShell, StatusBadge } from '../components/ventas/shared';
import { extractApiError } from '../utils/ventas';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/ui/Toast';

const EMPTY_EMPRESA = {
  nit: '',
  digito_verificacion: '',
  razon_social: '',
  nombre_comercial: '',
  email: '',
  telefono: '',
  direccion: '',
  municipio_codigo: '',
  ambiente_facturacion: 'SANDBOX',
  activo: true,
};

const EMPTY_OWNER = {
  username: '',
  email: '',
  password: '',
  confirm_password: '',
  first_name: '',
  last_name: '',
  phone: '',
};

export default function EmpresasAdminPage() {
  const queryClient = useQueryClient();
  const { toasts, toast, closeToast } = useToast();
  const [empresaForm, setEmpresaForm] = useState(EMPTY_EMPRESA);
  const [ownerForm, setOwnerForm] = useState(EMPTY_OWNER);
  const [editingId, setEditingId] = useState(null);

  const empresasQuery = useQuery({
    queryKey: ['empresas', 'admin'],
    queryFn: listarEmpresasAdmin,
  });
  const empresas = empresasQuery.data?.results || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['empresas'] });
  };

  const crearMutation = useMutation({
    mutationFn: crearEmpresaAdmin,
    onSuccess: () => {
      invalidate();
      setEmpresaForm(EMPTY_EMPRESA);
      setOwnerForm(EMPTY_OWNER);
      toast.success('Empresa creada con propietario');
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible crear la empresa'));
    },
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, payload }) => actualizarEmpresaAdmin(id, payload),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast.success('Empresa actualizada');
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible actualizar empresa'));
    },
  });

  const setEmpresaField = (field, value) => {
    setEmpresaForm((current) => ({ ...current, [field]: value }));
  };

  const setOwnerField = (field, value) => {
    setOwnerForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreate = (event) => {
    event.preventDefault();
    crearMutation.mutate({
      ...empresaForm,
      propietario: ownerForm,
    });
  };

  const toggleActivo = (empresa) => {
    editarMutation.mutate({
      id: empresa.id,
      payload: { activo: !empresa.activo },
    });
  };

  return (
    <div className="space-y-6">
      <SectionShell
        eyebrow="Mallor interno"
        title="Empresas SaaS"
        description="Alta administrada de tenants, propietario inicial y estado operativo."
      >
        <form className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]" onSubmit={handleCreate}>
          <div className="surface-subtle p-5">
            <div className="mb-4 eyebrow">Empresa</div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="NIT"
                value={empresaForm.nit}
                required
                onChange={(value) => setEmpresaField('nit', value)}
              />
              <Field
                label="DV"
                value={empresaForm.digito_verificacion}
                onChange={(value) =>
                  setEmpresaField('digito_verificacion', value)
                }
              />
              <Field
                label="Razon social"
                value={empresaForm.razon_social}
                required
                onChange={(value) => setEmpresaField('razon_social', value)}
              />
              <Field
                label="Nombre comercial"
                value={empresaForm.nombre_comercial}
                onChange={(value) => setEmpresaField('nombre_comercial', value)}
              />
              <Field
                label="Email"
                type="email"
                value={empresaForm.email}
                onChange={(value) => setEmpresaField('email', value)}
              />
              <Field
                label="Telefono"
                value={empresaForm.telefono}
                onChange={(value) => setEmpresaField('telefono', value)}
              />
              <Field
                label="Municipio"
                value={empresaForm.municipio_codigo}
                onChange={(value) => setEmpresaField('municipio_codigo', value)}
              />
              <label className="app-field">
                <span className="app-field-label">Ambiente</span>
                <select
                  value={empresaForm.ambiente_facturacion}
                  onChange={(event) =>
                    setEmpresaField('ambiente_facturacion', event.target.value)
                  }
                  className="app-select min-h-11"
                >
                  <option value="SANDBOX">Sandbox</option>
                  <option value="PRODUCCION">Produccion</option>
                </select>
              </label>
              <label className="app-field md:col-span-2">
                <span className="app-field-label">Direccion</span>
                <input
                  value={empresaForm.direccion}
                  onChange={(event) =>
                    setEmpresaField('direccion', event.target.value)
                  }
                  className="app-input min-h-11"
                />
              </label>
            </div>
          </div>

          <div className="surface-subtle p-5">
            <div className="mb-4 eyebrow">Propietario inicial</div>
            <div className="grid gap-4">
              <Field
                label="Usuario"
                value={ownerForm.username}
                required
                onChange={(value) => setOwnerField('username', value)}
              />
              <Field
                label="Email"
                type="email"
                value={ownerForm.email}
                required
                onChange={(value) => setOwnerField('email', value)}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Nombre"
                  value={ownerForm.first_name}
                  onChange={(value) => setOwnerField('first_name', value)}
                />
                <Field
                  label="Apellido"
                  value={ownerForm.last_name}
                  onChange={(value) => setOwnerField('last_name', value)}
                />
              </div>
              <Field
                label="Password"
                type="password"
                value={ownerForm.password}
                required
                onChange={(value) => setOwnerField('password', value)}
              />
              <Field
                label="Confirmar password"
                type="password"
                value={ownerForm.confirm_password}
                required
                onChange={(value) =>
                  setOwnerField('confirm_password', value)
                }
              />
              <button
                type="submit"
                disabled={crearMutation.isPending}
                className="app-button-primary min-h-11"
              >
                <Plus className="h-4 w-4" />
                Crear empresa
              </button>
            </div>
          </div>
        </form>
      </SectionShell>

      <SectionShell
        eyebrow="Tenants"
        title="Empresas registradas"
        description="El estado inactivo bloquea operacion y facturacion para ese tenant."
      >
        {empresasQuery.isLoading && (
          <div className="flex min-h-[180px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-soft" />
          </div>
        )}

        <div className="grid gap-3">
          {empresas.map((empresa) => (
            <article
              key={empresa.id}
              className="grid gap-4 rounded-xl border border-app bg-white/75 p-4 xl:grid-cols-[1fr_0.7fr_0.8fr_auto]"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-soft" />
                  <div className="text-[14px] font-semibold text-main">
                    {empresa.nombre_comercial || empresa.razon_social}
                  </div>
                </div>
                <div className="mt-1 text-[12px] text-soft">
                  NIT {empresa.nit}
                  {empresa.digito_verificacion
                    ? `-${empresa.digito_verificacion}`
                    : ''}
                </div>
              </div>
              <Info label="Usuarios" value={empresa.usuarios_count} />
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={empresa.activo ? 'ACTIVA' : 'INACTIVA'} />
                <StatusBadge
                  status={empresa.factus_configured ? 'FACTUS' : 'SIN FACTUS'}
                />
              </div>
              <button
                type="button"
                onClick={() => toggleActivo(empresa)}
                disabled={editarMutation.isPending && editingId === empresa.id}
                className="app-button-secondary min-h-10"
              >
                <Save className="h-4 w-4" />
                {empresa.activo ? 'Inactivar' : 'Activar'}
              </button>
            </article>
          ))}
        </div>
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

function Info({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
        {label}
      </div>
      <div className="mt-2 text-[14px] font-semibold text-main">{value}</div>
    </div>
  );
}
