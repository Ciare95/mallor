import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FilePlus2, Loader2, Plus, Trash2 } from 'lucide-react';
import { listarProductos } from '../../services/inventario.service';
import { formatCurrency } from '../../utils/formatters';

const getStoredUserId = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')?.id || '';
  } catch {
    return '';
  }
};

const emptyItem = { producto: '', cantidad: '1', precio_unitario: '', iva: '0', descuento: '0', transporte: '0' };

const FacturaCompraForm = ({ onSubmit, onCancel, isLoading, error }) => {
  const [formData, setFormData] = useState({
    numero_factura: '',
    proveedor: '',
    fecha_factura: new Date().toISOString().slice(0, 10),
    descuento: '0',
    observaciones: '',
    usuario_registro: getStoredUserId(),
    detalles: [{ ...emptyItem }],
  });
  const [touched, setTouched] = useState(false);

  const productosQuery = useQuery({
    queryKey: ['inventario', 'productos', 'factura-select'],
    queryFn: () => listarProductos({ page_size: 100, ordering: 'nombre' }),
  });

  const productos = productosQuery.data?.results || [];
  const subtotal = formData.detalles.reduce((acc, item) => acc + Number(item.cantidad || 0) * Number(item.precio_unitario || 0), 0);
  const ivaTotal = formData.detalles.reduce((acc, item) => acc + Number(item.cantidad || 0) * Number(item.precio_unitario || 0) * (Number(item.iva || 0) / 100), 0);
  const transporte = formData.detalles.reduce((acc, item) => acc + Number(item.transporte || 0), 0);
  const total = subtotal + ivaTotal + transporte - Number(formData.descuento || 0);

  const updateItem = (index, patch) => {
    setFormData((prev) => ({
      ...prev,
      detalles: prev.detalles.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  };

  const addItem = () => setFormData((prev) => ({ ...prev, detalles: [...prev.detalles, { ...emptyItem }] }));
  const removeItem = (index) => setFormData((prev) => ({ ...prev, detalles: prev.detalles.filter((_, itemIndex) => itemIndex !== index) }));

  const invalid = !formData.numero_factura.trim() || !formData.fecha_factura || !formData.usuario_registro || formData.detalles.some((item) => !item.producto || Number(item.cantidad) <= 0 || Number(item.precio_unitario) <= 0);

  const handleSubmit = (event) => {
    event.preventDefault();
    setTouched(true);
    if (invalid) return;
    onSubmit({
      numero_factura: formData.numero_factura.trim(),
      proveedor: formData.proveedor || null,
      fecha_factura: formData.fecha_factura,
      descuento: formData.descuento || '0',
      observaciones: formData.observaciones.trim(),
      usuario_registro: formData.usuario_registro,
      detalles: formData.detalles.map((item) => ({
        producto: item.producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        iva: item.iva,
        descuento: item.descuento,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-2xl">
        <button type="button" onClick={onCancel} className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-emerald-400 p-3 text-emerald-950"><FilePlus2 className="h-7 w-7" /></div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Compras</p>
            <h1 className="mt-1 text-3xl font-black">Registrar factura de compra</h1>
          </div>
        </div>
      </div>

      {(error || (touched && invalid)) && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-medium text-red-800">
          {error || 'Completa número, fecha, usuario y al menos un detalle válido.'}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="grid gap-5 md:grid-cols-4">
          <Field label="Número factura *" value={formData.numero_factura} onChange={(value) => setFormData((prev) => ({ ...prev, numero_factura: value }))} />
          <Field label="Proveedor ID" type="number" value={formData.proveedor} onChange={(value) => setFormData((prev) => ({ ...prev, proveedor: value }))} />
          <Field label="Fecha factura *" type="date" value={formData.fecha_factura} onChange={(value) => setFormData((prev) => ({ ...prev, fecha_factura: value }))} />
          <Field label="Usuario registro *" type="number" value={formData.usuario_registro} onChange={(value) => setFormData((prev) => ({ ...prev, usuario_registro: value }))} />
          <Field label="Descuento factura" type="number" min="0" step="0.01" value={formData.descuento} onChange={(value) => setFormData((prev) => ({ ...prev, descuento: value }))} />
          <div className="md:col-span-3">
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="observaciones_factura">Observaciones</label>
            <input id="observaciones_factura" value={formData.observaciones} onChange={(event) => setFormData((prev) => ({ ...prev, observaciones: event.target.value }))} className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="text-xl font-black text-slate-950">Productos de la factura</h2>
            <p className="text-sm text-slate-500">El transporte se usa para previsualizar costo final, no se envía al backend actual.</p>
          </div>
          <button type="button" onClick={addItem} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-700"><Plus className="h-4 w-4" />Agregar</button>
        </div>
        <div className="divide-y divide-slate-100">
          {formData.detalles.map((item, index) => {
            const costoFinal = Number(item.precio_unitario || 0) * (1 + Number(item.iva || 0) / 100) + Number(item.transporte || 0) / Math.max(Number(item.cantidad || 1), 1);
            return (
              <div key={`${index}-${item.producto}`} className="grid gap-3 p-5 lg:grid-cols-[1.4fr_110px_150px_100px_130px_130px_44px]">
                <select value={item.producto} onChange={(event) => updateItem(index, { producto: event.target.value })} className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
                  <option value="">Selecciona producto</option>
                  {productos.map((producto) => <option key={producto.id} value={producto.id}>{producto.nombre}</option>)}
                </select>
                <ItemInput label="Cant." value={item.cantidad} onChange={(value) => updateItem(index, { cantidad: value })} />
                <ItemInput label="Compra" value={item.precio_unitario} onChange={(value) => updateItem(index, { precio_unitario: value })} />
                <ItemInput label="IVA" value={item.iva} onChange={(value) => updateItem(index, { iva: value })} />
                <ItemInput label="Transporte" value={item.transporte} onChange={(value) => updateItem(index, { transporte: value })} />
                <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-xs text-slate-500">Costo final</p><p className="font-black text-slate-900">{formatCurrency(costoFinal)}</p></div>
                <button type="button" onClick={() => removeItem(index)} disabled={formData.detalles.length === 1} className="min-h-11 rounded-xl text-red-600 transition hover:bg-red-50 disabled:opacity-40"><Trash2 className="mx-auto h-4 w-4" /></button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="grid gap-4 md:grid-cols-4">
          <Summary label="Subtotal" value={formatCurrency(subtotal)} />
          <Summary label="IVA" value={formatCurrency(ivaTotal)} />
          <Summary label="Transporte" value={formatCurrency(transporte)} />
          <Summary label="Total preview" value={formatCurrency(total)} strong />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={isLoading} className="min-h-11 rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-700">Cancelar</button>
        <button type="submit" disabled={isLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-emerald-600/20 disabled:opacity-60">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Registrar factura
        </button>
      </div>
    </form>
  );
};

const Field = ({ label, value, onChange, type = 'text', ...props }) => (
  <div>
    <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" {...props} />
  </div>
);

const ItemInput = ({ label, value, onChange }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
    <input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
  </label>
);

const Summary = ({ label, value, strong = false }) => (
  <div className={`rounded-2xl p-4 ${strong ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
    <p className="text-sm opacity-70">{label}</p>
    <p className="mt-1 text-xl font-black">{value}</p>
  </div>
);

export default FacturaCompraForm;
