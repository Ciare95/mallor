import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarRange, Loader2, Search, ShoppingBag } from 'lucide-react';
import { obtenerHistorialCliente } from '../../services/clientes.service';
import { normalizeCollection, groupVentasByMonth } from '../../utils/clientes';
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from '../../utils/formatters';
import {
  ClienteRiskBadge,
  EmptyState,
  MetricTile,
  PaginationBar,
} from './shared';

export default function ClienteHistorial({
  clienteId,
  diasPlazo = 0,
  compact = false,
  onOpenVenta,
}) {
  const [filtros, setFiltros] = useState({
    fecha_desde: '',
    fecha_hasta: '',
    estado: '',
    page: 1,
    page_size: compact ? 6 : 10,
  });

  const historialQuery = useQuery({
    queryKey: ['clientes', 'historial', clienteId, filtros],
    queryFn: () => obtenerHistorialCliente(clienteId, filtros),
    enabled: Boolean(clienteId),
  });

  const data = normalizeCollection(historialQuery.data);
  const totalComprado = useMemo(
    () =>
      data.results.reduce((acc, venta) => acc + Number(venta.total || 0), 0),
    [data.results],
  );
  const chartData = useMemo(
    () => groupVentasByMonth(data.results),
    [data.results],
  );

  const handleFilterChange = (field, value) => {
    setFiltros((current) => ({
      ...current,
      [field]: value,
      page: field === 'page' ? value : 1,
    }));
  };

  return (
    <div className="space-y-5">
      {!compact && (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <FilterField
              label="Fecha desde"
              value={filtros.fecha_desde}
              type="date"
              onChange={(value) => handleFilterChange('fecha_desde', value)}
            />
            <FilterField
              label="Fecha hasta"
              value={filtros.fecha_hasta}
              type="date"
              onChange={(value) => handleFilterChange('fecha_hasta', value)}
            />
            <FilterSelect
              label="Estado"
              value={filtros.estado}
              onChange={(value) => handleFilterChange('estado', value)}
              options={[
                ['Todos', ''],
                ['Terminada', 'TERMINADA'],
                ['Pendiente', 'PENDIENTE'],
                ['Cancelada', 'CANCELADA'],
              ]}
            />
            <MetricTile
              label="Frecuencia"
              value={`${formatNumber(data.count)} compras`}
              note="Rango visible"
              compact
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <MetricTile
              label="Total comprado"
              value={formatCurrency(totalComprado)}
              note="Acumulado de la consulta"
              tone="accent"
            />
            <MiniTrendChart data={chartData} />
          </div>
        </>
      )}

      <div className="overflow-hidden rounded-xl border border-app bg-white/72">
        {historialQuery.isLoading && (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-soft" />
          </div>
        )}

        {historialQuery.isError && (
          <EmptyState
            icon={ShoppingBag}
            title="No fue posible cargar el historial"
            description="Intenta nuevamente o ajusta el filtro de fechas."
          />
        )}

        {!historialQuery.isLoading && !historialQuery.isError && (
          <>
            {!data.results.length ? (
              <EmptyState
                icon={Search}
                title="Sin compras registradas"
                description="No hay ventas para el rango seleccionado."
              />
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {data.results.map((venta) => (
                  <article
                    key={venta.id}
                    className="grid gap-4 px-5 py-5 transition hover:bg-[var(--panel-soft)] xl:grid-cols-[1fr_1fr_0.8fr_0.8fr_auto] xl:items-center"
                  >
                    <div>
                      <div className="font-display text-lg text-main">
                        {venta.numero_venta}
                      </div>
                      <div className="mt-1 text-sm text-soft">
                        {formatDateTime(venta.fecha_venta)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-main">
                        {venta.metodo_pago}
                      </div>
                      <div className="mt-1 text-sm text-soft">
                        {venta.detalles_count} lineas
                      </div>
                    </div>
                    <div>
                      <ClienteRiskBadge
                        venta={venta}
                        diasPlazo={diasPlazo}
                        overdueDays={0}
                      />
                    </div>
                    <div>
                      <div className="font-display text-lg text-main">
                        {formatCurrency(venta.total)}
                      </div>
                      <div className="mt-1 text-sm text-soft">
                        Saldo {formatCurrency(venta.saldo_pendiente)}
                      </div>
                    </div>
                    {onOpenVenta && (
                      <div>
                        <button
                          type="button"
                          onClick={() => onOpenVenta(venta)}
                          className="app-button-secondary min-h-11"
                        >
                          Ver venta
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {!compact && (
        <PaginationBar
          meta={data}
          onPageChange={(page) => handleFilterChange('page', page)}
        />
      )}
    </div>
  );
}

function FilterField({ label, value, onChange, type = 'text' }) {
  return (
    <label className="app-field">
      <span className="app-field-label">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="app-input min-h-11"
      />
    </label>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="app-field">
      <span className="app-field-label">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="app-select min-h-11"
      >
        {options.map(([text, optionValue]) => (
          <option key={`${label}-${optionValue}`} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function MiniTrendChart({ data }) {
  if (!data.length) {
    return (
      <div className="rounded-xl border border-app bg-white/72 p-5">
        <div className="flex items-center gap-2 text-sm text-soft">
          <CalendarRange className="h-4 w-4" />
          Sin puntos suficientes para graficar la frecuencia.
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-xl border border-app bg-white/72 p-5">
      <div className="mb-4 text-[10px] uppercase tracking-[0.24em] text-muted">
        Compras en el tiempo
      </div>
      <div className="grid h-[180px] grid-cols-3 gap-3 md:grid-cols-6">
        {data.map((item) => (
          <div key={item.label} className="flex flex-col justify-end gap-2">
            <div className="relative flex-1 overflow-hidden rounded-xl border border-app bg-[var(--panel-soft)]">
              <div
                className="absolute inset-x-2 bottom-2 rounded-lg bg-[linear-gradient(180deg,rgba(87,181,132,0.22),rgba(64,198,112,0.92))]"
                style={{
                  height: `${Math.max((item.value / maxValue) * 100, 8)}%`,
                }}
              />
            </div>
            <div className="text-center">
              <div className="text-xs text-muted">{item.label}</div>
              <div className="text-xs font-semibold text-main">
                {formatCurrency(item.value)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
