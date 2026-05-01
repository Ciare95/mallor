import { PieChart } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { getTopCategories } from '../../utils/informes';
import {
  EmptyPanel,
  PanelShell,
} from './shared';

const COLORS = [
  '#2f6a52',
  '#1f6c9f',
  '#956400',
  '#9f2f2d',
  '#7a6c5d',
  '#5a7d91',
];

export default function GraficoCategorias({
  totalGeneral = 0,
  categories = [],
}) {
  const visibleCategories = getTopCategories(categories, 6);

  if (!visibleCategories.length) {
    return (
      <PanelShell
        title="Ventas por categoria"
        subtitle="Participacion del periodo por categoria comercial."
      >
        <EmptyPanel
          icon={PieChart}
          title="Sin categorias activas"
          description="No se detectaron ventas para construir la distribucion del periodo."
        />
      </PanelShell>
    );
  }

  const segments = visibleCategories
    .map((item, index) => {
      const start = visibleCategories
        .slice(0, index)
        .reduce((accumulator, current) => accumulator + Number(current.porcentaje || 0), 0);
      const end = start + Number(item.porcentaje || 0);
      return `${COLORS[index % COLORS.length]} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <PanelShell
      title="Ventas por categoria"
      subtitle="Distribucion de facturacion y volumen por categoria."
    >
      <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="flex items-center justify-center">
          <div
            className="flex h-56 w-56 items-center justify-center rounded-full border border-app"
            style={{
              background: `conic-gradient(${segments})`,
            }}
          >
            <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-[var(--app-bg)] text-center">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Total
              </div>
              <div className="mt-2 font-display text-[1.8rem] leading-none text-main">
                {formatCurrency(totalGeneral)}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {visibleCategories.map((category, index) => (
            <article
              key={`${category.categoria}-${index}`}
              className="rounded-[20px] border border-app bg-white/72 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3.5 w-3.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <div className="text-[13px] font-semibold text-main">
                      {category.categoria}
                    </div>
                    <div className="mt-1 text-[12px] text-soft">
                      {formatNumber(category.cantidad_vendida)} unidades |{' '}
                      {formatNumber(category.cantidad_ventas)} ventas
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-main">
                    {formatCurrency(category.total_vendido)}
                  </div>
                  <div className="mt-1 text-[12px] text-soft">
                    {formatNumber(category.porcentaje)} %
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}
