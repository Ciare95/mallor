import { createElement } from 'react';
import { FileSpreadsheet, FileText, Info, ReceiptText } from 'lucide-react';
import { REPORT_TYPE_OPTIONS, getReportMeta, supportsFormat } from './reportes-config';
import { PanelShell } from './shared';

export default function GenerarReporteForm({
  form,
  onChange,
  onSubmit,
  cierresOptions = [],
  isSubmitting,
  error,
}) {
  const reportMeta = getReportMeta(form.tipo_reporte);
  const pdfSupported = supportsFormat(form.tipo_reporte, 'pdf');
  const excelSupported = supportsFormat(form.tipo_reporte, 'excel');

  return (
    <PanelShell
      title="Generar reporte"
      subtitle="Configura el tipo, rango y formato antes de generar o revisar la vista previa."
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <label className="app-field">
          <span className="app-field-label">Tipo de reporte</span>
          <select
            value={form.tipo_reporte}
            onChange={(event) => onChange('tipo_reporte', event.target.value)}
            className="app-select min-h-11"
          >
            {REPORT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-[22px] border border-app bg-[var(--panel-soft)] px-4 py-4">
          <div className="eyebrow">Resumen del tipo</div>
          <div className="mt-3 text-[13px] leading-6 text-soft">
            {reportMeta.description}
          </div>
        </div>

        {reportMeta.requiresDateRange && (
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="app-field">
              <span className="app-field-label">Fecha inicio</span>
              <input
                type="date"
                value={form.fecha_inicio}
                onChange={(event) => onChange('fecha_inicio', event.target.value)}
                className="app-input min-h-11"
                required
              />
            </label>
            <label className="app-field">
              <span className="app-field-label">Fecha fin</span>
              <input
                type="date"
                value={form.fecha_fin}
                onChange={(event) => onChange('fecha_fin', event.target.value)}
                className="app-input min-h-11"
                required
              />
            </label>
          </div>
        )}

        {reportMeta.requiresCierre && (
          <label className="app-field">
            <span className="app-field-label">Cierre a exportar</span>
            <select
              value={form.cierre_id}
              onChange={(event) => onChange('cierre_id', event.target.value)}
              className="app-select min-h-11"
            >
              <option value="">Selecciona un cierre</option>
              {cierresOptions.map((cierre) => (
                <option key={cierre.id} value={String(cierre.id)}>
                  {cierre.fecha_cierre} | {cierre.usuario_cierre_nombre || 'Sin usuario'}
                </option>
              ))}
            </select>
          </label>
        )}

        {(form.tipo_reporte === 'PRODUCTOS_MAS_VENDIDOS' ||
          form.tipo_reporte === 'CLIENTES_TOP') && (
          <label className="app-field">
            <span className="app-field-label">Limite de resultados</span>
            <input
              type="number"
              min="1"
              max="50"
              value={form.limite}
              onChange={(event) => onChange('limite', event.target.value)}
              className="app-input min-h-11"
            />
          </label>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <FormatCard
            label="PDF"
            icon={FileText}
            active={form.formato === 'pdf'}
            disabled={!pdfSupported}
            helper={
              pdfSupported
                ? 'Documento listo para imprimir o compartir.'
                : 'No hay generador PDF configurado para este tipo.'
            }
            onClick={() => onChange('formato', 'pdf')}
          />
          <FormatCard
            label="Excel"
            icon={FileSpreadsheet}
            active={form.formato === 'excel'}
            disabled={!excelSupported}
            helper={
              excelSupported
                ? 'Archivo tabular para analisis y filtros.'
                : 'No hay generador Excel configurado para este tipo.'
            }
            onClick={() => onChange('formato', 'excel')}
          />
        </div>

        {reportMeta.previewOnly && (
          <div className="rounded-[20px] border border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)] px-4 py-4 text-[13px] text-[var(--info-text)]">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4" />
              <div>
                Este tipo se deja como vista previa financiera. El backend no
                tiene generador de archivos configurado para exportarlo todavia.
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-[20px] border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-4 text-[13px] text-[var(--danger-text)]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || reportMeta.previewOnly}
          className="app-button-primary min-h-11 w-full"
        >
          <ReceiptText className="h-4 w-4" />
          {isSubmitting ? 'Generando reporte...' : 'Generar y descargar reporte'}
        </button>
      </form>
    </PanelShell>
  );
}

function FormatCard({
  label,
  icon: IconComponent,
  active,
  disabled,
  helper,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[22px] border px-4 py-4 text-left transition ${
        active
          ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
          : 'border-app bg-white/72'
      } ${disabled ? 'cursor-not-allowed opacity-55' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="eyebrow">{label}</div>
        {createElement(IconComponent, {
          className: 'h-4 w-4 text-[var(--accent)]',
        })}
      </div>
      <div className="mt-3 text-[13px] leading-6 text-soft">{helper}</div>
    </button>
  );
}
