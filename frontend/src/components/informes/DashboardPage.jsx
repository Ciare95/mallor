import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock3, RefreshCcw } from 'lucide-react';
import {
  obtenerDashboardEstadisticas,
  obtenerEstadisticasClientesInforme,
  obtenerEstadisticasFinancierasInforme,
  obtenerEstadisticasProductosInforme,
  obtenerEstadisticasVentasInforme,
} from '../../services/informes.service';
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from '../../utils/formatters';
import {
  buildDashboardQueryParams,
  buildWeeklyTrend,
  formatDelta,
  getDefaultGranularity,
  getRangeLabel,
  resolveDashboardRange,
  sumBy,
} from '../../utils/informes';
import EstadisticasGenerales from './EstadisticasGenerales';
import FiltrosFecha from './FiltrosFecha';
import GraficoCategorias from './GraficoCategorias';
import GraficoMetodosPago from './GraficoMetodosPago';
import GraficoProductos from './GraficoProductos';
import GraficoTendenciaSemanal from './GraficoTendenciaSemanal';
import GraficoVentas from './GraficoVentas';
import InformesModuleNav from './InformesModuleNav';
import { DashboardSection, ErrorPanel, LoadingPanel, PanelShell } from './shared';
import TablaTopClientes from './TablaTopClientes';

const DEFAULT_PRESET = 'ultimos_30_dias';
const INITIAL_RANGE = resolveDashboardRange(DEFAULT_PRESET, {});

const queryOptions = {
  placeholderData: (previousData) => previousData,
  staleTime: 30000,
  refetchInterval: 60000,
  refetchOnWindowFocus: true,
};

const metricFormatters = {
  currency: formatCurrency,
  number: formatNumber,
};

