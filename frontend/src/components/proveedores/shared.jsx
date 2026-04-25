import { FileClock, Landmark, ShieldCheck } from 'lucide-react';
import {
  EmptyState,
  PaginationBar,
  SectionShell,
} from '../ventas/shared';
import {
  DOCUMENTO_PROVEEDOR_LABELS,
  FACTURA_ESTADO_LABELS,
  FORMA_PAGO_PROVEEDOR_LABELS,
  getFacturaCompraStatusMeta,
  getProveedorStatusMeta,
} from '../../utils/proveedores';

export { EmptyState, PaginationBar, SectionShell };

export function ProveedorStatusBadge({ proveedor }) {
  const meta = getProveedorStatusMeta(proveedor);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${meta.classes}`}
    >
      {meta.label}
    </span>
  );
}

export function FacturaCompraStatusBadge({ factura }) {
  const meta = getFacturaCompraStatusMeta(factura);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${meta.classes}`}
    >
      {FACTURA_ESTADO_LABELS[factura?.estado] || meta.label}
    </span>
  );
}

export function MetricTile({
  label,
  value,
  note,
  tone = 'neutral',
  compact = false,
}) {
  const toneMap = {
    neutral: 'border-white/10 bg-white/[0.04]',
    success: 'border-emerald-500/20 bg-emerald-500/10',
    accent: 'border-cyan-500/20 bg-cyan-500/10',
    warning: 'border-amber-500/20 bg-amber-500/10',
  };

  return (
    <div className={`rounded-[22px] border p-4 ${toneMap[tone]}`}>
      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
        {label}
      </div>
      <div
        className={`mt-3 text-white ${
          compact ? 'text-lg font-semibold' : 'font-display text-3xl'
        }`}
      >
        {value}
      </div>
      {note && <div className="mt-2 text-sm text-slate-400">{note}</div>}
    </div>
  );
}

export function SupplierMetaGrid({ proveedor }) {
  const rows = [
    [
      'Documento',
      `${DOCUMENTO_PROVEEDOR_LABELS[proveedor.tipo_documento] || proveedor.tipo_documento} ${proveedor.numero_documento}`,
    ],
    ['Contacto', proveedor.nombre_contacto || '--'],
    ['Telefono', proveedor.telefono || '--'],
    ['Celular', proveedor.celular || '--'],
    ['Correo', proveedor.email || '--'],
    ['Ciudad', proveedor.ciudad || '--'],
    ['Departamento', proveedor.departamento || '--'],
    [
      'Forma pago',
      FORMA_PAGO_PROVEEDOR_LABELS[proveedor.forma_pago] || proveedor.forma_pago,
    ],
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4"
        >
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            {label}
          </div>
          <div className="mt-2 text-sm font-semibold text-white">{value}</div>
        </div>
      ))}
    </div>
  );
}

export function HelperPanel() {
  return (
    <div className="rounded-[20px] border border-cyan-500/20 bg-cyan-500/10 px-4 py-4 text-sm text-cyan-100">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-4 w-4" />
        <span>
          La ficha del proveedor consolida catalogo suministrado, historial de
          compras y condiciones de pago en una sola vista.
        </span>
      </div>
    </div>
  );
}

export function PurchaseQuickMeta({ factura }) {
  return (
    <div className="flex flex-wrap gap-3 text-sm text-slate-400">
      <span className="inline-flex items-center gap-2">
        <FileClock className="h-4 w-4 text-slate-500" />
        {factura?.detalles?.length || 0} items
      </span>
      <span className="inline-flex items-center gap-2">
        <Landmark className="h-4 w-4 text-slate-500" />
        {FORMA_PAGO_PROVEEDOR_LABELS[factura?.proveedor?.forma_pago] || 'Compra'}
      </span>
    </div>
  );
}
