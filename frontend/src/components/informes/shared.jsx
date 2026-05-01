import { createElement } from 'react';
import { AlertTriangle, Loader2, PackageSearch } from 'lucide-react';

export function DashboardSection({
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
            {description && <p className="body-copy max-w-3xl">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function PanelShell({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`rounded-[28px] border border-app bg-white/76 p-5 ${className}`}>
      <div className="mb-5 flex flex-col gap-3 border-b border-app pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="font-display text-[1.45rem] leading-none text-main">
            {title}
          </div>
          {subtitle && <div className="mt-2 text-[13px] text-soft">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function EmptyPanel({
  icon: IconComponent = PackageSearch,
  title,
  description,
  className = '',
}) {
  return (
    <div
      className={`empty-state min-h-[240px] rounded-[24px] border border-dashed border-app bg-[var(--panel-soft)] ${className}`}
    >
      <div className="rounded-xl border border-app bg-white/74 p-3 text-soft">
        {createElement(IconComponent, { className: 'h-5 w-5' })}
      </div>
      <div className="mt-4 font-display text-[1.4rem] leading-none text-main">
        {title}
      </div>
      <p className="mt-2 max-w-md text-[13px] leading-6 text-soft">
        {description}
      </p>
    </div>
  );
}

export function LoadingPanel({ label = 'Cargando bloque...' }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-app bg-white/76">
      <div className="inline-flex items-center gap-3 rounded-full border border-app bg-white/80 px-4 py-3 text-[13px] font-semibold text-soft">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
      </div>
    </div>
  );
}

export function ErrorPanel({
  title = 'No fue posible cargar este bloque',
  description = 'La consulta devolvio error o datos incompletos.',
}) {
  return (
    <EmptyPanel
      icon={AlertTriangle}
      title={title}
      description={description}
    />
  );
}

export function DeltaBadge({ value, children }) {
  const numericValue = Number(value);
  const toneClass =
    value === null || value === undefined || Number.isNaN(numericValue)
      ? 'border-app bg-white/70 text-soft'
      : numericValue > 0
        ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
        : numericValue < 0
          ? 'border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] text-[var(--danger-text)]'
          : 'border-app bg-white/70 text-soft';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}
