import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CreditCard,
  Loader2,
  Search,
  Wallet,
} from 'lucide-react';
import { obtenerCuentasPorCobrar } from '../../services/ventas.service';
import {
  formatCurrency,
  formatDateTime,
  getRelativeAgeLabel,
} from '../../utils/formatters';
import {
  getVentaPaymentDisplayStatus,
  normalizeCollection,
  printVentasDocument,
} from '../../utils/ventas';
import { useVentasStore } from '../../store/useVentasStore';
import { EmptyState, PaginationBar, SectionShell, StatusBadge } from './shared';

export default function CuentasPorCobrar({ onAbonar, onOpenVenta }) {
  const filtros = useVentasStore((state) => state.filtrosCartera);
  const setFiltros = useVentasStore((state) => state.setFiltrosCartera);

  const cuentasQuery = useQuery({
    queryKey: ['ventas', 'cartera', filtros],
    queryFn: () => obtenerCuentasPorCobrar(filtros),
  });

  const data = normalizeCollection(cuentasQuery.data);
  const filteredRows = useMemo(() => {
    if (filtros.antiguedad === 'todas') {
      return data.results;
    }

    const minDays = {
      '0-30': 0,
      '31-60': 31,
      '61+': 61,
    }[filtros.antiguedad];

    const maxDays = {
      '0-30': 30,
      '31-60': 60,
      '61+': Number.POSITIVE_INFINITY,
    }[filtros.antiguedad];

    return data.results.filter((venta) => {
      const ageLabel = getRelativeAgeLabel(venta.fecha_venta);
      const ageValue = Number.parseInt(ageLabel, 10) || 0;
      return ageValue >= minDays && ageValue <= maxDays;
    });
  }, [data.results, filtros.antiguedad]);

  const totalVisible = filteredRows.reduce(
    (acc, venta) => acc + Number(venta.saldo_pendiente || 0),
    0,
  );

  const agedCount = filteredRows.filter((venta) => {
    const ageLabel = getRelativeAgeLabel(venta.fecha_venta);
    const ageValue = Number.parseInt(ageLabel, 10) || 0;
    return ageValue > 30;
  }).length;

  const handleFilterChange = (field, value) => {
    setFiltros((current) => ({
      ...current,
      [field]: value,
      page: field === 'page' ? value : 1,
    }));
  };

  const handlePrint = () => {
    const rows = filteredRows.map((venta) => ({
      Numero: venta.numero_venta,
      Cliente: venta.cliente_nombre || 'Consumidor Final',
      Fecha: formatDateTime(venta.fecha_venta),
      Pago: getVentaPaymentDisplayStatus(venta),
      Saldo: formatCurrency(venta.saldo_pendiente),
      Antiguedad: getRelativeAgeLabel(venta.fecha_venta),
    }));

    printVentasDocument({
      title: 'Cuentas por cobrar',
      subtitle: `Ventas con saldo pendiente: ${filteredRows.length}`,
      rows,
      totals: [
        { label: 'Total visible', value: formatCurrency(totalVisible) },
        { label: 'Vencidas', value: `${agedCount}` },
      ],
    });
  };

  return (
    <SectionShell
      eyebrow="Cartera"
      title="Cuentas por cobrar"
      description="Concentra ventas con saldo pendiente, filtra por antiguedad y abre cobro directo sin salir de la consola."
      actions={
        <button
          type="button"
          onClick={handlePrint}
          className="app-button-secondary min-h-10"
        >
          <Wallet className="h-4 w-4" />
          Imprimir cartera
        </button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_0.8fr_0.8fr]">
        <FilterField
          label="Buscar"
          icon={Search}
          value={filtros.q}
          onChange={(value) => handleFilterChange('q', value)}
          placeholder="Numero o cliente"
        />
        <FilterField
          label="Fecha inicio"
          type="date"
          value={filtros.fecha_inicio}
          onChange={(value) => handleFilterChange('fecha_inicio', value)}
        />
        <FilterField
          label="Fecha fin"
          type="date"
          value={filtros.fecha_fin}
          onChange={(value) => handleFilterChange('fecha_fin', value)}
        />
        <FilterSelect
          label="Antiguedad"
          value={filtros.antiguedad}
          onChange={(value) => handleFilterChange('antiguedad', value)}
          options={[
            ['Todas', 'todas'],
            ['0 a 30 dias', '0-30'],
            ['31 a 60 dias', '31-60'],
            ['61 dias o mas', '61+'],
          ]}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <MetricCard
          label="Total por cobrar"
          value={formatCurrency(data.total_por_cobrar || totalVisible)}
          tone="success"
        />
        <MetricCard
          label="Saldo visible"
          value={formatCurrency(totalVisible)}
          tone="neutral"
        />
        <MetricCard
          label="Alertas"
          value={`${agedCount} vencidas`}
          tone="warning"
        />
      </div>

      <div className="table-shell mt-6">
        {cuentasQuery.isLoading && (
          <div className="flex min-h-[220px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-soft" />
          </div>
        )}

        {cuentasQuery.isError && (
          <EmptyState
            icon={AlertTriangle}
            title="No fue posible cargar la cartera"
            description="Intenta nuevamente o revisa la conexion con el backend."
          />
        )}

        {!cuentasQuery.isLoading && !cuentasQuery.isError && (
          <>
            {!filteredRows.length ? (
              <EmptyState
                icon={Wallet}
                title="Sin cartera pendiente"
                description="No hay ventas con saldo para los filtros actuales."
              />
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {filteredRows.map((venta) => (
                  <article
                    key={venta.id}
                    className="table-row grid gap-4 px-5 py-5 xl:grid-cols-[1fr_1.2fr_0.8fr_0.8fr_1fr]"
                  >
                    <div>
                      <div className="font-display text-[1.35rem] text-main">
                        {venta.numero_venta}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted">
                        {formatDateTime(venta.fecha_venta)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-main">
                        {venta.cliente_nombre || 'Consumidor Final'}
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        Antiguedad {getRelativeAgeLabel(venta.fecha_venta)}
                      </div>
                    </div>
                    <div>
                      <StatusBadge status={getVentaPaymentDisplayStatus(venta)} />
                    </div>
                    <div>
                      <div className="font-display text-[1.5rem] text-main">
                        {formatCurrency(venta.saldo_pendiente)}
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        Total {formatCurrency(venta.total)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onAbonar(venta)}
                        className="app-button-primary min-h-10"
                      >
                        <CreditCard className="h-4 w-4" />
                        Abonar
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenVenta(venta)}
                        className="app-button-secondary min-h-10"
                      >
                        Ver venta
                      </button>
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

function MetricCard({ label, value, tone }) {
  const toneMap = {
    success: 'border-[var(--accent-line)] bg-[var(--accent-soft)]',
    warning: 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)]',
    neutral: 'border-app bg-white/76',
  };

  return (
    <div className={`rounded-xl border px-5 py-5 ${toneMap[tone]}`}>
      <div className="eyebrow">{label}</div>
      <div className="mt-3 font-display text-[2rem] text-main">{value}</div>
    </div>
  );
}

function FilterField({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = 'text',
}) {
  return (
    <label className="app-field">
      <span className="app-field-label">{label}</span>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        )}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`app-input min-h-10 px-4 ${
            Icon ? 'pl-11' : ''
          }`}
        />
      </div>
    </label>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="app-field">
      <span className="app-field-label">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="app-select min-h-10"
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
