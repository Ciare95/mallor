import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Loader2,
  Mail,
  Phone,
  Save,
  UserRound,
} from 'lucide-react';
import { validarDocumentoProveedor } from '../../services/proveedores.service';
import {
  DOCUMENTO_PROVEEDOR_LABELS,
  FORMA_PAGO_PROVEEDOR_LABELS,
  buildProveedorPayload,
  createProveedorFormState,
  validateProveedorForm,
} from '../../utils/proveedores';
import { HelperPanel, SectionShell } from './shared';

const EMPTY_ERRORS = {};

export default function ProveedorForm({
  proveedor,
  mode = 'create',
  isSubmitting,
  submitError,
  onBack,
  onSubmit,
}) {
  const [form, setForm] = useState(() => createProveedorFormState(proveedor));
  const [touched, setTouched] = useState({});
  const deferredDocumento = useDeferredValue(form.numero_documento.trim());
  const isEdit = mode === 'edit';

  const duplicateQuery = useQuery({
    queryKey: [
      'proveedores',
      'documento',
      deferredDocumento,
      proveedor?.id || 'new',
    ],
    queryFn: () =>
      validarDocumentoProveedor({
        numeroDocumento: deferredDocumento,
        proveedorId: proveedor?.id,
      }),
    enabled: deferredDocumento.length >= 3,
  });

  const duplicateDocument = Boolean(duplicateQuery.data?.duplicate);
  const validationErrors = useMemo(
    () =>
      validateProveedorForm({
        form,
        duplicateDocument,
      }),
    [duplicateDocument, form],
  );

  const visibleErrors = useMemo(() => {
    if (!Object.keys(touched).length && !submitError) {
      return EMPTY_ERRORS;
    }

    return Object.fromEntries(
      Object.entries(validationErrors).filter(([field]) => touched[field]),
    );
  }, [submitError, touched, validationErrors]);

  const canSubmit = Object.keys(validationErrors).length === 0;

  const setField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleBlur = (field) => {
    setTouched((current) => ({
      ...current,
      [field]: true,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const fields = Object.keys(validationErrors).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {},
    );
    setTouched(fields);

    if (!canSubmit) {
      return;
    }

    onSubmit(buildProveedorPayload(form));
  };

  const title = isEdit
    ? `Editar ${proveedor?.nombre_completo || proveedor?.razon_social || 'proveedor'}`
    : 'Nuevo proveedor';

  return (
    <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
      <SectionShell
        eyebrow={isEdit ? 'Actualizacion' : 'Alta de suministro'}
        title={title}
        description="Registra identidad legal, contacto, productos suministrados y condiciones de pago del proveedor."
        actions={
          <button type="button" onClick={onBack} className="app-button-secondary min-h-11">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        }
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-2">
            <SelectField
              label="Tipo de documento"
              value={form.tipo_documento}
              onChange={(value) => setField('tipo_documento', value)}
              options={Object.entries(DOCUMENTO_PROVEEDOR_LABELS).map(
                ([value, label]) => [label, value],
              )}
            />
            <InputField
              label="Numero de documento"
              value={form.numero_documento}
              onChange={(value) => setField('numero_documento', value)}
              onBlur={() => handleBlur('numero_documento')}
              error={visibleErrors.numero_documento}
              helper={
                duplicateQuery.isFetching
                  ? 'Verificando disponibilidad...'
                  : 'Documento unico de proveedor.'
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <InputField
              label="Razon social"
              value={form.razon_social}
              onChange={(value) => setField('razon_social', value)}
              onBlur={() => handleBlur('razon_social')}
              error={visibleErrors.razon_social}
              icon={Building2}
            />
            <InputField
              label="Nombre comercial"
              value={form.nombre_comercial}
              onChange={(value) => setField('nombre_comercial', value)}
            />
            <InputField
              label="Nombre de contacto"
              value={form.nombre_contacto}
              onChange={(value) => setField('nombre_contacto', value)}
              onBlur={() => handleBlur('nombre_contacto')}
              error={visibleErrors.nombre_contacto}
              icon={UserRound}
            />
            <SelectField
              label="Forma de pago"
              value={form.forma_pago}
              onChange={(value) => setField('forma_pago', value)}
              options={Object.entries(FORMA_PAGO_PROVEEDOR_LABELS).map(
                ([value, label]) => [label, value],
              )}
            />
          </div>

          <div className="surface-subtle p-5">
            <div className="mb-4 eyebrow">Contacto</div>
            <div className="grid gap-4 lg:grid-cols-2">
              <InputField
                label="Correo"
                value={form.email}
                onChange={(value) => setField('email', value)}
                onBlur={() => handleBlur('email')}
                error={visibleErrors.email}
                icon={Mail}
                type="email"
              />
              <InputField
                label="Telefono"
                value={form.telefono}
                onChange={(value) => setField('telefono', value)}
                onBlur={() => handleBlur('telefono')}
                error={visibleErrors.telefono}
                icon={Phone}
              />
              <InputField
                label="Celular"
                value={form.celular}
                onChange={(value) => setField('celular', value)}
              />
              <InputField
                label="Banco"
                value={form.banco}
                onChange={(value) => setField('banco', value)}
              />
              <InputField
                label="Cuenta bancaria"
                value={form.cuenta_bancaria}
                onChange={(value) => setField('cuenta_bancaria', value)}
              />
            </div>
            <div className="mt-4 grid gap-4">
              <InputField
                label="Direccion"
                value={form.direccion}
                onChange={(value) => setField('direccion', value)}
                onBlur={() => handleBlur('direccion')}
                error={visibleErrors.direccion}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <InputField
                  label="Ciudad"
                  value={form.ciudad}
                  onChange={(value) => setField('ciudad', value)}
                  onBlur={() => handleBlur('ciudad')}
                  error={visibleErrors.ciudad}
                />
                <InputField
                  label="Departamento"
                  value={form.departamento}
                  onChange={(value) => setField('departamento', value)}
                  onBlur={() => handleBlur('departamento')}
                  error={visibleErrors.departamento}
                />
              </div>
            </div>
          </div>

          <div className="surface-subtle p-5">
            <div className="mb-4 eyebrow">Catalogo suministrado</div>
            <label className="app-field">
              <span className="app-field-label">Tipo de productos</span>
              <textarea
                rows="5"
                value={form.tipo_productos}
                onChange={(event) => setField('tipo_productos', event.target.value)}
                onBlur={() => handleBlur('tipo_productos')}
                className={`app-textarea ${
                  visibleErrors.tipo_productos
                    ? 'border-[rgba(159,47,45,0.28)] focus:border-[rgba(159,47,45,0.42)] focus:shadow-none'
                    : ''
                }`}
              />
              {visibleErrors.tipo_productos && (
                <div className="text-[12px] text-[var(--danger-text)]">
                  {visibleErrors.tipo_productos}
                </div>
              )}
            </label>

            <label className="mt-4 block app-field">
              <span className="app-field-label">Observaciones</span>
              <textarea
                rows="4"
                value={form.observaciones}
                onChange={(event) => setField('observaciones', event.target.value)}
                className="app-textarea"
              />
            </label>

            <div className="mt-4">
              <ToggleRow
                label="Proveedor activo"
                checked={form.activo}
                onChange={(checked) => setField('activo', checked)}
              />
            </div>
          </div>
        </form>
      </SectionShell>

      <div className="space-y-6">
        <SectionShell
          eyebrow="Lectura"
          title="Resumen de proveedor"
          description="Referencia rapida para validar la ficha antes de guardarla."
        >
          <div className="space-y-3">
            <SummaryRow
              label="Proveedor"
              value={form.nombre_comercial || form.razon_social || 'Sin nombre'}
            />
            <SummaryRow
              label="Documento"
              value={`${DOCUMENTO_PROVEEDOR_LABELS[form.tipo_documento] || form.tipo_documento} ${form.numero_documento || '--'}`}
            />
            <SummaryRow
              label="Contacto"
              value={form.nombre_contacto || '--'}
            />
            <SummaryRow
              label="Pago"
              value={FORMA_PAGO_PROVEEDOR_LABELS[form.forma_pago] || form.forma_pago}
            />
          </div>

          {submitError && (
            <div className="mt-5 rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-text)]">
              {submitError}
            </div>
          )}

          {!canSubmit && (
            <div className="mt-5 rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-text)]">
              Corrige los campos marcados antes de guardar.
            </div>
          )}

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
              className="app-button-primary min-h-11"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEdit ? 'Guardar cambios' : 'Crear proveedor'}
            </button>
            <HelperPanel />
          </div>
        </SectionShell>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  onBlur,
  error,
  helper,
  icon: Icon,
  type = 'text',
}) {
  return (
    <label className="app-field">
      <span className="app-field-label">{label}</span>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        )}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className={`app-input min-h-11 ${Icon ? 'pl-10' : ''} ${
            error
              ? 'border-[rgba(159,47,45,0.28)] focus:border-[rgba(159,47,45,0.42)] focus:shadow-none'
              : ''
          }`}
        />
      </div>
      {(error || helper) && (
        <div
          className={`text-[12px] ${
            error ? 'text-[var(--danger-text)]' : 'text-soft'
          }`}
        >
          {error || helper}
        </div>
      )}
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="app-field">
      <span className="app-field-label">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="app-select min-h-11"
      >
        {options.map(([text, optionValue]) => (
          <option key={`${label}-${optionValue}`} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-app bg-white/72 px-4 py-3">
      <span className="text-sm font-semibold text-main">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`inline-flex h-7 w-14 items-center rounded-full border px-1 transition ${
          checked
            ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
            : 'border-app bg-[var(--panel-soft)]'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`h-5 w-5 rounded-full bg-[var(--text-main)] transition ${
            checked ? 'translate-x-7' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-app bg-white/72 px-4 py-4">
      <div className="eyebrow">{label}</div>
      <div className="text-right text-sm font-semibold text-main">{value}</div>
    </div>
  );
}
