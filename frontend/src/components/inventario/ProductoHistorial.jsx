import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';
import { obtenerHistorialProducto } from '../../services/inventario.service';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const movimientoStyles = {
  ENTRADA: {
    icon: <ArrowUpRight className="h-4 w-4" />,
    badge:
      'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]',
    card: 'border-[var(--accent-line)]',
  },
  SALIDA: {
    icon: <ArrowDownLeft className="h-4 w-4" />,
    badge:
      'border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] text-[var(--danger-text)]',
    card: 'border-[rgba(159,47,45,0.18)]',
  },
  AJUSTE: {
    icon: <SlidersHorizontal className="h-4 w-4" />,
    badge:
      'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] text-[var(--warning-text)]',
    card: 'border-[rgba(149,100,0,0.18)]',
  },
};

const getResults = (data) => data?.results || data || [];

const ProductoHistorial = ({ productoId }) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['inventario', 'producto', productoId, 'historial'],
    queryFn: () => obtenerHistorialProducto(productoId, { limite: 25 }),
    enabled: !!productoId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-app bg-[var(--panel-soft)] py-10 text-soft">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-muted" />
        Cargando historial...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger-text)]">
        {error?.message || 'No fue posible cargar el historial'}
      </div>
    );
  }

  const movimientos = getResults(data);

  if (movimientos.length === 0) {
    return (
      <div className="empty-state">
        <Activity className="mb-3 h-10 w-10 text-muted" />
        <p className="text-sm font-semibold text-main">
          Sin movimientos registrados
        </p>
        <p className="mt-1 text-[13px] text-soft">
          Las entradas, salidas y ajustes apareceran aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {movimientos.map((movimiento) => {
        const style =
          movimientoStyles[movimiento.tipo_movimiento] || movimientoStyles.AJUSTE;
        return (
          <article
            key={movimiento.id}
            className={`rounded-xl border bg-white/74 p-4 ${style.card}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${style.badge}`}
                >
                  {style.icon}
                  {movimiento.tipo_movimiento_display || movimiento.tipo_movimiento}
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-main">
                    {movimiento.motivo}
                  </h4>
                  <p className="mt-1 text-[13px] text-soft">
                    {formatDateTime(movimiento.fecha)} por{' '}
                    {movimiento.usuario_nombre || 'Sistema'}
                  </p>
                  {movimiento.observaciones && (
                    <p className="mt-2 text-[13px] leading-6 text-soft">
                      {movimiento.observaciones}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm font-semibold text-main">
                  {Number(movimiento.cantidad)}
                </p>
                <p className="mt-1 text-[13px] text-soft">
                  {formatCurrency(Number(movimiento.precio_unitario || 0))}
                </p>
                {movimiento.factura_numero && (
                  <p className="mt-1 text-[12px] font-semibold text-[var(--accent)]">
                    Factura {movimiento.factura_numero}
                  </p>
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
