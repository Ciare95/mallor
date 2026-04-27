import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Boxes, ChevronLeft, ChevronRight, Eye, Filter, Grid3X3, List, Loader2, PackagePlus, Pencil, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import {
  listarCategorias,
  listarProductos,
  obtenerProductosBajoStock,
  obtenerProductosMasVendidos,
  obtenerValorTotalInventario,
} from '../../services/inventario.service';
import { useInventarioStore } from '../../store/useInventarioStore';
import { formatCurrency } from '../../utils/formatters';
import ExportarInventario from './ExportarInventario';

const getResults = (data) => data?.results || data || [];

const ProductosList = ({ onCreate, onView, onEdit, onDelete, onAdjustStock, onManageCategories, onCreateInvoice, onProcessInvoice, onToast }) => {
  const {
    filtrosProductos,
    setFiltrosProductos,
    modoVista,
    setModoVista,
    salePricingRules,
    setSalePricingRules,
  } = useInventarioStore();
  const [searchDraft, setSearchDraft] = useState(filtrosProductos.q || '');
  const deferredSearch = useDeferredValue(searchDraft);

  useEffect(() => {
    startTransition(() => {
      setFiltrosProductos((prev) => ({ ...prev, q: deferredSearch, page: 1 }));
    });
  }, [deferredSearch, setFiltrosProductos]);

  const apiFilters = {
    q: filtrosProductos.q,
    categoria_id: filtrosProductos.categoria_id,
    marca: filtrosProductos.marca,
    ordering: filtrosProductos.ordering,
    page: filtrosProductos.page,
    page_size: filtrosProductos.page_size,
    stock_max: filtrosProductos.stock_bajo ? 10 : undefined,
  };

  const productosQuery = useQuery({
    queryKey: ['inventario', 'productos', apiFilters],
    queryFn: () => listarProductos(apiFilters),
    placeholderData: (previousData) => previousData,
  });
  const categoriasQuery = useQuery({
    queryKey: ['inventario', 'categorias'],
    queryFn: () => listarCategorias({ page_size: 100 }),
  });
  const valorQuery = useQuery({
    queryKey: ['inventario', 'reportes', 'valor-total'],
    queryFn: obtenerValorTotalInventario,
  });
  const bajoStockQuery = useQuery({
    queryKey: ['inventario', 'reportes', 'bajo-stock'],
    queryFn: () => obtenerProductosBajoStock(10),
  });
  const masVendidosQuery = useQuery({
    queryKey: ['inventario', 'reportes', 'mas-vendidos'],
    queryFn: () => obtenerProductosMasVendidos({ limite: 5 }),
  });

  const productos = getResults(productosQuery.data);
  const categorias = getResults(categoriasQuery.data);
  const totalProductos = productosQuery.data?.count || productos.length;
  const paginaActual = productosQuery.data?.current_page || filtrosProductos.page;
  const totalPaginas = productosQuery.data?.total_pages || 1;
  const bajoStock = getResults(bajoStockQuery.data);
  const masVendidos = getResults(masVendidosQuery.data);
  const marcas = Array.from(new Set(productos.map((producto) => producto.marca).filter(Boolean))).slice(0, 12);

  const updateFilter = (patch) => {
    setFiltrosProductos((prev) => ({ ...prev, ...patch, page: patch.page || 1 }));
  };

  const handleSort = (field) => {
    setFiltrosProductos((prev) => ({
      ...prev,
      ordering: prev.ordering === field ? `-${field}` : field,
      page: 1,
    }));
  };

  if (productosQuery.isLoading) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center text-soft">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-[var(--accent)]" />
        Cargando inventario...
      </div>
    );
  }

  if (productosQuery.isError) {
    return (
      <div className="rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] p-6">
        <h2 className="text-lg font-semibold text-[var(--danger-text)]">Error al cargar productos</h2>
        <p className="mt-2 text-[13px] text-[var(--danger-text)]">{productosQuery.error?.message || 'Error desconocido'}</p>
        <button type="button" onClick={() => productosQuery.refetch()} className="app-button-primary mt-5">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="surface p-3">
        <div className="mb-2 text-[8px] font-semibold uppercase tracking-[0.2em] text-muted">
          Modulo de inventario
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={onManageCategories}
            className="tab-card min-h-[68px] px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <Boxes className="h-3.5 w-3.5 text-soft" />
              <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-muted">
                Gestion
              </span>
            </div>
            <div className="mt-2.5 font-display text-[1.15rem] leading-none text-main">
              Categorias
            </div>
          </button>

          <button
            type="button"
            onClick={onCreateInvoice}
            className="tab-card min-h-[68px] px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <PackagePlus className="h-3.5 w-3.5 text-soft" />
              <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-muted">
                Compras
              </span>
            </div>
            <div className="mt-2.5 font-display text-[1.15rem] leading-none text-main">
              Registrar factura
            </div>
          </button>

          <button
            type="button"
            onClick={onProcessInvoice}
            className="tab-card min-h-[68px] px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <SlidersHorizontal className="h-3.5 w-3.5 text-soft" />
              <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-muted">
                Flujo
              </span>
            </div>
            <div className="mt-2.5 font-display text-[1.15rem] leading-none text-main">
              Procesar factura
            </div>
          </button>

          <button
            type="button"
            onClick={onCreate}
            className="tab-card tab-card-active min-h-[68px] px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <PackagePlus className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-muted">
                Alta
              </span>
            </div>
            <div className="mt-2.5 font-display text-[1.15rem] leading-none text-main">
              Nuevo producto
            </div>
          </button>
        </div>
      </section>

      <section className="surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow">Regla sugerido venta</div>
            <p className="body-copy mt-2 max-w-2xl">
              Esta regla es global para inventario. Se define aqui y luego se aplica
              a las facturas antes de procesarlas.
            </p>
          </div>
          <div className="rounded-lg border border-app bg-[var(--panel-soft)] px-3 py-2 text-[12px] text-soft">
            Menor o igual a {formatCurrency(salePricingRules.threshold)}:
            {' '}+{salePricingRules.markupBelowOrEqual}% | Mayor:
            {' '}+{salePricingRules.markupAbove}%
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <RuleInput
            label="Umbral"
            value={salePricingRules.threshold}
            onChange={(value) =>
              setSalePricingRules((prev) => ({ ...prev, threshold: value }))
            }
          />
          <RuleInput
            label="% menor o igual"
            value={salePricingRules.markupBelowOrEqual}
            onChange={(value) =>
              setSalePricingRules((prev) => ({
                ...prev,
                markupBelowOrEqual: value,
              }))
            }
          />
          <RuleInput
            label="% mayor"
            value={salePricingRules.markupAbove}
            onChange={(value) =>
              setSalePricingRules((prev) => ({ ...prev, markupAbove: value }))
            }
          />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Valor compra" value={formatCurrency(Number(valorQuery.data?.valor_total_inventario || valorQuery.data?.valor_total || 0))} helper="Costo acumulado" />
        <StatCard label="Productos" value={totalProductos} helper="Registros filtrados" />
        <StatCard label="Bajo stock" value={bajoStock.length} helper="Umbral <= 10" tone="amber" />
        <StatCard label="Mas vendidos" value={masVendidos.length} helper="Ranking disponible" tone="emerald" />
      </section>

      {bajoStock.length > 0 && (
        <section className="rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] p-4 text-[var(--warning-text)]">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-[13px] font-semibold">{bajoStock.length} producto{bajoStock.length !== 1 ? 's' : ''} con stock bajo requieren revision.</p>
          </div>
        </section>
      )}

      <section className="surface">
        <div className="border-b border-app p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid flex-1 gap-3 md:grid-cols-[minmax(240px,1fr)_220px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input type="search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Buscar por nombre, codigo o barras" className="app-input min-h-10 pl-10" />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <select value={filtrosProductos.categoria_id} onChange={(event) => updateFilter({ categoria_id: event.target.value })} className="app-select min-h-10 pl-10">
                  <option value="">Todas las categorias</option>
                  {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
                </select>
              </div>
              <select value={filtrosProductos.marca} onChange={(event) => updateFilter({ marca: event.target.value })} className="app-select min-h-10">
                <option value="">Todas las marcas</option>
                {marcas.map((marca) => <option key={marca} value={marca}>{marca}</option>)}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => updateFilter({ stock_bajo: !filtrosProductos.stock_bajo })} className={`inline-flex min-h-10 items-center gap-2 rounded-md px-4 py-2.5 text-[12px] font-semibold transition ${filtrosProductos.stock_bajo ? 'border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] text-[var(--warning-text)]' : 'border border-app bg-white/70 text-soft hover:bg-white'}`}>
                <SlidersHorizontal className="h-4 w-4" />
                Stock bajo
              </button>
              <button type="button" onClick={() => setModoVista('tabla')} className={`min-h-10 rounded-md border p-3 transition ${modoVista === 'tabla' ? 'border-[var(--text-main)] bg-[var(--text-main)] text-white' : 'border-app bg-white/70 text-soft hover:bg-white'}`} aria-label="Vista tabla"><List className="h-4 w-4" /></button>
              <button type="button" onClick={() => setModoVista('tarjetas')} className={`min-h-10 rounded-md border p-3 transition ${modoVista === 'tarjetas' ? 'border-[var(--text-main)] bg-[var(--text-main)] text-white' : 'border-app bg-white/70 text-soft hover:bg-white'}`} aria-label="Vista tarjetas"><Grid3X3 className="h-4 w-4" /></button>
              <ExportarInventario onSuccess={onToast?.success} onError={onToast?.error} />
            </div>
          </div>
        </div>

        {modoVista === 'tabla' ? (
          <ProductosTable productos={productos} filtros={filtrosProductos} onSort={handleSort} onView={onView} onEdit={onEdit} onDelete={onDelete} onAdjustStock={onAdjustStock} />
        ) : (
          <ProductosCards productos={productos} onView={onView} onEdit={onEdit} onDelete={onDelete} onAdjustStock={onAdjustStock} />
        )}

        <Pagination paginaActual={paginaActual} totalPaginas={totalPaginas} totalProductos={totalProductos} pageSize={filtrosProductos.page_size} onPageChange={(page) => updateFilter({ page })} />
      </section>
    </div>
  );
};

