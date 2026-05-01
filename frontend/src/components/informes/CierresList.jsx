import { createElement } from 'react';
import { CalendarRange, Download, Eye, Printer, Search } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { PaginationBar } from '../ventas/shared';
import { EmptyPanel, PanelShell } from './shared';

export default function CierresList({
  data,
  filters,
  onChangeFilters,
  onPageChange,
  onSelect,
  onPrint,
  onDownloadPdf,
  isLoading,
  selectedId,
}) {
  return (
    <PanelShell
      title="Historial de cierres"
      subtitle="Filtra por fecha o usuario y abre cualquier cierre para revisar o imprimir."
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_180px_180px]">
        <label className="app-field">
          <span className="app-field-label">Buscar por usuario</span>
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
              placeholder="Nombre, apellido o username"
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
            Cargando cierres...
          </div>
        ) : data.results.length === 0 ? (
          <EmptyPanel
            icon={CalendarRange}
            title="Sin cierres para los filtros"
            description="Ajusta la fecha o genera el primer cierre para comenzar el historial."
          />
        ) : (
          data.results.map((cierre) => (
            <article
              key={cierre.id}
              className={`rounded-[22px] border px-4 py-4 transition ${
                selectedId === cierre.id
                  ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
                  : 'border-app bg-white/72'
              }`}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="font-display text-[1.45rem] leading-none text-main">
                    Cierre {cierre.fecha_cierre}
                  </div>
                  <div className="mt-2 text-[12px] text-soft">
                    Registrado {formatDateTime(cierre.fecha_registro)} por{' '}
                    {cierre.usuario_cierre_nombre || 'Sin usuario'}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <InlineMetric
                    label="Ventas"
                    value={formatCurrency(cierre.total_ventas)}
                  />
                  <InlineMetric
                    label="Efectivo esperado"
                    value={formatCurrency(cierre.efectivo_esperado)}
                  />
                  <InlineMetric
                    label="Diferencia"
                    value={formatCurrency(cierre.diferencia)}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton
                  label="Ver"
                  icon={Eye}
                  onClick={() => onSelect(cierre.id)}
                />
                <ActionButton
                  label="Imprimir"
                  icon={Printer}
                  onClick={() => onPrint(cierre.id)}
                />
                <ActionButton
                  label="Descargar PDF"
                  icon={Download}
                  onClick={() => onDownloadPdf(cierre.id)}
                />
              </div>
            </article>
          ))
        )}
      </div>

      <PaginationBar meta={data} onPageChange={onPageChange} />
    </PanelShell>
  );
}

function InlineMetric({ label, value }) {
  return (
    <div className="rounded-[16px] border border-app bg-[var(--panel-soft)] px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </div>
      <div className="mt-2 text-[13px] font-semibold text-main">{value}</div>
    </div>
  );
}

function ActionButton({ label, icon: IconComponent, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="app-button-secondary min-h-10"
    >
      {createElement(IconComponent, { className: 'h-4 w-4' })}
      {label}
    </button>
  );
}
