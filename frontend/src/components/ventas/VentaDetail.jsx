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
import { getVentaPaymentDisplayStatus } from '../../utils/ventas';
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
          <Loader2 className="h-5 w-5 animate-spin text-soft" />
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
              className="app-button-secondary min-h-10"
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
  const paymentDisplayStatus = getVentaPaymentDisplayStatus(venta);
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
              className="app-button-secondary min-h-10"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
            <button
              type="button"
              onClick={() => onEdit(venta)}
              disabled={venta.estado === 'CANCELADA'}
              className="app-button-secondary min-h-10 disabled:opacity-40"
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
              disabled={
                venta.estado === 'CANCELADA' ||
                venta.estado_pago === 'PAGADA'
              }
              className="app-button-primary min-h-10 disabled:opacity-40"
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
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-2 text-[12px] font-semibold text-[var(--danger-text)] transition hover:bg-[rgba(253,235,236,0.9)] disabled:opacity-40"
            >
              <Slash className="h-4 w-4" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onFacturar(venta)}
              className="app-button-secondary min-h-10"
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
          <SummaryCard label="Pago" value={<StatusBadge status={paymentDisplayStatus} />} />
          <SummaryCard label="Total" value={formatCurrency(venta.total)} />
        </div>

        <div className="mt-6 rounded-xl border border-app bg-white/76 p-5">
          <div className="grid gap-4 lg:grid-cols-4">
            <Metric label="Subtotal" value={formatCurrency(venta.subtotal)} />
            <Metric label="Impuestos" value={formatCurrency(venta.impuestos)} />
            <Metric label="Abonado" value={formatCurrency(venta.total_abonado)} />
            <Metric label="Saldo" value={formatCurrency(venta.saldo_pendiente)} />
          </div>
          <div className="mt-5 border-t border-app pt-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDetalleTab(key)}
                  className={`rounded-full border px-4 py-2 text-[12px] font-semibold transition ${
                    detalleTab === key
                      ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                      : 'border-app bg-white/72 text-main'
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
                      className="grid gap-3 rounded-xl border border-app bg-white/72 px-4 py-4 lg:grid-cols-[1.4fr_0.5fr_0.7fr_0.7fr]"
                    >
                      <div>
                        <div className="text-[13px] font-semibold text-main">
                          {detalle.producto?.nombre}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted">
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
                <div className="rounded-xl border border-app bg-white/72 px-4 py-4 text-[13px] text-soft">
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
    <div className="rounded-xl border border-app bg-white/76 p-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-3 text-[13px] font-semibold text-main">{value}</div>
    </div>
  );
}

function Metric({ label, value, compact = false }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
        {label}
      </div>
      <div
        className={`mt-2 ${compact ? 'text-base font-semibold text-main' : 'font-display text-2xl text-main'}`}
      >
        {value}
      </div>
    </div>
  );
}
