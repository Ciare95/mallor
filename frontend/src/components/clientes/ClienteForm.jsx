import { createElement, useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { validarDocumentoCliente } from '../../services/clientes.service';
import {
  DOCUMENTO_LABELS,
  REGIMEN_LABELS,
  TIPO_CLIENTE_LABELS,
  buildClientePayload,
  createClienteFormState,
  validateClienteForm,
} from '../../utils/clientes';
import { formatCurrency } from '../../utils/formatters';
import { SectionShell } from './shared';

const EMPTY_ERRORS = {};

export default function ClienteForm({
  cliente,
  mode = 'create',
  isSubmitting,
  submitError,
  saldoPendiente = 0,
  onBack,
  onSubmit,
}) {
  const [form, setForm] = useState(() => createClienteFormState(cliente));
  const [touched, setTouched] = useState({});
  const deferredDocumento = useDeferredValue(form.numero_documento.trim());
  const isEdit = mode === 'edit';

  const duplicateQuery = useQuery({
    queryKey: [
      'clientes',
      'documento',
      form.tipo_documento,
      deferredDocumento,
      cliente?.id || 'new',
    ],
    queryFn: () =>
      validarDocumentoCliente({
        tipoDocumento: form.tipo_documento,
        numeroDocumento: deferredDocumento,
        clienteId: cliente?.id,
      }),
    enabled: deferredDocumento.length >= 3,
  });

  const duplicateDocument = Boolean(duplicateQuery.data?.duplicate);
  const validationErrors = useMemo(
    () =>
      validateClienteForm({
        form,
        duplicateDocument,
        saldoPendiente,
      }),
    [duplicateDocument, form, saldoPendiente],
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

    onSubmit(buildClientePayload(form));
  };

  const title = isEdit
    ? `Editar ${cliente?.nombre_completo || cliente?.razon_social || 'cliente'}`
    : 'Nuevo cliente';

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <SectionShell
        eyebrow={isEdit ? 'Actualizacion' : 'Alta comercial'}
        title={title}
        description="Completa identidad, contacto y politica de credito del cliente. La validacion responde en tiempo real sobre documento y cartera."
        actions={
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        }
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-2">
            <SelectField
              label="Tipo de cliente"
              value={form.tipo_cliente}
              onChange={(value) => setField('tipo_cliente', value)}
              options={Object.entries(TIPO_CLIENTE_LABELS).map(
                ([value, label]) => [label, value],
              )}
            />
            <SelectField
              label="Tipo de documento"
              value={form.tipo_documento}
              onChange={(value) => setField('tipo_documento', value)}
              options={Object.entries(DOCUMENTO_LABELS).map(
                ([value, label]) => [label, value],
              )}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <InputField
              label="Numero de documento"
              value={form.numero_documento}
              onChange={(value) => setField('numero_documento', value)}
              onBlur={() => handleBlur('numero_documento')}
              error={visibleErrors.numero_documento}
              helper={
                duplicateQuery.isFetching
                  ? 'Verificando disponibilidad...'
                  : 'Documento unico por tipo.'
              }
            />

            {form.tipo_cliente === 'NATURAL' ? (
              <InputField
                label="Nombre completo"
                value={form.nombre}
                onChange={(value) => setField('nombre', value)}
                onBlur={() => handleBlur('nombre')}
                error={visibleErrors.nombre}
                icon={UserRound}
              />
            ) : (
              <InputField
                label="Razon social"
                value={form.razon_social}
                onChange={(value) => setField('razon_social', value)}
                onBlur={() => handleBlur('razon_social')}
                error={visibleErrors.razon_social}
                icon={Building2}
              />
            )}
          </div>

          {form.tipo_cliente === 'JURIDICO' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <InputField
                label="Nombre comercial"
                value={form.nombre_comercial}
                onChange={(value) => setField('nombre_comercial', value)}
              />
              <SelectField
                label="Regimen tributario"
                value={form.regimen_tributario}
                onChange={(value) => setField('regimen_tributario', value)}
                options={Object.entries(REGIMEN_LABELS).map(
                  ([value, label]) => [label, value],
                )}
              />
            </div>
          )}

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Contacto
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
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
                label="Correo"
                value={form.email}
                onChange={(value) => setField('email', value)}
                onBlur={() => handleBlur('email')}
                error={visibleErrors.email}
                icon={Mail}
                type="email"
              />
              <InputField
                label="Codigo postal"
                value={form.codigo_postal}
                onChange={(value) => setField('codigo_postal', value)}
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

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <div className="mb-4 text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Credito y condiciones
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <InputField
                label="Limite de credito"
                type="number"
                value={form.limite_credito}
                onChange={(value) => setField('limite_credito', value)}
                onBlur={() => handleBlur('limite_credito')}
                error={visibleErrors.limite_credito}
                min="0"
                step="0.01"
              />
              <InputField
                label="Dias plazo"
                type="number"
                value={form.dias_plazo}
                onChange={(value) => setField('dias_plazo', value)}
                onBlur={() => handleBlur('dias_plazo')}
                error={visibleErrors.dias_plazo}
                min="0"
                step="1"
              />
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <ToggleRow
                label="Responsable IVA"
                checked={form.responsable_iva}
                onChange={(checked) => setField('responsable_iva', checked)}
              />
              <ToggleRow
                label="Cliente activo"
                checked={form.activo}
                onChange={(checked) => setField('activo', checked)}
              />
            </div>

            <label className="mt-4 block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                Observaciones
              </span>
              <textarea
                rows="4"
                value={form.observaciones}
                onChange={(event) => setField('observaciones', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-400/50"
              />
            </label>
          </div>
        </form>
      </SectionShell>

      <div className="space-y-6">
        <SectionShell
          eyebrow="Lectura"
          title="Resumen operativo"
          description="Referencia rapida de perfil, capacidad de credito y estado comercial antes de guardar cambios."
        >
          <div className="space-y-3">
            <SummaryRow
              label="Cliente"
              value={
                form.tipo_cliente === 'NATURAL'
                  ? form.nombre || 'Sin nombre'
                  : form.razon_social || 'Sin razon social'
              }
            />
            <SummaryRow
              label="Documento"
              value={`${DOCUMENTO_LABELS[form.tipo_documento] || form.tipo_documento} ${form.numero_documento || '--'}`}
            />
            <SummaryRow
              label="Limite"
              value={formatCurrency(form.limite_credito)}
            />
            <SummaryRow
              label="Saldo pendiente"
              value={formatCurrency(saldoPendiente)}
            />
            <SummaryRow
              label="Credito libre"
              value={formatCurrency(
                Number(form.limite_credito || 0) - Number(saldoPendiente || 0),
              )}
              featured
            />
          </div>

          {submitError && (
            <div className="mt-5 rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {submitError}
            </div>
          )}

          {!canSubmit && (
            <div className="mt-5 rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Corrige los campos marcados antes de guardar.
            </div>
          )}

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEdit ? 'Guardar cambios' : 'Crear cliente'}
            </button>
            <div className="rounded-[20px] border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4" />
                <span>
                  La validacion documental corre sobre el endpoint de busqueda
                  y bloquea duplicados por tipo y numero.
                </span>
              </div>
            </div>
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
  icon,
  type = 'text',
  min,
  step,
}) {
  const iconNode = icon
    ? createElement(icon, {
        className:
          'pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500',
      })
    : null;

  return (
    <label className="space-y-2">
      <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
        {label}
      </span>
      <div className="relative">
        {iconNode}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          min={min}
          step={step}
          className={`min-h-12 w-full rounded-2xl border bg-white/5 px-4 text-white outline-none transition ${
            error
              ? 'border-rose-400/40 focus:border-rose-400/60'
              : 'border-white/10 focus:border-emerald-400/50'
          } ${icon ? 'pl-11' : ''}`}
        />
      </div>
      {(error || helper) && (
        <div className={`text-sm ${error ? 'text-rose-200' : 'text-slate-400'}`}>
          {error || helper}
        </div>
      )}
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/50"
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
    <label className="flex min-h-12 items-center justify-between gap-4 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="text-sm font-semibold text-white">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`inline-flex h-7 w-14 items-center rounded-full border px-1 transition ${
          checked
            ? 'border-emerald-400/40 bg-emerald-400/20'
            : 'border-white/10 bg-white/10'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white transition ${
            checked ? 'translate-x-7' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
}

function SummaryRow({ label, value, featured = false }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div
        className={`text-right text-white ${
          featured ? 'font-display text-2xl' : 'text-sm font-semibold'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