const ProductosTable = ({ productos, filtros, onSort, onView, onEdit, onDelete, onAdjustStock }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[1100px]">
      <thead className="table-header text-left">
        <tr>
          {[
            ['codigo_interno', 'N / Codigo'],
            ['nombre', 'Producto'],
            ['categoria', 'Categoria'],
            ['marca', 'Marca'],
            ['existencias', 'Stock'],
            ['precio_compra', 'Compra'],
            ['precio_venta', 'Venta'],
            ['iva', 'IVA'],
          ].map(([field, label]) => (
            <th key={field} className="px-5 py-4">
              <button type="button" onClick={() => onSort(field)} className="font-semibold hover:text-main">
                {label} {filtros.ordering === field ? '↑' : filtros.ordering === `-${field}` ? '↓' : ''}
              </button>
            </th>
          ))}
          <th className="px-5 py-4">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--line)]">
        {productos.length === 0 ? (
          <tr>
            <td colSpan="9" className="px-5 py-16 text-center text-soft">
              <Boxes className="mx-auto mb-3 h-12 w-12 text-muted" />
              No se encontraron productos con los filtros actuales.
            </td>
          </tr>
        ) : productos.map((producto) => <ProductoRow key={producto.id} producto={producto} onView={onView} onEdit={onEdit} onDelete={onDelete} onAdjustStock={onAdjustStock} />)}
      </tbody>
    </table>
  </div>
);

