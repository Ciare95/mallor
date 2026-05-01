import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Factory,
  FlaskConical,
  PackagePlus,
  Search,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react';
import useToast from '../../hooks/useToast';
import { ToastContainer } from '../ui/Toast';
import IngredienteForm from './IngredienteForm';
import IngredientesList from './IngredientesList';
import InventarioIngredientes from './InventarioIngredientes';
import ProduccionForm from './ProduccionForm';
import ProductoFabricadoForm from './ProductoFabricadoForm';
import {
  actualizarIngrediente,
  actualizarProductoFabricadoConReceta,
  actualizarStockIngrediente,
  convertirProductoFabricadoAInventario,
  crearIngrediente,
  crearProductoFabricado,
  empacarPresentacionProductoFabricado,
  eliminarIngrediente,
  eliminarProductoFabricado,
  listarIngredientes,
  listarProductosFabricados,
  obtenerIngredientesBajoStock,
  obtenerProductoFabricado,
  producirProductoFabricado,
} from '../../services/fabricante.service';
import {
  FABRICANTE_VISTAS,
  useFabricanteStore,
} from '../../store/useFabricanteStore';
import {
  buildPresentationPerformanceSummary,
  extractApiError,
  formatCostNote,
  getManufacturingStats,
  getProductStatusTone,
  getResults,
  safeNumber,
  unitLabel,
} from '../../utils/fabricante';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const FABRICANTE_VIEW_META = {
  [FABRICANTE_VISTAS.INGREDIENTES]: {
    eyebrow: 'Navegacion de modulo',
    title: 'Ingredientes',
    description:
      'Vuelve al tablero principal de fabricante sin perder el contexto de trabajo.',
  },
  [FABRICANTE_VISTAS.INGREDIENTE_FORM]: {
    eyebrow: 'Navegacion de modulo',
    title: 'Formulario de ingrediente',
    description:
      'Regresa al tablero principal del modulo cuando necesites cambiar de flujo.',
  },
  [FABRICANTE_VISTAS.PRODUCTOS]: {
    eyebrow: 'Navegacion de modulo',
    title: 'Catalogo de fabricacion',
    description:
      'Puedes volver al resumen general de fabricante desde cualquier vista operativa.',
  },
  [FABRICANTE_VISTAS.PRODUCTO_FORM]: {
    eyebrow: 'Navegacion de modulo',
    title: 'Formulario de producto fabricado',
    description:
      'Mantiene una salida directa al dashboard principal del modulo fabricante.',
  },
  [FABRICANTE_VISTAS.PRODUCCION]: {
    eyebrow: 'Navegacion de modulo',
    title: 'Produccion y empaque',
    description:
      'Regresa al tablero para revisar stock, productos o nuevas recetas.',
  },
};

