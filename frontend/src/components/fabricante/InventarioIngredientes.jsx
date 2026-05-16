import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  PackageCheck,
} from 'lucide-react';
import {
  getIngredientInventoryStats,
  unitLabel,
} from '../../utils/fabricante';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export default function InventarioIngredientes({
  ingredients,
  lowStockIngredients,
  onAdjustStock,
  onCreateIngredient,
}) {
  const stats = getIngredientInventoryStats(ingredients);

  return (
    <section className="surface p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="section-chip">Inventario de ingredientes</div>
          <div className="text-sm font-semibold text-main">
            Pulso de abastecimiento
          </div>
          <p className="max-w-2xl text-[12px] text-soft">
            Capital inmovilizado, cobertura y puntos de reposicion en una sola
            lectura.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="app-pill">
            {lowStockIngredients.length} en observacion
          </div>
          <button
            type="button"
            onClick={onCreateIngredient}
            className="app-button-primary min-h-10"
          >
            <PackageCheck className="h-4 w-4" />
            Nuevo ingrediente
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Valor total"
          value={formatCurrency(stats.totalValue)}
          helper="Costo acumulado del stock disponible."
          icon={CircleDollarSign}
        />
        <Metric
          label="Stock agregado"
          value={formatNumber(stats.totalStock)}
          helper="Suma de unidades base en bodega."
          icon={Boxes}
        />
        <Metric
          label="Bajo minimo"
          value={stats.underStockCount}
          helper="Ingredientes que ya requieren compra."
          icon={AlertTriangle}
          tone="warning"
        />
        <Metric
          label="Proveedores"
          value={stats.activeSuppliers}
          helper="Aliados activos en la cadena."
          icon={ArrowUpRight}
          tone="safe"
        />
      </div>

      <div className="mt-6 rounded-xl border border-app bg-white/68 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="eyebrow">Reposicion sugerida</div>
            <div className="mt-2 text-sm font-semibold text-main">
              Prioridades de abastecimiento
            </div>
          </div>
          {lowStockIngredients.length > 0 && (
            <div className="text-[12px] text-soft">
              Ajusta primero los insumos con menor cobertura.
            </div>
          )}
        </div>

        <div className="mt-4">
          {lowStockIngredients.length === 0 ? (
            <div className="rounded-xl border border-dashed border-app bg-[var(--panel-soft)] px-4 py-6 text-center">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[var(--accent)]" />
              <div className="text-base font-semibold text-main">
                Todo el stock esta por encima del minimo.
              </div>
              <p className="mx-auto mt-2 max-w-xl text-[12px] text-soft">
                Puedes concentrarte en fabricacion o registrar un nuevo insumo
                para ampliar el catalogo de recetas.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-3">
              {lowStockIngredients.slice(0, 3).map((ingredient) => (
                <div
                  key={ingredient.id}
                  className="rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-main">
                        {ingredient.nombre}
                      </div>
                      <div className="mt-1 text-[12px] text-[var(--warning-text)]">
                        Disponible {formatNumber(ingredient.stock_actual)}{' '}
                        {unitLabel(ingredient.unidad_medida)}
                      </div>
                    </div>
                    <div className="rounded-full border border-[rgba(149,100,0,0.18)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--warning-text)]">
                      Min {formatNumber(ingredient.stock_minimo)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAdjustStock(ingredient)}
                    className="app-button-secondary mt-4 min-h-10 w-full"
                  >
                    Ajustar stock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, helper, icon: Icon, tone = 'neutral' }) {
  const toneClass =
    tone === 'warning'
      ? 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)]'
      : tone === 'safe'
        ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
        : 'border-app bg-white/74';

  return (
    <article className={`rounded-xl border px-4 py-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="eyebrow">{label}</div>
        <Icon className="h-4 w-4 text-soft" />
      </div>
      <div className="mt-3 font-display text-[2rem] leading-none text-main">
        {value}
      </div>
      <p className="mt-2 text-[12px] text-soft">{helper}</p>
    </article>
  );
}
