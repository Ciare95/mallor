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
  const { filtrosProductos, setFiltrosProductos, modoVista, setModoVista } = useInventarioStore();
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
      <div className="flex min-h-96 flex-col items-center justify-center text-slate-600">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-emerald-600" />
        Cargando inventario...
      </div>
    );
  }

  if (productosQuery.isError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-xl font-black text-red-900">Error al cargar productos</h2>
        <p className="mt-2 text-red-700">{productosQuery.error?.message || 'Error desconocido'}</p>
        <button type="button" onClick={() => productosQuery.refetch()} className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">Inventario activo</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight md:text-5xl">Gestión de productos y stock</h1>
              <p className="mt-3 max-w-2xl text-slate-300">Controla precios, existencias, facturas de compra, movimientos y exportaciones desde un tablero operativo.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={onManageCategories} className="min-h-11 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">Categorías</button>
              <button type="button" onClick={onCreateInvoice} className="min-h-11 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">Registrar factura</button>
              <button type="button" onClick={onProcessInvoice} className="min-h-11 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20">Procesar factura</button>
              <button type="button" onClick={onCreate} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300">
                <PackagePlus className="h-4 w-4" />
                Nuevo producto
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Valor compra" value={formatCurrency(Number(valorQuery.data?.valor_total_inventario || valorQuery.data?.valor_total || 0))} helper="Costo acumulado" />
        <StatCard label="Productos" value={totalProductos} helper="Registros filtrados" />
        <StatCard label="Bajo stock" value={bajoStock.length} helper="Umbral <= 10" tone="amber" />
        <StatCard label="Más vendidos" value={masVendidos.length} helper="Ranking disponible" tone="emerald" />
      </section>

      {bajoStock.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-bold">{bajoStock.length} producto{bajoStock.length !== 1 ? 's' : ''} con stock bajo requieren revisión.</p>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid flex-1 gap-3 md:grid-cols-[minmax(240px,1fr)_220px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input type="search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Buscar por nombre, código o barras" className="min-h-11 w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <select value={filtrosProductos.categoria_id} onChange={(event) => updateFilter({ categoria_id: event.target.value })} className="min-h-11 w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
                  <option value="">Todas las categorías</option>
                  {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
                </select>
              </div>
              <select value={filtrosProductos.marca} onChange={(event) => updateFilter({ marca: event.target.value })} className="min-h-11 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
                <option value="">Todas las marcas</option>
                {marcas.map((marca) => <option key={marca} value={marca}>{marca}</option>)}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => updateFilter({ stock_bajo: !filtrosProductos.stock_bajo })} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${filtrosProductos.stock_bajo ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                <SlidersHorizontal className="h-4 w-4" />
                Stock bajo
              </button>
              <button type="button" onClick={() => setModoVista('tabla')} className={`min-h-11 rounded-xl p-3 transition ${modoVista === 'tabla' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} aria-label="Vista tabla"><List className="h-4 w-4" /></button>
              <button type="button" onClick={() => setModoVista('tarjetas')} className={`min-h-11 rounded-xl p-3 transition ${modoVista === 'tarjetas' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} aria-label="Vista tarjetas"><Grid3X3 className="h-4 w-4" /></button>
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
      <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wider text-slate-500">
        <tr>
          {[
            ['codigo_interno', 'N° / Código'],
            ['nombre', 'Producto'],
            ['categoria', 'Categoría'],
            ['marca', 'Marca'],
            ['existencias', 'Stock'],
            ['precio_compra', 'Compra'],
            ['precio_venta', 'Venta'],
            ['iva', 'IVA'],
          ].map(([field, label]) => (
            <th key={field} className="px-5 py-4">
              <button type="button" onClick={() => onSort(field)} className="font-black hover:text-emerald-700">
                {label} {filtros.ordering === field ? '↑' : filtros.ordering === `-${field}` ? '↓' : ''}
              </button>
            </th>
          ))}
          <th className="px-5 py-4">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {productos.length === 0 ? (
          <tr>
            <td colSpan="9" className="px-5 py-16 text-center text-slate-500">
              <Boxes className="mx-auto mb-3 h-12 w-12 text-slate-300" />
              No se encontraron productos con los filtros actuales.
            </td>
          </tr>
        ) : productos.map((producto) => <ProductoRow key={producto.id} producto={producto} onView={onView} onEdit={onEdit} onDelete={onDelete} onAdjustStock={onAdjustStock} />)}
      </tbody>
    </table>
  </div>
);

const ProductoRow = ({ producto, onView, onEdit, onDelete, onAdjustStock }) => {
  const stockBajo = Number(producto.existencias || 0) <= 10;
  return (
    <tr className="transition hover:bg-emerald-50/40">
      <td className="px-5 py-4 font-mono text-sm font-bold text-slate-700">{producto.codigo_interno_formateado || producto.codigo_interno}<div className="text-xs font-normal text-slate-400">{producto.codigo_barras || 'Sin barras'}</div></td>
      <td className="px-5 py-4"><div className="font-bold text-slate-950">{producto.nombre}</div><div className="text-sm text-slate-500">{producto.invima || 'Sin INVIMA'}</div></td>
      <td className="px-5 py-4 text-sm text-slate-600">{producto.categoria_nombre || producto.categoria?.nombre || 'Sin categoría'}</td>
      <td className="px-5 py-4 text-sm text-slate-600">{producto.marca || 'Sin marca'}</td>
      <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-sm font-black ${stockBajo ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>{Number(producto.existencias || 0)}</span></td>
      <td className="px-5 py-4 font-semibold text-slate-700">{formatCurrency(Number(producto.precio_compra || 0))}</td>
      <td className="px-5 py-4 font-black text-slate-950">{formatCurrency(Number(producto.precio_venta || 0))}</td>
      <td className="px-5 py-4 text-sm text-slate-600">{Number(producto.iva || 0).toFixed(2)}%</td>
      <td className="px-5 py-4"><Actions producto={producto} onView={onView} onEdit={onEdit} onDelete={onDelete} onAdjustStock={onAdjustStock} /></td>
    </tr>
  );
};

const ProductosCards = ({ productos, onView, onEdit, onDelete, onAdjustStock }) => (
  <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
    {productos.length === 0 ? (
      <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">No hay productos para mostrar.</div>
    ) : productos.map((producto) => {
      const stockBajo = Number(producto.existencias || 0) <= 10;
      return (
        <article key={producto.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-black text-emerald-700">{producto.codigo_interno_formateado || producto.codigo_interno}</p>
              <h3 className="mt-2 text-lg font-black text-slate-950">{producto.nombre}</h3>
              <p className="mt-1 text-sm text-slate-500">{producto.categoria_nombre || 'Sin categoría'} · {producto.marca || 'Sin marca'}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-black ${stockBajo ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>{Number(producto.existencias || 0)}</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
            <div><p className="text-xs text-slate-500">Compra</p><p className="font-bold text-slate-800">{formatCurrency(Number(producto.precio_compra || 0))}</p></div>
            <div><p className="text-xs text-slate-500">Venta</p><p className="font-black text-slate-950">{formatCurrency(Number(producto.precio_venta || 0))}</p></div>
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
  <button type="button" onClick={onClick} className={`inline-flex min-h-11 items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-100 hover:text-emerald-700'}`} aria-label={label} title={label}>{icon}<span className="sr-only sm:not-sr-only">{label}</span></button>
);

const Pagination = ({ paginaActual, totalPaginas, totalProductos, pageSize, onPageChange }) => {
  if (totalProductos === 0) return null;
  const start = (paginaActual - 1) * pageSize + 1;
  const end = Math.min(paginaActual * pageSize, totalProductos);
  return (
    <div className="border-t border-slate-200 px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">Mostrando <strong>{start}</strong> a <strong>{end}</strong> de <strong>{totalProductos}</strong></p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onPageChange(Math.max(1, paginaActual - 1))} disabled={paginaActual <= 1} className="min-h-11 rounded-xl border border-slate-300 p-3 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">{paginaActual} / {totalPaginas}</span>
          <button type="button" onClick={() => onPageChange(Math.min(totalPaginas, paginaActual + 1))} disabled={paginaActual >= totalPaginas} className="min-h-11 rounded-xl border border-slate-300 p-3 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, helper, tone = 'slate' }) => {
  const tones = {
    slate: 'from-slate-900 to-slate-700 text-white',
    amber: 'from-amber-500 to-orange-500 text-white',
    emerald: 'from-emerald-500 to-teal-500 text-white',
  };
  return (
    <div className={`rounded-3xl bg-gradient-to-br p-5 shadow-xl ${tones[tone]}`}>
      <p className="text-sm font-semibold opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-70">{helper}</p>
    </div>
  );
};

export default ProductosList;
