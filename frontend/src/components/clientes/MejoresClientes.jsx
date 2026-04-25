import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Crown,
  Loader2,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import {
  obtenerClientesMorosos,
  obtenerMejoresClientes,
} from '../../services/clientes.service';
import {
  getClienteNombre,
  normalizeCollection,
} from '../../utils/clientes';
import {
  formatCurrency,
  formatNumber,
  formatShortDate,
} from '../../utils/formatters';
import {
  ClienteStatusBadge,
  EmptyState,
  MetricTile,
  SectionShell,
} from './shared';

export default function MejoresClientes({ onOpenCliente }) {
  const mejoresQuery = useQuery({
    queryKey: ['clientes', 'dashboard', 'mejores'],
    queryFn: () => obtenerMejoresClientes(10),
  });

  const morososQuery = useQuery({
    queryKey: ['clientes', 'dashboard', 'morosos'],
    queryFn: () => obtenerClientesMorosos(),
  });

  const mejores = normalizeCollection(mejoresQuery.data).results;
  const morosos = normalizeCollection(morososQuery.data).results;

  const rankingChart = useMemo(() => {
    const maxValue = Math.max(
      ...mejores.map((cliente) => Number(cliente.total_compras || 0)),
      1,
    );

    return mejores.map((cliente) => ({
      ...cliente,
      ratio: Number(cliente.total_compras || 0) / maxValue,
    }));
  }, [mejores]);

  const loading = mejoresQuery.isLoading || morososQuery.isLoading;
  const hasError = mejoresQuery.isError || morososQuery.isError;
  const totalMoroso = morosos.reduce(
    (acc, item) => acc + Number(item.total_vencido || 0),
    0,
  );

  return (
    <SectionShell
      eyebrow="Analitica comercial"
      title="Mejores clientes y riesgo de cartera"
      description="Cruza aporte historico y presion de cobro para priorizar seguimiento comercial."
    >
      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.04]">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : hasError ? (
        <EmptyState
          icon={TrendingUp}
          title="No fue posible construir el dashboard"
          description="Una o varias consultas del tablero devolvieron error."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricTile
              label="Clientes top"
              value={formatNumber(mejores.length)}
              note="Ranking cargado"
            />
            <MetricTile
              label="Facturacion top"
              value={formatCurrency(
                mejores.reduce(
                  (acc, cliente) => acc + Number(cliente.total_compras || 0),
                  0,
                ),
              )}
              note="Acumulado del ranking"
              tone="success"
            />
            <MetricTile
              label="Clientes morosos"
              value={formatNumber(morosos.length)}
              note="Con saldo vencido"
              tone="warning"
            />
            <MetricTile
              label="Total vencido"
              value={formatCurrency(totalMoroso)}
              note="Cartera en alerta"
              tone="accent"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-100">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-2xl text-white">
                    Ranking de clientes
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Ordenado por compras historicas.
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {rankingChart.map((cliente, index) => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => onOpenCliente?.(cliente)}
                    className="w-full rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-emerald-400/30 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                          #{index + 1}
                        </div>
                        <div className="mt-2 font-display text-xl text-white">
                          {getClienteNombre(cliente)}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                          Ultima compra {formatShortDate(cliente.ultima_compra)}
                        </div>
                      </div>
                      <ClienteStatusBadge cliente={cliente} />
                    </div>

                    <div className="mt-4 overflow-hidden rounded-full border border-white/10 bg-app/70">
                      <div
                        className="h-2 rounded-full bg-[linear-gradient(90deg,rgba(34,197,94,0.7),rgba(16,185,129,1))]"
                        style={{
                          width: `${Math.max(cliente.ratio * 100, 12)}%`,
                        }}
                      />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <MetricInline
                        label="Compras"
                        value={formatCurrency(cliente.total_compras)}
                      />
                      <MetricInline
                        label="Saldo"
                        value={formatCurrency(cliente.saldo_pendiente)}
                      />
                      <MetricInline
                        label="Frecuencia"
                        value={`${formatNumber(cliente.cantidad_compras)} ventas`}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-rose-100">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-2xl text-white">
                    Riesgo de mora
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Clientes con saldo vencido para seguimiento.
                  </div>
                </div>
              </div>

              {!morosos.length ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="Sin morosos"
                  description="No hay clientes con ventas vencidas."
                />
              ) : (
                <div className="space-y-3">
                  {morosos.map((item) => (
                    <button
                      key={item.cliente.id}
                      type="button"
                      onClick={() => onOpenCliente?.(item.cliente)}
                      className="w-full rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-amber-400/30 hover:bg-white/[0.06]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-white">
                            {getClienteNombre(item.cliente)}
                          </div>
                          <div className="mt-1 text-sm text-slate-400">
                            {item.cantidad_ventas_vencidas} ventas vencidas
                          </div>
                        </div>
                        <ClienteStatusBadge cliente={item.cliente} />
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <MetricInline
                          label="Total vencido"
                          value={formatCurrency(item.total_vencido)}
                        />
                        <MetricInline
                          label="Casos"
                          value={formatNumber(item.ventas.length)}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </SectionShell>
  );
}

function MetricInline({ label, value }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
