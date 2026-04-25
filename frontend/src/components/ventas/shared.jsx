import { ChevronLeft, ChevronRight, PackageSearch } from 'lucide-react';
import { getToneClasses, getVentaEstadoTone } from '../../utils/ventas';

export function SectionShell({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = '',
}) {
  return (
    <section className={`surface rounded-[28px] p-5 sm:p-6 xl:p-7 ${className}`}>
      {(eyebrow || title || description || actions) && (
        <div className="mb-5 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            {eyebrow && (
              <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className="font-display text-2xl text-white sm:text-3xl">
                {title}
              </h2>
            )}
            {description && (
              <p className="max-w-3xl text-sm leading-6 text-slate-400">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({ status }) {
  const tone = getVentaEstadoTone(status);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getToneClasses(tone)}`}
    >
      {status}
    </span>
  );
}

export function EmptyState({ icon, title, description, action }) {
  const IconComponent = icon || PackageSearch;

  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] px-6 py-10 text-center">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-300">
        <IconComponent className="h-6 w-6" />
      </div>
      <h3 className="mt-5 font-display text-xl text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PaginationBar({ meta, onPageChange }) {
  if (!meta || meta.total_pages <= 1) {
    return null;
  }

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-slate-400">
        Pagina {meta.current_page} de {meta.total_pages}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(meta.current_page - 1)}
          disabled={meta.current_page <= 1}
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange(meta.current_page + 1)}
          disabled={meta.current_page >= meta.total_pages}
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
