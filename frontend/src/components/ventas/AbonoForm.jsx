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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-md">
      <form
        onSubmit={handleSubmit}
        className="surface w-full max-w-lg rounded-[28px] p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              Nuevo abono
            </div>
            <h3 className="mt-2 font-display text-2xl text-white">
              {venta.numero_venta}
            </h3>
            <div className="mt-2 text-sm text-slate-400">
              Saldo pendiente: {formatCurrency(venta.saldo_pendiente)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300 transition hover:bg-white/10"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-200">
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
              className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/60"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-200">
              Metodo de pago
            </span>
            <select
              value={form.metodo_pago}
              onChange={(event) =>
                handleChange('metodo_pago', event.target.value)
              }
              className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/60"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-200">
              Referencia
            </span>
            <input
              type="text"
              value={form.referencia_pago}
              onChange={(event) =>
                handleChange('referencia_pago', event.target.value)
              }
              className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/60"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-200">
              Observaciones
            </span>
            <textarea
              rows="3"
              value={form.observaciones}
              onChange={(event) =>
                handleChange('observaciones', event.target.value)
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-400/60"
            />
          </label>
        </div>

        {isInvalid && (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            El monto debe ser mayor que cero y no puede superar el saldo.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading || isInvalid}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
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
