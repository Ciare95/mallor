import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import {
  CircleDollarSign,
  Edit3,
  ListFilter,
  PackagePlus,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  FABRICANTE_UNIT_OPTIONS,
  formatCostNote,
  safeNumber,
  unitLabel,
} from '../../utils/fabricante';
import { formatNumber } from '../../utils/formatters';

export default function IngredientesList({
  ingredients,
  filters,
  isLoading,
  onChangeFilters,
  onCreate,
  onEdit,
  onDelete,
  onAdjustStock,
}) {
  const [searchDraft, setSearchDraft] = useState(filters.q || '');
  const deferredSearch = useDeferredValue(searchDraft);

  useEffect(() => {
    startTransition(() => {
      onChangeFilters((current) => ({
        ...current,
        q: deferredSearch,
      }));
    });
  }, [deferredSearch, onChangeFilters]);

  useEffect(() => {
    setSearchDraft(filters.q || '');
  }, [filters.q]);

  return (
    <section className="surface overflow-hidden">
      <div className="border-b border-app p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="eyebrow">Catalogo de materias primas</div>
            <h2 className="section-title mt-2">Ingredientes</h2>
            <p className="body-copy mt-2 max-w-2xl">
              Consulta costos, proveedor, niveles actuales y capacidad de
              reposicion desde una sola vista operativa.
            </p>
          </div>

          <button
            type="button"
            onClick={onCreate}
            className="app-button-primary min-h-11"
          >
            <PackagePlus className="h-4 w-4" />
            Nuevo ingrediente
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px_190px_auto]">
          <label className="app-field">
            <span className="app-field-label">Buscar</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Nombre, descripcion o proveedor"
                className="app-input min-h-11 pl-10"
              />
            </div>
          </label>

          <label className="app-field">
            <span className="app-field-label">Unidad</span>
            <div className="relative">
              <ListFilter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <select
                value={filters.unidad_medida}
                onChange={(event) =>
                  onChangeFilters((current) => ({
                    ...current,
                    unidad_medida: event.target.value,
                  }))
                }
                className="app-select min-h-11 pl-10"
              >
                <option value="">Todas las unidades</option>
                {FABRICANTE_UNIT_OPTIONS.map(([label, value]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="app-field">
            <span className="app-field-label">Orden</span>
            <select
              value={filters.ordering}
              onChange={(event) =>
                onChangeFilters((current) => ({
                  ...current,
                  ordering: event.target.value,
                }))
              }
              className="app-select min-h-11"
            >
              <option value="nombre">Nombre</option>
              <option value="-stock_actual">Mayor stock</option>
              <option value="stock_actual">Menor stock</option>
              <option value="-precio_por_unidad">Mayor costo</option>
              <option value="precio_por_unidad">Menor costo</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() =>
              onChangeFilters((current) => ({
                ...current,
                bajo_stock: !current.bajo_stock,
              }))
            }
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-[12px] font-semibold transition ${
              filters.bajo_stock
                ? 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] text-[var(--warning-text)]'
                : 'border-app bg-white/70 text-soft'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Bajo stock
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead className="table-header text-left">
            <tr>
              <th className="px-5 py-4">Ingrediente</th>
              <th className="px-5 py-4">Unidad base</th>
              <th className="px-5 py-4">Proveedor</th>
              <th className="px-5 py-4">Costo</th>
              <th className="px-5 py-4">Stock actual</th>
              <th className="px-5 py-4">Stock minimo</th>
              <th className="px-5 py-4">Estado</th>
              <th className="px-5 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {isLoading ? (
              <tr>
                <td colSpan="8" className="px-5 py-16 text-center text-soft">
                  Cargando ingredientes...
                </td>
              </tr>
            ) : ingredients.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-5 py-16 text-center text-soft">
                  No hay ingredientes para los filtros actuales.
                </td>
              </tr>
            ) : (
              ingredients.map((ingredient) => {
                const underStock =
                  safeNumber(ingredient.stock_actual) <=
                  safeNumber(ingredient.stock_minimo);

                return (
                  <tr key={ingredient.id} className="table-row">
                    <td className="px-5 py-4">
                      <div className="text-[13px] font-semibold text-main">
                        {ingredient.nombre}
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        {ingredient.descripcion || 'Sin descripcion'}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[12px] text-soft">
                      {unitLabel(ingredient.unidad_medida)}
                    </td>
                    <td className="px-5 py-4 text-[12px] text-soft">
                      {ingredient.proveedor_nombre || 'Sin proveedor'}
                    </td>
                    <td className="px-5 py-4 text-[13px] font-semibold text-main">
                      {formatCostNote(ingredient.precio_por_unidad)}
                    </td>
                    <td className="px-5 py-4 text-[12px] text-soft">
                      {formatNumber(ingredient.stock_actual)}{' '}
                      {unitLabel(ingredient.unidad_medida)}
                    </td>
                    <td className="px-5 py-4 text-[12px] text-soft">
                      {formatNumber(ingredient.stock_minimo)}{' '}
                      {unitLabel(ingredient.unidad_medida)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${
                          underStock
                            ? 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] text-[var(--warning-text)]'
                            : 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        }`}
                      >
                        {underStock ? 'Reponer' : 'Disponible'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          label="Editar"
                          icon={Edit3}
                          onClick={() => onEdit(ingredient)}
                        />
                        <ActionButton
                          label="Stock"
                          icon={CircleDollarSign}
                          onClick={() => onAdjustStock(ingredient)}
                        />
                        <ActionButton
                          label="Eliminar"
                          icon={Trash2}
                          onClick={() => onDelete(ingredient)}
                          danger
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActionButton({ label, icon: Icon, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-[12px] font-semibold transition ${
        danger
          ? 'text-[var(--danger-text)] hover:bg-[var(--danger-soft)]'
          : 'text-soft hover:bg-white hover:text-main'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