const RuleInput = ({ label, value, onChange }) => (
  <label className="app-field">
    <span className="app-field-label">{label}</span>
    <input
      type="number"
      min="0"
      step="1"
      value={value}
      onFocus={(event) => {
        if (String(value) === '0') {
          onChange('');
          return;
        }
        event.target.select();
      }}
      onBlur={(event) => {
        if (event.target.value === '') {
          return;
        }
        onChange(String(Math.round(Number(event.target.value) || 0)));
      }}
      onChange={(event) => onChange(event.target.value)}
      className="app-input min-h-11"
    />
  </label>
);

const ProductoRow = ({ producto, onView, onEdit, onDelete, onAdjustStock }) => {
  const stockBajo = Number(producto.existencias || 0) <= 10;
  return (
    <tr className="table-row">
      <td className="px-5 py-4 font-mono-ui text-[12px] font-semibold text-main">{producto.codigo_interno_formateado || producto.codigo_interno}<div className="text-[11px] font-normal text-muted">{producto.codigo_barras || 'Sin barras'}</div></td>
      <td className="px-5 py-4"><div className="text-[13px] font-semibold text-main">{producto.nombre}</div><div className="text-[12px] text-soft">{producto.invima || 'Sin INVIMA'}</div></td>
      <td className="px-5 py-4 text-[12px] text-soft">{producto.categoria_nombre || producto.categoria?.nombre || 'Sin categoria'}</td>
      <td className="px-5 py-4 text-[12px] text-soft">{producto.marca || 'Sin marca'}</td>
      <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${stockBajo ? 'bg-[var(--warning-soft)] text-[var(--warning-text)]' : 'bg-[var(--accent-soft)] text-[var(--accent)]'}`}>{Number(producto.existencias || 0)}</span></td>
      <td className="px-5 py-4 text-[12px] font-semibold text-soft">{formatCurrency(Number(producto.precio_compra || 0))}</td>
      <td className="px-5 py-4 text-[13px] font-semibold text-main">{formatCurrency(Number(producto.precio_venta || 0))}</td>
      <td className="px-5 py-4 text-[12px] text-soft">{Number(producto.iva || 0).toFixed(2)}%</td>
      <td className="px-5 py-4"><Actions producto={producto} onView={onView} onEdit={onEdit} onDelete={onDelete} onAdjustStock={onAdjustStock} /></td>
    </tr>
  );
};

const ProductosCards = ({ productos, onView, onEdit, onDelete, onAdjustStock }) => (
  <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
    {productos.length === 0 ? (
      <div className="col-span-full rounded-xl border border-dashed border-app p-10 text-center text-soft">No hay productos para mostrar.</div>
    ) : productos.map((producto) => {
      const stockBajo = Number(producto.existencias || 0) <= 10;
      return (
        <article key={producto.id} className="surface p-5 transition hover:-translate-y-0.5 hover:border-[var(--accent-line)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono-ui text-[11px] font-semibold text-[var(--accent)]">{producto.codigo_interno_formateado || producto.codigo_interno}</p>
              <h3 className="mt-2 text-[15px] font-semibold text-main">{producto.nombre}</h3>
              <p className="mt-1 text-[12px] text-soft">{producto.categoria_nombre || 'Sin categoria'} · {producto.marca || 'Sin marca'}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${stockBajo ? 'bg-[var(--warning-soft)] text-[var(--warning-text)]' : 'bg-[var(--accent-soft)] text-[var(--accent)]'}`}>{Number(producto.existencias || 0)}</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-app bg-[var(--panel-soft)] p-4">
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-muted">Compra</p><p className="mt-1 text-[13px] font-semibold text-soft">{formatCurrency(Number(producto.precio_compra || 0))}</p></div>
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-muted">Venta</p><p className="mt-1 text-[13px] font-semibold text-main">{formatCurrency(Number(producto.precio_venta || 0))}</p></div>
          </div>
          <div className="mt-5"><Actions producto={producto} onView={onView} onEdit={onEdit} onDelete={onDelete} onAdjustStock={onAdjustStock} /></div>
        </article>
      );
    })}
  </div>
);

