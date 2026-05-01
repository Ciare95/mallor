import { createElement } from 'react';
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Search,
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { PaginationBar } from '../ventas/shared';
import { EmptyPanel, PanelShell } from './shared';
import { getReportMeta, supportsFormat } from './reportes-config';

export default function HistorialReportes({
  data,
  filters,
  onChangeFilters,
  onPageChange,
  onSelect,
  onDownloadPdf,
  onDownloadExcel,
  isLoading,
  selectedId,
}) {
  return (
    <PanelShell
      title="Historial de reportes"
      subtitle="Consulta reportes ya generados, revisa sus datos y descarga otra vez el archivo correspondiente."
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_220px_220px]">
        <label className="app-field">
          <span className="app-field-label">Buscar por tipo o usuario</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={filters.q}
              onChange={(event) =>
                onChangeFilters((current) => ({
                  ...current,
                  q: event.target.value,
                  page: 1,
                }))
              }
              placeholder="Tipo o usuario"
              className="app-input min-h-11 pl-10"
            />
          </div>
        </label>
        <label className="app-field">
          <span className="app-field-label">Fecha inicio</span>
          <input
            type="date"
            value={filters.fecha_inicio}
            onChange={(event) =>
              onChangeFilters((current) => ({
                ...current,
                fecha_inicio: event.target.value,
                page: 1,
              }))
            }
            className="app-input min-h-11"
          />
        </label>
        <label className="app-field">
          <span className="app-field-label">Fecha fin</span>
          <input
            type="date"
            value={filters.fecha_fin}
            onChange={(event) =>
              onChangeFilters((current) => ({
                ...current,
                fecha_fin: event.target.value,
                page: 1,
              }))
            }
            className="app-input min-h-11"
          />
        </label>
      </div>

      <div className="mt-5 space-y-3">
        {isLoading ? (
          <div className="rounded-[22px] border border-app bg-[var(--panel-soft)] px-4 py-8 text-center text-soft">
            Cargando reportes...
          </div>
        ) : data.results.length === 0 ? (
          <EmptyPanel
            icon={History}
            title="Sin reportes generados"
            description="Genera el primer archivo o cambia los filtros para revisar el historial."
          />
        ) : (
          data.results.map((report) => {
            const meta = getReportMeta(report.tipo_informe);

            return (
              <article
                key={report.id}
                className={`rounded-[22px] border px-4 py-4 transition ${
                  selectedId === report.id
                    ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
                    : 'border-app bg-white/72'
                }`}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="font-display text-[1.35rem] leading-none text-main">
                      {meta.label}
                    </div>
                    <div className="mt-2 text-[12px] text-soft">
                      {formatDate(report.fecha_inicio)} - {formatDate(report.fecha_fin)} |{' '}
                      generado {formatDateTime(report.fecha_generacion)}
                    </div>
                    <div className="mt-1 text-[12px] text-soft">
                      {report.usuario_genero_nombre || 'Sin usuario'}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      label="Ver"
                      icon={Eye}
                      onClick={() => onSelect(report.id)}
                    />
                    <ActionButton
                      label="PDF"
                      icon={FileText}
                      disabled={!report.tiene_pdf && !supportsFormat(report.tipo_informe, 'pdf')}
                      onClick={() => onDownloadPdf(report.id)}
                    />
                    <ActionButton
                      label="Excel"
                      icon={FileSpreadsheet}
                      disabled={!report.tiene_excel && !supportsFormat(report.tipo_informe, 'excel')}
                      onClick={() => onDownloadExcel(report.id)}
                    />
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <PaginationBar meta={data} onPageChange={onPageChange} />
    </PanelShell>
  );
}

function ActionButton({ label, icon, disabled = false, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="app-button-secondary min-h-10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {createElement(icon, { className: 'h-4 w-4' })}
      {label}
    </button>
  );
}
