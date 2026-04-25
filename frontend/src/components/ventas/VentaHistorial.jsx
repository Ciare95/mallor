import { useQuery } from '@tanstack/react-query';
import { Boxes, Loader2, PackageSearch } from 'lucide-react';
import { obtenerHistorialVenta } from '../../services/ventas.service';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { EmptyState } from './shared';

export default function VentaHistorial({ ventaId }) {
  const historialQuery = useQuery({
    queryKey: ['ventas', 'historial', ventaId],
    queryFn: () => obtenerHistorialVenta(ventaId),
    enabled: Boolean(ventaId),
  });

  if (historialQuery.isLoading) {
    return (
      <div className="flex min-h-[180px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (historialQuery.isError) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No fue posible cargar el historial"
        description="Revisa la conexion con el backend o intenta nuevamente."
      />
    );
  }

  const movimientos = historialQuery.data || [];

  if (!movimientos.length) {
    return (
      <EmptyState
        icon={Boxes}
        title="Sin movimientos"
        description="La venta aun no tiene historial de inventario asociado."
      />
    );
  }

  return (
    <div className="space-y-3">
      {movimientos.map((movimiento) => (
        <article
          key={movimiento.id}
          className="grid gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 sm:grid-cols-[1.3fr_0.7fr_0.7fr]"
        >
          <div>
            <div className="text-sm font-semibold text-white">
              {movimiento.producto?.nombre || 'Producto'}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              {movimiento.motivo || 'Movimiento de inventario'}
            </div>
            <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
              {formatDateTime(movimiento.fecha || movimiento.created_at)}
            </div>
          </div>
          <div className="text-sm text-slate-300">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Cantidad
            </div>
            <div className="mt-2 font-display text-lg text-white">
              {movimiento.cantidad}
            </div>
          </div>
          <div className="text-sm text-slate-300">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Precio
            </div>
            <div className="mt-2 font-display text-lg text-white">
              {formatCurrency(movimiento.precio_unitario)}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
