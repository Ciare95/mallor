import { useState } from 'react';
import { Loader2, Wallet, X } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const getInitialForm = (venta) => ({
  monto_abonado: venta?.saldo_pendiente || '',
  metodo_pago: 'EFECTIVO',
  referencia_pago: '',
  observaciones: '',
});

export default function AbonoForm({
  open,
  venta,
  isLoading,
  error,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => getInitialForm(venta));

  if (!open || !venta) {
    return null;
  }

  const monto = Number(form.monto_abonado || 0);
  const saldo = Number(venta.saldo_pendiente || 0);
  const isInvalid = monto <= 0 || monto > saldo;

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isInvalid) {
      return;
    }

    onSubmit({
      ...form,
      monto_abonado: Number(form.monto_abonado).toFixed(2),
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="surface w-full max-w-lg p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Nuevo abono</div>
            <h3 className="mt-2 font-display text-2xl text-main">
              {venta.numero_venta}
            </h3>
            <div className="mt-2 text-[13px] text-soft">
              Saldo pendiente: {formatCurrency(venta.saldo_pendiente)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-app bg-white/72 text-main transition hover:bg-white"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-[13px] font-semibold text-main">
              Monto abonado
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.monto_abonado}
              onChange={(event) =>
                handleChange('monto_abonado', event.target.value)
              }
              className="app-input min-h-10"
            />
          </label>

          <label className="space-y-2">
            <span className="text-[13px] font-semibold text-main">
              Metodo de pago
            </span>
            <select
              value={form.metodo_pago}
              onChange={(event) =>
                handleChange('metodo_pago', event.target.value)
              }
              className="app-select min-h-10"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-[13px] font-semibold text-main">
              Referencia
            </span>
            <input
              type="text"
              value={form.referencia_pago}
              onChange={(event) =>
                handleChange('referencia_pago', event.target.value)
              }
              className="app-input min-h-10"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-[13px] font-semibold text-main">
              Observaciones
            </span>
            <textarea
              rows="3"
              value={form.observaciones}
              onChange={(event) =>
                handleChange('observaciones', event.target.value)
              }
              className="app-textarea"
            />
          </label>
        </div>

        {isInvalid && (
          <div className="mt-4 rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-3 text-[13px] text-[var(--warning-text)]">
            El monto debe ser mayor que cero y no puede superar el saldo.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-3 text-[13px] text-[var(--danger-text)]">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="app-button-secondary min-h-10"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading || isInvalid}
            className="app-button-primary min-h-10 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            Registrar abono
          </button>
        </div>
      </form>
    </div>
  );
}
