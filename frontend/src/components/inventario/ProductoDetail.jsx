import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Barcode,
  Calendar,
  Edit,
  ImageOff,
  Loader2,
  Package,
  SlidersHorizontal,
  Tag,
  Trash2,
} from 'lucide-react';
import { obtenerProducto } from '../../services/inventario.service';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import ProductoHistorial from './ProductoHistorial';

const metricClass = 'rounded-xl border border-app bg-white/74 p-4';

const ProductoDetail = ({
  productoId,
  onBack,
  onEdit,
  onDelete,
  onAdjustStock,
}) => {
  const { data: producto, isLoading, isError, error } = useQuery({
    queryKey: ['inventario', 'producto', productoId],
    queryFn: () => obtenerProducto(productoId),
    enabled: !!productoId,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center text-soft">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-muted" />
        Cargando producto...
      </div>
    );
  }

  if (isError || !producto) {
    return (
      <div className="rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] p-6">
        <p className="text-sm font-semibold text-[var(--danger-text)]">
          {error?.message || 'No fue posible cargar el producto'}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="app-button-secondary mt-4 min-h-10"
        >
          Volver
        </button>
      </div>
    );
  }

  const margen = Number(producto.margen_ganancia || 0);
  const stockBajo = Number(producto.existencias || 0) <= 10;

  return (
    <div className="space-y-6">
      <section className="surface p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="overflow-hidden rounded-xl border border-app bg-[var(--panel-soft)]">
            {producto.imagen ? (
              <img
                src={producto.imagen}
                alt={producto.nombre}
                className="h-full min-h-64 w-full object-cover"
              />
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center text-muted">
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
                className="app-button-secondary mb-5 min-h-11"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inventario
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--info-text)]">
                  {producto.categoria?.nombre || 'Sin categoria'}
                </span>
                {stockBajo && (
                  <span className="inline-flex items-center rounded-full border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--warning-text)]">
                    Stock bajo
                  </span>
                )}
              </div>

              <h1 className="section-title mt-4 max-w-4xl text-[2.5rem] md:text-[3.4rem]">
                {producto.nombre}
              </h1>
              <p className="body-copy mt-3 max-w-3xl">
                {producto.descripcion || 'Sin descripcion registrada.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-app bg-white/72 p-4">
                <p className="eyebrow">Existencias</p>
                <p className="mt-2 font-display text-[2rem] leading-none text-main">
                  {Number(producto.existencias || 0)}
                </p>
              </div>
              <div className="rounded-xl border border-app bg-white/72 p-4">
                <p className="eyebrow">Precio venta</p>
                <p className="mt-2 font-display text-[1.85rem] leading-none text-main">
                  {formatCurrency(Number(producto.precio_venta || 0))}
                </p>
              </div>
              <div className="rounded-xl border border-app bg-white/72 p-4">
                <p className="eyebrow">Margen</p>
                <p
                  className={`mt-2 font-display text-[1.85rem] leading-none ${
                    margen < 0 ? 'text-[var(--danger-text)]' : 'text-[var(--accent)]'
                  }`}
                >
                  {margen.toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => onEdit(producto)}
                className="app-button-primary min-h-11"
              >
                <Edit className="h-4 w-4" />
                Editar producto
              </button>
              <button
                type="button"
                onClick={() => onAdjustStock(producto)}
                className="app-button-secondary min-h-11"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Ajustar stock
              </button>
              <button
                type="button"
                onClick={() => onDelete(producto)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-2.5 text-[12px] font-semibold text-[var(--danger-text)] transition"
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
          <Barcode className="mb-3 h-5 w-5 text-muted" />
          <p className="eyebrow">Codigo interno</p>
          <p className="mt-2 text-sm font-semibold text-main">
            {producto.codigo_interno_formateado || producto.codigo_interno}
          </p>
        </div>
        <div className={metricClass}>
          <Tag className="mb-3 h-5 w-5 text-muted" />
          <p className="eyebrow">Codigo de barras</p>
          <p className="mt-2 text-sm font-semibold text-main">
            {producto.codigo_barras || 'No registrado'}
          </p>
        </div>
        <div className={metricClass}>
          <Package className="mb-3 h-5 w-5 text-muted" />
          <p className="eyebrow">Valor inventario</p>
          <p className="mt-2 text-sm font-semibold text-main">
            {formatCurrency(Number(producto.valor_inventario || 0))}
          </p>
        </div>
        <div className={metricClass}>
          <Calendar className="mb-3 h-5 w-5 text-muted" />
          <p className="eyebrow">Caducidad</p>
          <p className="mt-2 text-sm font-semibold text-main">
            {producto.fecha_caducidad
              ? formatDate(producto.fecha_caducidad)
              : 'No aplica'}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="surface p-5 sm:p-6">
          <h2 className="section-title">Ficha tecnica</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <Row label="Marca" value={producto.marca || 'Sin marca'} />
            <Row label="INVIMA" value={producto.invima || 'No aplica'} />
            <Row
              label="Precio compra"
              value={formatCurrency(Number(producto.precio_compra || 0))}
            />
            <Row label="IVA" value={`${Number(producto.iva || 0).toFixed(2)}%`} />
            <Row
              label="Fecha ingreso"
              value={formatDateTime(producto.fecha_ingreso)}
            />
            <Row
              label="Ultima actualizacion"
              value={formatDateTime(producto.updated_at)}
            />
          </dl>
        </div>

        <div className="surface p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="section-title">Historial de movimientos</h2>
            <p className="body-copy mt-1">
              Ultimos movimientos registrados para este producto.
            </p>
          </div>
          <ProductoHistorial productoId={producto.id} />
        </div>
      </section>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 border-b border-app pb-3 last:border-0 last:pb-0">
    <dt className="eyebrow">{label}</dt>
    <dd className="text-right text-sm font-semibold text-main">{value}</dd>
  </div>
);

export default ProductoDetail;
