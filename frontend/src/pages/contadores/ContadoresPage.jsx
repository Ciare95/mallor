import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Archive,
  Banknote,
  Boxes,
  Download,
  FileCheck2,
  FileSearch,
  ReceiptText,
  ShieldAlert,
} from 'lucide-react';
import {
  listarFacturasContador,
  listarSoportesContador,
  obtenerCarteraContador,
  obtenerImpuestosContador,
  obtenerInventarioValorizado,
  obtenerResumenContador,
  obtenerRiesgosDian,
} from '../../services/contador.service';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
} from '../../utils/formatters';
import { EmptyState, SectionShell, StatusBadge } from '../../components/ventas/shared';

const TABS = [
  ['riesgos', 'Riesgos DIAN', ShieldAlert],
  ['facturas', 'Facturas electronicas', ReceiptText],
  ['impuestos', 'Impuestos', Banknote],
  ['cartera', 'Cartera', FileSearch],
  ['inventario', 'Inventario', Boxes],
  ['soportes', 'Soportes', Archive],
  ['reportes', 'Reportes', Download],
];

const PERIODOS = [
  ['hoy', 'Hoy'],
  ['semana', 'Semana'],
  ['mes', 'Mes'],
  ['anio', 'Ano'],
  ['personalizado', 'Personalizado'],
];

export default function ContadoresPage() {
  const [activeTab, setActiveTab] = useState('riesgos');
  const [filters, setFilters] = useState({
    periodo: 'mes',
    fecha_inicio: '',
    fecha_fin: '',
    estado: '',
    q: '',
  });

  const params = useMemo(() => {
    const next = { ...filters };
    if (next.periodo !== 'personalizado') {
      delete next.fecha_inicio;
      delete next.fecha_fin;
    }
    return next;
  }, [filters]);

  const resumenQuery = useQuery({
    queryKey: ['contador', 'resumen', params],
    queryFn: () => obtenerResumenContador(params),
  });
  const riesgosQuery = useQuery({
    queryKey: ['contador', 'riesgos', params],
    queryFn: () => obtenerRiesgosDian(params),
    enabled: activeTab === 'riesgos' || activeTab === 'reportes',
  });
  const facturasQuery = useQuery({
    queryKey: ['contador', 'facturas', params],
    queryFn: () => listarFacturasContador(params),
    enabled: activeTab === 'facturas' || activeTab === 'reportes',
  });
  const impuestosQuery = useQuery({
    queryKey: ['contador', 'impuestos', params],
    queryFn: () => obtenerImpuestosContador(params),
    enabled: activeTab === 'impuestos' || activeTab === 'reportes',
  });
  const carteraQuery = useQuery({
    queryKey: ['contador', 'cartera', params],
    queryFn: () => obtenerCarteraContador(params),
    enabled: activeTab === 'cartera' || activeTab === 'reportes',
  });
  const inventarioQuery = useQuery({
    queryKey: ['contador', 'inventario'],
    queryFn: obtenerInventarioValorizado,
    enabled: activeTab === 'inventario' || activeTab === 'reportes',
  });
  const soportesQuery = useQuery({
    queryKey: ['contador', 'soportes', params],
    queryFn: () => listarSoportesContador(params),
    enabled: activeTab === 'soportes' || activeTab === 'reportes',
  });

  const resumen = resumenQuery.data;
  const isLoading = resumenQuery.isLoading;

  function setFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function exportCsv(name, rows) {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <SectionShell
        eyebrow="Revision contable"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filters.periodo}
              onChange={(event) => setFilter('periodo', event.target.value)}
              className="app-input min-h-10 w-36"
              aria-label="Periodo"
            >
              {PERIODOS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {filters.periodo === 'personalizado' && (
              <>
                <input
                  type="date"
                  value={filters.fecha_inicio}
                  onChange={(event) => setFilter('fecha_inicio', event.target.value)}
                  className="app-input min-h-10 w-40"
                  aria-label="Fecha inicio"
                />
                <input
                  type="date"
                  value={filters.fecha_fin}
                  onChange={(event) => setFilter('fecha_fin', event.target.value)}
                  className="app-input min-h-10 w-40"
                  aria-label="Fecha fin"
                />
              </>
            )}
            <input
              value={filters.q}
              onChange={(event) => setFilter('q', event.target.value)}
              placeholder="Buscar factura, CUFE o cliente"
              className="app-input min-h-10 w-64"
            />
          </div>
        }
      >
        <div className="mb-5">
          <div className="section-chip">Modulo contadores</div>
          <h2 className="mt-3 font-display text-[2rem] leading-none text-main">
            Cumplimiento DIAN y control contable
          </h2>
          <p className="mt-2 max-w-3xl text-[13px] leading-6 text-soft">
            Vista de lectura para revisar facturacion electronica, impuestos,
            cartera, inventario valorizado y soportes probatorios por empresa.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-app bg-white/70 px-4 py-6 text-sm text-soft">
            Cargando revision contable...
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Kpi label="Ventas" value={formatNumber(resumen?.total_ventas)} />
            <Kpi label="Total vendido" value={formatCurrency(resumen?.total)} />
            <Kpi label="IVA" value={formatCurrency(resumen?.impuestos)} />
            <Kpi label="Cartera" value={formatCurrency(resumen?.cartera)} />
            <Kpi label="Facturas error" value={formatNumber(resumen?.facturas_error)} danger />
            <Kpi label="Riesgos altos" value={formatNumber(resumen?.riesgos_altos)} danger />
          </div>
        )}
      </SectionShell>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg border px-3.5 py-2 text-[12px] font-semibold transition ${
              activeTab === key
                ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-app bg-white/64 text-soft hover:bg-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'riesgos' && <RiesgosPanel query={riesgosQuery} />}
      {activeTab === 'facturas' && (
        <FacturasPanel
          query={facturasQuery}
          estado={filters.estado}
          onEstadoChange={(value) => setFilter('estado', value)}
          onExport={() => exportCsv('facturas-contador', facturasQuery.data?.results || [])}
        />
      )}
      {activeTab === 'impuestos' && <ImpuestosPanel query={impuestosQuery} />}
      {activeTab === 'cartera' && <CarteraPanel query={carteraQuery} />}
      {activeTab === 'inventario' && <InventarioPanel query={inventarioQuery} />}
      {activeTab === 'soportes' && <SoportesPanel query={soportesQuery} />}
      {activeTab === 'reportes' && (
        <ReportesPanel
          onExportFacturas={() => exportCsv('facturas-contador', facturasQuery.data?.results || [])}
          onExportCartera={() => exportCsv('cartera-contador', carteraQuery.data?.results || [])}
          onExportInventario={() => exportCsv('inventario-valorizado', inventarioQuery.data?.results || [])}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, danger = false }) {
  return (
    <div className={`rounded-lg border bg-white/74 p-4 ${danger ? 'border-[rgba(159,47,45,0.24)]' : 'border-app'}`}>
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted">{label}</div>
      <div className={`mt-2 font-display text-[1.55rem] leading-none ${danger ? 'text-[var(--danger-text)]' : 'text-main'}`}>
        {value || '0'}
      </div>
    </div>
  );
}

