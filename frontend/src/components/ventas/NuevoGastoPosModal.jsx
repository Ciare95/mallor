import { Save, X } from 'lucide-react';

export default function NuevoGastoPosModal({
  form,
  onChange,
  onClose,
  onSubmit,
  isSaving = false,
  error = '',
}) {
  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nuevo-gasto-pos-title"
    >
      <div className="w-full max-w-[520px] overflow-hidden rounded-[28px] border border-app bg-[var(--panel)] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-app px-5 py-5">
          <div>
            <div className="eyebrow">Gastos manuales del dia</div>
            <h2
              id="nuevo-gasto-pos-title"
              className="mt-2 font-display text-[1.45rem] leading-none text-main"
            >
              Nuevo gasto
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-app bg-white/70 text-soft transition hover:text-main"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="space-y-4 px-5 py-5" onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(120px,0.9fr)]">
            <label className="app-field">
              <span className="app-field-label">Metodo</span>
              <select
                value={form.metodo_pago}
                onChange={(event) => onChange('metodo_pago', event.target.value)}
                className="app-input min-h-11"
                required
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
                value={form.monto}
                onChange={(event) => onChange('monto', event.target.value)}
                className="app-input min-h-11"
                required
              />
            </label>
          </div>

          <label className="app-field">
            <span className="app-field-label">Detalle</span>
            <input
              type="text"
              value={form.descripcion}
              onChange={(event) => onChange('descripcion', event.target.value)}
              placeholder="Compra de agua, almuerzo, transporte..."
              className="app-input min-h-11"
              required
            />
          </label>

          {error && (
            <div className="rounded-[18px] border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-3 text-[13px] text-[var(--danger-text)]">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[12px] leading-5 text-soft">
              Se guarda para el cierre de caja de hoy.
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="app-button-primary min-h-11"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Guardando...' : 'Guardar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
