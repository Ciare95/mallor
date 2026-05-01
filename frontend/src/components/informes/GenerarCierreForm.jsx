import { AlertTriangle, Receipt } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { PanelShell } from './shared';

const MANUAL_EXPENSE_FIELDS = [
  {
    key: 'servicios_publicos',
    label: 'Servicios publicos',
    placeholder: 'Factura de energia, agua, internet',
  },
  {
    key: 'arriendos',
    label: 'Arriendos',
    placeholder: 'Canon o prorrateo del dia',
  },
  {
    key: 'salarios',
    label: 'Salarios',
    placeholder: 'Nomina, turnos o bonificaciones',
  },
  {
    key: 'otros_gastos',
    label: 'Otros gastos',
    placeholder: 'Cualquier otro egreso operativo',
  },
];

export default function GenerarCierreForm({
  form,
  onChange,
  preview,
  onSubmit,
  isSubmitting,
  exactDateClosure,
  error,
}) {
  return (
    <PanelShell
      title="Generar cierre"
      subtitle="Calcula automaticamente ventas, abonos y gastos del dia antes de confirmar."
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-3 lg:grid-cols-2">
          <label className="app-field">
            <span className="app-field-label">Fecha del cierre</span>
            <input
              type="date"
              value={form.fecha}
              onChange={(event) => onChange('fecha', event.target.value)}
              className="app-input min-h-11"
              required
            />
          </label>
          <label className="app-field">
            <span className="app-field-label">Efectivo real en caja</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.efectivo_real}
              onChange={(event) => onChange('efectivo_real', event.target.value)}
              className="app-input min-h-11"
              required
            />
          </label>
        </div>

        {exactDateClosure && (
          <div className="rounded-[20px] border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-4 text-[13px] text-[var(--warning-text)]">
            Ya existe un cierre para esta fecha. Si confirmas, el backend
            actualizara ese cierre con los nuevos valores.
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[24px] border border-app bg-[var(--panel-soft)] p-4">
            <div className="eyebrow">Resumen automatico</div>
            <div className="mt-4 space-y-3">
              <SummaryRow
                label="Total ventas"
                value={formatCurrency(preview.totalVentas)}
              />
              <SummaryRow
                label="Total abonos"
                value={formatCurrency(preview.totalAbonos)}
              />
              <SummaryRow
                label="Compras de mercancia"
                value={formatCurrency(preview.comprasMercancia)}
              />
              <SummaryRow
                label="Total gastos"
                value={formatCurrency(preview.totalGastos)}
              />
              <SummaryRow
                label="Efectivo esperado"
                value={formatCurrency(preview.efectivoEsperado)}
              />
              <SummaryRow
                label="Diferencia"
                value={formatCurrency(preview.diferencia)}
                tone={
                  preview.diferencia > 0
                    ? 'success'
                    : preview.diferencia < 0
                      ? 'danger'
                      : 'neutral'
                }
              />
            </div>

            <div className="mt-5 rounded-[18px] border border-app bg-white/76 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Metodos de pago
              </div>
              <div className="mt-3 space-y-2">
                {preview.metodosPago.map((item) => (
                  <SummaryRow
                    key={item.label}
                    label={`${item.label} (${formatNumber(item.cantidad_ventas)} ventas)`}
                    value={formatCurrency(item.total_vendido)}
                    compact
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-app bg-white/72 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Gastos manuales del dia
              </div>
              <div className="mt-4 space-y-4">
                {MANUAL_EXPENSE_FIELDS.map((field) => (
                  <div
                    key={field.key}
                    className="grid gap-3 lg:grid-cols-[160px_minmax(0,1fr)]"
                  >
                    <label className="app-field">
                      <span className="app-field-label">{field.label}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.gastos[field.key].monto}
                        onChange={(event) =>
                          onChange(
                            `gastos.${field.key}.monto`,
                            event.target.value,
                          )
                        }
                        className="app-input min-h-11"
                      />
                    </label>
                    <label className="app-field">
                      <span className="app-field-label">Detalle</span>
                      <input
                        type="text"
                        value={form.gastos[field.key].descripcion}
                        onChange={(event) =>
                          onChange(
                            `gastos.${field.key}.descripcion`,
                            event.target.value,
                          )
                        }
                        placeholder={field.placeholder}
                        className="app-input min-h-11"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <label className="app-field">
              <span className="app-field-label">Observaciones</span>
              <textarea
                value={form.observaciones}
                onChange={(event) => onChange('observaciones', event.target.value)}
                rows={4}
                className="app-textarea min-h-[120px]"
                placeholder="Notas de cierre, diferencias explicadas o novedades del turno"
              />
            </label>

            {error && (
              <div className="rounded-[20px] border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-4 text-[13px] text-[var(--danger-text)]">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div>{error}</div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="app-button-primary min-h-11 w-full"
            >
              <Receipt className="h-4 w-4" />
              {isSubmitting ? 'Generando cierre...' : 'Confirmar y generar cierre'}
            </button>
          </div>
        </div>
      </form>
    </PanelShell>
  );
}

function SummaryRow({ label, value, compact = false, tone = 'neutral' }) {
  const toneClass =
    tone === 'success'
      ? 'text-[var(--accent)]'
      : tone === 'danger'
        ? 'text-[var(--danger-text)]'
        : 'text-main';
  const labelClass = compact ? 'text-[12px]' : 'text-[13px]';

  return (
    <div className="flex items-center justify-between gap-3 rounded-[16px] border border-app bg-white/72 px-3 py-3">
      <div className={`${labelClass} text-soft`}>{label}</div>
      <div className={`font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
