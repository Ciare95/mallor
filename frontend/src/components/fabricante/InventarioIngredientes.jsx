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
    <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
      <section className="surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow">Inventario de ingredientes</div>
            <h2 className="section-title mt-2">Pulso de abastecimiento</h2>
            <p className="body-copy mt-2 max-w-2xl">
              Control rapido del capital inmovilizado, cobertura disponible y
              puntos de reposicion para sostener la produccion.
            </p>
          </div>

          <button
            type="button"
            onClick={onCreateIngredient}
            className="app-button-primary min-h-11"
          >
            <PackageCheck className="h-4 w-4" />
            Nuevo ingrediente
          </button>
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
      </section>

      <section className="surface p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="eyebrow">Reposicion sugerida</div>
            <h3 className="section-title mt-2">Alertas de bajo stock</h3>
          </div>
          <div className="app-pill">
            {lowStockIngredients.length} en observacion
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {lowStockIngredients.length === 0 ? (
            <div className="empty-state min-h-[240px]">
              <AlertTriangle className="mb-3 h-10 w-10 text-[var(--accent)]" />
              <div className="text-base font-semibold text-main">
                Todo el stock esta por encima del minimo.
              </div>
              <p className="body-copy mt-2 max-w-sm">
                Puedes pasar a productos fabricados o registrar un nuevo insumo
                para ampliar el catalogo de recetas.
              </p>
            </div>
          ) : (
            lowStockIngredients.slice(0, 6).map((ingredient) => (
              <div
                key={ingredient.id}
                className="rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-main">
                      {ingredient.nombre}
                    </div>
                    <div className="mt-1 text-[12px] text-[var(--warning-text)]">
                      Disponible {formatNumber(ingredient.stock_actual)}{' '}
                      {unitLabel(ingredient.unidad_medida)} de un minimo de{' '}
                      {formatNumber(ingredient.stock_minimo)}{' '}
                      {unitLabel(ingredient.unidad_medida)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAdjustStock(ingredient)}
                    className="app-button-secondary min-h-10"
                  >
                    Ajustar stock
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
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
