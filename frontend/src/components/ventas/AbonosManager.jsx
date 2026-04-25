import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Loader2, Wallet } from 'lucide-react';
import { listarAbonosVenta } from '../../services/abonos.service';
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
} from '../../utils/formatters';
import { EmptyState } from './shared';
import AbonoForm from './AbonoForm';

export default function AbonosManager({
  venta,
  onSubmitAbono,
  isSubmitting,
  submitError,
  autoOpen = false,
}) {
  const [open, setOpen] = useState(autoOpen);

  const abonosQuery = useQuery({
    queryKey: ['abonos', 'venta', venta?.id],
    queryFn: () => listarAbonosVenta(venta.id),
    enabled: Boolean(venta?.id),
  });

  const progreso = useMemo(() => {
    const total = Number(venta?.total || 0);
    const abonado = Number(venta?.total_abonado || 0);

    if (!total) {
      return 0;
    }

    return Math.min(abonado / total, 1);
  }, [venta?.total, venta?.total_abonado]);

  const handleClose = () => setOpen(false);

  const handleSubmit = async (payload) => {
    await onSubmitAbono(payload);
    setOpen(false);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
        <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
          Progreso de cobro
        </div>
        <div className="mt-5 flex items-center gap-5">
          <div
            className="relative flex h-28 w-28 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#22c55e ${progreso * 360}deg, rgba(255,255,255,0.08) 0deg)`,
            }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-app text-center">
              <div>
                <div className="font-display text-xl text-white">
                  {Math.round(progreso * 100)}%
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Cobrado
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <Metric label="Total" value={formatCurrency(venta?.total)} />
            <Metric
              label="Abonado"
              value={formatCurrency(venta?.total_abonado)}
            />
            <Metric
              label="Pendiente"
              value={formatCurrency(venta?.saldo_pendiente)}
            />
            <Metric label="Ratio" value={formatPercent(progreso)} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          <Wallet className="h-4 w-4" />
          Registrar nuevo abono
        </button>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              Historial de pagos
            </div>
            <div className="mt-2 font-display text-xl text-white">
              {venta?.numero_venta}
            </div>
          </div>
        </div>

        {abonosQuery.isLoading && (
          <div className="flex min-h-[180px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        )}

        {abonosQuery.isError && (
          <EmptyState
            icon={Wallet}
            title="No fue posible cargar los abonos"
            description="Intenta nuevamente o revisa la conexion con el backend."
          />
        )}

        {!abonosQuery.isLoading && !abonosQuery.isError && (
          <>
            {(abonosQuery.data || []).length === 0 ? (
              <EmptyState
                icon={ArrowUpRight}
                title="Sin abonos registrados"
                description="Cuando se registre un pago parcial aparecera aqui."
              />
            ) : (
              <div className="space-y-3">
                {abonosQuery.data.map((abono) => (
                  <div
                    key={abono.id}
                    className="grid gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4 sm:grid-cols-[1fr_0.7fr_0.8fr]"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {formatCurrency(abono.monto_abonado)}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                        {formatDateTime(abono.fecha_abono)}
                      </div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Metodo
                      </div>
                      <div className="mt-2">{abono.metodo_pago}</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Referencia
                      </div>
                      <div className="mt-2 break-all">
                        {abono.referencia_pago || 'Sin referencia'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AbonoForm
        key={`${venta?.id || 'venta'}-${open ? 'open' : 'closed'}`}
        open={open}
        venta={venta}
        isLoading={isSubmitting}
        error={submitError}
        onClose={handleClose}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-white">{value}</div>
    </div>
  );
}
