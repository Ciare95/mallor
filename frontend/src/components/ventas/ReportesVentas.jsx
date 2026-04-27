import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  CalendarRange,
  Loader2,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import {
  obtenerCuentasPorCobrar,
  obtenerEstadisticasVentas,
  obtenerProductosTopVentas,
  obtenerVentasPorPeriodo,
} from '../../services/ventas.service';
import {
  formatCurrency,
  formatNumber,
  formatShortDate,
} from '../../utils/formatters';
import { normalizeCollection } from '../../utils/ventas';
import { EmptyState, SectionShell } from './shared';

const defaultFiltro = {
  periodo: 'mes',
  fecha_inicio: '',
  fecha_fin: '',
};

export default function ReportesVentas() {
  const [filtro, setFiltro] = useState(defaultFiltro);

  const params =
    filtro.periodo === 'personalizado'
      ? {
          periodo: 'personalizado',
          fecha_inicio: filtro.fecha_inicio,
          fecha_fin: filtro.fecha_fin,
        }
      : { periodo: filtro.periodo };

  const estadisticasQuery = useQuery({
    queryKey: ['ventas', 'reportes', 'estadisticas', params],
    queryFn: () => obtenerEstadisticasVentas(params),
  });

  const periodoQuery = useQuery({
    queryKey: ['ventas', 'reportes', 'periodo', params],
    queryFn: () =>
      obtenerVentasPorPeriodo({
        fecha_inicio: params.fecha_inicio,
        fecha_fin: params.fecha_fin,
      }),
  });

  const productosQuery = useQuery({
    queryKey: ['ventas', 'reportes', 'productos-top', params],
    queryFn: () =>
      obtenerProductosTopVentas({
        fecha_inicio: params.fecha_inicio,
        fecha_fin: params.fecha_fin,
        limite: 5,
      }),
  });

  const carteraQuery = useQuery({
    queryKey: ['ventas', 'reportes', 'cartera'],
    queryFn: () => obtenerCuentasPorCobrar({ page_size: 50 }),
  });

  const loading =
    estadisticasQuery.isLoading ||
    periodoQuery.isLoading ||
    productosQuery.isLoading ||
    carteraQuery.isLoading;

  const hasError =
    estadisticasQuery.isError ||
    periodoQuery.isError ||
    productosQuery.isError ||
    carteraQuery.isError;

  const estadisticas = estadisticasQuery.data;
  const ventasPeriodo = normalizeCollection(periodoQuery.data).results || [];
  const productosTop = productosQuery.data || [];
  const cartera = normalizeCollection(carteraQuery.data).results || [];

  const groupedSales = agruparVentasPorDia(ventasPeriodo);
  const paymentBreakdown = agruparPorMetodo(ventasPeriodo);
  const clientesTop = agruparPorCliente(ventasPeriodo).slice(0, 5);

  return (
    <SectionShell
      eyebrow="Inteligencia comercial"
      title="Reportes de ventas"
      description="Lectura rapida del periodo, comportamiento de cobro y mezcla de pagos, sin depender de una libreria pesada de graficos."
    >
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-xl border border-app bg-white/76 p-5">
          <div className="eyebrow">Periodo</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="app-field sm:col-span-2">
              <span className="text-[13px] font-semibold text-main">
                Ventana de analisis
              </span>
              <select
                value={filtro.periodo}
                onChange={(event) =>
                  setFiltro((current) => ({
                    ...current,
                    periodo: event.target.value,
                  }))
                }
                className="app-select min-h-10"
              >
                <option value="hoy">Hoy</option>
                <option value="semana">Semana</option>
                <option value="mes">Mes</option>
                <option value="anio">Anio</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </label>

            {filtro.periodo === 'personalizado' && (
              <>
                <label className="app-field">
                  <span className="text-[13px] font-semibold text-main">
                    Fecha inicio
                  </span>
                  <input
                    type="date"
                    value={filtro.fecha_inicio}
                    onChange={(event) =>
                      setFiltro((current) => ({
                        ...current,
                        fecha_inicio: event.target.value,
                      }))
                    }
                    className="app-input min-h-10"
                  />
                </label>
                <label className="app-field">
                  <span className="text-[13px] font-semibold text-main">
                    Fecha fin
                  </span>
                  <input
                    type="date"
                    value={filtro.fecha_fin}
                    onChange={(event) =>
                      setFiltro((current) => ({
                        ...current,
                        fecha_fin: event.target.value,
                      }))
                    }
                    className="app-input min-h-10"
                  />
                </label>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-app bg-white/76">
            <Loader2 className="h-5 w-5 animate-spin text-soft" />
          </div>
        ) : hasError ? (
          <EmptyState
            icon={BarChart3}
            title="No fue posible construir el reporte"
            description="Hay un problema con una o varias fuentes del dashboard."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Ingresos"
              value={formatCurrency(estadisticas?.ingresos)}
              icon={TrendingUp}
            />
            <MetricCard
              label="Ventas"
              value={formatNumber(estadisticas?.total_ventas || 0)}
              icon={CalendarRange}
            />
            <MetricCard
              label="Ticket"
              value={formatCurrency(estadisticas?.ticket_promedio)}
              icon={BarChart3}
            />
            <MetricCard
              label="Cartera"
              value={formatCurrency(estadisticas?.saldo_pendiente)}
              icon={PieChart}
            />
          </div>
        )}
      </div>

      {!loading && !hasError && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <ChartPanel
            title="Ventas por periodo"
            subtitle="Tendencia de facturacion del rango visible."
          >
            <LineBars data={groupedSales} />
          </ChartPanel>

          <ChartPanel
            title="Metodos de pago"
            subtitle="Participacion del periodo."
          >
            <DonutBreakdown data={paymentBreakdown} />
          </ChartPanel>

          <ChartPanel
            title="Clientes con mayor facturacion"
            subtitle="Agrupado sobre las ventas del periodo."
          >
            <RankingList
              items={clientesTop.map((item) => ({
                label: item.label,
                value: formatCurrency(item.value),
              }))}
            />
          </ChartPanel>

          <ChartPanel
            title="Productos mas vendidos"
            subtitle="Ranking de unidades despachadas."
          >
            <RankingList
              items={productosTop.map((item) => ({
                label: item.producto_nombre || item.nombre || 'Producto',
                value: `${formatNumber(item.total_vendido || item.cantidad || item.unidades_vendidas || 0)} uds`,
              }))}
            />
          </ChartPanel>

          <ChartPanel
            title="Cartera activa"
            subtitle="Ventas con saldo pendiente y antiguedad."
            className="xl:col-span-2"
          >
            <div className="grid gap-3 md:grid-cols-3">
              <MetricMini
                label="Total cartera"
                value={formatCurrency(
                  cartera.reduce(
                    (acc, venta) => acc + Number(venta.saldo_pendiente || 0),
                    0,
                  ),
                )}
              />
              <MetricMini
                label="Casos abiertos"
                value={formatNumber(cartera.length)}
              />
              <MetricMini
                label="Mayor saldo"
                value={formatCurrency(
                  cartera.reduce(
                    (acc, venta) =>
                      Math.max(acc, Number(venta.saldo_pendiente || 0)),
                    0,
                  ),
                )}
              />
            </div>
          </ChartPanel>
        </div>
      )}
    </SectionShell>
  );
}

