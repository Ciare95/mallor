import { useState } from 'react';
import {
  AlertCircle,
  ClipboardPenLine,
  Loader2,
  PackageCheck,
  X,
} from 'lucide-react';

const normalizeIntegerInput = (value) => {
  const stringValue = String(value ?? '');
  const match = stringValue.match(/^\d+/);
  return match ? match[0] : '';
};

const normalizeIntegerDisplay = (value, fallback = '0') => {
  if (value === '' || value === null || value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return String(Math.trunc(parsed));
};

const AjusteStockModal = ({
  producto,
  isLoading,
  error,
  onConfirm,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    nueva_cantidad: normalizeIntegerDisplay(producto?.existencias),
    motivo: '',
    observaciones: '',
  });
  const [touched, setTouched] = useState(false);

  const cantidadInvalida =
    formData.nueva_cantidad === ''
    || Number(formData.nueva_cantidad) < 0
    || Number.isNaN(Number(formData.nueva_cantidad));
  const motivoInvalido = !formData.motivo.trim();
  const hasError = touched && (cantidadInvalida || motivoInvalido);

  const handleSubmit = (event) => {
    event.preventDefault();
    setTouched(true);
    if (cantidadInvalida || motivoInvalido) return;
    onConfirm({
      nueva_cantidad: formData.nueva_cantidad,
      motivo: formData.motivo.trim(),
      observaciones: formData.observaciones.trim(),
    });
  };

  const handleCantidadChange = (event) => {
    const nextValue = normalizeIntegerInput(event.target.value);
    setFormData((prev) => ({
      ...prev,
      nueva_cantidad: nextValue,
    }));
  };

  const handleCantidadFocus = (event) => {
    if (normalizeIntegerDisplay(event.target.value, '') === '0') {
      setFormData((prev) => ({
        ...prev,
        nueva_cantidad: '',
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,14,13,0.72)] px-4 py-6 backdrop-blur-md">
      <div className="flex w-full max-w-2xl items-center justify-center">
        <div className="surface flex max-h-[calc(100vh-3rem)] w-full flex-col overflow-hidden border border-app shadow-[0_28px_80px_rgba(5,12,10,0.34)]">
          <div className="border-b border-app px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <div className="section-chip">Ajuste de inventario</div>
                  <div className="text-lg font-semibold text-main sm:text-xl">
                    Ajuste manual de stock
                  </div>
                  <p className="text-[12px] text-soft">{producto?.nombre}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-app p-2 text-muted transition hover:border-[var(--accent-line)] hover:bg-[var(--panel-soft)] hover:text-main"
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:space-y-6 sm:px-6 sm:py-6">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-text)]">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-2xl border border-app bg-[var(--panel-soft)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
                  Producto
                </div>
                <div className="mt-2 text-sm font-semibold text-main">
                  {producto?.nombre}
                </div>
                <div className="mt-1 text-[12px] text-soft">
                  Registra conteos, mermas o correcciones operativas.
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-soft)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]/70">
                  Stock actual
                </div>
                <div className="mt-2 text-3xl font-semibold text-[var(--accent)]">
                  {Number(producto?.existencias || 0)}
                </div>
              </div>
            </section>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="app-field" htmlFor="nueva_cantidad">
                  <span className="app-field-label">Nueva cantidad *</span>
                  <input
                    id="nueva_cantidad"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={formData.nueva_cantidad}
                    onChange={handleCantidadChange}
                    onFocus={handleCantidadFocus}
                    className={`app-input min-h-11 ${touched && cantidadInvalida ? 'border-[rgba(159,47,45,0.28)] focus:border-[rgba(159,47,45,0.42)] focus:shadow-none' : ''}`}
                  />
                </label>
                <p className="mt-2 text-[12px] text-soft">
                  Define el nuevo stock total que debe quedar registrado.
                </p>
                {touched && cantidadInvalida && (
                  <p className="mt-2 text-[12px] text-[var(--danger-text)]">
                    Ingresa una cantidad valida mayor o igual a cero.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-app bg-[var(--panel-soft)] p-4">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
                  <ClipboardPenLine className="h-4 w-4" />
                  Guia rapida
                </div>
                <div className="mt-3 space-y-2 text-[12px] text-soft">
                  <p>Usa un motivo breve y claro para dejar trazabilidad.</p>
                  <p>Las observaciones son opcionales, pero ayudan en auditoria.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-5">
              <div>
                <label className="app-field" htmlFor="motivo">
                  <span className="app-field-label">Motivo *</span>
                  <input
                    id="motivo"
                    type="text"
                    value={formData.motivo}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        motivo: event.target.value,
                      }))}
                    placeholder="Conteo fisico, merma, devolucion..."
                    className={`app-input min-h-11 ${touched && motivoInvalido ? 'border-[rgba(159,47,45,0.28)] focus:border-[rgba(159,47,45,0.42)] focus:shadow-none' : ''}`}
                  />
                </label>
                {touched && motivoInvalido && (
                  <p className="mt-2 text-[12px] text-[var(--danger-text)]">
                    El motivo es obligatorio.
                  </p>
                )}
              </div>

              <label className="app-field" htmlFor="observaciones">
                <span className="app-field-label">Observaciones</span>
                <textarea
                  id="observaciones"
                  rows="4"
                  value={formData.observaciones}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      observaciones: event.target.value,
                    }))}
                  className="app-textarea"
                  placeholder="Notas adicionales para el historial del ajuste."
                />
              </label>
            </div>

            {hasError && (
              <div className="rounded-xl border border-[rgba(176,118,14,0.18)] bg-[rgba(245,166,35,0.08)] px-4 py-3 text-sm text-[var(--warning-text)]">
                Revisa los campos marcados antes de confirmar el ajuste.
              </div>
            )}
            </div>

            <div className="border-t border-app bg-[var(--panel-strong)] px-5 py-4 sm:px-6">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="app-button-secondary min-h-11"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="app-button-primary min-h-11"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar ajuste
              </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AjusteStockModal;
