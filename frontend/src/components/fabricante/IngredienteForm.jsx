import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CircleDollarSign,
  Factory,
  Loader2,
  Package,
  Save,
} from 'lucide-react';
import { listarProveedores } from '../../services/proveedores.service';
import {
  buildIngredientPayload,
  createIngredientFormState,
  FABRICANTE_UNIT_OPTIONS,
  normalizeDecimalInput,
  safeNumber,
  unitLabel,
} from '../../utils/fabricante';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const EMPTY_ERRORS = {};

export default function IngredienteForm({
  ingredient,
  isLoading,
  error,
  onCancel,
  onSubmit,
}) {
  const [form, setForm] = useState(() => createIngredientFormState(ingredient));
  const [touched, setTouched] = useState({});

  useEffect(() => {
    setForm(createIngredientFormState(ingredient));
    setTouched({});
  }, [ingredient]);

  const providersQuery = useQuery({
    queryKey: ['proveedores', 'selector'],
    queryFn: () => listarProveedores({ page_size: 100, ordering: 'nombre' }),
  });

  const proveedorOptions = providersQuery.data?.results || providersQuery.data || [];
  const isEdit = Boolean(ingredient?.id);
  const price = safeNumber(form.precio_por_unidad);
  const stock = safeNumber(form.stock_actual);
  const minimum = safeNumber(form.stock_minimo);
  const inventoryValue = price * stock;
  const stockGap = stock - minimum;

  const validationErrors = {};
  if (!form.nombre.trim()) {
    validationErrors.nombre = 'El nombre es obligatorio.';
  }
  if (price <= 0) {
    validationErrors.precio_por_unidad = 'Ingresa un costo mayor que cero.';
  }
  if (stock < 0) {
    validationErrors.stock_actual = 'El stock actual no puede ser negativo.';
  }
  if (minimum < 0) {
    validationErrors.stock_minimo = 'El stock minimo no puede ser negativo.';
  }

  const visibleErrors =
    Object.keys(touched).length > 0
      ? Object.fromEntries(
          Object.entries(validationErrors).filter(([field]) => touched[field]),
        )
      : EMPTY_ERRORS;

  const canSubmit = Object.keys(validationErrors).length === 0;

  const setField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const markTouched = (field) => {
    setTouched((current) => ({
      ...current,
      [field]: true,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setTouched({
      nombre: true,
      precio_por_unidad: true,
      stock_actual: true,
      stock_minimo: true,
    });

    if (!canSubmit) {
      return;
    }

    onSubmit(buildIngredientPayload(form));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <section className="surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-app pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow">
              {isEdit ? 'Edicion de insumo' : 'Alta de materia prima'}
            </div>
            <h2 className="section-title mt-2">
              {isEdit ? ingredient.nombre : 'Nuevo ingrediente'}
            </h2>
            <p className="body-copy mt-2 max-w-2xl">
              Registra costo base, unidad de compra, proveedor principal y
              niveles de reposicion para mantener la receta sincronizada.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="app-button-secondary min-h-11"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Nombre"
              value={form.nombre}
              onChange={(value) => setField('nombre', value)}
              onBlur={() => markTouched('nombre')}
              error={visibleErrors.nombre}
              placeholder="Leche entera, azucar, esencia..."
              className="md:col-span-2"
            />

            <label className="app-field">
              <span className="app-field-label">Unidad base</span>
              <select
                value={form.unidad_medida}
                onChange={(event) =>
                  setField('unidad_medida', event.target.value)
                }
                className="app-select min-h-11"
              >
                {FABRICANTE_UNIT_OPTIONS.map(([label, value]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="app-field">
              <span className="app-field-label">Proveedor principal</span>
              <select
                value={form.proveedor_id}
                onChange={(event) =>
                  setField('proveedor_id', event.target.value)
                }
                className="app-select min-h-11"
              >
                <option value="">Sin proveedor asignado</option>
                {proveedorOptions.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.nombre_completo || provider.razon_social}
                  </option>
                ))}
              </select>
            </label>

            <Field
              label="Costo por unidad"
              value={form.precio_por_unidad}
              onChange={(value) => setField('precio_por_unidad', value)}
              onBlur={(value) => {
                setField(
                  'precio_por_unidad',
                  normalizeDecimalInput(value, {
                    fallback: '0',
                    min: 0,
                  }),
                );
                markTouched('precio_por_unidad');
              }}
              error={visibleErrors.precio_por_unidad}
              placeholder="0.0000"
              type="number"
              step="1"
              min="0"
              icon={CircleDollarSign}
            />
            <Field
              label="Stock actual"
              value={form.stock_actual}
              onChange={(value) => setField('stock_actual', value)}
              onBlur={(value) => {
                setField(
                  'stock_actual',
                  normalizeDecimalInput(value, {
                    fallback: '0',
                    min: 0,
                  }),
                );
                markTouched('stock_actual');
              }}
              error={visibleErrors.stock_actual}
              placeholder="0.0000"
              type="number"
              step="1"
              min="0"
              icon={Package}
            />
            <Field
              label="Stock minimo"
              value={form.stock_minimo}
              onChange={(value) => setField('stock_minimo', value)}
              onBlur={(value) => {
                setField(
                  'stock_minimo',
                  normalizeDecimalInput(value, {
                    fallback: '0',
                    min: 0,
                  }),
                );
                markTouched('stock_minimo');
              }}
              error={visibleErrors.stock_minimo}
              placeholder="0.0000"
              type="number"
              step="1"
              min="0"
              icon={Factory}
            />

            <label className="app-field md:col-span-2">
              <span className="app-field-label">Descripcion</span>
              <textarea
                rows="5"
                value={form.descripcion}
                onChange={(event) =>
                  setField('descripcion', event.target.value)
                }
                className="app-textarea"
                placeholder="Condiciones de compra, presentacion, calidad o notas de fabricacion."
              />
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-text)]">
              {error}
            </div>
          )}

          <div className="sticky bottom-4 z-10 rounded-xl border border-app bg-[var(--panel-strong)] p-4 backdrop-blur">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] text-soft">
                La unidad base define conversiones, stock y costo de receta.
              </p>

              <button
                type="submit"
                disabled={isLoading || !canSubmit}
                className="app-button-primary min-h-11"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isEdit ? 'Guardar ingrediente' : 'Crear ingrediente'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <aside className="space-y-6">
        <section className="surface p-5 sm:p-6">
          <div className="eyebrow">Lectura operativa</div>
          <h3 className="section-title mt-2">Resumen del ingrediente</h3>

          <div className="mt-5 grid gap-3">
            <StatCard
              label="Valor inmovilizado"
              value={formatCurrency(inventoryValue)}
              helper="Costo base multiplicado por stock actual."
            />
            <StatCard
              label="Unidad de control"
              value={unitLabel(form.unidad_medida)}
              helper="La receta puede consumir otra unidad compatible."
            />
            <StatCard
              label="Cobertura sobre minimo"
              value={`${formatNumber(stockGap)} ${unitLabel(form.unidad_medida)}`}
              helper={
                stockGap >= 0
                  ? 'Hay margen antes de disparar alerta.'
                  : 'Se recomienda reponer antes de producir.'
              }
              tone={stockGap >= 0 ? 'safe' : 'warning'}
            />
          </div>
        </section>

        <section className="surface p-5 sm:p-6">
          <div className="eyebrow">Validacion</div>
          <div className="mt-4 space-y-3">
            <CheckRow
              ok={Boolean(form.nombre.trim())}
              label="Nombre comercial o tecnico"
            />
            <CheckRow
              ok={price > 0}
              label="Costo mayor que cero"
            />
            <CheckRow
              ok={stock >= 0 && minimum >= 0}
              label="Niveles de stock coherentes"
            />
          </div>
        </section>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  error,
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <div className={className}>
      <label className="app-field">
        <span className="app-field-label">{label}</span>
        <div className="relative">
          {Icon && (
            <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          )}
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={(event) => onBlur?.(event.target.value)}
            className={`app-input min-h-11 ${Icon ? 'pl-10' : ''} ${
              error
                ? 'border-[rgba(159,47,45,0.24)] focus:border-[rgba(159,47,45,0.32)] focus:shadow-none'
                : ''
            }`}
            {...props}
          />
        </div>
      </label>
      {error && (
        <div className="mt-2 text-[12px] text-[var(--danger-text)]">
          {error}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, helper, tone = 'neutral' }) {
  const toneClass =
    tone === 'warning'
      ? 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)]'
      : tone === 'safe'
        ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
        : 'border-app bg-white/72';

  return (
    <div className={`rounded-xl border px-4 py-4 ${toneClass}`}>
      <div className="eyebrow">{label}</div>
      <div className="mt-2 text-[1.05rem] font-semibold text-main">
        {value}
      </div>
      <div className="mt-2 text-[12px] text-soft">{helper}</div>
    </div>
  );
}

function CheckRow({ ok, label }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        ok
          ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
          : 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] text-[var(--warning-text)]'
      }`}
    >
      {label}
    </div>
  );
}
