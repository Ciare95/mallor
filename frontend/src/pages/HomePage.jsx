import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CreditCard,
  PackageSearch,
  PieChart,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  obtenerDashboardEstadisticas,
  obtenerEstadisticasVentasInforme,
} from '../services/informes.service';
import { mergeComparisonSeries } from '../utils/informes';
import {
  formatCurrency,
  formatNumber,
  formatShortDate,
} from '../utils/formatters';

const buildCurrentMonthRange = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    fecha_inicio: toIsoDate(start),
    fecha_fin: toIsoDate(today),
  };
};

const moduleLinks = [
  {
    title: 'Ventas POS',
    description: 'Caja, ventas y cobro rapido.',
    href: '/ventas',
    icon: CreditCard,
  },
  {
    title: 'Informes',
    description: 'Dashboard y reportes del negocio.',
    href: '/informes',
    icon: PieChart,
  },
  {
    title: 'Inventario',
    description: 'Stock, productos y movimientos.',
    href: '/inventario',
    icon: PackageSearch,
  },
  {
    title: 'IA',
    description: 'Asistente y consultas operativas.',
    href: '/ia',
    icon: Sparkles,
  },
];

export default function HomePage() {
  const monthRange = useMemo(() => buildCurrentMonthRange(), []);
  const previousYearMonthRange = useMemo(
    () => buildPreviousYearMonthRange(monthRange),
    [monthRange],
  );

  const dashboardQuery = useQuery({
    queryKey: ['home', 'dashboard', monthRange],
    queryFn: () => obtenerDashboardEstadisticas(monthRange),
    staleTime: 60000,
  });

  const ventasQuery = useQuery({
    queryKey: ['home', 'ventas', monthRange],
    queryFn: () => obtenerEstadisticasVentasInforme(monthRange),
    staleTime: 60000,
  });

  const ventasPreviousYearQuery = useQuery({
    queryKey: ['home', 'ventas', 'previous-year', previousYearMonthRange],
    queryFn: () =>
      obtenerEstadisticasVentasInforme({
        ...previousYearMonthRange,
        anio: Number(previousYearMonthRange.fecha_fin.slice(0, 4)),
      }),
    staleTime: 60000,
  });

  const resumen = dashboardQuery.data?.ventas?.resumen || {};
  const currentSeries = ventasQuery.data?.serie_diaria?.series || [];
  const previousSeries = ventasPreviousYearQuery.data?.serie_diaria?.series || [];
  const comparisonSeries = mergeComparisonSeries(currentSeries, previousSeries);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {moduleLinks.map((module) => (
          <ModuleShortcut key={module.href} {...module} />
        ))}
      </section>

      <section className="surface overflow-hidden px-5 py-5 sm:px-6 xl:px-7">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-app pb-4">
          <div>
            <div className="eyebrow">Ventas del mes actual</div>
            <h2 className="mt-2 font-display text-[2rem] leading-none text-main">
              Informe basico
            </h2>
            <p className="mt-2 text-[12px] text-soft">
              Desde {formatShortDate(monthRange.fecha_inicio)} hasta{' '}
              {formatShortDate(monthRange.fecha_fin)}.
            </p>
          </div>
          <Link to="/informes" className="app-button-secondary min-h-10">
            Ver informes
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {dashboardQuery.isLoading
          || ventasQuery.isLoading
          || ventasPreviousYearQuery.isLoading ? (
            <CompactStatePanel message="Cargando ventas del mes..." />
          ) : null}

          {dashboardQuery.isError
          || ventasQuery.isError
          || ventasPreviousYearQuery.isError ? (
            <CompactStatePanel message="No fue posible cargar el informe del mes." />
          ) : null}

          {!dashboardQuery.isLoading
          && !dashboardQuery.isError
          && !ventasQuery.isLoading
          && !ventasQuery.isError
          && !ventasPreviousYearQuery.isLoading
          && !ventasPreviousYearQuery.isError ? (
            <>
              <MetricCard
                label="Total vendido"
                value={formatCurrency(resumen.total_ventas || 0)}
                note="Facturacion acumulada del mes"
              />
              <MetricCard
                label="Cantidad de ventas"
                value={formatNumber(resumen.cantidad_ventas || 0)}
                note="Transacciones registradas"
              />
              <MetricCard
                label="Ticket promedio"
                value={formatCurrency(resumen.ticket_promedio || 0)}
                note="Promedio por venta"
              />
              <SalesLineChartCard
                series={comparisonSeries}
                previousYear={previousYearMonthRange.fecha_inicio.slice(0, 4)}
              />
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ModuleShortcut({ title, description, href, icon: Icon }) {
  return (
    <Link
      to={href}
      className="surface group flex min-h-[124px] flex-col justify-between px-4 py-4 transition hover:border-[var(--accent-line)] hover:bg-white/84"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-lg border border-app bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
          <Icon className="h-4 w-4" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted transition group-hover:text-main" />
      </div>
      <div className="pt-4">
        <h3 className="text-[15px] font-semibold text-main">{title}</h3>
        <p className="mt-1.5 text-[12px] leading-5 text-soft">{description}</p>
      </div>
    </Link>
  );
}

function MetricCard({ label, value, note }) {
  return (
    <div className="rounded-lg border border-app bg-white/62 px-4 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">
        {label}
      </div>
      <div className="mt-2 font-display text-[1.75rem] leading-none text-main">
        {value}
      </div>
      <div className="mt-1.5 text-[12px] text-soft">{note}</div>
    </div>
  );
}

function CompactStatePanel({ message }) {
  return (
    <div className="rounded-lg border border-app bg-white/62 px-4 py-4 text-[13px] text-soft md:col-span-3">
      {message}
    </div>
  );
}

function SalesLineChartCard({ series, previousYear }) {
  if (!series.length) {
    return (
      <div className="rounded-lg border border-app bg-white/62 px-4 py-4 md:col-span-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">
          Ventas por dia
        </div>
        <div className="mt-2 text-[13px] text-soft">
          Sin ventas registradas en el mes actual.
        </div>
      </div>
    );
  }

  const visibleSeries = series;
  const maxValue = Math.max(
    1,
    ...visibleSeries.flatMap((item) => [
      Number(item.total_ventas || 0),
      Number(item.total_anterior || 0),
    ]),
  );
  const width = Math.max(visibleSeries.length * 58, 680);
  const height = 260;
  const padding = { top: 16, right: 14, bottom: 42, left: 14 };
  const yAxisTicks = [1, 0.66, 0.33, 0].map((ratio) => ({
    ratio,
    value: Math.round(maxValue * ratio),
  }));
  const currentPoints = buildChartPoints({
    values: visibleSeries.map((item) => Number(item.total_ventas || 0)),
    width,
    height,
    padding,
    maxValue,
  });
  const previousPoints = buildChartPoints({
    values: visibleSeries.map((item) => Number(item.total_anterior || 0)),
    width,
    height,
    padding,
    maxValue,
  });
  const labelStep = Math.max(Math.ceil(visibleSeries.length / 8), 1);

  return (
    <div className="rounded-lg border border-app bg-white/62 px-4 py-4 md:col-span-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">
            Ventas por dia
          </div>
          <div className="mt-1 text-[12px] text-soft">
            Azul: mes actual. Naranja: mismo mes de {previousYear}.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-soft">
          <LegendDot color="bg-sky-500" label="Mes actual" />
          <LegendDot color="bg-orange-400" label={`Mismo mes ${previousYear}`} />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[260px] min-w-[680px] w-full"
          role="img"
          aria-label="Grafico de lineas de ventas por dia"
        >
          {yAxisTicks.map((tick) => {
            const y =
              padding.top +
              ((height - padding.top - padding.bottom) * (1 - tick.ratio));

            return (
              <g key={tick.ratio}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(24,23,22,0.12)"
                  strokeDasharray="4 6"
                />
                <text
                  x={width - padding.right}
                  y={y - 6}
                  textAnchor="end"
                  className="fill-[var(--text-muted)] text-[10px] font-semibold"
                >
                  {formatCompactCurrency(tick.value)}
                </text>
              </g>
            );
          })}

          <path
            d={toPath(previousPoints)}
            fill="none"
            stroke="#fb923c"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={toPath(currentPoints)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {previousPoints.map((point, index) => (
            <circle
              key={`previous-${point.x}-${index}`}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#fb923c"
            />
          ))}

          {currentPoints.map((point, index) => (
            <g key={`current-${point.x}-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4.2"
                fill="#3b82f6"
              />
              {index % labelStep === 0 || index === currentPoints.length - 1 ? (
                <text
                  x={point.x}
                  y={height - 12}
                  textAnchor="middle"
                  className="fill-[var(--text-muted)] text-[10px] font-semibold"
                >
                  {formatDayLabel(visibleSeries[index].fecha)}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}

function buildChartPoints({ values, width, height, padding, maxValue }) {
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

function formatDayLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getDate()}`;
}

function buildPreviousYearMonthRange(currentRange) {
  const startDate = new Date(`${currentRange.fecha_inicio}T00:00:00`);
  const endDate = new Date(`${currentRange.fecha_fin}T00:00:00`);

  const previousStart = new Date(
    startDate.getFullYear() - 1,
    startDate.getMonth(),
    startDate.getDate(),
  );
  const previousEnd = new Date(
    endDate.getFullYear() - 1,
    endDate.getMonth(),
    endDate.getDate(),
  );

  return {
    fecha_inicio: toIsoDate(previousStart),
    fecha_fin: toIsoDate(previousEnd),
          };
}

function formatCompactCurrency(value) {
  const amount = Number(value || 0);

  if (amount >= 1000000) {
    return `$${trimTrailingZero((amount / 1000000).toFixed(1))}M`;
  }

  if (amount >= 1000) {
    return `$${trimTrailingZero((amount / 1000).toFixed(1))}k`;
  }

  return formatCurrency(amount);
}

function trimTrailingZero(value) {
  return String(value).replace(/\.0$/, '');
}

function toIsoDate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