export default function FabricantePage() {
  const queryClient = useQueryClient();
  const { toasts, toast, closeToast } = useToast();
  const {
    vistaActual,
    ingredienteSeleccionado,
    productoSeleccionado,
    filtrosIngredientes,
    filtrosProductos,
    margenObjetivo,
    setVistaActual,
    setIngredienteSeleccionado,
    setProductoSeleccionado,
    setFiltrosIngredientes,
    setFiltrosProductos,
  } = useFabricanteStore();

  const ingredientesQuery = useQuery({
    queryKey: ['fabricante', 'ingredientes', filtrosIngredientes],
    queryFn: () => listarIngredientes({ ...filtrosIngredientes, page_size: 100 }),
    placeholderData: (previousData) => previousData,
  });

  const bajoStockQuery = useQuery({
    queryKey: ['fabricante', 'ingredientes', 'bajo-stock'],
    queryFn: obtenerIngredientesBajoStock,
  });

  const productosQuery = useQuery({
    queryKey: ['fabricante', 'productos', filtrosProductos],
    queryFn: () => listarProductosFabricados({ ...filtrosProductos, page_size: 100 }),
    placeholderData: (previousData) => previousData,
  });

  const productDetailQuery = useQuery({
    queryKey: ['fabricante', 'producto', productoSeleccionado?.id],
    queryFn: () => obtenerProductoFabricado(productoSeleccionado.id),
    enabled: Boolean(
      productoSeleccionado?.id &&
        (vistaActual === FABRICANTE_VISTAS.PRODUCTO_FORM ||
          vistaActual === FABRICANTE_VISTAS.PRODUCCION),
    ),
  });

  const ingredients = getResults(ingredientesQuery.data);
  const lowStockIngredients = getResults(bajoStockQuery.data);
  const products = getResults(productosQuery.data);
  const selectedProduct = productDetailQuery.data || productoSeleccionado;
  const stats = getManufacturingStats({
    ingredients,
    products,
    lowStock: lowStockIngredients,
  });

  const invalidateModule = () => {
    queryClient.invalidateQueries({ queryKey: ['fabricante'] });
    queryClient.invalidateQueries({ queryKey: ['inventario'] });
  };

  const createIngredientMutation = useMutation({
    mutationFn: crearIngrediente,
    onSuccess: (ingredient) => {
      invalidateModule();
      toast.success(`Ingrediente ${ingredient.nombre} creado correctamente.`);
      setIngredienteSeleccionado(ingredient);
      setVistaActual(FABRICANTE_VISTAS.INGREDIENTES);
    },
    onError: (error) =>
      toast.error(
        extractApiError(error, 'No fue posible crear el ingrediente.'),
      ),
  });

  const updateIngredientMutation = useMutation({
    mutationFn: ({ id, payload }) => actualizarIngrediente(id, payload),
    onSuccess: (ingredient) => {
      invalidateModule();
      toast.success(`Ingrediente ${ingredient.nombre} actualizado.`);
      setIngredienteSeleccionado(null);
      setVistaActual(FABRICANTE_VISTAS.INGREDIENTES);
    },
    onError: (error) =>
      toast.error(
        extractApiError(error, 'No fue posible actualizar el ingrediente.'),
      ),
  });

  const updateStockMutation = useMutation({
    mutationFn: ({ id, payload }) => actualizarStockIngrediente(id, payload),
    onSuccess: (ingredient) => {
      invalidateModule();
      toast.success(`Stock de ${ingredient.nombre} actualizado.`);
    },
    onError: (error) =>
      toast.error(
        extractApiError(error, 'No fue posible ajustar el stock.'),
      ),
  });

  const deleteIngredientMutation = useMutation({
    mutationFn: eliminarIngrediente,
    onSuccess: () => {
      invalidateModule();
      toast.success('Ingrediente eliminado.');
    },
    onError: (error) =>
      toast.error(
        extractApiError(error, 'No fue posible eliminar el ingrediente.'),
      ),
  });

  const createProductMutation = useMutation({
    mutationFn: crearProductoFabricado,
    onSuccess: (product) => {
      invalidateModule();
      toast.success(`Producto ${product.nombre} creado correctamente.`);
      setProductoSeleccionado(product);
      setVistaActual(FABRICANTE_VISTAS.PRODUCTOS);
    },
    onError: (error) =>
      toast.error(
        extractApiError(error, 'No fue posible crear el producto fabricado.'),
      ),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, payload, currentRecipe }) =>
      actualizarProductoFabricadoConReceta({ id, payload, currentRecipe }),
    onSuccess: (product) => {
      invalidateModule();
      toast.success(`Producto ${product.nombre} actualizado.`);
      setProductoSeleccionado(product);
      setVistaActual(FABRICANTE_VISTAS.PRODUCTOS);
    },
    onError: (error) =>
      toast.error(
        extractApiError(error, 'No fue posible actualizar el producto.'),
      ),
  });

  const deleteProductMutation = useMutation({
    mutationFn: eliminarProductoFabricado,
    onSuccess: () => {
      invalidateModule();
      toast.success('Producto fabricado eliminado.');
    },
    onError: (error) =>
      toast.error(
        extractApiError(error, 'No fue posible eliminar el producto.'),
      ),
  });

  const convertProductMutation = useMutation({
    mutationFn: convertirProductoFabricadoAInventario,
    onSuccess: (result) => {
      invalidateModule();
      toast.success(
        `Producto vinculado a inventario: ${result.producto_inventario.nombre}.`,
      );
    },
    onError: (error) =>
      toast.error(
        extractApiError(
          error,
          'No fue posible convertir el producto a inventario.',
        ),
      ),
  });

  const produceMutation = useMutation({
    mutationFn: async ({ product, productId, lots, ensureInventoryLink }) => {
      if (ensureInventoryLink && !product.producto_final) {
        await convertirProductoFabricadoAInventario(productId);
      }

      return producirProductoFabricado(productId, {
        cantidad_lotes: lots,
      });
    },
    onSuccess: (result) => {
      invalidateModule();
      toast.success(
        `Produccion completada: ${formatNumber(result.cantidad_total_producida)} unidades generadas.`,
      );
      setProductoSeleccionado(result.producto);
      setVistaActual(FABRICANTE_VISTAS.PRODUCCION);
    },
    onError: (error) =>
      toast.error(
        extractApiError(error, 'No fue posible completar la produccion.'),
      ),
  });

  const packageMutation = useMutation({
    mutationFn: ({ productId, presentationId, payload }) =>
      empacarPresentacionProductoFabricado(productId, presentationId, payload),
    onSuccess: (result) => {
      invalidateModule();
      setProductoSeleccionado(result.producto);
      toast.success(
        `Empaque completado: ${formatNumber(result.cantidad_unidades)} unidades enviadas a inventario.`,
      );
    },
    onError: (error) =>
      toast.error(
        extractApiError(error, 'No fue posible empacar la presentacion.'),
      ),
  });

  const ingredientFormMutation =
    vistaActual === FABRICANTE_VISTAS.INGREDIENTE_FORM &&
    ingredienteSeleccionado?.id
      ? updateIngredientMutation
      : createIngredientMutation;

  const productFormMutation =
    vistaActual === FABRICANTE_VISTAS.PRODUCTO_FORM &&
    productoSeleccionado?.id
      ? updateProductMutation
      : createProductMutation;

  const openIngredientForm = (ingredient = null) => {
    setIngredienteSeleccionado(ingredient);
    setVistaActual(FABRICANTE_VISTAS.INGREDIENTE_FORM);
  };

  const openProductForm = (product = null) => {
    setProductoSeleccionado(product);
    setVistaActual(FABRICANTE_VISTAS.PRODUCTO_FORM);
  };

  const openProduction = (product = null) => {
    setProductoSeleccionado(product);
    setVistaActual(FABRICANTE_VISTAS.PRODUCCION);
  };

  const handleDeleteIngredient = (ingredient) => {
    const confirmed = window.confirm(
      `Eliminar el ingrediente "${ingredient.nombre}" puede afectar recetas existentes. ¿Deseas continuar?`,
    );
    if (!confirmed) {
      return;
    }
    deleteIngredientMutation.mutate(ingredient.id);
  };

  const handleDeleteProduct = (product) => {
    const confirmed = window.confirm(
      `Eliminar el producto fabricado "${product.nombre}" quitara su receta actual. ¿Deseas continuar?`,
    );
    if (!confirmed) {
      return;
    }
    deleteProductMutation.mutate(product.id);
  };

  const handleAdjustIngredientStock = (ingredient) => {
    const input = window.prompt(
      `Ingresa el ajuste para ${ingredient.nombre}. Usa positivos para ingreso y negativos para consumo.`,
      '0.0000',
    );
    if (input === null) {
      return;
    }

    updateStockMutation.mutate({
      id: ingredient.id,
      payload: { cantidad: input },
    });
  };

  const handleIngredientSubmit = (payload) => {
    if (ingredienteSeleccionado?.id) {
      updateIngredientMutation.mutate({
        id: ingredienteSeleccionado.id,
        payload,
      });
      return;
    }
    createIngredientMutation.mutate(payload);
  };

  const handleProductSubmit = (payload) => {
    if (productoSeleccionado?.id) {
      updateProductMutation.mutate({
        id: productoSeleccionado.id,
        payload,
        currentRecipe: selectedProduct?.receta || [],
        currentPresentations: selectedProduct?.presentaciones || [],
      });
      return;
    }
    createProductMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      {vistaActual !== FABRICANTE_VISTAS.DASHBOARD && (
        <ModuleBackCard
          {...FABRICANTE_VIEW_META[vistaActual]}
          onBack={() => setVistaActual(FABRICANTE_VISTAS.DASHBOARD)}
        />
      )}

      {vistaActual === FABRICANTE_VISTAS.DASHBOARD && (
        <DashboardView
          stats={stats}
          lowStockIngredients={lowStockIngredients}
          products={products}
          onGoIngredients={() => setVistaActual(FABRICANTE_VISTAS.INGREDIENTES)}
          onGoProducts={() => setVistaActual(FABRICANTE_VISTAS.PRODUCTOS)}
          onCreateIngredient={() => openIngredientForm()}
          onCreateProduct={() => openProductForm()}
          onGoProduction={() => openProduction()}
        />
      )}

      {vistaActual === FABRICANTE_VISTAS.INGREDIENTES && (
        <div className="space-y-6">
          <InventarioIngredientes
            ingredients={ingredients}
            lowStockIngredients={lowStockIngredients}
            onAdjustStock={handleAdjustIngredientStock}
            onCreateIngredient={() => openIngredientForm()}
          />
          <IngredientesList
            ingredients={ingredients}
            filters={filtrosIngredientes}
            isLoading={ingredientesQuery.isLoading}
            onChangeFilters={setFiltrosIngredientes}
            onCreate={() => openIngredientForm()}
            onEdit={openIngredientForm}
            onDelete={handleDeleteIngredient}
            onAdjustStock={handleAdjustIngredientStock}
          />
        </div>
      )}

      {vistaActual === FABRICANTE_VISTAS.INGREDIENTE_FORM && (
        <IngredienteForm
          ingredient={ingredienteSeleccionado}
          isLoading={ingredientFormMutation.isPending}
          error={
            ingredientFormMutation.isError
              ? extractApiError(
                  ingredientFormMutation.error,
                  'No fue posible guardar el ingrediente.',
                )
              : null
          }
          onCancel={() => setVistaActual(FABRICANTE_VISTAS.INGREDIENTES)}
          onSubmit={handleIngredientSubmit}
        />
      )}

      {vistaActual === FABRICANTE_VISTAS.PRODUCTOS && (
        <ProductosView
          products={products}
          filters={filtrosProductos}
          isLoading={productosQuery.isLoading}
          onChangeFilters={setFiltrosProductos}
          onCreate={() => openProductForm()}
          onEdit={openProductForm}
          onDelete={handleDeleteProduct}
          onConvert={(product) => convertProductMutation.mutate(product.id)}
          onProduce={openProduction}
        />
      )}

      {vistaActual === FABRICANTE_VISTAS.PRODUCTO_FORM && (
        <ProductoFabricadoForm
          product={selectedProduct}
          ingredients={ingredients}
          defaultMargin={margenObjetivo}
          isLoading={productFormMutation.isPending}
          isLoadingProduct={productDetailQuery.isLoading}
          error={
            productFormMutation.isError
              ? extractApiError(
                  productFormMutation.error,
                  'No fue posible guardar el producto fabricado.',
                )
              : null
          }
          onCancel={() => setVistaActual(FABRICANTE_VISTAS.PRODUCTOS)}
          onSubmit={handleProductSubmit}
        />
      )}

      {vistaActual === FABRICANTE_VISTAS.PRODUCCION && (
        <ProduccionForm
          products={products}
          selectedProduct={selectedProduct}
          isSubmitting={produceMutation.isPending}
          isPackaging={packageMutation.isPending}
          error={
            produceMutation.isError || packageMutation.isError
              ? extractApiError(
                  produceMutation.error || packageMutation.error,
                  'No fue posible completar la operacion.',
                )
              : null
          }
          onCancel={() => setVistaActual(FABRICANTE_VISTAS.DASHBOARD)}
          onSubmit={(payload) => produceMutation.mutate(payload)}
          onPackage={(payload) => packageMutation.mutate(payload)}
        />
      )}

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}

