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
  const isFullyPaid = progreso >= 1 || Number(venta?.saldo_pendiente || 0) <= 0;

  const handleClose = () => setOpen(false);

  const handleSubmit = async (payload) => {
    await onSubmitAbono(payload);
    setOpen(false);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-xl border border-app bg-white/76 p-5">
        <div className="eyebrow">
          Progreso de cobro
        </div>
        <div className="mt-5 flex items-center gap-5">
          <div
            className="relative flex h-28 w-28 items-center justify-center rounded-full border border-[var(--accent-line)]"
            style={{
              background: `conic-gradient(var(--accent) ${progreso * 360}deg, rgba(132, 148, 123, 0.12) 0deg)`,
            }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-app bg-[rgba(255,255,255,0.92)] text-center">
              <div>
                <div className="font-display text-[1.35rem] text-main">
                  {Math.round(progreso * 100)}%
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
                  Cobrado
                </div>
              </div>
            </div>
          </div>

          <div className="grid flex-1 gap-3 sm:grid-cols-2">
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
          disabled={isFullyPaid}
          className="app-button-primary mt-6 min-h-11 w-full justify-center disabled:opacity-40"
        >
          <Wallet className="h-4 w-4" />
          Registrar nuevo abono
        </button>
      </div>

      <div className="rounded-xl border border-app bg-white/76 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="eyebrow">
              Historial de pagos
            </div>
            <div className="mt-2 font-display text-[1.75rem] leading-none text-main">
              {venta?.numero_venta}
            </div>
          </div>
        </div>

        {abonosQuery.isLoading && (
          <div className="flex min-h-[180px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-soft" />
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
                    className="grid gap-3 rounded-xl border border-app bg-white/72 px-4 py-4 sm:grid-cols-[1fr_0.7fr_0.8fr]"
                  >
                    <div>
                      <div className="font-display text-[1.35rem] leading-none text-main">
                        {formatCurrency(abono.monto_abonado)}
                      </div>
                      <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted">
                        {formatDateTime(abono.fecha_abono)}
                      </div>
                    </div>
                    <div className="text-[13px] text-soft">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
                        Metodo
                      </div>
                      <div className="mt-2 font-semibold text-main">
                        {abono.metodo_pago}
                      </div>
                    </div>
                    <div className="text-[13px] text-soft">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
                        Referencia
                      </div>
                      <div className="mt-2 break-all text-main">
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
    <div className="rounded-xl border border-app bg-white/72 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
        {label}
      </div>
      <div className="mt-2 font-display text-[1.2rem] leading-none text-main">
        {value}
      </div>
    </div>
  );
}
