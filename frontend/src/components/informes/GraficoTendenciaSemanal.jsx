import { CalendarRange } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import {
  EmptyPanel,
  PanelShell,
} from './shared';

export default function GraficoTendenciaSemanal({ items = [] }) {
  if (!items.length) {
    return (
      <PanelShell
        title="Tendencia semanal"
        subtitle="Comportamiento de ventas por dia de la semana."
      >
        <EmptyPanel
          icon={CalendarRange}
          title="Sin tendencia semanal"
          description="No hay datos diarios suficientes para consolidar el patron semanal."
        />
      </PanelShell>
    );
  }

  const maxValue = Math.max(
    ...items.map((item) => Number(item.total_ventas || 0)),
    1,
  );

  return (
    <PanelShell
      title="Tendencia semanal"
      subtitle="Lectura rapida de los dias con mayor traccion comercial."
    >
      <div className="grid gap-4 lg:grid-cols-7">
        {items.map((item) => (
          <article
            key={item.label}
            className="rounded-[22px] border border-app bg-white/72 px-4 py-4"
          >
            <div className="eyebrow">{item.label}</div>
            <div className="mt-4 h-32 overflow-hidden rounded-[18px] border border-app bg-[var(--panel-soft)]">
              <div
                className="mx-auto mt-auto w-full rounded-t-[18px] bg-[linear-gradient(180deg,rgba(149,100,0,0.25),rgba(149,100,0,0.95))]"
                style={{
                  height: `${Math.max(
                    (Number(item.total_ventas || 0) / maxValue) * 100,
                    8,
                  )}%`,
                  marginTop: `${100 - Math.max(
                    (Number(item.total_ventas || 0) / maxValue) * 100,
                    8,
                  )}%`,
                }}
              />
            </div>
            <div className="mt-4 text-sm font-semibold text-main">
              {formatCurrency(item.total_ventas)}
            </div>
            <div className="mt-1 text-[12px] text-soft">
              {formatNumber(item.cantidad_ventas)} ventas
            </div>
          </article>
        ))}
      </div>
    </PanelShell>
  );
}
