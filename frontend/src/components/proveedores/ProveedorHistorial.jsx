import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarRange, Factory, Loader2, Search } from 'lucide-react';
import { obtenerHistorialProveedor } from '../../services/proveedores.service';
import {
  groupFacturasByMonth,
  normalizeCollection,
} from '../../utils/proveedores';
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from '../../utils/formatters';
import {
  EmptyState,
  FacturaCompraStatusBadge,
  MetricTile,
  PaginationBar,
  PurchaseQuickMeta,
} from './shared';

export default function ProveedorHistorial({
  proveedorId,
  compact = false,
}) {
  const [filtros, setFiltros] = useState({
    fecha_desde: '',
    fecha_hasta: '',
    estado: '',
    page: 1,
    page_size: compact ? 6 : 10,
  });

  const historialQuery = useQuery({
    queryKey: ['proveedores', 'historial', proveedorId, filtros],
    queryFn: () => obtenerHistorialProveedor(proveedorId, filtros),
    enabled: Boolean(proveedorId),
  });

  const data = normalizeCollection(historialQuery.data);
  const totalComprado = useMemo(
    () =>
      data.results.reduce((acc, factura) => acc + Number(factura.total || 0), 0),
    [data.results],
  );
  const chartData = useMemo(
    () => groupFacturasByMonth(data.results),
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
                ['Procesada', 'PROCESADA'],
                ['Pendiente', 'PENDIENTE'],
              ]}
            />
            <MetricTile
              label="Facturas"
              value={`${formatNumber(data.count)} registros`}
              note="Rango visible"
              compact
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <MetricTile
              label="Total visible"
              value={formatCurrency(totalComprado)}
              note="Acumulado de la consulta"
              tone="accent"
            />
            <MiniTrendChart data={chartData} />
          </div>
        </>
      )}

      <div className="overflow-hidden rounded-[24px] border border-white/10">
        {historialQuery.isLoading && (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        )}

        {historialQuery.isError && (
          <EmptyState
            icon={Factory}
            title="No fue posible cargar el historial"
            description="Intenta nuevamente o ajusta el filtro de fechas."
          />
        )}

        {!historialQuery.isLoading && !historialQuery.isError && (
          <>
            {!data.results.length ? (
              <EmptyState
                icon={Search}
                title="Sin facturas registradas"
                description="No hay compras para el rango seleccionado."
              />
            ) : (
              <div className="divide-y divide-white/10">
                {data.results.map((factura) => (
                  <article
                    key={factura.id}
                    className="grid gap-4 px-5 py-5 transition hover:bg-white/[0.04] xl:grid-cols-[1fr_1fr_0.8fr_0.9fr] xl:items-center"
                  >
                    <div>
                      <div className="font-display text-lg text-white">
                        {factura.numero_factura}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {formatDate(factura.fecha_factura)}
                      </div>
                    </div>
                    <div>
                      <PurchaseQuickMeta factura={factura} />
                      <div className="mt-2 text-sm text-slate-400">
                        IVA {formatCurrency(factura.iva)}
                      </div>
                    </div>
                    <div>
                      <FacturaCompraStatusBadge factura={factura} />
                    </div>
                    <div>
                      <div className="font-display text-lg text-white">
                        {formatCurrency(factura.total)}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {formatNumber(factura.detalles?.length || 0)} productos
                      </div>
                    </div>
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
    <label className="space-y-2">
      <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/50"
      />
    </label>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/50"
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
      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <CalendarRange className="h-4 w-4" />
          Sin puntos suficientes para graficar el ritmo de compras.
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 text-[11px] uppercase tracking-[0.24em] text-slate-500">
        Compras en el tiempo
      </div>
      <div className="grid h-[180px] grid-cols-3 gap-3 md:grid-cols-6">
        {data.map((item) => (
          <div key={item.label} className="flex flex-col justify-end gap-2">
            <div className="relative flex-1 overflow-hidden rounded-[16px] border border-white/10 bg-app/70">
              <div
                className="absolute inset-x-2 bottom-2 rounded-[14px] bg-[linear-gradient(180deg,rgba(56,189,248,0.35),rgba(56,189,248,0.95))]"
                style={{
                  height: `${Math.max((item.value / maxValue) * 100, 8)}%`,
                }}
              />
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-500">{item.label}</div>
              <div className="text-xs font-semibold text-white">
                {formatCurrency(item.value)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