function RiesgosPanel({ query }) {
  const data = query.data || {};
  const groups = [
    ['Ventas sin FE emitida', data.ventas_facturables_sin_fe || []],
    ['Facturas en error', data.facturas_error || []],
    ['Facturas sin entrega', data.facturas_sin_entrega || []],
    ['Soportes faltantes', data.soportes_faltantes || []],
    ['Respuestas inconsistentes', data.respuestas_inconsistentes || []],
  ];

  return (
    <SectionShell>
      <PanelHeader icon={AlertTriangle} title="Riesgos DIAN" />
      <div className="grid gap-4 xl:grid-cols-2">
        {groups.map(([title, rows]) => (
          <div key={title} className="rounded-lg border border-app bg-white/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-[13px] font-semibold text-main">{title}</h3>
              <StatusBadge status={rows.length ? 'REVISAR' : 'OK'} />
            </div>
            {rows.length ? (
              <CompactRows rows={rows.slice(0, 6)} />
            ) : (
              <p className="text-[13px] text-soft">Sin hallazgos en el periodo.</p>
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function FacturasPanel({ query, estado, onEstadoChange, onExport }) {
  const rows = query.data?.results || [];
  return (
    <SectionShell
      actions={
        <>
          <select
            value={estado}
            onChange={(event) => onEstadoChange(event.target.value)}
            className="app-input min-h-10 w-44"
            aria-label="Estado factura"
          >
            <option value="">Todos los estados</option>
            <option value="EMITIDA">Emitida</option>
            <option value="ERROR">Error</option>
            <option value="PENDIENTE_ENVIO">Pendiente</option>
            <option value="ANULADA">Anulada</option>
          </select>
          <button type="button" onClick={onExport} className="app-button-secondary min-h-10">
            <Download className="h-4 w-4" />
            CSV
          </button>
        </>
      }
    >
      <PanelHeader icon={ReceiptText} title="Facturas electronicas" />
      <FacturasTable rows={rows} empty="No hay facturas para los filtros activos." />
    </SectionShell>
  );
}

function ImpuestosPanel({ query }) {
  const data = query.data;
  return (
    <SectionShell>
      <PanelHeader icon={Banknote} title="Impuestos" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Base" value={formatCurrency(data?.resumen?.subtotal)} />
        <Kpi label="IVA" value={formatCurrency(data?.resumen?.impuestos)} />
        <Kpi label="Total" value={formatCurrency(data?.resumen?.total)} />
        <Kpi label="Notas credito" value={formatNumber(data?.notas_credito)} />
      </div>
      <SimpleTable
        className="mt-4"
        columns={['IVA', 'Base', 'Impuesto', 'Total']}
        rows={(data?.por_iva || []).map((row) => [
          `${row.iva}%`,
          formatCurrency(row.base),
          formatCurrency(row.impuesto),
          formatCurrency(row.total),
        ])}
        empty="No hay bases gravables en el periodo."
      />
    </SectionShell>
  );
}

function CarteraPanel({ query }) {
  const rows = query.data?.results || [];
  return (
    <SectionShell>
      <PanelHeader icon={FileSearch} title={`Cartera ${formatCurrency(query.data?.total)}`} />
      <SimpleTable
        columns={['Venta', 'Cliente', 'Fecha', 'Total', 'Abonado', 'Saldo']}
        rows={rows.map((row) => [
          row.numero_venta,
          row.cliente,
          formatDate(row.fecha_venta),
          formatCurrency(row.total),
          formatCurrency(row.total_abonado),
          formatCurrency(row.saldo_pendiente),
        ])}
        empty="No hay cartera pendiente para el periodo."
      />
    </SectionShell>
  );
}

function InventarioPanel({ query }) {
  const rows = query.data?.results || [];
  return (
    <SectionShell>
      <PanelHeader icon={Boxes} title="Inventario valorizado" />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Kpi label="Costo inventario" value={formatCurrency(query.data?.costo_total)} />
        <Kpi label="Venta potencial" value={formatCurrency(query.data?.venta_total)} />
      </div>
      <SimpleTable
        columns={['Codigo', 'Producto', 'Existencias', 'Costo', 'Venta', 'IVA']}
        rows={rows.map((row) => [
          row.codigo,
          row.nombre,
          formatNumber(row.existencias),
          formatCurrency(row.costo_valorizado),
          formatCurrency(row.venta_valorizada),
          `${row.iva}%`,
        ])}
        empty="No hay productos valorizados."
      />
    </SectionShell>
  );
}

function SoportesPanel({ query }) {
  const rows = query.data?.results || [];
  return (
    <SectionShell>
      <PanelHeader icon={Archive} title="Soportes probatorios" />
      <FacturasTable rows={rows} empty="No hay soportes para los filtros activos." />
    </SectionShell>
  );
}

function ReportesPanel({ onExportFacturas, onExportCartera, onExportInventario }) {
  return (
    <SectionShell>
      <PanelHeader icon={Download} title="Reportes exportables" />
      <div className="grid gap-3 md:grid-cols-3">
        <ExportAction title="Facturas electronicas" onClick={onExportFacturas} />
        <ExportAction title="Cartera" onClick={onExportCartera} />
        <ExportAction title="Inventario valorizado" onClick={onExportInventario} />
      </div>
    </SectionShell>
  );
}

function ExportAction({ title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-20 items-center justify-between rounded-lg border border-app bg-white/72 px-4 py-3 text-left transition hover:bg-white"
    >
      <span className="text-[13px] font-semibold text-main">{title}</span>
      <Download className="h-4 w-4 text-soft" />
    </button>
  );
}

function PanelHeader({ icon: Icon, title }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="rounded-lg border border-app bg-[var(--panel-soft)] p-2 text-soft">
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="font-display text-[1.65rem] leading-none text-main">{title}</h2>
    </div>
  );
}

function CompactRows({ rows }) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={`${row.id}-${row.numero_venta || row.bill_number}`} className="rounded-md border border-app bg-white/78 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-main">
              {row.numero_venta || row.bill_number || row.reference_code}
            </span>
            <span className="text-[12px] text-soft">{formatCurrency(row.total)}</span>
          </div>
          <div className="mt-1 text-[12px] text-soft">{row.cliente}</div>
        </div>
      ))}
    </div>
  );
}

function FacturasTable({ rows, empty }) {
  return (
    <SimpleTable
      columns={['Factura', 'Cliente', 'Estado', 'Entrega', 'Total', 'Validacion']}
      rows={rows.map((row) => [
        row.bill_number || row.reference_code || row.numero_venta,
        row.cliente,
        row.status,
        row.entregada ? 'Entregada' : 'Sin evidencia',
        formatCurrency(row.total),
        formatDateTime(row.validated_at),
      ])}
      empty={empty}
    />
  );
}

function SimpleTable({ columns, rows, empty, className = '' }) {
  if (!rows.length) {
    return (
      <div className={className}>
        <EmptyState
          icon={FileCheck2}
          title="Sin datos"
          description={empty}
        />
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-lg border border-app bg-white/72 ${className}`}>
      <table className="min-w-full text-left text-[13px]">
        <thead className="border-b border-app bg-[var(--panel-soft)] text-[10px] uppercase tracking-[0.18em] text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 font-semibold">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgba(24,23,22,0.08)]">
          {rows.map((row, index) => (
            <tr key={`${row.join('-')}-${index}`} className="align-top">
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`} className="px-4 py-3 text-main">
                  {cell || '--'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function toCsv(rows) {
  if (!rows.length) {
    return '';
  }
  const columns = Object.keys(rows[0]);
  const lines = [
    columns.join(','),
    ...rows.map((row) =>
      columns.map((column) => escapeCsv(row[column])).join(','),
    ),
  ];
  return lines.join('\n');
}

function escapeCsv(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}
