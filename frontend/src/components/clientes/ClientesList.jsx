import { createElement, useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  buscarClientes,
  listarClientes,
} from '../../services/clientes.service';
import {
  DOCUMENTO_LABELS,
  TIPO_CLIENTE_LABELS,
  getClienteNombre,
  normalizeCollection,
} from '../../utils/clientes';
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from '../../utils/formatters';
import { useClientesStore } from '../../store/useClientesStore';
import {
  ClienteStatusBadge,
  EmptyState,
  PaginationBar,
  SectionShell,
} from './shared';

export default function ClientesList({
  onCreate,
  onView,
  onEdit,
  onDelete,
  onToggleActive,
  onOpenDashboard,
}) {
  const filtros = useClientesStore((state) => state.filtros);
  const setFiltros = useClientesStore((state) => state.setFiltros);
  const deferredSearch = useDeferredValue(filtros.q);

  const clientesQuery = useQuery({
    queryKey: ['clientes', 'listado', { ...filtros, q: deferredSearch }],
    queryFn: () =>
      deferredSearch
        ? buscarClientes(deferredSearch, filtros)
        : listarClientes(filtros),
  });

  const data = normalizeCollection(clientesQuery.data);
  const totalVisible = data.results.reduce(
    (acc, cliente) => acc + Number(cliente.saldo_pendiente || 0),
    0,
  );
  const morosos = data.results.filter(
    (cliente) => Number(cliente.saldo_pendiente || 0) > 0,
  ).length;

  const handleFilterChange = (field, value) => {
    setFiltros((current) => ({
      ...current,
      [field]: value,
      page: field === 'page' ? value : 1,
    }));
  };

  return (
    <SectionShell
      eyebrow="Relacion comercial"
      title="Gestion de clientes"
      description="Consulta cartera, perfila clientes y abre rapidamente acciones comerciales sin salir del flujo operativo."
      actions={
        <>
          <button
            type="button"
            onClick={onCreate}
            className="app-button-primary min-h-10"
          >
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </button>
          <button
            type="button"
            onClick={onOpenDashboard}
            className="app-button-secondary min-h-10"
          >
            <Wallet className="h-4 w-4" />
            Ver dashboard
          </button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr]">
        <FilterField
          label="Buscar"
          icon={Search}
          value={filtros.q}
          onChange={(value) => handleFilterChange('q', value)}
          placeholder="Documento o nombre"
        />
        <FilterSelect
          label="Tipo"
          value={filtros.tipo_cliente}
          onChange={(value) => handleFilterChange('tipo_cliente', value)}
          options={[
            ['Todos', ''],
            ['Natural', 'NATURAL'],
            ['Juridico', 'JURIDICO'],
          ]}
        />
        <FilterField
          label="Ciudad"
          value={filtros.ciudad}
          onChange={(value) => handleFilterChange('ciudad', value)}
          placeholder="Ciudad"
        />
        <FilterSelect
          label="Estado"
          value={filtros.activo}
          onChange={(value) => handleFilterChange('activo', value)}
          options={[
            ['Todos', ''],
            ['Activos', 'true'],
            ['Inactivos', 'false'],
          ]}
        />
        <FilterSelect
          label="Cartera"
          value={filtros.con_saldo_pendiente}
          onChange={(value) =>
            handleFilterChange('con_saldo_pendiente', value)
          }
          options={[
            ['Todos', ''],
            ['Con saldo', 'true'],
            ['Sin saldo', 'false'],
          ]}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Clientes visibles"
          value={formatNumber(data.count)}
          note={`${formatNumber(data.results.length)} en pagina actual`}
        />
        <MetricCard
          label="Saldo visible"
          value={formatCurrency(totalVisible)}
          note={`${morosos} clientes con saldo pendiente`}
          tone="warning"
        />
        <MetricCard
          label="Activos"
          value={formatNumber(data.results.filter((cliente) => cliente.activo).length)}
          note="Base operativa de la pagina"
          tone="success"
        />
      </div>

      <div className="table-shell mt-6">
        <div className="table-header hidden grid-cols-[1.35fr_1.05fr_0.8fr_0.8fr_0.9fr_1fr] gap-3 px-5 py-4 xl:grid">
          <span>Cliente</span>
          <span>Documento</span>
          <span>Segmento</span>
          <span>Estado</span>
          <span>Compras</span>
          <span>Acciones</span>
        </div>

        {clientesQuery.isLoading && (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-soft" />
          </div>
        )}

        {clientesQuery.isError && (
          <EmptyState
            icon={Wallet}
            title="No fue posible cargar clientes"
            description="Revisa filtros o la conexion del backend y vuelve a intentar."
          />
        )}

        {!clientesQuery.isLoading && !clientesQuery.isError && (
          <>
            {!data.results.length ? (
              <EmptyState
                icon={Search}
                title="No hay clientes para esta consulta"
                description="Ajusta los filtros o registra un nuevo cliente."
                action={
                  <button
                    type="button"
                    onClick={onCreate}
                    className="app-button-primary min-h-10"
                  >
                    <Plus className="h-4 w-4" />
                    Crear cliente
                  </button>
                }
              />
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {data.results.map((cliente) => (
                  <article
                    key={cliente.id}
                    className="table-row grid gap-4 px-5 py-5 xl:grid-cols-[1.35fr_1.05fr_0.8fr_0.8fr_0.9fr_1fr] xl:items-center"
                  >
                    <div>
                      <div className="font-display text-[1.35rem] text-main">
                        {getClienteNombre(cliente)}
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        {cliente.ciudad || '--'} · {cliente.telefono || '--'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[13px] font-semibold text-main">
                        {DOCUMENTO_LABELS[cliente.tipo_documento] ||
                          cliente.tipo_documento}{' '}
                        {cliente.numero_documento}
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        Ultima compra {formatDate(cliente.ultima_compra)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[13px] font-semibold text-main">
                        {TIPO_CLIENTE_LABELS[cliente.tipo_cliente] ||
                          cliente.tipo_cliente}
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        {formatNumber(cliente.cantidad_compras)} compras
                      </div>
                    </div>

                    <div>
                      <ClienteStatusBadge cliente={cliente} />
                    </div>

                    <div>
                      <div className="font-display text-[1.35rem] text-main">
                        {formatCurrency(cliente.total_compras)}
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        Saldo {formatCurrency(cliente.saldo_pendiente)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        icon={Eye}
                        label="Ver"
                        onClick={() => onView(cliente)}
                      />
                      <ActionButton
                        icon={Pencil}
                        label="Editar"
                        onClick={() => onEdit(cliente)}
                      />
                      <ActionButton
                        icon={cliente.activo ? ShieldOff : ShieldCheck}
                        label={cliente.activo ? 'Inactivar' : 'Activar'}
                        onClick={() => onToggleActive(cliente)}
                      />
                      <ActionButton
                        icon={Trash2}
                        label="Eliminar"
                        onClick={() => onDelete(cliente)}
                        tone="danger"
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

function MetricCard({ label, value, note, tone = 'neutral' }) {
  const toneMap = {
    neutral: 'border-app bg-white/76',
    success: 'border-[var(--accent-line)] bg-[var(--accent-soft)]',
    warning: 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)]',
  };

  return (
    <div className={`rounded-xl border px-5 py-5 ${toneMap[tone]}`}>
      <div className="eyebrow">{label}</div>
      <div className="mt-3 font-display text-[2rem] text-main">{value}</div>
      <div className="mt-2 text-[12px] text-soft">{note}</div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, tone = 'neutral' }) {
  const toneClasses =
    tone === 'danger'
      ? 'border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] text-[var(--danger-text)] hover:bg-[rgba(253,235,236,0.9)]'
      : 'border-app bg-white/72 text-main hover:bg-white';
  const iconNode = icon ? createElement(icon, { className: 'h-4 w-4' }) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-4 py-2 text-[12px] font-semibold transition ${toneClasses}`}
    >
      {iconNode}
      {label}
    </button>
  );
}

function FilterField({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = 'text',
}) {
  const iconNode = icon
    ? createElement(icon, {
        className:
          'pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted',
      })
    : null;

  return (
    <label className="app-field">
      <span className="app-field-label">{label}</span>
      <div className="relative">
        {iconNode}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`app-input min-h-10 px-4 ${icon ? 'pl-11' : ''}`}
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
