import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Plus,
  Search,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import {
  buildRecipeMetrics,
  createRecipeDraft,
  FABRICANTE_UNIT_OPTIONS,
  formatCostNote,
  mapRecipeItem,
  normalizeDecimalInput,
  safeNumber,
  unitLabel,
} from '../../utils/fabricante';
import { formatNumber } from '../../utils/formatters';

export default function RecetaBuilder({
  ingredients,
  quantityProduced,
  recipeItems,
  onChangeRecipe,
}) {
  const [draft, setDraft] = useState(createRecipeDraft());
  const [searchDraft, setSearchDraft] = useState('');
  const deferredSearch = useDeferredValue(searchDraft);

  const availableIngredients = ingredients.filter((ingredient) => {
    const alreadyUsed = recipeItems.some(
      (item) => (item.ingrediente_id || item.ingrediente?.id) === ingredient.id,
    );
    const normalizedQuery = deferredSearch.trim().toLowerCase();

    return (
      !alreadyUsed &&
      (!normalizedQuery ||
        ingredient.nombre.toLowerCase().includes(normalizedQuery) ||
        (ingredient.descripcion || '')
          .toLowerCase()
          .includes(normalizedQuery))
    );
  });

  const selectedIngredient = ingredients.find(
    (ingredient) => Number(ingredient.id) === Number(draft.ingrediente_id),
  );

  useEffect(() => {
    if (selectedIngredient && !draft.unidad_medida) {
      setDraft(createRecipeDraft(selectedIngredient));
    }
  }, [draft.unidad_medida, selectedIngredient]);

  useEffect(() => {
    if (selectedIngredient && searchDraft !== selectedIngredient.nombre) {
      setSearchDraft(selectedIngredient.nombre);
    }
  }, [searchDraft, selectedIngredient]);

  const metrics = buildRecipeMetrics({
    recipeItems,
    cantidadProducida: quantityProduced,
    precioVenta: 0,
    margenObjetivo: 0,
    lotes: 1,
  });

  const addIngredient = () => {
    if (!selectedIngredient || safeNumber(draft.cantidad_necesaria) <= 0) {
      return;
    }

    const nextItems = [
      ...recipeItems,
      mapRecipeItem({
        ...draft,
        ingrediente: selectedIngredient,
      }),
    ];

    onChangeRecipe(nextItems);
    setDraft(createRecipeDraft());
    setSearchDraft('');
  };

  const removeIngredient = (ingredientId) => {
    onChangeRecipe(
      recipeItems.filter(
        (item) =>
          Number(item.ingrediente_id || item.ingrediente?.id) !==
          Number(ingredientId),
      ),
    );
  };

  const updateDraft = (field, value) => {
    startTransition(() => {
      setDraft((current) => ({
        ...current,
        [field]: value,
      }));
    });
  };

  const handleSearchChange = (value) => {
    setSearchDraft(value);

    if (
      selectedIngredient &&
      value.trim().toLowerCase() !==
        selectedIngredient.nombre.trim().toLowerCase()
    ) {
      setDraft((current) => ({
        ...current,
        ingrediente_id: '',
      }));
    }
  };

  const handleSelectIngredient = (ingredient) => {
    setDraft(createRecipeDraft(ingredient));
    setSearchDraft(ingredient.nombre);
  };

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-app pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="eyebrow">Receta visual</div>
          <h3 className="section-title mt-2">Constructor de receta</h3>
          <p className="body-copy mt-2 max-w-2xl">
            Busca ingredientes, elige la unidad de trabajo y valida en el acto
            si la conversion afecta costo o disponibilidad del lote.
          </p>
        </div>

        <div className="app-pill">
          {recipeItems.length} ingrediente{recipeItems.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-4">
          <label className="app-field">
            <span className="app-field-label">Buscar ingrediente</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={searchDraft}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Leche, azucar, cacao..."
                className="app-input min-h-11 pl-10"
              />
              <ChevronsUpDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>
          </label>

          <div className="rounded-xl border border-app bg-white/72 p-2">
            {availableIngredients.length === 0 ? (
              <div className="px-3 py-2 text-[12px] text-soft">
                {searchDraft.trim()
                  ? 'No hay coincidencias disponibles para agregar.'
                  : 'Escribe para filtrar y selecciona un ingrediente de la lista.'}
              </div>
            ) : (
              <div className="max-h-52 space-y-1 overflow-y-auto">
                {availableIngredients.slice(0, 8).map((ingredient) => {
                  const isSelected =
                    Number(draft.ingrediente_id) === Number(ingredient.id);

                  return (
                    <button
                      key={ingredient.id}
                      type="button"
                      onClick={() => handleSelectIngredient(ingredient)}
                      className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition ${
                        isSelected
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'text-main hover:bg-[var(--panel-soft)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {ingredient.nombre}
                        </div>
                        <div className="mt-1 text-[12px] text-soft">
                          {unitLabel(ingredient.unidad_medida)} · costo{' '}
                          {formatCostNote(ingredient.precio_por_unidad)}
                        </div>
                      </div>
                      {isSelected ? (
                        <Check className="h-4 w-4 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="app-field">
              <span className="app-field-label">Cantidad necesaria</span>
              <input
                type="number"
                min="0"
                step="1"
                value={draft.cantidad_necesaria}
                onChange={(event) =>
                  updateDraft('cantidad_necesaria', event.target.value)
                }
                onBlur={(event) =>
                  updateDraft(
                    'cantidad_necesaria',
                    normalizeDecimalInput(event.target.value, {
                      fallback: '',
                      min: 0,
                    }),
                  )
                }
                className="app-input min-h-11"
              />
            </label>

            <label className="app-field">
              <span className="app-field-label">Unidad de receta</span>
              <select
                value={draft.unidad_medida}
                onChange={(event) =>
                  updateDraft('unidad_medida', event.target.value)
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
          </div>

          {selectedIngredient && (
            <div className="rounded-xl border border-app bg-[var(--panel-soft)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-main">
                <WandSparkles className="h-4 w-4 text-[var(--accent)]" />
                Conversion automatica
              </div>
              <div className="mt-2 text-[12px] text-soft">
                Unidad base del ingrediente:{' '}
                <strong>{unitLabel(selectedIngredient.unidad_medida)}</strong>.
                {draft.unidad_medida !== selectedIngredient.unidad_medida && (
                  <>
                    {' '}La receta trabajara en{' '}
                    <strong>{unitLabel(draft.unidad_medida)}</strong> y el stock
                    se convertira automaticamente.
                  </>
                )}
              </div>
              <div className="mt-3 text-[12px] text-soft">
                Costo base: {formatCostNote(selectedIngredient.precio_por_unidad)}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={addIngredient}
            disabled={!selectedIngredient || safeNumber(draft.cantidad_necesaria) <= 0}
            className="app-button-primary min-h-11 w-full"
          >
            <Plus className="h-4 w-4" />
            Agregar ingrediente a la receta
          </button>
        </div>

        <div className="space-y-3">
          {metrics.items.length === 0 ? (
            <div className="empty-state min-h-[320px]">
              <Plus className="mb-3 h-10 w-10 text-[var(--accent)]" />
              <div className="text-base font-semibold text-main">
                La receta aun esta vacia.
              </div>
              <p className="body-copy mt-2 max-w-sm">
                Agrega ingredientes para ver su costo, conversion y cobertura
                sobre el lote.
              </p>
            </div>
          ) : (
            metrics.items.map((item) => (
              <article
                key={item.ingrediente_id}
                className="rounded-xl border border-app bg-white/76 p-4"
              >
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-main">
                        {item.ingredient.nombre}
                      </h4>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          item.isAvailable
                            ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] text-[var(--warning-text)]'
                        }`}
                      >
                        {item.isAvailable ? 'Disponible' : 'Faltante'}
                      </span>
                    </div>
                    <div className="mt-2 text-[12px] text-soft">
                      {formatNumber(item.amountNeeded)}{' '}
                      {unitLabel(item.unidad_medida)}
                      {item.conversionLabel ? ` · ${item.conversionLabel}` : ''}
                    </div>
                    <div className="mt-2 text-[12px] text-soft">
                      Stock actual {formatNumber(item.stockAvailable)}{' '}
                      {unitLabel(item.ingredient.unidad_medida)}
                    </div>
                    {!item.isAvailable && (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-3 py-2 text-[12px] text-[var(--warning-text)]">
                        <AlertTriangle className="h-4 w-4" />
                        Faltan {formatNumber(Math.abs(item.remainingAfterProduction))}{' '}
                        {unitLabel(item.ingredient.unidad_medida)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-main">
                        {formatCostNote(item.ingredientCost)}
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        costo por lote
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeIngredient(item.ingrediente_id)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-[12px] font-semibold text-[var(--danger-text)] transition hover:bg-[var(--danger-soft)]"
                    >
                      <Trash2 className="h-4 w-4" />
                      Quitar
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
