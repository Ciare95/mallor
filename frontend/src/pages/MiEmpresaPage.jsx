import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Save } from 'lucide-react';
import { actualizarEmpresa } from '../services/empresas.service';
import { useAppStore } from '../store/useStore';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/ui/Toast';
import { SectionShell } from '../components/ventas/shared';
import { extractApiError } from '../utils/ventas';

const EMPTY_FORM = {
  nit: '',
  digito_verificacion: '',
  razon_social: '',
  nombre_comercial: '',
  email: '',
  telefono: '',
  direccion: '',
  municipio_codigo: '',
  ambiente_facturacion: 'SANDBOX',
};

export default function MiEmpresaPage() {
  const queryClient = useQueryClient();
  const empresaActiva = useAppStore((state) => state.empresaActiva);
  const setEmpresaActiva = useAppStore((state) => state.setEmpresaActiva);
  const user = useAppStore((state) => state.user);
  const { toasts, toast, closeToast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);

  const rol = empresaActiva?.rol_usuario;
  const puedeEditar = ['PROPIETARIO', 'ADMIN'].includes(rol);
  const puedeEditarNit = rol === 'PROPIETARIO' || user?.is_superuser;

  useEffect(() => {
    if (empresaActiva) {
      setForm({
        ...EMPTY_FORM,
        ...empresaActiva,
      });
    }
  }, [empresaActiva]);

  const guardarMutation = useMutation({
    mutationFn: (payload) => actualizarEmpresa(empresaActiva.id, payload),
    onSuccess: (empresa) => {
      setEmpresaActiva(empresa);
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast.success('Datos de empresa actualizados');
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible guardar la empresa'));
    },
  });

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!empresaActiva || !puedeEditar) {
      return;
    }

    const payload = { ...form };
    if (!puedeEditarNit) {
      delete payload.nit;
    }
    delete payload.id;
    delete payload.rol_usuario;
    delete payload.activo;

    guardarMutation.mutate(payload);
  };

  if (!empresaActiva) {
    return (
      <SectionShell
        eyebrow="Configuracion"
        title="Mi empresa"
        description="No hay una empresa activa seleccionada."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionShell
        eyebrow="Configuracion"
        title="Mi empresa"
        description="Datos fiscales y comerciales usados por Mallor para documentos locales y validaciones operativas."
        actions={
          <span className="app-pill border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]">
            {rol || 'Sin rol'}
          </span>
        }
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-3">
            <Field
              label="NIT"
              value={form.nit}
              disabled={!puedeEditar || !puedeEditarNit}
              onChange={(value) => setField('nit', value)}
            />
            <Field
              label="Digito verificacion"
              value={form.digito_verificacion}
              disabled={!puedeEditar}
              onChange={(value) => setField('digito_verificacion', value)}
            />
            <SelectField
              label="Ambiente facturacion"
              value={form.ambiente_facturacion}
              disabled={!puedeEditar}
              onChange={(value) => setField('ambiente_facturacion', value)}
              options={[
                ['Sandbox', 'SANDBOX'],
                ['Produccion', 'PRODUCCION'],
              ]}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field
              label="Razon social"
              value={form.razon_social}
              disabled={!puedeEditar}
              required
              onChange={(value) => setField('razon_social', value)}
            />
            <Field
              label="Nombre comercial"
              value={form.nombre_comercial}
              disabled={!puedeEditar}
              onChange={(value) => setField('nombre_comercial', value)}
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              disabled={!puedeEditar}
              onChange={(value) => setField('email', value)}
            />
            <Field
              label="Telefono"
              value={form.telefono}
              disabled={!puedeEditar}
              onChange={(value) => setField('telefono', value)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.35fr]">
            <Field
              label="Direccion"
              value={form.direccion}
              disabled={!puedeEditar}
              onChange={(value) => setField('direccion', value)}
            />
            <Field
              label="Codigo municipio"
              value={form.municipio_codigo}
              disabled={!puedeEditar}
              onChange={(value) => setField('municipio_codigo', value)}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-app pt-4">
            <div className="flex items-center gap-2 text-[13px] text-soft">
              <Building2 className="h-4 w-4" />
              {puedeEditar
                ? 'Los cambios aplican solo a la empresa activa.'
                : 'Tu rol permite consulta, no edicion.'}
            </div>
            {puedeEditar && (
              <button
                type="submit"
                disabled={guardarMutation.isPending}
                className="app-button-primary min-h-11"
              >
                <Save className="h-4 w-4" />
                Guardar
              </button>
            )}
          </div>
        </form>
      </SectionShell>
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = 'text',
  required = false,
}) {
  return (
    <label className="app-field">
      <span className="app-field-label">{label}</span>
      <input
        type={type}
        value={value || ''}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="app-input min-h-11"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, disabled, options }) {
  return (
    <label className="app-field">
      <span className="app-field-label">{label}</span>
      <select
        value={value || ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="app-select min-h-11"
      >
        {options.map(([text, optionValue]) => (
          <option key={optionValue} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
