import {
  PackageOpen,
  CircleDollarSign,
  PieChart,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { FABRICANTE_UNIT_OPTIONS, unitLabel } from '../../utils/fabricante';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export default function CalculadoraCostos({
  metrics,
  marginTarget,
  onChangeMarginTarget,
  salePrice,
  onChangeSalePrice,
  onBlurSalePrice,
  saleUnitAmount,
  onChangeSaleUnitAmount,
  onBlurSaleUnitAmount,
  saleUnitMeasure,
  onChangeSaleUnitMeasure,
  productionUnitMeasure,
  readOnly = false,
}) {
  if (!metrics.items.length) {
    return (
      <section className="surface p-5 sm:p-6">
        <div className="eyebrow">Calculadora</div>
        <h3 className="section-title mt-2">Costos del lote</h3>
        <div className="empty-state mt-5 min-h-[260px]">
          <PieChart className="mb-3 h-10 w-10 text-[var(--accent)]" />
          <div className="text-base font-semibold text-main">
            Agrega ingredientes para activar el analisis.
          </div>
          <p className="body-copy mt-2 max-w-sm">
            Aqui apareceran el costo por lote, la utilidad sugerida y la
            composicion visual de la receta.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-app pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="eyebrow">Calculadora</div>
          <h3 className="section-title mt-2">Costo y rentabilidad</h3>
          <p className="body-copy mt-2 max-w-2xl">
            El precio sugerido se recalcula con el margen objetivo, mientras la
            utilidad real responde al precio de venta que registres.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Costo produccion"
            value={formatCurrency(metrics.productionCost)}
            icon={CircleDollarSign}
          />
          <MetricCard
            label="Costo unitario"
            value={formatCurrency(metrics.unitCost)}
            icon={Sparkles}
          />
          <MetricCard
            label="Margen actual"
            value={formatCurrency(metrics.utilityMargin)}
            icon={TrendingUp}
          />
          <MetricCard
            label="Rentabilidad"
            value={`${formatNumber(metrics.profitability)}%`}
            icon={PieChart}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-5">
          <div className="rounded-xl border border-app bg-white/72 p-4">
            <div className="eyebrow">Presentacion comercial</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="app-field">
                <span className="app-field-label">Cantidad por empaque</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={saleUnitAmount}
                  onChange={(event) =>
                    onChangeSaleUnitAmount(event.target.value)
                  }
                  onBlur={(event) =>
                    onBlurSaleUnitAmount?.(event.target.value)
                  }
                  disabled={readOnly}
                  className="app-input min-h-11"
                />
              </label>

              <label className="app-field">
                <span className="app-field-label">Unidad vendida</span>
                <select
                  value={saleUnitMeasure}
                  onChange={(event) =>
                    onChangeSaleUnitMeasure(event.target.value)
                  }
                  disabled={readOnly}
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
            <p className="mt-3 text-[12px] text-soft">
              El lote se produce en {unitLabel(productionUnitMeasure)} y luego
              se divide en presentaciones vendibles.
            </p>
            {!metrics.saleMeasureCompatible && (
              <p className="mt-3 rounded-lg border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-3 py-2 text-[12px] text-[var(--warning-text)]">
                La unidad de venta debe ser compatible con la unidad del lote.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-app bg-[var(--panel-soft)] p-4">
            <div className="eyebrow">Precio sugerido</div>
            <div className="mt-3 font-display text-[2.3rem] leading-none text-main">
              {formatCurrency(metrics.suggestedPrice)}
            </div>
            <p className="mt-2 text-[12px] text-soft">
              Calculado por presentacion con un objetivo de margen de {formatNumber(marginTarget)}%.
            </p>
          </div>

          <label className="app-field">
            <span className="app-field-label">
              Margen deseado {formatNumber(marginTarget)}%
            </span>
            <input
              type="range"
              min="10"
              max="150"
              step="1"
              value={marginTarget}
              onChange={(event) => onChangeMarginTarget(event.target.value)}
              disabled={readOnly}
              className="w-full accent-[var(--text-main)]"
            />
          </label>

          <label className="app-field">
            <span className="app-field-label">Precio por unidad vendida</span>
            <input
              type="number"
              min="0"
              step="1"
              value={salePrice}
              onChange={(event) => onChangeSalePrice(event.target.value)}
              onBlur={(event) => onBlurSalePrice?.(event.target.value)}
              disabled={readOnly}
              className="app-input min-h-11"
            />
          </label>
        </div>

        <div className="space-y-5">
          <div>
            <div className="eyebrow">Composicion de costos</div>
            <div className="mt-3 flex h-4 overflow-hidden rounded-full border border-app bg-white/72">
              {metrics.composition.map((item, index) => (
                <div
                  key={`${item.ingrediente_id}-${index}`}
                  className="h-full"
                  style={{
                    width: `${item.share || 0}%`,
                    backgroundColor: COST_COLORS[index % COST_COLORS.length],
                  }}
                  title={`${item.ingredient.nombre}: ${formatNumber(item.share)}%`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-app bg-[var(--panel-soft)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="eyebrow">Salida comercial</div>
                  <div className="mt-2 text-sm font-semibold text-main">
                    {formatNumber(metrics.saleUnitsCount)} presentaciones por lote
                  </div>
                </div>
                <PackageOpen className="h-4 w-4 text-soft" />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <MetricCard
                  label="Costo por presentacion"
                  value={formatCurrency(metrics.costPerSaleUnit)}
                  icon={CircleDollarSign}
                />
                <MetricCard
                  label="Formato de venta"
                  value={`${formatNumber(metrics.saleUnitAmount)} ${unitLabel(metrics.saleUnitMeasure)}`}
                  icon={PackageOpen}
                />
              </div>
            </div>

            {metrics.composition.map((item, index) => (
              <div
                key={`${item.ingrediente_id}-${index}`}
                className="rounded-xl border border-app bg-white/72 px-4 py-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            COST_COLORS[index % COST_COLORS.length],
                        }}
                      />
                      <div className="text-sm font-semibold text-main">
                        {item.ingredient.nombre}
                      </div>
                    </div>
                    <div className="mt-2 text-[12px] text-soft">
                      {formatNumber(item.amountNeeded)}{' '}
                      {unitLabel(item.unidad_medida)}
                      {item.conversionLabel ? ` · ${item.conversionLabel}` : ''}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold text-main">
                      {formatCurrency(item.totalIngredientCost)}
                    </div>
                    <div className="mt-1 text-[12px] text-soft">
                      {formatNumber(item.share)}% del lote
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

            <div className="rounded-xl border border-app bg-white/72 px-4 py-4">
              <div className="eyebrow">Lectura rapida</div>
              <ul className="mt-3 space-y-2 text-[13px] text-soft">
                <li>
                  El costo base por {unitLabel(productionUnitMeasure)} se calcula
                  desde el lote completo y luego se reparte por presentacion.
                </li>
                <li>
                  El precio sugerido y la utilidad se calculan sobre cada unidad
                  vendible, no sobre el lote completo.
                </li>
                <li>
                  Los ingredientes con mayor participacion son candidatos
                prioritarios para negociar costo o mejorar rendimiento.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

const COST_COLORS = ['#d9c7b7', '#a9c1b2', '#e7d89b', '#bcd7ea', '#d5c6df'];

function MetricCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-app bg-white/72 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="eyebrow">{label}</div>
        <Icon className="h-4 w-4 text-soft" />
      </div>
      <div className="mt-3 text-sm font-semibold text-main">{value}</div>
    </div>
  );
}
