import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Barcode, Calendar, Edit, ImageOff, Loader2, Package, SlidersHorizontal, Tag, Trash2 } from 'lucide-react';
import { obtenerProducto } from '../../services/inventario.service';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import ProductoHistorial from './ProductoHistorial';

const metricClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';

const ProductoDetail = ({ productoId, onBack, onEdit, onDelete, onAdjustStock }) => {
  const { data: producto, isLoading, isError, error } = useQuery({
    queryKey: ['inventario', 'producto', productoId],
    queryFn: () => obtenerProducto(productoId),
    enabled: !!productoId,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center text-slate-600">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-emerald-600" />
        Cargando producto...
      </div>
    );
  }

  if (isError || !producto) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <p className="font-semibold text-red-800">{error?.message || 'No fue posible cargar el producto'}</p>
        <button type="button" onClick={onBack} className="mt-4 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white">
          Volver
        </button>
      </div>
    );
  }

  const margen = Number(producto.margen_ganancia || 0);
  const stockBajo = Number(producto.existencias || 0) <= 10;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl">
        <div className="grid gap-6 p-6 lg:grid-cols-[280px_1fr]">
          <div className="min-h-64 overflow-hidden rounded-3xl border border-white/10 bg-white/10">
            {producto.imagen ? (
              <img src={producto.imagen} alt={producto.nombre} className="h-full min-h-64 w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-64 flex-col items-center justify-center text-slate-400">
                <ImageOff className="mb-3 h-12 w-12" />
                Sin imagen
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between gap-6">
            <div>
              <button
                type="button"
                onClick={onBack}
                className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inventario
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-950">
                  {producto.categoria?.nombre || 'Sin categoría'}
                </span>
                {stockBajo && (
                  <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black uppercase tracking-widest text-amber-950">
                    Stock bajo
                  </span>
                )}
              </div>
              <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight md:text-5xl">{producto.nombre}</h1>
              <p className="mt-3 max-w-3xl text-slate-300">{producto.descripcion || 'Sin descripción registrada.'}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-300">Existencias</p>
                <p className="mt-1 text-3xl font-black">{Number(producto.existencias || 0)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-300">Precio venta</p>
                <p className="mt-1 text-2xl font-black">{formatCurrency(Number(producto.precio_venta || 0))}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-300">Margen</p>
                <p className={`mt-1 text-2xl font-black ${margen < 0 ? 'text-red-300' : 'text-emerald-300'}`}>{margen.toFixed(2)}%</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => onEdit(producto)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                <Edit className="h-4 w-4" />
                Editar producto
              </button>
              <button
                type="button"
                onClick={() => onAdjustStock(producto)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 font-semibold text-emerald-950 transition hover:bg-emerald-400"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Ajustar stock
              </button>
              <button
                type="button"
                onClick={() => onDelete(producto)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300/40 px-5 py-2.5 font-semibold text-red-100 transition hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={metricClass}>
          <Barcode className="mb-3 h-5 w-5 text-slate-400" />
          <p className="text-sm text-slate-500">Código interno</p>
          <p className="mt-1 text-lg font-black text-slate-950">{producto.codigo_interno_formateado || producto.codigo_interno}</p>
        </div>
        <div className={metricClass}>
          <Tag className="mb-3 h-5 w-5 text-slate-400" />
          <p className="text-sm text-slate-500">Código de barras</p>
          <p className="mt-1 text-lg font-black text-slate-950">{producto.codigo_barras || 'No registrado'}</p>
        </div>
        <div className={metricClass}>
          <Package className="mb-3 h-5 w-5 text-slate-400" />
          <p className="text-sm text-slate-500">Valor inventario</p>
          <p className="mt-1 text-lg font-black text-slate-950">{formatCurrency(Number(producto.valor_inventario || 0))}</p>
        </div>
        <div className={metricClass}>
          <Calendar className="mb-3 h-5 w-5 text-slate-400" />
          <p className="text-sm text-slate-500">Caducidad</p>
          <p className="mt-1 text-lg font-black text-slate-950">{producto.fecha_caducidad ? formatDate(producto.fecha_caducidad) : 'No aplica'}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
          <h2 className="text-xl font-black text-slate-950">Ficha técnica</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <Row label="Marca" value={producto.marca || 'Sin marca'} />
            <Row label="INVIMA" value={producto.invima || 'No aplica'} />
            <Row label="Precio compra" value={formatCurrency(Number(producto.precio_compra || 0))} />
            <Row label="IVA" value={`${Number(producto.iva || 0).toFixed(2)}%`} />
            <Row label="Fecha ingreso" value={formatDateTime(producto.fecha_ingreso)} />
            <Row label="Última actualización" value={formatDateTime(producto.updated_at)} />
          </dl>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-950">Historial de movimientos</h2>
              <p className="text-sm text-slate-500">Últimos movimientos registrados para este producto.</p>
            </div>
          </div>
          <ProductoHistorial productoId={producto.id} />
        </div>
      </section>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
    <dt className="font-semibold text-slate-500">{label}</dt>
    <dd className="text-right font-bold text-slate-900">{value}</dd>
  </div>
);

export default ProductoDetail;
