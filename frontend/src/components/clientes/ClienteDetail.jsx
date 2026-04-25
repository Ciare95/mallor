import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  FilePenLine,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  obtenerCliente,
  obtenerEstadisticasCliente,
  obtenerHistorialCliente,
} from '../../services/clientes.service';
import {
  CLIENTE_DETALLE_TABS,
  useClientesStore,
} from '../../store/useClientesStore';
import {
  groupVentasByMonth,
  normalizeCollection,
} from '../../utils/clientes';
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from '../../utils/formatters';
import {
  ClienteStatusBadge,
  CustomerMetaGrid,
  EmptyState,
  MetricTile,
  SectionShell,
} from './shared';
import ClienteCartera from './ClienteCartera';
import ClienteHistorial from './ClienteHistorial';

export default function ClienteDetail({
  clienteId,
  onBack,
  onEdit,
  onDelete,
  onToggleActive,
  onAbonarVenta,
  onOpenVenta,
}) {
  const detalleTab = useClientesStore((state) => state.detalleTab);
  const setDetalleTab = useClientesStore((state) => state.setDetalleTab);

  const clienteQuery = useQuery({
    queryKey: ['clientes', 'detalle', clienteId],
    queryFn: () => obtenerCliente(clienteId),
    enabled: Boolean(clienteId),
  });

  const estadisticasQuery = useQuery({
    queryKey: ['clientes', 'estadisticas', clienteId],
    queryFn: () => obtenerEstadisticasCliente(clienteId),
    enabled: Boolean(clienteId),
  });

  const historialPreviewQuery = useQuery({
    queryKey: ['clientes', 'historial', 'preview', clienteId],
    queryFn: () => obtenerHistorialCliente(clienteId, { page_size: 24 }),
    enabled: Boolean(clienteId),
  });

  if (
    clienteQuery.isLoading ||
    estadisticasQuery.isLoading ||
    historialPreviewQuery.isLoading
  ) {
    return (
      <SectionShell title="Detalle de cliente">
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      </SectionShell>
    );
  }

  if (
    clienteQuery.isError ||
    estadisticasQuery.isError ||
    !clienteQuery.data ||
    !estadisticasQuery.data
  ) {
    return (
      <SectionShell title="Detalle de cliente">
        <EmptyState
          title="No fue posible cargar el cliente"
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

  const cliente = clienteQuery.data;
  const estadisticas = estadisticasQuery.data;
  const previewHistorial = normalizeCollection(
    historialPreviewQuery.data,
  ).results;
  const chartData = groupVentasByMonth(previewHistorial);
  const tabs = [
    [CLIENTE_DETALLE_TABS.RESUMEN, 'Resumen'],
    [CLIENTE_DETALLE_TABS.HISTORIAL, 'Historial'],
    [CLIENTE_DETALLE_TABS.CARTERA, 'Cartera'],
  ];

  return (
    <SectionShell
      eyebrow="Perfil comercial"
      title={cliente.nombre_completo}
      description={`Documento ${cliente.tipo_documento} ${cliente.numero_documento}. Alta ${formatDate(cliente.created_at)}.`}
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
            onClick={() => onEdit(cliente)}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10"
          >
            <FilePenLine className="h-4 w-4" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onToggleActive(cliente)}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10"
          >
            {cliente.activo ? (
              <ShieldOff className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {cliente.activo ? 'Inactivar' : 'Activar'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(cliente)}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-3 font-semibold text-rose-100 transition hover:bg-rose-500/20"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_1.1fr_1fr]">
          <MetricTile
            label="Estado"
            value={<ClienteStatusBadge cliente={cliente} />}
            note={cliente.activo ? 'Disponible para operar' : 'Registro inactivo'}
            compact
          />
          <MetricTile
            label="Total compras"
            value={formatCurrency(estadisticas.total_compras)}
            note={`${formatNumber(estadisticas.cantidad_compras)} ventas historicas`}
            tone="success"
          />
          <MetricTile
            label="Saldo pendiente"
            value={formatCurrency(estadisticas.saldo_pendiente)}
            note={`${formatNumber(estadisticas.ventas_con_saldo)} ventas abiertas`}
            tone="warning"
          />
          <MetricTile
            label="Credito disponible"
            value={formatCurrency(estadisticas.credito_disponible)}
            note={`Limite ${formatCurrency(estadisticas.limite_credito)}`}
            tone="accent"
          />
        </div>

        <CustomerMetaGrid cliente={cliente} />

        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
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

          {detalleTab === CLIENTE_DETALLE_TABS.RESUMEN && (
            <div className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                <div className="grid gap-4">
                  <MetricTile
                    label="Ultima compra"
                    value={formatDate(estadisticas.ultima_compra)}
                    note={`Ticket promedio ${formatCurrency(estadisticas.ticket_promedio)}`}
                    compact
                  />
                  <MetricTile
                    label="Ventas vencidas"
                    value={formatNumber(estadisticas.ventas_vencidas)}
                    note={`Total vencido ${formatCurrency(estadisticas.total_vencido)}`}
                    compact
                    tone="warning"
                  />
                  <MetricTile
                    label="Plazo configurado"
                    value={`${formatNumber(estadisticas.dias_plazo)} dias`}
                    note="Base para evaluar mora"
                    compact
                  />
                </div>
                <TrendPanel data={chartData} />
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Observaciones
                </div>
                <div className="text-sm leading-7 text-slate-300">
                  {cliente.observaciones || 'Sin observaciones registradas.'}
                </div>
              </div>
            </div>
          )}

          {detalleTab === CLIENTE_DETALLE_TABS.HISTORIAL && (
            <ClienteHistorial
              clienteId={cliente.id}
              diasPlazo={cliente.dias_plazo}
              onOpenVenta={onOpenVenta}
            />
          )}

          {detalleTab === CLIENTE_DETALLE_TABS.CARTERA && (
            <ClienteCartera
              clienteId={cliente.id}
              diasPlazo={cliente.dias_plazo}
              onAbonarVenta={onAbonarVenta}
              onOpenVenta={onOpenVenta}
            />
          )}
        </div>
      </div>
    </SectionShell>
  );
}

function TrendPanel({ data }) {
  if (!data.length) {
    return (
      <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Wallet className="h-4 w-4" />
          Sin compras suficientes para graficar la evolucion.
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 text-[11px] uppercase tracking-[0.24em] text-slate-500">
        Compras en el tiempo
      </div>
      <div className="grid h-[220px] grid-cols-3 gap-4 md:grid-cols-6">
        {data.map((item) => (
          <div key={item.label} className="flex flex-col justify-end gap-3">
            <div className="relative flex-1 overflow-hidden rounded-[18px] border border-white/10 bg-app/70">
              <div
                className="absolute inset-x-2 bottom-2 rounded-[14px] bg-[linear-gradient(180deg,rgba(56,189,248,0.35),rgba(56,189,248,0.95))]"
                style={{
                  height: `${Math.max((item.value / maxValue) * 100, 8)}%`,
                }}
              />
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-500">{item.label}</div>
              <div className="text-xs font-semibold text-white">
                {formatCurrency(item.value)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
