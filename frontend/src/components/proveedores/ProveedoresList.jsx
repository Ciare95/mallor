import { createElement, useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Eye,
  Factory,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldOff,
  Trash2,
} from 'lucide-react';
import {
  buscarProveedores,
  listarProveedores,
} from '../../services/proveedores.service';
import { useProveedoresStore } from '../../store/useProveedoresStore';
import {
  DOCUMENTO_PROVEEDOR_LABELS,
  FORMA_PAGO_PROVEEDOR_LABELS,
  getProveedorNombre,
  normalizeCollection,
} from '../../utils/proveedores';
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from '../../utils/formatters';
import {
  EmptyState,
  PaginationBar,
  ProveedorStatusBadge,
  SectionShell,
} from './shared';

export default function ProveedoresList({
  onCreate,
  onView,
  onEdit,
  onDelete,
}) {
  const filtros = useProveedoresStore((state) => state.filtros);
  const setFiltros = useProveedoresStore((state) => state.setFiltros);
  const deferredSearch = useDeferredValue(filtros.q);

  const proveedoresQuery = useQuery({
    queryKey: [
      'proveedores',
      'listado',
      { ...filtros, q: deferredSearch },
    ],
    queryFn: () =>
      deferredSearch
        ? buscarProveedores(deferredSearch, filtros)
        : listarProveedores(filtros),
  });

  const data = normalizeCollection(proveedoresQuery.data);
  const totalComprado = data.results.reduce(
    (acc, proveedor) => acc + Number(proveedor.total_compras || 0),
    0,
  );

  const handleFilterChange = (field, value) => {
    setFiltros((current) => ({
      ...current,
      [field]: value,
      page: field === 'page' ? value : 1,
    }));
  };

  return (
    <SectionShell
      eyebrow="Cadena de abastecimiento"
      title="Gestion de proveedores"
      description="Mantiene visible la red de suministro, los contactos operativos y el historico de compras por proveedor."
      actions={
        <button
          type="button"
          onClick={onCreate}
          className="app-button-primary min-h-10"
        >
          <Plus className="h-4 w-4" />
          Nuevo proveedor
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr]">
        <FilterField
          label="Buscar"
          icon={Search}
          value={filtros.q}
          onChange={(value) => handleFilterChange('q', value)}
          placeholder="Documento, razon social o contacto"
        />
        <FilterSelect
          label="Documento"
          value={filtros.tipo_documento}
          onChange={(value) => handleFilterChange('tipo_documento', value)}
          options={[
            ['Todos', ''],
            ['NIT', 'NIT'],
            ['CC', 'CC'],
            ['CE', 'CE'],
          ]}
        />
        <FilterField
          label="Ciudad"
          value={filtros.ciudad}
          onChange={(value) => handleFilterChange('ciudad', value)}
          placeholder="Ciudad"
        />
        <FilterSelect
          label="Pago"
          value={filtros.forma_pago}
          onChange={(value) => handleFilterChange('forma_pago', value)}
          options={[
            ['Todos', ''],
            ['Contado', 'CONTADO'],
            ['Credito 15', 'CREDITO_15'],
            ['Credito 30', 'CREDITO_30'],
            ['Credito 60', 'CREDITO_60'],
          ]}
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
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Proveedores visibles"
          value={formatNumber(data.count)}
          note={`${formatNumber(data.results.length)} en pagina actual`}
        />
        <MetricCard
          label="Volumen visible"
          value={formatCurrency(totalComprado)}
          note="Compras historicas visibles"
          tone="accent"
        />
        <MetricCard
          label="Activos"
          value={formatNumber(data.results.filter((item) => item.activo).length)}
          note="Base operativa actual"
          tone="success"
        />
      </div>

      <div className="table-shell mt-6">
        <div className="table-header hidden grid-cols-[1.35fr_1fr_0.9fr_0.8fr_0.9fr_1fr] gap-3 px-5 py-4 xl:grid">
          <span>Proveedor</span>
          <span>Documento</span>
          <span>Contacto</span>
          <span>Estado</span>
          <span>Compras</span>
          <span>Acciones</span>
        </div>

        {proveedoresQuery.isLoading && (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-soft" />
          </div>
        )}

        {proveedoresQuery.isError && (
          <EmptyState
            icon={Factory}
            title="No fue posible cargar proveedores"
            description="Revisa filtros o la conexion del backend e intenta nuevamente."
          />
        )}

        {!proveedoresQuery.isLoading && !proveedoresQuery.isError && (
          <>
            {!data.results.length ? (
              <EmptyState
                icon={Search}
                title="No hay proveedores para esta consulta"
                description="Ajusta los filtros o registra un nuevo proveedor."
                action={
                  <button
                    type="button"
                    onClick={onCreate}
                    className="app-button-primary min-h-10"
                  >
                    <Plus className="h-4 w-4" />
                    Crear proveedor
                  </button>
                }
              />
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {data.results.map((proveedor) => (
                  <article
                    key={proveedor.id}
                    className="table-row grid gap-4 px-5 py-5 xl:grid-cols-[1.35fr_1fr_0.9fr_0.8fr_0.9fr_1fr] xl:items-center"
                  >
                    <div>
                      <div className="font-display text-[1.35rem] text-main">
                        {getProveedorNombre(proveedor)}
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        {proveedor.ciudad || '--'} · {proveedor.nombre_contacto || '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-main">
                        {DOCUMENTO_PROVEEDOR_LABELS[proveedor.tipo_documento] ||
                          proveedor.tipo_documento}{' '}
                        {proveedor.numero_documento}
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        Ultima compra {formatDate(proveedor.ultima_compra)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-main">
                        {proveedor.telefono || '--'}
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        {FORMA_PAGO_PROVEEDOR_LABELS[proveedor.forma_pago] ||
                          proveedor.forma_pago}
                      </div>
                    </div>
                    <div>
                      <ProveedorStatusBadge proveedor={proveedor} />
                    </div>
                    <div>
                      <div className="font-display text-[1.35rem] text-main">
                        {formatCurrency(proveedor.total_compras)}
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        {formatNumber(proveedor.cantidad_compras)} compras
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        icon={Eye}
                        label="Ver"
                        onClick={() => onView(proveedor)}
                      />
                      <ActionButton
                        icon={Pencil}
                        label="Editar"
                        onClick={() => onEdit(proveedor)}
                      />
                      <ActionButton
                        icon={ShieldOff}
                        label="Archivar"
                        onClick={() => onDelete(proveedor)}
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
    accent: 'border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)]',
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
          <option key={`${label}-${optionValue}`} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
