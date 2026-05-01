import { CalendarDays, Printer, RefreshCcw } from 'lucide-react';
import {
  DASHBOARD_PRESETS,
  formatDateInput,
  getRangeSupportLabel,
} from '../../utils/informes';

export default function FiltrosFecha({
  preset,
  customRange,
  resolvedRange,
  onPresetChange,
  onCustomRangeChange,
  onApplyCustomRange,
  onRefresh,
  onPrint,
  isRefreshing = false,
  latestUpdateLabel = '',
}) {
  return (
    <section className="surface p-3">
      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div>
          <div className="eyebrow">Control de lectura</div>
          <div className="mt-2 font-display text-[1.9rem] leading-none text-main">
            Dashboard de estadisticas
          </div>
          <p className="body-copy mt-2 max-w-2xl text-[13px]">
            Vista consolidada de ventas, clientes, inventario y cartera.
            Cambia la ventana temporal para refrescar metricas, comparativos y
            tendencias.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {DASHBOARD_PRESETS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onPresetChange(option.value)}
                className={`rounded-full border px-4 py-2 text-[12px] font-semibold transition ${
                  preset === option.value
                    ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-app bg-white/72 text-soft hover:bg-white hover:text-main'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-soft">
            <div className="inline-flex items-center gap-2 rounded-full border border-app bg-white/72 px-3 py-2">
              <CalendarDays className="h-3.5 w-3.5" />
              {getRangeSupportLabel(resolvedRange)}
            </div>
            {latestUpdateLabel && (
              <div className="inline-flex rounded-full border border-app bg-white/72 px-3 py-2">
                Actualizado {latestUpdateLabel}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-app bg-white/72 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="app-field">
              <span className="app-field-label">Fecha inicio</span>
              <input
                type="date"
                value={formatDateInput(customRange.fechaInicio)}
                onChange={(event) =>
                  onCustomRangeChange('fechaInicio', event.target.value)
                }
                disabled={preset !== 'personalizado'}
                className="app-input min-h-11"
              />
            </label>
            <label className="app-field">
              <span className="app-field-label">Fecha fin</span>
              <input
                type="date"
                value={formatDateInput(customRange.fechaFin)}
                onChange={(event) =>
                  onCustomRangeChange('fechaFin', event.target.value)
                }
                disabled={preset !== 'personalizado'}
                className="app-input min-h-11"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onApplyCustomRange}
              disabled={preset !== 'personalizado'}
              className="app-button-primary min-h-11"
            >
              Aplicar rango
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="app-button-secondary min-h-11"
            >
              <RefreshCcw
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Refrescar
            </button>
            <button
              type="button"
              onClick={onPrint}
              className="app-button-secondary min-h-11"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
          </div>

          <div className="mt-4 rounded-[18px] border border-app bg-[var(--panel-soft)] px-4 py-4">
            <div className="eyebrow">Lectura actual</div>
            <div className="mt-2 text-sm font-semibold text-main">
              {preset === 'personalizado'
                ? 'Rango personalizado activo'
                : 'Preset activo'}
            </div>
            <div className="mt-2 text-[13px] text-soft">
              El tablero se actualiza en segundo plano y conserva la ultima
              respuesta mientras llegan los nuevos datos.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
