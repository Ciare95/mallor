import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, FileSearch, Loader2, PackagePlus, Search } from 'lucide-react';
import { listarFacturasCompra } from '../../services/inventario.service';
import { formatCurrency, formatDate } from '../../utils/formatters';

const ProcesarFacturaForm = ({ onProcess, onCancel, onCreateProduct, isLoading, error }) => {
  const [query, setQuery] = useState('');
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [preview, setPreview] = useState(false);

  const facturasQuery = useQuery({
    queryKey: ['inventario', 'facturas', { q: query }],
    queryFn: () => listarFacturasCompra({ q: query, estado: 'PENDIENTE' }),
  });

  const facturas = facturasQuery.data || [];

  const handleProcess = () => {
    if (!facturaSeleccionada) return;
    onProcess(facturaSeleccionada.id);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-2xl">
        <button type="button" onClick={onCancel} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-emerald-400 p-3 text-emerald-950"><FileSearch className="h-7 w-7" /></div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Procesamiento</p>
            <h1 className="mt-1 text-3xl font-black">Procesar factura y actualizar inventario</h1>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-medium text-red-800">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar número de factura" className="min-h-11 w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
          </div>

          <div className="mt-5 space-y-3">
            {facturasQuery.isLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-600"><Loader2 className="mr-2 h-5 w-5 animate-spin text-emerald-600" />Buscando facturas...</div>
            ) : facturas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No hay facturas pendientes para esta búsqueda.</div>
            ) : facturas.map((factura) => (
              <button key={factura.id} type="button" onClick={() => { setFacturaSeleccionada(factura); setPreview(false); }} className={`w-full rounded-2xl border p-4 text-left transition ${facturaSeleccionada?.id === factura.id ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{factura.numero_factura}</p>
                    <p className="mt-1 text-sm text-slate-500">{factura.proveedor_nombre || 'Sin proveedor'} · {formatDate(factura.fecha_factura)}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">{factura.estado}</span>
                </div>
                <p className="mt-3 text-lg font-black text-slate-950">{formatCurrency(Number(factura.total || 0))}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
          {!facturaSeleccionada ? (
            <div className="flex min-h-96 flex-col items-center justify-center text-center text-slate-500">
              <FileSearch className="mb-4 h-12 w-12 text-slate-300" />
              <p className="font-semibold text-slate-800">Selecciona una factura pendiente</p>
              <p className="mt-1 text-sm">Aquí verás el preview antes de confirmar el ingreso al inventario.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">Factura {facturaSeleccionada.numero_factura}</h2>
                  <p className="mt-1 text-sm text-slate-500">{facturaSeleccionada.detalles?.length || 0} producto{facturaSeleccionada.detalles?.length !== 1 ? 's' : ''} listo{facturaSeleccionada.detalles?.length !== 1 ? 's' : ''} para procesar</p>
                </div>
                <button type="button" onClick={onCreateProduct} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                  <PackagePlus className="h-4 w-4" />
                  Crear producto
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Summary label="Subtotal" value={formatCurrency(Number(facturaSeleccionada.subtotal || 0))} />
                <Summary label="IVA" value={formatCurrency(Number(facturaSeleccionada.iva || 0))} />
                <Summary label="Total" value={formatCurrency(Number(facturaSeleccionada.total || 0))} strong />
              </div>

              <div className="space-y-3">
                {(facturaSeleccionada.detalles || []).map((detalle) => {
                  const costoFinal = Number(detalle.precio_unitario || 0) * (1 + Number(detalle.iva || 0) / 100);
                  const precioSugerido = costoFinal * 1.3;
                  return (
                    <div key={detalle.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-black text-slate-950">{detalle.producto_nombre || `Producto #${detalle.producto}`}</h3>
                          <p className="mt-1 text-sm text-slate-500">Cantidad {Number(detalle.cantidad || 0)} · IVA {Number(detalle.iva || 0).toFixed(2)}%</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="font-black text-slate-950">{formatCurrency(costoFinal)}</p>
                          <p className="text-sm font-semibold text-emerald-700">Sugerido venta {formatCurrency(precioSugerido)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {preview ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                    <div>
                      <p className="font-black text-emerald-900">Preview confirmado</p>
                      <p className="mt-1 text-sm text-emerald-800">Al procesar, el backend actualizará stock, registrará movimientos y marcará la factura como procesada.</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setPreview(true)} className="min-h-11 rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50">Ver preview</button>
                <button type="button" onClick={handleProcess} disabled={!preview || isLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar procesamiento
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const Summary = ({ label, value, strong = false }) => (
  <div className={`rounded-2xl p-4 ${strong ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
    <p className="text-sm opacity-70">{label}</p>
    <p className="mt-1 text-xl font-black">{value}</p>
  </div>
);

export default ProcesarFacturaForm;
