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
        <Loader2 className="h-5 w-5 animate-spin text-soft" />
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
          className="grid gap-4 rounded-xl border border-app bg-white/72 px-4 py-4 sm:grid-cols-[1.4fr_0.7fr_0.7fr]"
        >
          <div>
            <div className="text-[13px] font-semibold text-main">
              {movimiento.producto?.nombre || 'Producto'}
            </div>
            <div className="mt-1 text-[13px] text-soft">
              {movimiento.motivo || 'Movimiento de inventario'}
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted">
              {formatDateTime(movimiento.fecha || movimiento.created_at)}
            </div>
          </div>
          <div className="rounded-xl border border-app bg-white/72 px-4 py-3 text-[13px] text-soft">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
              Cantidad
            </div>
            <div className="mt-2 font-display text-[1.2rem] leading-none text-main">
              {Math.abs(Number(movimiento.cantidad || 0))}
            </div>
          </div>
          <div className="rounded-xl border border-app bg-white/72 px-4 py-3 text-[13px] text-soft">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
              Precio
            </div>
            <div className="mt-2 font-display text-[1.2rem] leading-none text-main">
              {formatCurrency(movimiento.precio_unitario)}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
