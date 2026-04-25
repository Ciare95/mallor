import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CreditCard,
  FilePenLine,
  Loader2,
  ReceiptText,
  Slash,
} from 'lucide-react';
import { obtenerVenta } from '../../services/ventas.service';
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from '../../utils/formatters';
import { useVentasStore } from '../../store/useVentasStore';
import { VENTA_DETALLE_TABS } from '../../store/useVentasStore';
import { EmptyState, SectionShell, StatusBadge } from './shared';
import AbonosManager from './AbonosManager';
import VentaHistorial from './VentaHistorial';

export default function VentaDetail({
  ventaId,
  onBack,
  onEdit,
  onAbonar,
  onCancel,
  onFacturar,
  abonoSubmitting,
  abonoError,
}) {
  const detalleTab = useVentasStore((state) => state.detalleTab);
  const setDetalleTab = useVentasStore((state) => state.setDetalleTab);
  const [showAbonoForm, setShowAbonoForm] = useState(
    detalleTab === VENTA_DETALLE_TABS.ABONOS,
  );

  const ventaQuery = useQuery({
    queryKey: ['ventas', 'detalle', ventaId],
    queryFn: () => obtenerVenta(ventaId),
    enabled: Boolean(ventaId),
  });

  if (ventaQuery.isLoading) {
    return (
      <SectionShell title="Detalle de venta">
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      </SectionShell>
    );
  }

  if (ventaQuery.isError || !ventaQuery.data) {
    return (
      <SectionShell title="Detalle de venta">
        <EmptyState
          title="No fue posible cargar la venta"
          description="Intenta nuevamente o vuelve al listado."
          action={
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-slate-100 transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
          }
        />
      </SectionShell>
    );
  }

  const venta = ventaQuery.data;
  const tabs = [
    [VENTA_DETALLE_TABS.RESUMEN, 'Resumen'],
    [VENTA_DETALLE_TABS.ABONOS, 'Abonos'],
    [VENTA_DETALLE_TABS.HISTORIAL, 'Historial'],
  ];

  return (
    <div className="space-y-6">
      <SectionShell
        eyebrow="Detalle comercial"
        title={venta.numero_venta}
        description={`Registrada el ${formatDateTime(venta.fecha_venta)} por ${venta.usuario_registro?.full_name || venta.usuario_registro?.username || 'usuario actual'}.`}
        actions={
          <>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <button
              type="button"
              onClick={() => onEdit(venta)}
              disabled={venta.estado === 'CANCELADA'}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FilePenLine className="h-4 w-4" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => {
                setDetalleTab(VENTA_DETALLE_TABS.ABONOS);
                setShowAbonoForm(true);
              }}
              disabled={venta.estado === 'CANCELADA'}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CreditCard className="h-4 w-4" />
              Abonar
            </button>
            <button
              type="button"
              onClick={() => onCancel(venta)}
              disabled={
                venta.estado === 'CANCELADA' ||
                Number(venta.total_abonado || 0) > 0
              }
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-3 font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Slash className="h-4 w-4" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onFacturar(venta)}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10"
            >
              <ReceiptText className="h-4 w-4" />
              Facturar
            </button>
          </>
        }
      >
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr]">
          <SummaryCard label="Cliente" value={venta.cliente?.nombre_completo || 'Consumidor Final'} />
          <SummaryCard label="Estado" value={<StatusBadge status={venta.estado} />} />
          <SummaryCard label="Pago" value={<StatusBadge status={venta.estado_pago} />} />
          <SummaryCard label="Total" value={formatCurrency(venta.total)} />
        </div>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
          <div className="grid gap-4 lg:grid-cols-4">
            <Metric label="Subtotal" value={formatCurrency(venta.subtotal)} />
            <Metric label="Impuestos" value={formatCurrency(venta.impuestos)} />
            <Metric label="Abonado" value={formatCurrency(venta.total_abonado)} />
            <Metric label="Saldo" value={formatCurrency(venta.saldo_pendiente)} />
          </div>
          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDetalleTab(key)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    detalleTab === key
                      ? 'border-emerald-400/40 bg-emerald-400/12 text-emerald-100'
                      : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {detalleTab === VENTA_DETALLE_TABS.RESUMEN && (
              <div className="space-y-4">
                <div className="grid gap-3">
                  {(venta.detalles || []).map((detalle) => (
                    <div
                      key={detalle.id}
                      className="grid gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 lg:grid-cols-[1.4fr_0.5fr_0.7fr_0.7fr]"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {detalle.producto?.nombre}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                          {detalle.producto?.codigo_interno || 'Sin codigo'}
                        </div>
                      </div>
                      <Metric
                        compact
                        label="Cantidad"
                        value={formatNumber(detalle.cantidad)}
                      />
                      <Metric
                        compact
                        label="Unitario"
                        value={formatCurrency(detalle.precio_unitario)}
                      />
                      <Metric
                        compact
                        label="Total"
                        value={formatCurrency(detalle.total)}
                      />
                    </div>
                  ))}
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-300">
                  {venta.observaciones || 'Sin observaciones registradas.'}
                </div>
              </div>
            )}

            {detalleTab === VENTA_DETALLE_TABS.ABONOS && (
              <AbonosManager
                venta={venta}
                onSubmitAbono={onAbonar}
                isSubmitting={abonoSubmitting}
                submitError={abonoError}
                autoOpen={showAbonoForm}
              />
            )}

            {detalleTab === VENTA_DETALLE_TABS.HISTORIAL && (
              <VentaHistorial ventaId={venta.id} />
            )}
          </div>
        </div>
      </SectionShell>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function Metric({ label, value, compact = false }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div
        className={`mt-2 ${compact ? 'text-base font-semibold text-white' : 'font-display text-2xl text-white'}`}
      >
        {value}
      </div>
    </div>
  );
}
