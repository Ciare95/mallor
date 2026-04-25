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
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${meta.classes}`}
    >
      {meta.label}
    </span>
  );
}

export function ClienteRiskBadge({ venta, diasPlazo = 0, overdueDays = 0 }) {
  if (Number(venta?.saldo_pendiente || 0) <= 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
        <ShieldCheck className="h-3.5 w-3.5" />
        Al dia
      </span>
    );
  }

  if (overdueDays > 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
        <ShieldAlert className="h-3.5 w-3.5" />
        {overdueDays} dias mora
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
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
