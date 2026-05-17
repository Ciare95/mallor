import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, PencilLine, Plus, Save, X } from 'lucide-react';
import {
  actualizarEmpresaAdmin,
  crearEmpresaAdmin,
  listarEmpresasAdmin,
} from '../services/empresas.service';
import MunicipioLookupField from '../components/forms/MunicipioLookupField';
import { SectionShell, StatusBadge } from '../components/ventas/shared';
import { extractApiError } from '../utils/ventas';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/ui/Toast';
import {
  calculateNitVerificationDigit,
  sanitizeNumeric,
} from '../utils/nit';

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
  const isEditing = editingId !== null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['empresas'] });
  };

  const resetForms = () => {
    setEmpresaForm(EMPTY_EMPRESA);
    setOwnerForm(EMPTY_OWNER);
    setEditingId(null);
  };

  const crearMutation = useMutation({
    mutationFn: crearEmpresaAdmin,
    onSuccess: () => {
      invalidate();
      resetForms();
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
      resetForms();
      toast.success('Empresa actualizada');
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible actualizar empresa'));
    },
  });

  const setEmpresaField = (field, value) => {
    setEmpresaForm((current) => {
      const normalizedValue = field === 'nit' ? sanitizeNumeric(value) : value;
      const next = { ...current, [field]: normalizedValue };
      if (field === 'nit') {
        next.digito_verificacion = calculateNitVerificationDigit(normalizedValue);
      }
      return next;
    });
  };

  const setOwnerField = (field, value) => {
    setOwnerForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreate = (event) => {
    event.preventDefault();
    if (isEditing) {
      editarMutation.mutate({
        id: editingId,
        payload: empresaForm,
      });
      return;
    }
    crearMutation.mutate({
      ...empresaForm,
      propietario: ownerForm,
    });
  };

  const beginEdit = (empresa) => {
    setEditingId(empresa.id);
    setEmpresaForm({
      nit: empresa.nit || '',
      digito_verificacion: empresa.digito_verificacion || '',
      razon_social: empresa.razon_social || '',
      nombre_comercial: empresa.nombre_comercial || '',
      email: empresa.email || '',
      telefono: empresa.telefono || '',
      direccion: empresa.direccion || '',
      municipio_codigo: empresa.municipio_codigo || '',
      ambiente_facturacion: empresa.ambiente_facturacion || 'SANDBOX',
      activo: Boolean(empresa.activo),
    });
    setOwnerForm(EMPTY_OWNER);
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
        title={isEditing ? 'Editar empresa' : 'Empresas SaaS'}
        description={
          isEditing
            ? 'Ajusta datos fiscales y operativos del tenant seleccionado.'
            : 'Alta administrada de tenants, propietario inicial y estado operativo.'
        }
      >
        <form
          className={`grid gap-4 ${isEditing ? 'xl:grid-cols-1' : 'xl:grid-cols-[1.2fr_0.8fr]'}`}
          onSubmit={handleCreate}
        >
          <div className="surface-subtle p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="eyebrow">
                {isEditing ? 'Empresa en edicion' : 'Empresa'}
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForms}
                  className="app-button-secondary min-h-10 px-3"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
              )}
            </div>
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
                readOnly
                helper="Se calcula automaticamente desde el NIT."
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
              <MunicipioLookupField
                className="md:col-span-2"
                label="Municipio DIAN"
                code={empresaForm.municipio_codigo}
                onCodeChange={(value) => setEmpresaField('municipio_codigo', value)}
                helper="Selecciona el municipio y el codigo se asigna automaticamente."
              />
            </div>
          </div>

          {isEditing ? (
            <div className="surface-subtle p-5">
              <div className="mb-4 eyebrow">Edicion activa</div>
              <div className="grid gap-4">
                <Info
                  label="Empresa"
                  value={empresaForm.nombre_comercial || empresaForm.razon_social || '-'}
                />
                <Field
                  label="Estado"
                  value={empresaForm.activo ? 'Activa' : 'Inactiva'}
                  readOnly
                />
                <Info
                  label="Codigo municipio"
                  value={empresaForm.municipio_codigo || '--'}
                />
                <div className="text-[12px] leading-6 text-soft">
                  Usa este panel para corregir datos fiscales como direccion,
                  NIT y codigo de municipio antes de emitir facturas.
                </div>
              </div>
            </div>
          ) : (
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
          )}
          <div className={`${isEditing ? 'md:col-span-2' : 'hidden'}`}>
            <button
              type="submit"
              disabled={editarMutation.isPending}
              className="app-button-primary min-h-11"
            >
              <Save className="h-4 w-4" />
              Guardar cambios
            </button>
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
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => beginEdit(empresa)}
                  className="app-button-secondary min-h-10"
                >
                  <PencilLine className="h-4 w-4" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => toggleActivo(empresa)}
                  disabled={editarMutation.isPending}
                  className="app-button-secondary min-h-10"
                >
                  <Save className="h-4 w-4" />
                  {empresa.activo ? 'Inactivar' : 'Activar'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </SectionShell>

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange = () => {},
  type = 'text',
  required = false,
  readOnly = false,
  helper,
}) {
  return (
    <label className="app-field">
      <span className="app-field-label">{label}</span>
      <input
        type={type}
        required={required}
        value={value || ''}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className={`app-input min-h-11 ${readOnly ? 'bg-[var(--panel-soft)] text-soft' : ''}`}
      />
      {helper && <span className="text-[12px] text-soft">{helper}</span>}
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