function MetricCard({ label, value, icon }) {
  const IconComponent = icon;

  return (
    <div className="rounded-xl border border-app bg-white/76 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="eyebrow">{label}</div>
        <IconComponent className="h-4 w-4 text-[var(--accent)]" />
      </div>
      <div className="mt-4 font-display text-3xl text-main">{value}</div>
    </div>
  );
}

function MetricMini({ label, value }) {
  return (
    <div className="rounded-xl border border-app bg-white/72 px-4 py-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-3 font-display text-2xl text-main">{value}</div>
    </div>
  );
}

function ChartPanel({ title, subtitle, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-app bg-white/76 p-5 ${className}`}>
      <div className="mb-5">
        <div className="font-display text-xl text-main">{title}</div>
        <div className="mt-1 text-[13px] text-soft">{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function LineBars({ data }) {
  if (!data.length) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Sin datos de tendencia"
        description="No hay suficientes ventas para construir la serie."
      />
    );
  }

  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="grid h-[260px] grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
      {data.map((item) => (
        <div key={item.label} className="flex flex-col justify-end gap-3">
          <div className="relative flex-1 overflow-hidden rounded-xl border border-app bg-[var(--panel-soft)]">
            <div
              className="absolute inset-x-2 bottom-2 rounded-lg bg-[linear-gradient(180deg,rgba(47,106,82,0.25),rgba(47,106,82,0.95))]"
              style={{
                height: `${Math.max((item.value / max) * 100, 6)}%`,
              }}
            />
          </div>
          <div className="space-y-1 text-center">
            <div className="text-xs text-muted">{item.label}</div>
            <div className="font-display text-sm text-main">
              {formatCurrency(item.value)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutBreakdown({ data }) {
  if (!data.length) {
    return (
      <EmptyState
        icon={PieChart}
        title="Sin mezcla de pagos"
        description="Aun no hay pagos procesados para este periodo."
      />
    );
  }

  const total = data.reduce((acc, item) => acc + item.value, 0) || 1;
  const colors = ['#2f6a52', '#1f6c9f', '#956400', '#9f2f2d', '#7a6c5d'];
  const percentages = data.map((item) => (item.value / total) * 100);
  const segments = data
    .map((item, index) => {
      const start = percentages
        .slice(0, index)
        .reduce((acc, value) => acc + value, 0);
      const end = start + percentages[index];
      return `${colors[index % colors.length]} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
      <div
        className="mx-auto flex h-48 w-48 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${segments})`,
        }}
      >
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[var(--app-bg)]">
          <div className="text-center">
            <div className="font-display text-3xl text-main">
              {formatCurrency(total)}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">
              Movido
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        {data.map((item, index) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-4 rounded-xl border border-app bg-white/72 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-[13px] text-main">{item.label}</span>
            </div>
            <span className="font-display text-sm text-main">
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingList({ items }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sin ranking disponible"
        description="No hay volumen suficiente para construir esta comparativa."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className="flex items-center justify-between gap-4 rounded-xl border border-app bg-white/72 px-4 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-app bg-white text-xs font-semibold text-soft">
              {index + 1}
            </div>
            <div className="text-[13px] font-semibold text-main">{item.label}</div>
          </div>
          <div className="font-display text-sm text-main">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function agruparVentasPorDia(ventas) {
  const map = new Map();

  ventas.forEach((venta) => {
    const label = formatShortDate(venta.fecha_venta);
    const current = map.get(label) || 0;
    map.set(label, current + Number(venta.total || 0));
  });

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .slice(-6);
}

function agruparPorMetodo(ventas) {
  const map = new Map();

  ventas.forEach((venta) => {
    const key = venta.metodo_pago || 'SIN_DATO';
    const current = map.get(key) || 0;
    map.set(key, current + Number(venta.total || 0));
  });

  return Array.from(map.entries()).map(([label, value]) => ({
    label,
    value,
  }));
}

function agruparPorCliente(ventas) {
  const map = new Map();

  ventas.forEach((venta) => {
    const key = venta.cliente_nombre || 'Consumidor Final';
    const current = map.get(key) || 0;
    map.set(key, current + Number(venta.total || 0));
  });

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}