function DashboardView({
  stats,
  lowStockIngredients,
  products,
  onGoIngredients,
  onGoProducts,
  onCreateIngredient,
  onCreateProduct,
  onGoProduction,
}) {
  return (
    <div className="space-y-6">
      <section className="surface p-3">
        <div className="grid gap-3 xl:grid-cols-[1.02fr_0.98fr]">
          <div>
            <div className="eyebrow">Modulo de fabricante</div>
            <h2 className="section-title mt-1 text-[1.8rem] leading-[0.98] sm:text-[2rem]">
              Control de recetas, costos y lotes.
            </h2>
            <p className="body-copy mt-2 max-w-xl text-[13px]">
              Revisa insumos, cobertura y fabricacion sin salir del tablero.
            </p>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              <HeroAction
                title="Ingredientes"
                subtitle="Stock y costos"
                icon={FlaskConical}
                onClick={onGoIngredients}
              />
              <HeroAction
                title="Nuevo producto"
                subtitle="Crear receta"
                icon={PackagePlus}
                onClick={onCreateProduct}
                active
              />
              <HeroAction
                title="Produccion"
                subtitle="Validar lotes"
                icon={Factory}
                onClick={onGoProduction}
              />
              <HeroAction
                title="Catalogo"
                subtitle="Ver fabricados"
                icon={Boxes}
                onClick={onGoProducts}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <DashboardMetric
              label="Ingredientes activos"
              value={stats.totalIngredients}
              helper="Materias primas listas."
            />
            <DashboardMetric
              label="Productos fabricados"
              value={stats.totalProducts}
              helper="Lotes configurados."
            />
            <DashboardMetric
              label="Bajo stock"
              value={stats.lowStockCount}
              helper="Reposicion sugerida."
              tone="warning"
            />
            <DashboardMetric
              label="Listos para producir"
              value={stats.readyProductsCount}
              helper="Cobertura disponible."
              tone="safe"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
        <section className="surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="eyebrow">Radar de reposicion</div>
              <h3 className="section-title mt-2">Ingredientes criticos</h3>
            </div>
            <button
              type="button"
              onClick={onCreateIngredient}
              className="app-button-secondary min-h-11"
            >
              Nuevo ingrediente
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {lowStockIngredients.length === 0 ? (
              <div className="empty-state min-h-[260px]">
                <Sparkles className="mb-3 h-10 w-10 text-[var(--accent)]" />
                <div className="text-base font-semibold text-main">
                  No hay alertas de reposicion.
                </div>
                <p className="body-copy mt-2 max-w-sm">
                  El inventario de ingredientes se ve sano para sostener la
                  manufactura inmediata.
                </p>
              </div>
            ) : (
              lowStockIngredients.slice(0, 5).map((ingredient) => (
                <div
                  key={ingredient.id}
                  className="rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-main">
                        {ingredient.nombre}
                      </div>
                      <div className="mt-1 text-[12px] text-[var(--warning-text)]">
                        {formatNumber(ingredient.stock_actual)}{' '}
                        {unitLabel(ingredient.unidad_medida)} disponibles -
                        minimo {formatNumber(ingredient.stock_minimo)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onGoIngredients}
                      className="app-button-secondary min-h-10"
                    >
                      Ver inventario
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="eyebrow">Catalogo de lotes</div>
              <h3 className="section-title mt-2">Productos fabricados</h3>
            </div>
            <button
              type="button"
              onClick={onGoProducts}
              className="app-button-secondary min-h-11"
            >
              Ver catalogo
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {products.length === 0 ? (
              <div className="empty-state min-h-[260px]">
                <Boxes className="mb-3 h-10 w-10 text-[var(--accent)]" />
                <div className="text-base font-semibold text-main">
                  Aun no hay productos fabricados.
                </div>
                <p className="body-copy mt-2 max-w-sm">
                  Crea el primer producto, define la receta y activa la
                  calculadora de costos.
                </p>
              </div>
            ) : (
              products.slice(0, 5).map((product) => {
                const tone = getProductStatusTone(product);

                return (
                  <article
                    key={product.id}
                    className="rounded-xl border border-app bg-white/72 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-main">
                          {product.nombre}
                        </div>
                        <div className="mt-1 text-[12px] text-soft">
                          {product.receta_count} ingredientes - costo unitario{' '}
                          {formatCostNote(product.costo_unitario)}
                        </div>
                      </div>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${tone.className}`}
                      >
                        {tone.label}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ProductosView({
  products,
  filters,
  isLoading,
  onChangeFilters,
  onCreate,
  onEdit,
  onDelete,
  onConvert,
  onProduce,
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
    <div className="space-y-6">
      <section className="surface p-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow">Catalogo de fabricacion</div>
            <p className="body-copy mt-1 max-w-2xl">
              Revisa lotes, costo unitario y acciones de produccion o paso a
              inventario.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCreate}
              className="app-button-primary min-h-11"
            >
              <PackagePlus className="h-4 w-4" />
              Nuevo producto
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_200px_210px]">
          <label className="app-field">
            <span className="app-field-label">Buscar producto</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Nombre o descripcion"
                className="app-input min-h-11 pl-10"
              />
            </div>
          </label>

          <label className="app-field">
            <span className="app-field-label">Vinculo inventario</span>
            <select
              value={filters.con_producto_final}
              onChange={(event) =>
                onChangeFilters((current) => ({
                  ...current,
                  con_producto_final: event.target.value,
                }))
              }
              className="app-select min-h-11"
            >
              <option value="">Todos</option>
              <option value="true">Vinculados</option>
              <option value="false">Sin vincular</option>
            </select>
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
              <option value="-costo_unitario">Mayor costo unitario</option>
              <option value="costo_unitario">Menor costo unitario</option>
              <option value="-precio_venta">Mayor precio venta</option>
              <option value="precio_venta">Menor precio venta</option>
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {isLoading ? (
          <div className="surface col-span-full p-10 text-center text-soft">
            Cargando productos fabricados...
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state col-span-full min-h-[320px]">
            <Boxes className="mb-3 h-10 w-10 text-[var(--accent)]" />
            <div className="text-base font-semibold text-main">
              No hay productos para los filtros actuales.
            </div>
            <p className="body-copy mt-2 max-w-sm">
              Crea un producto nuevo o ajusta el filtro de vinculo e inventario.
            </p>
          </div>
        ) : (
          products.map((product) => {
            const tone = getProductStatusTone(product);
            const presentationSummary =
              buildPresentationPerformanceSummary(product);

            return (
              <article
                key={product.id}
                className="surface p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent-line)]"
              >
                <div className="flex flex-col gap-3 border-b border-app pb-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-[14px] font-semibold text-main">
                      {product.nombre}
                    </div>
                    <div className="mt-1 line-clamp-2 text-[12px] text-soft">
                      {product.descripcion}
                    </div>
                    <div className="mt-2 text-[11px] text-muted">
                      {product.receta_count || 0} ingrediente
                      {Number(product.receta_count || 0) !== 1 ? 's' : ''} en
                      receta · {product.presentaciones_count || 0}{' '}
                      presentacion
                      {Number(product.presentaciones_count || 0) !== 1
                        ? 'es'
                        : ''}
                    </div>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${tone.className}`}
                  >
                    {tone.label}
                  </span>
                </div>

                <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  <SmallMetric
                    label="Lote"
                    value={`${formatNumber(product.cantidad_producida)} ${unitLabel(product.unidad_medida)}`}
                  />
                  <SmallMetric
                    label="Stock fabricado"
                    value={`${formatNumber(product.stock_fabricado_disponible)} ${unitLabel(product.unidad_medida)}`}
                  />
                  <SmallMetric
                    label="Costo produccion"
                    value={formatCostNote(product.costo_produccion)}
                  />
                  <SmallMetric
                    label="Costo unitario"
                    value={formatCostNote(product.costo_unitario)}
                  />
                  <SmallMetric
                    label="Precio por unidad vendida"
                    value={formatCostNote(product.precio_venta)}
                  />
                  <SmallMetric
                    label="Margen actual"
                    value={formatCostNote(product.margen_utilidad)}
                  />
                  <SmallMetric
                    label="Rentabilidad"
                    value={`${formatNumber(product.porcentaje_utilidad || 0, 2)} %`}
                  />
                </div>

                {presentationSummary.length > 0 && (
                  <div className="mt-3.5 rounded-xl border border-app bg-[var(--panel-soft)] p-3">
                    <div className="flex flex-col gap-2 border-b border-app pb-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="eyebrow">Utilidad por presentacion</div>
                        <div className="mt-1 text-[12px] text-soft">
                          Lectura directa de ganancia neta y rentabilidad por
                          empaque.
                        </div>
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                        {presentationSummary.length} salida
                        {presentationSummary.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="mt-3 space-y-2.5">
                      {presentationSummary.map((presentation) => (
                        <article
                          key={presentation.id}
                          className="rounded-xl border border-app bg-white/78 px-3.5 py-3"
                        >
                          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <div className="truncate text-[12px] font-semibold uppercase tracking-[0.04em] text-main">
                                {presentation.displayName}
                              </div>
                              <div className="mt-1 text-[11px] text-soft">
                                Precio {formatCostNote(presentation.price)} ·
                                costo {formatCostNote(presentation.unitCost)}
                              </div>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                              <ProfitBadge
                                label="Ganancia neta"
                                value={formatCostNote(presentation.netMargin)}
                              />
                              <ProfitBadge
                                label="Utilidad"
                                value={`${formatNumber(
                                  presentation.profitability,
                                  2,
                                )} %`}
                              />
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  <ProductAction
                    label="Editar"
                    icon={Wrench}
                    onClick={() => onEdit(product)}
                  />
                  <ProductAction
                    label="Producir"
                    icon={Factory}
                    onClick={() => onProduce(product)}
                  />
                  <ProductAction
                    label="Inventario"
                    icon={Sparkles}
                    onClick={() => onConvert(product)}
                  />
                  <ProductAction
                    label="Eliminar"
                    icon={Trash2}
                    onClick={() => onDelete(product)}
                    danger
                  />
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

function HeroAction({ title, subtitle, icon: Icon, onClick, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tab-card min-h-[68px] px-3 py-2.5 text-left ${
        active ? 'tab-card-active' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <Icon
          className={`h-3.5 w-3.5 ${
            active ? 'text-[var(--accent)]' : 'text-soft'
          }`}
        />
        <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-muted">
          Flujo
        </span>
      </div>
      <div className="mt-2.5 font-display text-[1.15rem] leading-none text-main">
        {title}
      </div>
      <div className="mt-1.5 text-[11px] text-soft">{subtitle}</div>
    </button>
  );
}

function DashboardMetric({ label, value, helper, tone = 'neutral' }) {
  const toneClass =
    tone === 'warning'
      ? 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)]'
      : tone === 'safe'
        ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
        : 'border-app bg-white/74';

  return (
    <article className={`rounded-xl border px-4 py-4 ${toneClass}`}>
      <div className="eyebrow">{label}</div>
      <div className="mt-3 font-display text-[2rem] leading-none text-main">
        {value}
      </div>
      <div className="mt-2 text-[12px] text-soft">{helper}</div>
    </article>
  );
}

function SmallMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-app bg-white/72 px-3.5 py-3">
      <div className="eyebrow">{label}</div>
      <div className="mt-2 text-[13px] font-semibold text-main">{value}</div>
    </div>
  );
}

function ProfitBadge({ label, value }) {
  return (
    <div className="rounded-lg border border-[var(--accent-line)] bg-[var(--accent-soft)] px-3 py-2.5">
      <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
        {label}
      </div>
      <div className="mt-1 text-[12px] font-semibold text-main">{value}</div>
    </div>
  );
}

function ProductAction({ label, icon: Icon, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 py-2 text-[11px] font-semibold transition ${
        danger
          ? 'text-[var(--danger-text)] hover:bg-[var(--danger-soft)]'
          : 'text-soft hover:bg-white hover:text-main'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function ModuleBackCard({ eyebrow, title, description, onBack }) {
  return (
    <section className="surface p-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <div className="mt-1 text-sm font-semibold text-main">{title}</div>
          <div className="mt-1 text-[12px] text-soft">{description}</div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="app-button-secondary min-h-10"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a fabricante
        </button>
      </div>
    </section>
  );
}
