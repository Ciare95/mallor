import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowDownLeft, ArrowUpRight, Loader2, SlidersHorizontal } from 'lucide-react';
import { obtenerHistorialProducto } from '../../services/inventario.service';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const movimientoStyles = {
  ENTRADA: {
    icon: <ArrowUpRight className="h-4 w-4" />,
    badge: 'bg-emerald-100 text-emerald-800',
    line: 'border-emerald-200',
  },
  SALIDA: {
    icon: <ArrowDownLeft className="h-4 w-4" />,
    badge: 'bg-red-100 text-red-800',
    line: 'border-red-200',
  },
  AJUSTE: {
    icon: <SlidersHorizontal className="h-4 w-4" />,
    badge: 'bg-amber-100 text-amber-800',
    line: 'border-amber-200',
  },
};

const ProductoHistorial = ({ productoId }) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['inventario', 'producto', productoId, 'historial'],
    queryFn: () => obtenerHistorialProducto(productoId, { limite: 25 }),
    enabled: !!productoId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 py-10 text-slate-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-emerald-600" />
        Cargando historial...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
        {error?.message || 'No fue posible cargar el historial'}
      </div>
    );
  }

  const movimientos = data || [];

  if (movimientos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <Activity className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="font-semibold text-slate-800">Sin movimientos registrados</p>
        <p className="mt-1 text-sm text-slate-500">Las entradas, salidas y ajustes aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {movimientos.map((movimiento) => {
        const style = movimientoStyles[movimiento.tipo_movimiento] || movimientoStyles.AJUSTE;
        return (
          <article
            key={movimiento.id}
            className={`rounded-2xl border bg-white p-4 shadow-sm ${style.line}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${style.badge}`}>
                  {style.icon}
                  {movimiento.tipo_movimiento_display || movimiento.tipo_movimiento}
                </span>
                <div>
                  <h4 className="font-bold text-slate-950">{movimiento.motivo}</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDateTime(movimiento.fecha)} por {movimiento.usuario_nombre || 'Sistema'}
                  </p>
                  {movimiento.observaciones && (
                    <p className="mt-2 text-sm text-slate-600">{movimiento.observaciones}</p>
                  )}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-lg font-black text-slate-950">{Number(movimiento.cantidad)}</p>
                <p className="text-sm text-slate-500">{formatCurrency(Number(movimiento.precio_unitario || 0))}</p>
                {movimiento.factura_numero && (
                  <p className="mt-1 text-xs font-semibold text-emerald-700">Factura {movimiento.factura_numero}</p>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default ProductoHistorial;