export default function DashboardPage() {
  const [preset, setPreset] = useState(DEFAULT_PRESET);
  const [draftCustomRange, setDraftCustomRange] = useState({
    fechaInicio: INITIAL_RANGE.fechaInicioIso,
    fechaFin: INITIAL_RANGE.fechaFinIso,
  });
  const [activeCustomRange, setActiveCustomRange] = useState({
    fechaInicio: INITIAL_RANGE.fechaInicioIso,
    fechaFin: INITIAL_RANGE.fechaFinIso,
  });
  const [granularity, setGranularity] = useState(
    getDefaultGranularity(INITIAL_RANGE),
  );

  const resolvedRange = resolveDashboardRange(preset, activeCustomRange);
  const queryParams = buildDashboardQueryParams(resolvedRange);

  const dashboardQuery = useQuery({
    queryKey: ['informes', 'dashboard', queryParams],
    queryFn: () => obtenerDashboardEstadisticas(queryParams),
    ...queryOptions,
  });

  const ventasQuery = useQuery({
    queryKey: ['informes', 'estadisticas', 'ventas', queryParams],
    queryFn: () => obtenerEstadisticasVentasInforme(queryParams),
    ...queryOptions,
  });

  const productosQuery = useQuery({
    queryKey: ['informes', 'estadisticas', 'productos', queryParams],
    queryFn: () => obtenerEstadisticasProductosInforme(queryParams),
    ...queryOptions,
  });

  const clientesQuery = useQuery({
    queryKey: ['informes', 'estadisticas', 'clientes', queryParams],
    queryFn: () => obtenerEstadisticasClientesInforme(queryParams),
    ...queryOptions,
  });

  const financieroQuery = useQuery({
    queryKey: ['informes', 'estadisticas', 'financiero', queryParams],
    queryFn: () => obtenerEstadisticasFinancierasInforme(queryParams),
    ...queryOptions,
  });

  const previousPeriod = dashboardQuery.data?.ventas?.periodo_anterior;

  const previousVentasQuery = useQuery({
    queryKey: ['informes', 'estadisticas', 'ventas', 'anterior', previousPeriod],
    queryFn: () =>
      obtenerEstadisticasVentasInforme({
        fecha_inicio: previousPeriod.fecha_inicio,
        fecha_fin: previousPeriod.fecha_fin,
        anio: Number(previousPeriod.fecha_fin.slice(0, 4)),
      }),
    enabled: Boolean(previousPeriod?.fecha_inicio && previousPeriod?.fecha_fin),
    ...queryOptions,
  });

  const deferredCurrentSeries = useDeferredValue(
    ventasQuery.data?.serie_diaria?.series || [],
  );
  const deferredPreviousSeries = useDeferredValue(
    previousVentasQuery.data?.serie_diaria?.series || [],
  );
  const deferredTopProducts = useDeferredValue(
    productosQuery.data?.productos_mas_vendidos?.resultados || [],
  );
  const deferredTopClients = useDeferredValue(
    clientesQuery.data?.mejores_clientes?.resultados || [],
  );

  const refetchAll = () => {
    dashboardQuery.refetch();
    ventasQuery.refetch();
    productosQuery.refetch();
    clientesQuery.refetch();
    financieroQuery.refetch();

    if (previousPeriod?.fecha_inicio && previousPeriod?.fecha_fin) {
      previousVentasQuery.refetch();
    }
  };

  const handleAutoRefresh = useEffectEvent(() => {
    refetchAll();
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      handleAutoRefresh();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handlePresetChange = (nextPreset) => {
    startTransition(() => {
      setPreset(nextPreset);

      if (nextPreset !== 'personalizado') {
        const nextRange = resolveDashboardRange(nextPreset, activeCustomRange);
        const nextCustomRange = {
          fechaInicio: nextRange.fechaInicioIso,
          fechaFin: nextRange.fechaFinIso,
        };
        setDraftCustomRange(nextCustomRange);
        setActiveCustomRange(nextCustomRange);
        setGranularity(getDefaultGranularity(nextRange));
      }
    });
  };

  const handleCustomRangeChange = (field, value) => {
    setDraftCustomRange((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleApplyCustomRange = () => {
    startTransition(() => {
      const nextRange = resolveDashboardRange('personalizado', draftCustomRange);
      setPreset('personalizado');
      setActiveCustomRange(draftCustomRange);
      setGranularity(getDefaultGranularity(nextRange));
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const isInitialLoading =
    !dashboardQuery.data &&
    !ventasQuery.data &&
    !productosQuery.data &&
    !clientesQuery.data &&
    !financieroQuery.data &&
    (dashboardQuery.isLoading ||
      ventasQuery.isLoading ||
      productosQuery.isLoading ||
      clientesQuery.isLoading ||
      financieroQuery.isLoading);

  const hasTopLevelError =
    !dashboardQuery.data &&
    !ventasQuery.data &&
    !productosQuery.data &&
    !clientesQuery.data &&
    !financieroQuery.data &&
    (dashboardQuery.isError ||
      ventasQuery.isError ||
      productosQuery.isError ||
      clientesQuery.isError ||
      financieroQuery.isError);

  const comparison = dashboardQuery.data?.ventas?.comparacion_periodo_anterior;
  const categories = ventasQuery.data?.ventas_por_categoria?.distribucion || [];
  const paymentMethods =
    ventasQuery.data?.ventas_por_metodo_pago?.distribucion || [];
  const weeklyTrend = buildWeeklyTrend(deferredCurrentSeries);
  const recurrence = clientesQuery.data?.analisis_recurrencia;
  const inventory = dashboardQuery.data?.inventario?.valor_total || {};
  const receivables = financieroQuery.data?.cuentas_por_cobrar || {};
  const projectedIncome = financieroQuery.data?.proyeccion_ingresos || {};
  const utilityEstimate = sumBy(deferredTopProducts, 'margen_generado');
  const totalProductsSold = sumBy(categories, 'cantidad_vendida');
  const latestUpdateSource =
    dashboardQuery.data?.cierres_recientes?.[0]?.fecha_registro ||
    dashboardQuery.data?.periodo?.fecha_fin;

  const metrics = [
    {
      id: 'total_ventas',
      label: 'Total ventas',
      value: dashboardQuery.data?.ventas?.resumen?.total_ventas || 0,
      formatter: metricFormatters.currency,
      deltaValue: comparison?.total_ventas?.variacion_porcentual,
      deltaLabel: formatDelta(comparison?.total_ventas?.variacion_porcentual),
      note: `Vs. periodo anterior ${formatCurrency(
        comparison?.total_ventas?.anterior || 0,
      )}`,
    },
    {
      id: 'cantidad_ventas',
      label: 'Cantidad de ventas',
      value: dashboardQuery.data?.ventas?.resumen?.cantidad_ventas || 0,
      formatter: metricFormatters.number,
      deltaValue: comparison?.cantidad_ventas?.variacion_porcentual,
      deltaLabel: formatDelta(comparison?.cantidad_ventas?.variacion_porcentual),
      note: `Periodo ${getRangeLabel(resolvedRange)}`,
    },
    {
      id: 'ticket_promedio',
      label: 'Ticket promedio',
      value: dashboardQuery.data?.ventas?.resumen?.ticket_promedio || 0,
      formatter: metricFormatters.currency,
      deltaValue: comparison?.ticket_promedio?.variacion_porcentual,
      deltaLabel: formatDelta(comparison?.ticket_promedio?.variacion_porcentual),
      note: `Anterior ${formatCurrency(
        comparison?.ticket_promedio?.anterior || 0,
      )}`,
    },
    {
      id: 'productos_vendidos',
      label: 'Productos vendidos',
      value: totalProductsSold,
      formatter: metricFormatters.number,
      note: `${formatNumber(categories.length)} categorias activas`,
    },
    {
      id: 'valor_inventario',
      label: 'Valor inventario',
      value: inventory.valor_compra || 0,
      formatter: metricFormatters.currency,
      note: `${formatNumber(inventory.cantidad_productos || 0)} referencias activas`,
    },
    {
      id: 'cuentas_por_cobrar',
      label: 'Cuentas por cobrar',
      value: receivables.total_cartera || 0,
      formatter: metricFormatters.currency,
      note: `${formatNumber(receivables.cantidad_ventas || 0)} casos abiertos`,
    },
    {
      id: 'utilidad_estimada',
      label: 'Utilidad estimada',
      value: utilityEstimate,
      formatter: metricFormatters.currency,
      note: `Proyeccion ${formatCurrency(
        projectedIncome.total_proyectado || 0,
      )}`,
    },
  ];

  if (isInitialLoading) {
    return <LoadingPanel label="Construyendo dashboard de estadisticas..." />;
  }

  if (hasTopLevelError) {
    return (
      <ErrorPanel
        title="No fue posible cargar el dashboard"
        description="Las consultas del modulo informes no devolvieron una respuesta valida."
      />
    );
  }

  return (
    <div className="space-y-6">
      <InformesModuleNav />

      <FiltrosFecha
        preset={preset}
        customRange={draftCustomRange}
        resolvedRange={resolvedRange}
        onPresetChange={handlePresetChange}
        onCustomRangeChange={handleCustomRangeChange}
        onApplyCustomRange={handleApplyCustomRange}
        onRefresh={refetchAll}
        onPrint={handlePrint}
        isRefreshing={
          dashboardQuery.isFetching ||
          ventasQuery.isFetching ||
          productosQuery.isFetching ||
          clientesQuery.isFetching ||
          financieroQuery.isFetching
        }
        latestUpdateLabel={formatDateTime(latestUpdateSource)}
      />

      <EstadisticasGenerales metrics={metrics} />

      <DashboardSection
        eyebrow="Pulso del negocio"
        title="Lectura visual del periodo"
        description="Tendencias, mezcla de recaudo, productos destacados, categorias y clientes clave en una sola vista."
        actions={
          <div className="inline-flex items-center gap-2 rounded-full border border-app bg-white/76 px-4 py-2 text-[12px] font-semibold text-soft">
            <RefreshCcw className="h-3.5 w-3.5" />
            Auto refresh cada 60 s
          </div>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          {ventasQuery.isError ? (
            <ErrorPanel
              title="No fue posible construir la tendencia de ventas"
              description="La serie temporal no pudo cargarse para el periodo seleccionado."
            />
          ) : (
            <GraficoVentas
              currentSeries={deferredCurrentSeries}
              previousSeries={deferredPreviousSeries}
              granularity={granularity}
              onGranularityChange={setGranularity}
              comparison={comparison}
            />
          )}

          <PanelShell
            title="Resumen financiero"
            subtitle="Cartera, proyeccion y cierres recientes."
          >
            <div className="space-y-3">
              <FinancialTile
                label="Cartera total"
                value={formatCurrency(receivables.total_cartera || 0)}
                note={`${formatNumber(
                  receivables.clientes_con_saldo || 0,
                )} clientes con saldo`}
              />
              <FinancialTile
                label="Ticket pendiente"
                value={formatCurrency(
                  receivables.ticket_promedio_pendiente || 0,
                )}
                note={`${formatNumber(
                  receivables.cantidad_ventas || 0,
                )} ventas pendientes`}
              />
              <FinancialTile
                label="Proyeccion"
                value={formatCurrency(projectedIncome.total_proyectado || 0)}
                note={`${formatNumber(
                  projectedIncome.dias_proyeccion || 0,
                )} dias proyectados`}
              />

              <div className="rounded-[22px] border border-app bg-[var(--panel-soft)] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-[var(--accent)]" />
                  <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">
                    Cierres recientes
                  </div>
                </div>
                <div className="space-y-3">
                  {(dashboardQuery.data?.cierres_recientes || []).slice(0, 4).map(
                    (closure) => (
                      <article
                        key={closure.id}
                        className="rounded-[18px] border border-app bg-white/78 px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[13px] font-semibold text-main">
                              Cierre {closure.fecha_cierre}
                            </div>
                            <div className="mt-1 text-[12px] text-soft">
                              {closure.usuario_cierre_nombre || 'Sin usuario'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-main">
                              {formatCurrency(closure.total_ventas)}
                            </div>
                            <div className="mt-1 text-[12px] text-soft">
                              Dif. {formatCurrency(closure.diferencia)}
                            </div>
                          </div>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              </div>
            </div>
          </PanelShell>

          {productosQuery.isError ? (
            <ErrorPanel
              title="No fue posible construir el ranking de productos"
              description="El endpoint de productos no devolvio datos validos."
            />
          ) : (
            <GraficoProductos products={deferredTopProducts} />
          )}

          {ventasQuery.isError ? (
            <ErrorPanel
              title="No fue posible construir la distribucion por categoria"
              description="El detalle de ventas por categoria no esta disponible."
            />
          ) : (
            <GraficoCategorias
              totalGeneral={ventasQuery.data?.ventas_por_categoria?.total_general || 0}
              categories={categories}
            />
          )}

          {ventasQuery.isError ? (
            <ErrorPanel
              title="No fue posible construir los metodos de pago"
              description="La mezcla de recaudo no pudo cargarse para este periodo."
            />
          ) : (
            <GraficoMetodosPago
              totalGeneral={ventasQuery.data?.ventas_por_metodo_pago?.total_general || 0}
              paymentMethods={paymentMethods}
            />
          )}

          {clientesQuery.isError ? (
            <ErrorPanel
              title="No fue posible construir el ranking de clientes"
              description="Las metricas comerciales de clientes no estan disponibles."
            />
          ) : (
            <TablaTopClientes
              clients={deferredTopClients}
              recurrenceSummary={recurrence?.resumen}
              recurrentClients={recurrence?.top_recurrentes || []}
            />
          )}

          {ventasQuery.isError ? (
            <ErrorPanel
              title="No fue posible construir la tendencia semanal"
              description="La serie diaria no pudo consolidarse por dia de la semana."
            />
          ) : (
            <GraficoTendenciaSemanal items={weeklyTrend} />
          )}
        </div>
      </DashboardSection>

      {(dashboardQuery.isError ||
        ventasQuery.isError ||
        productosQuery.isError ||
        clientesQuery.isError ||
        financieroQuery.isError) && (
        <div className="rounded-[24px] border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-4 text-[13px] text-[var(--warning-text)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div>
              Una o varias consultas del dashboard devolvieron error. El tablero
              mantiene la ultima respuesta valida cuando existe, pero conviene
              revisar conectividad o permisos si el problema persiste.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FinancialTile({ label, value, note }) {
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
