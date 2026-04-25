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
          className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
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

      <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
        <div className="hidden grid-cols-[1.35fr_1fr_0.9fr_0.8fr_0.9fr_1fr] gap-3 bg-white/[0.06] px-5 py-4 text-[11px] uppercase tracking-[0.28em] text-slate-500 xl:grid">
          <span>Proveedor</span>
          <span>Documento</span>
          <span>Contacto</span>
          <span>Estado</span>
          <span>Compras</span>
          <span>Acciones</span>
        </div>

        {proveedoresQuery.isLoading && (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
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
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
                  >
                    <Plus className="h-4 w-4" />
                    Crear proveedor
                  </button>
                }
              />
            ) : (
              <div className="divide-y divide-white/10">
                {data.results.map((proveedor) => (
                  <article
                    key={proveedor.id}
                    className="grid gap-4 px-5 py-5 transition hover:bg-white/[0.04] xl:grid-cols-[1.35fr_1fr_0.9fr_0.8fr_0.9fr_1fr] xl:items-center"
                  >
                    <div>
                      <div className="font-display text-lg text-white">
                        {getProveedorNombre(proveedor)}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {proveedor.ciudad || '--'} · {proveedor.nombre_contacto || '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {DOCUMENTO_PROVEEDOR_LABELS[proveedor.tipo_documento] ||
                          proveedor.tipo_documento}{' '}
                        {proveedor.numero_documento}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        Ultima compra {formatDate(proveedor.ultima_compra)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {proveedor.telefono || '--'}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {FORMA_PAGO_PROVEEDOR_LABELS[proveedor.forma_pago] ||
                          proveedor.forma_pago}
                      </div>
                    </div>
                    <div>
                      <ProveedorStatusBadge proveedor={proveedor} />
                    </div>
                    <div>
                      <div className="font-display text-lg text-white">
                        {formatCurrency(proveedor.total_compras)}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
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
    neutral: 'border-white/10 bg-white/[0.04]',
    success: 'border-emerald-500/20 bg-emerald-500/10',
    accent: 'border-cyan-500/20 bg-cyan-500/10',
  };

  return (
    <div className={`rounded-[22px] border px-5 py-5 ${toneMap[tone]}`}>
      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 font-display text-3xl text-white">{value}</div>
      <div className="mt-2 text-sm text-slate-400">{note}</div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, tone = 'neutral' }) {
  const toneClasses =
    tone === 'danger'
      ? 'border-rose-500/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20'
      : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10';
  const iconNode = icon ? createElement(icon, { className: 'h-4 w-4' }) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${toneClasses}`}
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
          'pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500',
      })
    : null;

  return (
    <label className="space-y-2">
      <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
        {label}
      </span>
      <div className="relative">
        {iconNode}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`min-h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition focus:border-emerald-400/50 ${
            icon ? 'pl-11' : ''
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
          <option key={`${label}-${optionValue}`} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
