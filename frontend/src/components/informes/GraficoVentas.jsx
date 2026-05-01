import { TrendingUp } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import {
  aggregateSeriesByGranularity,
  buildSparklineStatus,
  mergeComparisonSeries,
} from '../../utils/informes';
import {
  EmptyPanel,
  PanelShell,
} from './shared';

const GRANULARITY_OPTIONS = [
  { value: 'dia', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
];

export default function GraficoVentas({
  currentSeries = [],
  previousSeries = [],
  granularity = 'dia',
  onGranularityChange,
  comparison,
}) {
  if (!currentSeries.length) {
    return (
      <PanelShell
        title="Ventas en el tiempo"
        subtitle="Tendencia diaria, semanal o mensual del periodo visible."
      >
        <EmptyPanel
          icon={TrendingUp}
          title="Sin serie de ventas"
          description="No hay ventas suficientes para construir la tendencia del rango actual."
        />
      </PanelShell>
    );
  }

  const currentAggregated = aggregateSeriesByGranularity(
    currentSeries,
    granularity,
  );
  const previousAggregated = aggregateSeriesByGranularity(
    previousSeries,
    granularity,
  );
  const mergedSeries = mergeComparisonSeries(
    currentAggregated,
    previousAggregated,
  );
  const trendStatus = buildSparklineStatus(currentSeries);

  return (
    <PanelShell
      title="Ventas en el tiempo"
      subtitle={`Comparativo del periodo actual contra la ventana anterior, ${trendStatus}.`}
      actions={
        <>
          {GRANULARITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onGranularityChange(option.value)}
              className={`rounded-full border px-3 py-2 text-[11px] font-semibold transition ${
                granularity === option.value
                  ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-app bg-white/72 text-soft'
              }`}
            >
              {option.label}
            </button>
          ))}
        </>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1.16fr_0.84fr]">
        <LineChart series={mergedSeries} />

        <div className="space-y-3">
          <MetricMini
            label="Ventas del periodo"
            value={formatCurrency(comparison?.total_ventas?.actual)}
            note={`Previo ${formatCurrency(comparison?.total_ventas?.anterior)}`}
          />
          <MetricMini
            label="Cantidad de ventas"
            value={formatNumber(comparison?.cantidad_ventas?.actual || 0)}
            note={`Previo ${formatNumber(comparison?.cantidad_ventas?.anterior || 0)}`}
          />
          <MetricMini
            label="Ticket promedio"
            value={formatCurrency(comparison?.ticket_promedio?.actual)}
            note={`Previo ${formatCurrency(comparison?.ticket_promedio?.anterior)}`}
          />
        </div>
      </div>
    </PanelShell>
  );
}

function LineChart({ series }) {
  const width = 880;
  const height = 300;
  const padding = { top: 18, right: 18, bottom: 46, left: 18 };
  const maxValue = Math.max(
    1,
    ...series.flatMap((item) => [
      Number(item.total_ventas || 0),
      Number(item.total_anterior || 0),
    ]),
  );

  const pointsCurrent = buildPoints({
    values: series.map((item) => Number(item.total_ventas || 0)),
    width,
    height,
    padding,
    maxValue,
  });
  const pointsPrevious = buildPoints({
    values: series.map((item) => Number(item.total_anterior || 0)),
    width,
    height,
    padding,
    maxValue,
  });
  const step = Math.max(Math.ceil(series.length / 5), 1);

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-app bg-[var(--panel-soft)] p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[320px] w-full"
          role="img"
          aria-label="Grafico de lineas de ventas"
        >
          {[0, 1, 2, 3].map((index) => {
            const y =
              padding.top +
              ((height - padding.top - padding.bottom) / 3) * index;
            return (
              <line
                key={index}
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="rgba(24,23,22,0.08)"
                strokeDasharray="4 8"
              />
            );
          })}

          <path
            d={toPath(pointsPrevious)}
            fill="none"
            stroke="rgba(31,108,159,0.55)"
            strokeWidth="3"
            strokeDasharray="8 10"
          />
          <path
            d={toPath(pointsCurrent)}
            fill="none"
            stroke="rgba(47,106,82,0.96)"
            strokeWidth="4"
          />

          {pointsCurrent.map((point, index) => (
            <g key={`${point.x}-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4.5"
                fill="rgba(47,106,82,0.98)"
              />
              {index % step === 0 || index === pointsCurrent.length - 1 ? (
                <text
                  x={point.x}
                  y={height - 14}
                  textAnchor="middle"
                  className="fill-[var(--text-muted)] text-[11px]"
                >
                  {series[index].label}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <LegendCard
          label="Periodo actual"
          tone="current"
          helper="Linea principal"
        />
        <LegendCard
          label="Periodo anterior"
          tone="previous"
          helper="Comparativo homologado"
        />
      </div>
    </div>
  );
}

function buildPoints({ values, width, height, padding, maxValue }) {
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const divisor = Math.max(values.length - 1, 1);

  return values.map((value, index) => ({
    x: padding.left + (chartWidth / divisor) * index,
    y: padding.top + chartHeight - (Number(value || 0) / maxValue) * chartHeight,
  }));
}

function toPath(points) {
  if (!points.length) {
    return '';
  }

  return points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(' ');
}

function LegendCard({ label, helper, tone }) {
  const toneClass =
    tone === 'current'
      ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
      : 'border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)] text-[var(--info-text)]';

  return (
    <div className={`rounded-[18px] border px-4 py-4 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">
        {label}
      </div>
      <div className="mt-2 text-[13px]">{helper}</div>
    </div>
  );
}

function MetricMini({ label, value, note }) {
  return (
    <div className="rounded-[22px] border border-app bg-white/72 px-4 py-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-3 font-display text-[1.8rem] leading-none text-main">
        {value}
      </div>
      <div className="mt-2 text-[12px] text-soft">{note}</div>
    </div>
  );
}