const Actions = ({ producto, onView, onEdit, onDelete, onAdjustStock }) => (
  <div className="flex flex-wrap items-center gap-2">
    <IconButton label="Ver" onClick={() => onView(producto)} icon={<Eye className="h-4 w-4" />} />
    <IconButton label="Editar" onClick={() => onEdit(producto)} icon={<Pencil className="h-4 w-4" />} />
    <IconButton label="Stock" onClick={() => onAdjustStock(producto)} icon={<SlidersHorizontal className="h-4 w-4" />} />
    <IconButton label="Eliminar" onClick={() => onDelete(producto)} icon={<Trash2 className="h-4 w-4" />} danger />
  </div>
);

const IconButton = ({ label, icon, onClick, danger = false }) => (
  <button type="button" onClick={onClick} className={`inline-flex min-h-9 items-center gap-1 rounded-md px-3 py-2 text-[12px] font-semibold transition ${danger ? 'text-[var(--danger-text)] hover:bg-[var(--danger-soft)]' : 'text-soft hover:bg-white hover:text-main'}`} aria-label={label} title={label}>{icon}<span className="sr-only sm:not-sr-only">{label}</span></button>
);

const Pagination = ({ paginaActual, totalPaginas, totalProductos, pageSize, onPageChange }) => {
  if (totalProductos === 0) return null;
  const start = (paginaActual - 1) * pageSize + 1;
  const end = Math.min(paginaActual * pageSize, totalProductos);
  return (
    <div className="border-t border-app px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-soft">Mostrando <strong>{start}</strong> a <strong>{end}</strong> de <strong>{totalProductos}</strong></p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onPageChange(Math.max(1, paginaActual - 1))} disabled={paginaActual <= 1} className="app-button-secondary min-h-10 px-3"><ChevronLeft className="h-4 w-4" /></button>
          <span className="rounded-md border border-app bg-white/72 px-4 py-2 text-[12px] font-semibold text-main">{paginaActual} / {totalPaginas}</span>
          <button type="button" onClick={() => onPageChange(Math.min(totalPaginas, paginaActual + 1))} disabled={paginaActual >= totalPaginas} className="app-button-secondary min-h-10 px-3"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, helper, tone = 'slate' }) => {
  const tones = {
    slate: 'border-app bg-white/76',
    amber: 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)]',
    emerald: 'border-[var(--accent-line)] bg-[var(--accent-soft)]',
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-display text-[2rem] leading-none text-main">{value}</p>
      <p className="mt-2 text-[12px] text-soft">{helper}</p>
    </div>
  );
};

export default ProductosList;
