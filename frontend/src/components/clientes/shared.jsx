import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  EmptyState,
  PaginationBar,
  SectionShell,
} from '../ventas/shared';
import {
  DOCUMENTO_LABELS,
  REGIMEN_LABELS,
  TIPO_CLIENTE_LABELS,
  getClienteStatusMeta,
} from '../../utils/clientes';

export { EmptyState, PaginationBar, SectionShell };

export function ClienteStatusBadge({ cliente }) {
  const meta = getClienteStatusMeta(cliente);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${meta.classes}`}
    >
      {meta.label}
    </span>
  );
}

export function ClienteRiskBadge({ venta, diasPlazo = 0, overdueDays = 0 }) {
  if (Number(venta?.saldo_pendiente || 0) <= 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        <ShieldCheck className="h-3.5 w-3.5" />
        Al dia
      </span>
    );
  }

  if (overdueDays > 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--warning-text)]">
        <ShieldAlert className="h-3.5 w-3.5" />
        {overdueDays} dias mora
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--info-text)]">
      <AlertTriangle className="h-3.5 w-3.5" />
      Plazo {diasPlazo} dias
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

export function CustomerMetaGrid({ cliente }) {
  const rows = [
    ['Documento', `${DOCUMENTO_LABELS[cliente.tipo_documento] || cliente.tipo_documento} ${cliente.numero_documento}`],
    ['Tipo', TIPO_CLIENTE_LABELS[cliente.tipo_cliente] || cliente.tipo_cliente],
    ['Regimen', REGIMEN_LABELS[cliente.regimen_tributario] || 'Sin regimen'],
    ['Telefono', cliente.telefono || '--'],
    ['Celular', cliente.celular || '--'],
    ['Correo', cliente.email || '--'],
    ['Ciudad', cliente.ciudad || '--'],
    ['Departamento', cliente.departamento || '--'],
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
