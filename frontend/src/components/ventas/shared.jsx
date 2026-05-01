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
    <section className={`surface p-4 sm:p-5 xl:p-6 ${className}`}>
      {(eyebrow || title || description || actions) && (
        <div className="mb-5 flex flex-col gap-4 border-b border-app pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h2 className="section-title">{title}</h2>}
            {description && <p className="max-w-3xl body-copy">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
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
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getToneClasses(tone)}`}
    >
      {status}
    </span>
  );
}

export function EmptyState({ icon, title, description, action }) {
  const IconComponent = icon || PackageSearch;

  return (
    <div className="empty-state">
      <div className="rounded-lg border border-app bg-[var(--panel-soft)] p-3 text-soft">
        <IconComponent className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-display text-[1.55rem] leading-none text-main">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-[13px] leading-6 text-soft">
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
    <div className="mt-5 flex flex-col gap-3 border-t border-app pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-[13px] text-soft">
        Pagina {meta.current_page} de {meta.total_pages}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(meta.current_page - 1)}
          disabled={meta.current_page <= 1}
          className="app-button-secondary min-h-10"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange(meta.current_page + 1)}
          disabled={meta.current_page >= meta.total_pages}
          className="app-button-secondary min-h-10"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
