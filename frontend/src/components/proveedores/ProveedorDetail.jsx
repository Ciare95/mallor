import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Factory,
  FilePenLine,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  obtenerEstadisticasProveedor,
  obtenerHistorialProveedor,
  obtenerProveedor,
} from '../../services/proveedores.service';
import {
  PROVEEDOR_DETALLE_TABS,
  useProveedoresStore,
} from '../../store/useProveedoresStore';
import { groupFacturasByMonth, normalizeCollection } from '../../utils/proveedores';
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from '../../utils/formatters';
import {
  EmptyState,
  MetricTile,
  ProveedorStatusBadge,
  SectionShell,
  SupplierMetaGrid,
} from './shared';
import ProveedorHistorial from './ProveedorHistorial';

export default function ProveedorDetail({
  proveedorId,
  onBack,
  onEdit,
  onDelete,
}) {
  const detalleTab = useProveedoresStore((state) => state.detalleTab);
  const setDetalleTab = useProveedoresStore((state) => state.setDetalleTab);

  const proveedorQuery = useQuery({
    queryKey: ['proveedores', 'detalle', proveedorId],
    queryFn: () => obtenerProveedor(proveedorId),
    enabled: Boolean(proveedorId),
  });

  const estadisticasQuery = useQuery({
    queryKey: ['proveedores', 'estadisticas', proveedorId],
    queryFn: () => obtenerEstadisticasProveedor(proveedorId),
    enabled: Boolean(proveedorId),
  });

  const historialPreviewQuery = useQuery({
    queryKey: ['proveedores', 'historial', 'preview', proveedorId],
    queryFn: () => obtenerHistorialProveedor(proveedorId, { page_size: 24 }),
    enabled: Boolean(proveedorId),
  });

  if (
    proveedorQuery.isLoading ||
    estadisticasQuery.isLoading ||
    historialPreviewQuery.isLoading
  ) {
    return (
      <SectionShell title="Detalle de proveedor">
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      </SectionShell>
    );
  }

  if (
    proveedorQuery.isError ||
    estadisticasQuery.isError ||
    !proveedorQuery.data ||
    !estadisticasQuery.data
  ) {
    return (
      <SectionShell title="Detalle de proveedor">
        <EmptyState
          title="No fue posible cargar el proveedor"
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

  const proveedor = proveedorQuery.data;
  const estadisticas = estadisticasQuery.data;
  const previewHistorial = normalizeCollection(
    historialPreviewQuery.data,
  ).results;
  const chartData = groupFacturasByMonth(previewHistorial);
  const tabs = [
    [PROVEEDOR_DETALLE_TABS.RESUMEN, 'Resumen'],
    [PROVEEDOR_DETALLE_TABS.HISTORIAL, 'Historial'],
  ];

  return (
    <SectionShell
      eyebrow="Ficha de abastecimiento"
      title={proveedor.nombre_completo}
      description={`Documento ${proveedor.tipo_documento} ${proveedor.numero_documento}. Alta ${formatDate(proveedor.created_at)}.`}
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
            onClick={() => onEdit(proveedor)}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10"
          >
            <FilePenLine className="h-4 w-4" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onDelete(proveedor)}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-3 font-semibold text-rose-100 transition hover:bg-rose-500/20"
          >
            <Trash2 className="h-4 w-4" />
            Archivar
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_1.1fr_1fr]">
          <MetricTile
            label="Estado"
            value={<ProveedorStatusBadge proveedor={proveedor} />}
            note={proveedor.activo ? 'Disponible para compras' : 'Registro inactivo'}
            compact
          />
          <MetricTile
            label="Total compras"
            value={formatCurrency(estadisticas.total_compras)}
            note={`${formatNumber(estadisticas.compras_procesadas)} compras procesadas`}
            tone="success"
          />
          <MetricTile
            label="Pendientes"
            value={formatNumber(estadisticas.compras_pendientes)}
            note={formatCurrency(estadisticas.total_pendiente_procesar)}
            tone="warning"
          />
          <MetricTile
            label="Ticket promedio"
            value={formatCurrency(estadisticas.ticket_promedio)}
            note={`Relacionadas ${formatNumber(estadisticas.facturas_relacionadas)}`}
            tone="accent"
          />
        </div>

        <SupplierMetaGrid proveedor={proveedor} />

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

          {detalleTab === PROVEEDOR_DETALLE_TABS.RESUMEN && (
            <div className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                <div className="grid gap-4">
                  <MetricTile
                    label="Ultima compra"
                    value={formatDate(estadisticas.ultima_compra)}
                    note={`Impuestos ${formatCurrency(estadisticas.total_impuestos)}`}
                    compact
                  />
                  <MetricTile
                    label="Descuentos"
                    value={formatCurrency(estadisticas.total_descuentos)}
                    note="Acumulado del proveedor"
                    compact
                    tone="warning"
                  />
                  <MetricTile
                    label="Facturas"
                    value={formatNumber(estadisticas.cantidad_compras)}
                    note="Relacion total con el proveedor"
                    compact
                  />
                </div>
                <TrendPanel data={chartData} />
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Productos suministrados
                </div>
                <div className="text-sm leading-7 text-slate-300">
                  {proveedor.tipo_productos}
                </div>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Observaciones
                </div>
                <div className="text-sm leading-7 text-slate-300">
                  {proveedor.observaciones || 'Sin observaciones registradas.'}
                </div>
              </div>
            </div>
          )}

          {detalleTab === PROVEEDOR_DETALLE_TABS.HISTORIAL && (
            <ProveedorHistorial proveedorId={proveedor.id} />
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
          <Factory className="h-4 w-4" />
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
