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
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${meta.classes}`}
    >
      {meta.label}
    </span>
  );
}

export function FacturaCompraStatusBadge({ factura }) {
  const meta = getFacturaCompraStatusMeta(factura);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${meta.classes}`}
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
    neutral: 'border-app bg-white/70',
    success: 'border-[var(--accent-line)] bg-[var(--accent-soft)]',
    accent: 'border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)]',
    warning: 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)]',
  };

  return (
    <div className={`rounded-xl border p-4 ${toneMap[tone]}`}>
      <div className="eyebrow">{label}</div>
      <div
        className={`mt-2 text-main ${
          compact ? 'text-base font-semibold' : 'font-display text-[2rem]'
        }`}
      >
        {value}
      </div>
      {note && <div className="mt-2 text-[12px] text-soft">{note}</div>}
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
          className="rounded-xl border border-app bg-white/70 px-4 py-4"
        >
          <div className="eyebrow">{label}</div>
          <div className="mt-2 text-[13px] font-semibold text-main">{value}</div>
        </div>
      ))}
    </div>
  );
}

export function HelperPanel() {
  return (
    <div className="rounded-xl border border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)] px-4 py-4 text-[13px] text-[var(--info-text)]">
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
    <div className="flex flex-wrap gap-3 text-[13px] text-soft">
      <span className="inline-flex items-center gap-2">
        <FileClock className="h-4 w-4 text-muted" />
        {factura?.detalles?.length || 0} items
      </span>
      <span className="inline-flex items-center gap-2">
        <Landmark className="h-4 w-4 text-muted" />
        {FORMA_PAGO_PROVEEDOR_LABELS[factura?.proveedor?.forma_pago] || 'Compra'}
      </span>
    </div>
  );
}
