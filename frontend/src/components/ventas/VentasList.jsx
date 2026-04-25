import { useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  Eye,
  FileOutput,
  Loader2,
  Pencil,
  ReceiptText,
  Search,
  Slash,
} from 'lucide-react';
import { buscarVentas, listarVentas } from '../../services/ventas.service';
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from '../../utils/formatters';
import {
  downloadSpreadsheet,
  normalizeCollection,
  printVentasDocument,
} from '../../utils/ventas';
import { useVentasStore } from '../../store/useVentasStore';
import { EmptyState, PaginationBar, SectionShell, StatusBadge } from './shared';

export default function VentasList({
  onView,
  onEdit,
  onAbonar,
  onCancel,
  onFacturar,
  onCreate,
}) {
  const filtros = useVentasStore((state) => state.filtrosVentas);
  const setFiltros = useVentasStore((state) => state.setFiltrosVentas);
  const deferredSearch = useDeferredValue(filtros.q);

  const ventasQuery = useQuery({
    queryKey: ['ventas', 'listado', { ...filtros, q: deferredSearch }],
    queryFn: () =>
      deferredSearch
        ? buscarVentas(deferredSearch, filtros)
        : listarVentas(filtros),
  });

  const data = normalizeCollection(ventasQuery.data);

  const handleFilterChange = (field, value) => {
    setFiltros((current) => ({
      ...current,
      [field]: value,
      page: field === 'page' ? value : 1,
    }));
  };

  const handleExportSheet = () => {
    const rows = data.results.map((venta) => ({
      Numero: venta.numero_venta,
      Fecha: formatDateTime(venta.fecha_venta),
      Cliente: venta.cliente_nombre || 'Consumidor Final',
      Estado: venta.estado,
      Pago: venta.estado_pago,
      Metodo: venta.metodo_pago,
      Total: Number(venta.total || 0).toFixed(2),
      Saldo: Number(venta.saldo_pendiente || 0).toFixed(2),
    }));

    downloadSpreadsheet(rows, 'ventas-operacion.xls');
  };

  const handlePrint = () => {
    const rows = data.results.map((venta) => ({
      Numero: venta.numero_venta,
      Cliente: venta.cliente_nombre || 'Consumidor Final',
      Estado: venta.estado,
      Pago: venta.estado_pago,
      Total: formatCurrency(venta.total),
      Saldo: formatCurrency(venta.saldo_pendiente),
    }));

    printVentasDocument({
      title: 'Listado operativo de ventas',
      subtitle: `Registros visibles: ${formatNumber(data.count)}`,
      rows,
      totals: [
        { label: 'Registros', value: formatNumber(data.count) },
        {
          label: 'Total visible',
          value: formatCurrency(
            data.results.reduce(
              (acc, venta) => acc + Number(venta.total || 0),
              0,
            ),
          ),
        },
      ],
    });
  };

  return (
    <SectionShell
      eyebrow="Operacion comercial"
      title="Lista de ventas"
      description="Filtra por fecha, cliente, estado o numero de venta. Desde aqui puedes entrar al detalle, continuar ventas pendientes y enviar cobros a cartera."
      actions={
        <>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            <CreditCard className="h-4 w-4" />
            Nueva venta
          </button>
          <button
            type="button"
            onClick={handleExportSheet}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10"
          >
            <FileOutput className="h-4 w-4" />
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10"
          >
            <ReceiptText className="h-4 w-4" />
            Exportar PDF
          </button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <FilterInput
          label="Buscar"
          icon={Search}
          value={filtros.q}
          onChange={(value) => handleFilterChange('q', value)}
          placeholder="Numero o cliente"
        />
        <FilterInput
          label="Fecha inicio"
          type="date"
          value={filtros.fecha_inicio}
          onChange={(value) => handleFilterChange('fecha_inicio', value)}
        />
        <FilterInput
          label="Fecha fin"
          type="date"
          value={filtros.fecha_fin}
          onChange={(value) => handleFilterChange('fecha_fin', value)}
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
        <FilterSelect
          label="Pago"
          value={filtros.estado_pago}
          onChange={(value) => handleFilterChange('estado_pago', value)}
          options={[
            ['Todos', ''],
            ['Pagada', 'PAGADA'],
            ['Parcial', 'PARCIAL'],
            ['Pendiente', 'PENDIENTE'],
          ]}
        />
        <FilterSelect
          label="Metodo"
          value={filtros.metodo_pago}
          onChange={(value) => handleFilterChange('metodo_pago', value)}
          options={[
            ['Todos', ''],
            ['Efectivo', 'EFECTIVO'],
            ['Tarjeta', 'TARJETA'],
            ['Transferencia', 'TRANSFERENCIA'],
            ['Credito', 'CREDITO'],
          ]}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
        <div className="hidden grid-cols-[1.1fr_1.3fr_0.7fr_0.7fr_0.8fr_1fr] gap-3 bg-white/[0.06] px-5 py-4 text-[11px] uppercase tracking-[0.28em] text-slate-500 lg:grid">
          <span>Venta</span>
          <span>Cliente</span>
          <span>Estado</span>
          <span>Pago</span>
          <span>Total</span>
          <span>Acciones</span>
        </div>

        {ventasQuery.isLoading && (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        )}

        {ventasQuery.isError && (
          <EmptyState
            icon={Slash}
            title="No fue posible cargar las ventas"
            description="Verifica los filtros, la conexion del backend o intenta nuevamente."
          />
        )}

        {!ventasQuery.isLoading && !ventasQuery.isError && (
          <>
            {!data.results.length ? (
              <EmptyState
                icon={Search}
                title="Sin ventas para esta consulta"
                description="Ajusta los filtros o crea una nueva venta desde el POS."
                action={
                  <button
                    type="button"
                    onClick={onCreate}
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
                  >
                    <CreditCard className="h-4 w-4" />
                    Abrir POS
                  </button>
                }
              />
            ) : (
              <div className="divide-y divide-white/10">
                {data.results.map((venta) => (
                  <article
                    key={venta.id}
                    className="grid gap-4 px-5 py-5 transition hover:bg-white/[0.04] lg:grid-cols-[1.1fr_1.3fr_0.7fr_0.7fr_0.8fr_1fr] lg:items-center"
                  >
                    <div>
                      <div className="font-display text-lg text-white">
                        {venta.numero_venta}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                        {formatDateTime(venta.fecha_venta)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {venta.cliente_nombre || 'Consumidor Final'}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {venta.detalles_count} items · {venta.metodo_pago}
                      </div>
                    </div>
                    <div>
                      <StatusBadge status={venta.estado} />
                    </div>
                    <div>
                      <StatusBadge status={venta.estado_pago} />
                    </div>
                    <div>
                      <div className="font-display text-lg text-white">
                        {formatCurrency(venta.total)}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        Saldo {formatCurrency(venta.saldo_pendiente)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        icon={Eye}
                        label="Ver"
                        onClick={() => onView(venta)}
                      />
                      <ActionButton
                        icon={Pencil}
                        label="Editar"
                        onClick={() => onEdit(venta)}
                        disabled={venta.estado === 'CANCELADA'}
                      />
                      <ActionButton
                        icon={CreditCard}
                        label="Abonar"
                        onClick={() => onAbonar(venta)}
                        disabled={venta.estado === 'CANCELADA'}
                      />
                      <ActionButton
                        icon={Slash}
                        label="Cancelar"
                        onClick={() => onCancel(venta)}
                        disabled={
                          venta.estado === 'CANCELADA' ||
                          Number(venta.saldo_pendiente || 0) <
                            Number(venta.total || 0)
                        }
                      />
                      <ActionButton
                        icon={ReceiptText}
                        label="Facturar"
                        onClick={() => onFacturar(venta)}
                        disabled={!venta.factura_electronica}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <PaginationBar
        meta={data}
        onPageChange={(page) => handleFilterChange('page', page)}
      />
    </SectionShell>
  );
}

function FilterInput({
  label,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
        {label}
      </span>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        )}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/50 ${
            Icon ? 'pl-11' : ''
          }`}
        />
      </div>
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
          <option key={text} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({ icon, label, onClick, disabled = false }) {
  const IconComponent = icon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <IconComponent className="h-4 w-4" />
      {label}
    </button>
  );
}
