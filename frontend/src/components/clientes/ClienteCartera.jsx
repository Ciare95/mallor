import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Loader2, Search, Wallet } from 'lucide-react';
import { obtenerCarteraCliente } from '../../services/clientes.service';
import {
  calculateDaysPastDue,
  normalizeCollection,
} from '../../utils/clientes';
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from '../../utils/formatters';
import {
  ClienteRiskBadge,
  EmptyState,
  MetricTile,
} from './shared';

export default function ClienteCartera({
  clienteId,
  diasPlazo = 0,
  onAbonarVenta,
  onOpenVenta,
}) {
  const carteraQuery = useQuery({
    queryKey: ['clientes', 'cartera', clienteId],
    queryFn: () => obtenerCarteraCliente(clienteId),
    enabled: Boolean(clienteId),
  });

  const data = normalizeCollection(carteraQuery.data);
  const rows = data.results;

  const summary = useMemo(() => {
    const totalPorCobrar = rows.reduce(
      (acc, venta) => acc + Number(venta.saldo_pendiente || 0),
      0,
    );
    const ventasVencidas = rows.filter(
      (venta) => calculateDaysPastDue(venta, diasPlazo) > 0,
    );

    return {
      totalPorCobrar,
      ventasVencidas: ventasVencidas.length,
      totalVencido: ventasVencidas.reduce(
        (acc, venta) => acc + Number(venta.saldo_pendiente || 0),
        0,
      ),
    };
  }, [diasPlazo, rows]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile
          label="Total por cobrar"
          value={formatCurrency(summary.totalPorCobrar)}
          note={`${formatNumber(rows.length)} ventas abiertas`}
          tone="warning"
        />
        <MetricTile
          label="Ventas vencidas"
          value={formatNumber(summary.ventasVencidas)}
          note={`Plazo base ${formatNumber(diasPlazo)} dias`}
          tone="accent"
        />
        <MetricTile
          label="Monto vencido"
          value={formatCurrency(summary.totalVencido)}
          note="Saldo fuera de plazo"
          tone="success"
        />
      </div>

      <div className="overflow-hidden rounded-[24px] border border-white/10">
        {carteraQuery.isLoading && (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        )}

        {carteraQuery.isError && (
          <EmptyState
            icon={Wallet}
            title="No fue posible cargar la cartera"
            description="Intenta nuevamente en unos segundos."
          />
        )}

        {!carteraQuery.isLoading && !carteraQuery.isError && (
          <>
            {!rows.length ? (
              <EmptyState
                icon={Search}
                title="Sin cartera pendiente"
                description="Este cliente no tiene ventas con saldo abierto."
              />
            ) : (
              <div className="divide-y divide-white/10">
                {rows.map((venta) => {
                  const overdueDays = calculateDaysPastDue(venta, diasPlazo);

                  return (
                    <article
                      key={venta.id}
                      className="grid gap-4 px-5 py-5 transition hover:bg-white/[0.04] xl:grid-cols-[1fr_1fr_0.9fr_0.8fr_auto] xl:items-center"
                    >
                      <div>
                        <div className="font-display text-lg text-white">
                          {venta.numero_venta}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                          {formatDateTime(venta.fecha_venta)}
                        </div>
                      </div>
                      <div>
                        <ClienteRiskBadge
                          venta={venta}
                          diasPlazo={diasPlazo}
                          overdueDays={overdueDays}
                        />
                        <div className="mt-2 text-sm text-slate-400">
                          Metodo {venta.metodo_pago}
                        </div>
                      </div>
                      <div>
                        <div className="font-display text-lg text-white">
                          {formatCurrency(venta.saldo_pendiente)}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                          Total {formatCurrency(venta.total)}
                        </div>
                      </div>
                      <div className="text-sm text-slate-400">
                        {overdueDays > 0
                          ? `${overdueDays} dias de mora`
                          : 'Dentro del plazo'}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onAbonarVenta?.(venta)}
                          className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                        >
                          <CreditCard className="h-4 w-4" />
                          Abonar
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenVenta?.(venta)}
                          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                        >
                          Ver venta
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
