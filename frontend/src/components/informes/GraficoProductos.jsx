import { BarChart3 } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import {
  EmptyPanel,
  PanelShell,
} from './shared';

export default function GraficoProductos({ products = [] }) {
  const topProducts = products.slice(0, 10);

  if (!topProducts.length) {
    return (
      <PanelShell
        title="Productos mas vendidos"
        subtitle="Ranking por cantidad y valor despachado."
      >
        <EmptyPanel
          icon={BarChart3}
          title="Sin ranking de productos"
          description="Todavia no hay ventas suficientes para construir el top del periodo."
        />
      </PanelShell>
    );
  }

  const maxValue = Math.max(
    ...topProducts.map((item) => Number(item.total_vendido || 0)),
    1,
  );

  return (
    <PanelShell
      title="Productos mas vendidos"
      subtitle="Top 10 por volumen de ventas y margen generado."
    >
      <div className="space-y-3">
        {topProducts.map((product, index) => (
          <article
            key={`${product.producto_id}-${index}`}
            className="rounded-[20px] border border-app bg-white/72 px-4 py-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-app bg-[var(--panel-soft)] text-[11px] font-semibold text-soft">
                    {index + 1}
                  </div>
                  <div>
                    <div className="truncate text-[14px] font-semibold text-main">
                      {product.nombre}
                    </div>
                    <div className="mt-1 text-[12px] text-soft">
                      {product.categoria || 'Sin categoria'} | {product.codigo_interno || 'Sin codigo'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <InlineMetric
                  label="Cantidad"
                  value={formatNumber(product.cantidad_vendida)}
                />
                <InlineMetric
                  label="Venta"
                  value={formatCurrency(product.total_vendido)}
                />
                <InlineMetric
                  label="Margen"
                  value={formatCurrency(product.margen_generado)}
                />
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-full border border-app bg-[var(--panel-soft)]">
              <div
                className="h-3 rounded-full bg-[linear-gradient(90deg,rgba(47,106,82,0.72),rgba(47,106,82,0.98))]"
                style={{
                  width: `${Math.max(
                    (Number(product.total_vendido || 0) / maxValue) * 100,
                    8,
                  )}%`,
                }}
              />
            </div>
          </article>
        ))}
      </div>
    </PanelShell>
  );
}

function InlineMetric({ label, value }) {
  return (
    <div className="rounded-[16px] border border-app bg-[var(--panel-soft)] px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </div>
      <div className="mt-2 text-[13px] font-semibold text-main">{value}</div>
    </div>
  );
}
