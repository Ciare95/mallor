import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Save,
} from 'lucide-react';
import CalculadoraCostos from './CalculadoraCostos';
import PresentacionesBuilder from './PresentacionesBuilder';
import RecetaBuilder from './RecetaBuilder';
import {
  buildProductPayload,
  buildRecipeMetrics,
  createProductFabricadoFormState,
  FABRICANTE_UNIT_OPTIONS,
  mapPresentationItem,
  mapRecipeItem,
  normalizeDecimalInput,
  normalizeIntegerInput,
  safeNumber,
} from '../../utils/fabricante';

export default function ProductoFabricadoForm({
  product,
  ingredients,
  defaultMargin = 45,
  isLoading,
  isLoadingProduct,
  error,
  onCancel,
  onSubmit,
}) {
  const [form, setForm] = useState(() => createProductFabricadoFormState(product));
  const [recipeItems, setRecipeItems] = useState(
    (product?.receta || []).map(mapRecipeItem),
  );
  const [marginTarget, setMarginTarget] = useState(defaultMargin);
  const [presentations, setPresentations] = useState(
    (product?.presentaciones || []).map(mapPresentationItem),
  );
  const [presentationDraftId, setPresentationDraftId] = useState(null);
  const [presentationName, setPresentationName] = useState('');
  const [saleUnitAmount, setSaleUnitAmount] = useState('1');
  const [saleUnitMeasure, setSaleUnitMeasure] = useState(
    product?.unidad_medida || 'UNIDADES',
  );
  const [touched, setTouched] = useState({});

  useEffect(() => {
    const firstPresentation = product?.presentaciones?.[0] || null;
    const baseForm = createProductFabricadoFormState(product);
    setForm({
      ...baseForm,
      precio_venta:
        firstPresentation?.precio_venta !== undefined
          ? String(firstPresentation.precio_venta)
          : baseForm.precio_venta,
    });
    setRecipeItems((product?.receta || []).map(mapRecipeItem));
    setPresentations((product?.presentaciones || []).map(mapPresentationItem));
    setPresentationDraftId(firstPresentation?.id || null);
    setPresentationName(firstPresentation?.nombre || '');
    setMarginTarget(safeNumber(product?.porcentaje_utilidad) || defaultMargin);
    setSaleUnitAmount(
      firstPresentation?.cantidad_por_unidad !== undefined
        ? String(firstPresentation.cantidad_por_unidad)
        : '1',
    );
    setSaleUnitMeasure(
      firstPresentation?.unidad_medida || product?.unidad_medida || 'UNIDADES',
    );
    setTouched({});
  }, [defaultMargin, product]);

  const metrics = buildRecipeMetrics({
    recipeItems,
    cantidadProducida: form.cantidad_producida,
    precioVenta: form.precio_venta,
    margenObjetivo: marginTarget,
    lotes: 1,
    saleUnitAmount,
    saleUnitMeasure,
    productionUnitMeasure: form.unidad_medida,
  });

  const validationErrors = {};
  if (!form.nombre.trim()) {
    validationErrors.nombre = 'El nombre es obligatorio.';
  }
  if (!form.descripcion.trim()) {
    validationErrors.descripcion = 'La descripcion es obligatoria.';
  }
  if (safeNumber(form.cantidad_producida) <= 0) {
    validationErrors.cantidad_producida =
      'La cantidad producida debe ser mayor que cero.';
  }
  if (safeNumber(form.tiempo_produccion) < 0) {
    validationErrors.tiempo_produccion =
      'El tiempo de produccion no puede ser negativo.';
  }
  if (recipeItems.length === 0) {
    validationErrors.receta = 'Agrega al menos un ingrediente a la receta.';
  }
  if (presentations.some((item) => !item.nombre.trim())) {
    validationErrors.presentaciones =
      'Todas las presentaciones deben tener nombre.';
  }

  const visibleErrors =
    Object.keys(touched).length > 0
      ? Object.fromEntries(
          Object.entries(validationErrors).filter(([field]) => touched[field]),
        )
      : {};

  const canSubmit = Object.keys(validationErrors).length === 0;
  const isEdit = Boolean(product?.id);

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
      descripcion: true,
      cantidad_producida: true,
      tiempo_produccion: true,
      receta: true,
      presentaciones: true,
    });

    if (!canSubmit) {
      return;
    }

    onSubmit(
      buildProductPayload({
        form,
        recipeItems,
        suggestedPrice: metrics.suggestedPrice,
        presentations,
      }),
    );
  };

  const resetPresentationDraft = () => {
    setPresentationDraftId(null);
    setPresentationName('');
    setSaleUnitAmount('1');
    setSaleUnitMeasure(form.unidad_medida || 'UNIDADES');
    setField('precio_venta', '');
  };

  const handleSavePresentation = () => {
    const name = presentationName.trim();

    if (!name) {
      markTouched('presentaciones');
      return;
    }

    const nextItem = mapPresentationItem({
      id: presentationDraftId,
      local_id: presentationDraftId || `presentation-${Date.now()}`,
      nombre: name,
      cantidad_por_unidad: saleUnitAmount,
      unidad_medida: saleUnitMeasure,
      precio_venta: form.precio_venta,
      precio_venta_sugerido: metrics.suggestedPrice,
      costo_unitario_presentacion: metrics.costPerSaleUnit,
      margen_utilidad: metrics.utilityMargin,
      porcentaje_utilidad: metrics.profitability,
    });

    setPresentations((current) => {
      const currentWithoutEdited = current.filter(
        (item) => (item.id || item.local_id) !== presentationDraftId,
      );

      return [...currentWithoutEdited, nextItem];
    });

    resetPresentationDraft();
  };

  const handleEditPresentation = (presentation) => {
    setPresentationDraftId(presentation.id || presentation.local_id);
    setPresentationName(presentation.nombre);
    setSaleUnitAmount(String(presentation.cantidad_por_unidad));
    setSaleUnitMeasure(presentation.unidad_medida);
    setField('precio_venta', String(presentation.precio_venta || ''));
  };

  const handleRemovePresentation = (presentation) => {
    setPresentations((current) =>
      current.filter(
        (item) =>
          (item.id || item.local_id) !==
          (presentation.id || presentation.local_id),
      ),
    );
    if ((presentation.id || presentation.local_id) === presentationDraftId) {
      resetPresentationDraft();
    }
  };

  if (isLoadingProduct) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-app bg-white/72 text-soft">
        <Loader2 className="mr-3 h-5 w-5 animate-spin text-[var(--accent)]" />
        Cargando detalle del producto...
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-app pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow">
              {isEdit ? 'Edicion de lote' : 'Nuevo producto fabricado'}
            </div>
            <h2 className="section-title mt-2">
              {isEdit ? product.nombre : 'Construccion de producto'}
            </h2>
            <p className="body-copy mt-2 max-w-2xl">
              Define el lote, construye la receta y observa como cambian en
              tiempo real el costo unitario, la utilidad y la capacidad de
              produccion.
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

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field
            label="Nombre del producto"
            value={form.nombre}
            onChange={(value) => setField('nombre', value)}
            onBlur={() => markTouched('nombre')}
            error={visibleErrors.nombre}
            placeholder="Yogur natural, avena premium..."
            className="xl:col-span-2"
          />

          <label className="app-field">
            <span className="app-field-label">Unidad del lote</span>
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

          <Field
            label="Cantidad producida por lote"
            value={form.cantidad_producida}
            onChange={(value) => setField('cantidad_producida', value)}
            onBlur={(value) => {
              setField(
                'cantidad_producida',
                normalizeDecimalInput(value, {
                  fallback: '',
                  min: 0,
                }),
              );
              markTouched('cantidad_producida');
            }}
            error={visibleErrors.cantidad_producida}
            placeholder="10.0000"
            type="number"
            step="1"
            min="0"
          />

          <Field
            label="Tiempo de produccion (min)"
            value={form.tiempo_produccion}
            onChange={(value) => setField('tiempo_produccion', value)}
            onBlur={(value) => {
              setField(
                'tiempo_produccion',
                normalizeIntegerInput(value, {
                  fallback: '0',
                  min: 0,
                }),
              );
              markTouched('tiempo_produccion');
            }}
            error={visibleErrors.tiempo_produccion}
            placeholder="45"
            type="number"
            min="0"
          />

          <label className="app-field md:col-span-2 xl:col-span-4">
            <span className="app-field-label">Descripcion</span>
            <textarea
              rows="4"
              value={form.descripcion}
              onChange={(event) => setField('descripcion', event.target.value)}
              onBlur={() => markTouched('descripcion')}
              className={`app-textarea ${
                visibleErrors.descripcion
                  ? 'border-[rgba(159,47,45,0.24)] focus:border-[rgba(159,47,45,0.32)] focus:shadow-none'
                  : ''
              }`}
              placeholder="Presentacion, proceso, rendimiento esperado o notas de fabricacion."
            />
            {visibleErrors.descripcion && (
              <div className="mt-2 text-[12px] text-[var(--danger-text)]">
                {visibleErrors.descripcion}
              </div>
            )}
          </label>
        </div>
      </section>

      <RecetaBuilder
        ingredients={ingredients}
        quantityProduced={form.cantidad_producida}
        recipeItems={recipeItems}
        onChangeRecipe={setRecipeItems}
      />

      {visibleErrors.receta && (
        <div className="rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-text)]">
          {visibleErrors.receta}
        </div>
      )}

      <CalculadoraCostos
        metrics={metrics}
        marginTarget={marginTarget}
        onChangeMarginTarget={setMarginTarget}
        salePrice={form.precio_venta}
        onChangeSalePrice={(value) => setField('precio_venta', value)}
        onBlurSalePrice={(value) =>
          setField(
            'precio_venta',
            normalizeIntegerInput(value, {
              fallback: '',
              min: 0,
            }),
          )
        }
        saleUnitAmount={saleUnitAmount}
        onChangeSaleUnitAmount={setSaleUnitAmount}
        onBlurSaleUnitAmount={(value) =>
          setSaleUnitAmount(
            normalizeDecimalInput(value, {
              fallback: '1',
              min: 0,
            }),
          )
        }
        saleUnitMeasure={saleUnitMeasure}
        onChangeSaleUnitMeasure={setSaleUnitMeasure}
        productionUnitMeasure={form.unidad_medida}
      />

      <PresentacionesBuilder
        presentations={presentations}
        draftName={presentationName}
        onChangeDraftName={setPresentationName}
        draftQuantity={saleUnitAmount}
        draftUnit={saleUnitMeasure}
        draftPrice={form.precio_venta}
        productUnitMeasure={form.unidad_medida}
        productUnitCost={metrics.unitCost}
        marginTarget={marginTarget}
        onSavePresentation={handleSavePresentation}
        onEditPresentation={handleEditPresentation}
        onRemovePresentation={handleRemovePresentation}
      />

      {visibleErrors.presentaciones && (
        <div className="rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-text)]">
          {visibleErrors.presentaciones}
        </div>
      )}

      <section className="surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="eyebrow">Validacion de receta</div>
            <h3 className="section-title mt-2">Lectura de disponibilidad</h3>
            <p className="body-copy mt-2 max-w-2xl">
              El sistema advierte faltantes antes de guardar y deja listo el
              producto para pasar a produccion.
            </p>
          </div>

          <div
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
              metrics.allIngredientsAvailable
                ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] text-[var(--warning-text)]'
            }`}
          >
            {metrics.allIngredientsAvailable
              ? 'Todos los ingredientes alcanzan para un lote.'
              : `${metrics.missingIngredients.length} ingrediente(s) quedan por debajo del stock requerido.`}
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-text)]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      <div className="sticky bottom-4 z-10 rounded-xl border border-app bg-[var(--panel-strong)] p-4 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-[12px] text-soft">
            El lote base cuesta {metrics.unitCost.toFixed(4)} por{' '}
            {form.unidad_medida?.toLowerCase()} y ya tienes{' '}
            {presentations.length} presentacion
            {presentations.length !== 1 ? 'es' : ''} configurada
            {presentations.length !== 1 ? 's' : ''}.
          </div>

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
            {isEdit ? 'Guardar producto' : 'Crear producto fabricado'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  error,
  className = '',
  ...props
}) {
  return (
    <div className={className}>
      <label className="app-field">
        <span className="app-field-label">{label}</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => onBlur?.(event.target.value)}
          className={`app-input min-h-11 ${
            error
              ? 'border-[rgba(159,47,45,0.24)] focus:border-[rgba(159,47,45,0.32)] focus:shadow-none'
              : ''
          }`}
          {...props}
        />
      </label>
      {error && (
        <div className="mt-2 text-[12px] text-[var(--danger-text)]">
          {error}
        </div>
      )}
    </div>
  );
}
