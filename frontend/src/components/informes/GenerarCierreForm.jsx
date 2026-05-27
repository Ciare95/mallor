import { AlertTriangle, Plus, Receipt, Save, Trash2 } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { PanelShell } from './shared';

export default function GenerarCierreForm({
  form,
  onChange,
  preview,
  onSubmit,
  isSubmitting,
  isMonthlySubmitting = false,
  isSavingExpense = false,
  exactDateClosure,
  selectedPeriod,
  error,
}) {
  const isMonthlyClosure = form.tipo_cierre === 'MES';

  return (
    <PanelShell
      title="Generar cierre"
      subtitle="Calcula automaticamente ventas, abonos y gastos del dia antes de confirmar."
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="grid gap-3 lg:grid-cols-3">
          <label className="app-field">
            <span className="app-field-label">Tipo de cierre</span>
            <select
              value={form.tipo_cierre}
              onChange={(event) => onChange('tipo_cierre', event.target.value)}
              className="app-input min-h-11"
            >
              <option value="DIA">Diario</option>
              <option value="MES">Mensual</option>
            </select>
          </label>
          <label className="app-field">
            <span className="app-field-label">
              {isMonthlyClosure ? 'Mes del cierre' : 'Fecha del cierre'}
            </span>
            <input
              type={isMonthlyClosure ? 'month' : 'date'}
              value={isMonthlyClosure ? form.mes : form.fecha}
              onChange={(event) =>
                onChange(
                  isMonthlyClosure ? 'mes' : 'fecha',
                  event.target.value,
                )
              }
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
              required={!isMonthlyClosure}
              disabled={isMonthlyClosure}
              placeholder={isMonthlyClosure ? 'Suma cierres diarios' : ''}
            />
          </label>
        </div>

        {isMonthlyClosure && (
          <div className="rounded-[20px] border border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)] px-4 py-4 text-[13px] leading-6 text-[var(--info-text)]">
            El cierre mensual consolida el periodo {selectedPeriod?.fecha_inicio} a{' '}
            {selectedPeriod?.fecha_fin}. El efectivo real se toma de la suma de
            cierres diarios registrados; los gastos manuales tambien vienen de
            esos cierres.
          </div>
        )}

        {!isMonthlyClosure && exactDateClosure && (
          <div className="rounded-[20px] border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-4 text-[13px] text-[var(--warning-text)]">
            Ya existe un cierre para esta fecha. Si confirmas, el sistema
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

            <div className="mt-5 rounded-[18px] border border-app bg-white/76 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Gastos por metodo
              </div>
              <div className="mt-3 space-y-2">
                <SummaryRow
                  label="Efectivo"
                  value={formatCurrency(preview.gastosPorMetodo?.EFECTIVO || 0)}
                  compact
                />
                <SummaryRow
                  label="Transferencia"
                  value={formatCurrency(preview.gastosPorMetodo?.TRANSFERENCIA || 0)}
                  compact
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {!isMonthlyClosure && (
            <div className="rounded-[24px] border border-app bg-white/72 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                    Gastos manuales del dia
                  </div>
                  <div className="mt-2 text-[12px] text-soft">
                    Agrega cada gasto cuando ocurra; el detalle indica en que se gasto.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onChange('gastos.add')}
                  className="app-button-secondary min-h-10"
                >
                  <Plus className="h-4 w-4" />
                  Nueva fila
                </button>
              </div>
              <div className="mt-4 space-y-4">
                {form.gastos.map((expense, index) => (
                  <div
                    key={expense.id}
                    className="rounded-[18px] border border-app bg-[var(--panel-soft)] p-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(92px,1fr)_42px]">
                      <label className="app-field">
                        <span className="app-field-label">Metodo</span>
                        <select
                          value={expense.metodo_pago}
                          onChange={(event) =>
                            onChange(
                              `gastos.${index}.metodo_pago`,
                              event.target.value,
                            )
                          }
                          className="app-input min-h-11"
                          required={Number(expense.monto || 0) > 0}
                        >
                          <option value="">Selecciona</option>
                          <option value="EFECTIVO">Efectivo</option>
                          <option value="TRANSFERENCIA">Transferencia</option>
                        </select>
                      </label>
                      <label className="app-field">
                        <span className="app-field-label">Valor</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={expense.monto}
                          onChange={(event) =>
                            onChange(
                              `gastos.${index}.monto`,
                              event.target.value,
                            )
                          }
                          className="app-input min-h-11"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => onChange('gastos.remove', expense.id)}
                        disabled={form.gastos.length <= 1}
                        className="mt-[22px] inline-flex min-h-11 items-center justify-center rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] text-[var(--danger-text)] transition hover:bg-[rgba(253,235,236,0.9)] disabled:cursor-not-allowed disabled:opacity-45"
                        aria-label="Eliminar gasto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <label className="app-field mt-3">
                      <span className="app-field-label">Detalle</span>
                      <input
                        type="text"
                        value={expense.descripcion}
                        onChange={(event) =>
                          onChange(
                            `gastos.${index}.descripcion`,
                            event.target.value,
                          )
                        }
                        placeholder="Compra de agua, almuerzo, transporte..."
                        className="app-input min-h-11"
                      />
                    </label>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-[12px] text-soft">
                        {expense.registro_id
                          ? 'Gasto guardado en el sistema.'
                          : 'Guarda este gasto para que no se pierda al cambiar de modulo.'}
                      </div>
                      <button
                        type="button"
                        onClick={() => onChange('gastos.save', expense.id)}
                        disabled={isSavingExpense}
                        className="app-button-secondary min-h-10"
                      >
                        <Save className="h-4 w-4" />
                        {expense.registro_id ? 'Guardar cambios' : 'Guardar gasto'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {!isMonthlyClosure && (
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
            )}

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
              disabled={isSubmitting || isMonthlySubmitting}
              className="app-button-primary min-h-11 w-full"
            >
              <Receipt className="h-4 w-4" />
              {isMonthlyClosure
                ? isMonthlySubmitting
                  ? 'Generando PDF mensual...'
                  : 'Generar cierre mensual PDF'
                : isSubmitting
                  ? 'Generando cierre...'
                  : 'Confirmar y generar cierre'}
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
