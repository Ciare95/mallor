import { useState } from 'react';
import { AlertCircle, Loader2, PackageCheck, X } from 'lucide-react';

const AjusteStockModal = ({ producto, isLoading, error, onConfirm, onCancel }) => {
  const [formData, setFormData] = useState({
    nueva_cantidad: producto?.existencias ?? '',
    motivo: '',
    observaciones: '',
  });
  const [touched, setTouched] = useState(false);

  const cantidadInvalida =
    formData.nueva_cantidad === '' || Number(formData.nueva_cantidad) < 0 || Number.isNaN(Number(formData.nueva_cantidad));
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <PackageCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950">Ajuste manual de stock</h2>
              <p className="mt-1 text-sm text-slate-600">{producto?.nombre}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Stock actual</p>
            <p className="mt-1 text-3xl font-black text-slate-950">{Number(producto?.existencias || 0)}</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="nueva_cantidad">
              Nueva cantidad *
            </label>
            <input
              id="nueva_cantidad"
              type="number"
              min="0"
              step="0.01"
              value={formData.nueva_cantidad}
              onChange={(event) => setFormData((prev) => ({ ...prev, nueva_cantidad: event.target.value }))}
              className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            {touched && cantidadInvalida && (
              <p className="mt-2 text-sm font-medium text-red-600">Ingresa una cantidad válida mayor o igual a cero.</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="motivo">
              Motivo *
            </label>
            <input
              id="motivo"
              type="text"
              value={formData.motivo}
              onChange={(event) => setFormData((prev) => ({ ...prev, motivo: event.target.value }))}
              placeholder="Conteo físico, merma, devolución..."
              className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            {touched && motivoInvalido && (
              <p className="mt-2 text-sm font-medium text-red-600">El motivo es obligatorio.</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="observaciones">
              Observaciones
            </label>
            <textarea
              id="observaciones"
              rows="3"
              value={formData.observaciones}
              onChange={(event) => setFormData((prev) => ({ ...prev, observaciones: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {hasError && (
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Revisa los campos marcados antes de confirmar el ajuste.
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="min-h-11 rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar ajuste
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AjusteStockModal;
