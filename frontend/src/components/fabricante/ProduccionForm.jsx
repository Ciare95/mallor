import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Factory,
  Loader2,
  PackageOpen,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import { obtenerProductoFabricado } from '../../services/fabricante.service';
import {
  buildPackagingProjection,
  buildProductionProjection,
  normalizeIntegerInput,
  safeNumber,
  unitLabel,
} from '../../utils/fabricante';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export default function ProduccionForm({
  products,
  selectedProduct,
  isSubmitting,
  isPackaging,
  error,
  onCancel,
  onSubmit,
  onPackage,
}) {
  const [productId, setProductId] = useState(selectedProduct?.id || '');
  const [lots, setLots] = useState('1');
  const [ensureInventoryLink, setEnsureInventoryLink] = useState(true);
  const [presentationId, setPresentationId] = useState('');
  const [packageUnits, setPackageUnits] = useState('1');

  useEffect(() => {
    if (selectedProduct?.id) {
      setProductId(selectedProduct.id);
      return;
    }

    if (!productId && products.length > 0) {
      setProductId(products[0].id);
    }
  }, [productId, products, selectedProduct]);

  const productQuery = useQuery({
    queryKey: ['fabricante', 'producto', productId],
    queryFn: () => obtenerProductoFabricado(productId),
    enabled: Boolean(productId),
  });

  const product = productQuery.data;
  const selectedPresentation = product?.presentaciones?.find(
    (item) => String(item.id) === String(presentationId),
  );
  const projection = product
    ? buildProductionProjection(product, lots)
    : {
        items: [],
        productionCost: 0,
        totalProduced: 0,
        allIngredientsAvailable: false,
        missingIngredients: [],
      };
  const packagingProjection = buildPackagingProjection(
    product,
    selectedPresentation,
    packageUnits,
  );

  const canProduce =
    Boolean(product) &&
    safeNumber(lots) > 0 &&
    projection.items.length > 0 &&
    projection.allIngredientsAvailable;

  const canPackage =
    Boolean(product) &&
    Boolean(selectedPresentation) &&
    safeNumber(packageUnits) > 0 &&
    packagingProjection.compatible &&
    packagingProjection.totalConsumed > 0 &&
    packagingProjection.remainingStock >= 0;

  useEffect(() => {
    if (!product?.presentaciones?.length) {
      setPresentationId('');
      return;
    }

    if (
      !presentationId ||
      !product.presentaciones.some(
        (item) => String(item.id) === String(presentationId),
      )
    ) {
      setPresentationId(String(product.presentaciones[0].id));
    }
  }, [presentationId, product]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!product || !canProduce) {
      return;
    }

    onSubmit({
      product,
      productId: product.id,
      lots,
      ensureInventoryLink,
    });
  };

  const handlePackage = (event) => {
    event.preventDefault();
    if (!product || !selectedPresentation || !canPackage) {
      return;
    }

    onPackage({
      productId: product.id,
      presentationId: selectedPresentation.id,
      payload: {
        cantidad_unidades: packageUnits,
      },
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
      <section className="surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-app pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="eyebrow">Orden de produccion</div>
            <h2 className="section-title mt-2">Fabricar lote</h2>
            <p className="body-copy mt-2 max-w-2xl">
              Selecciona el producto, valida cobertura de ingredientes y decide
              si el resultado debe vincularse al inventario general antes de
              producir.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="app-button-secondary min-h-11"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <label className="app-field">
            <span className="app-field-label">Producto fabricado</span>
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="app-select min-h-11"
            >
              <option value="">Selecciona un producto</option>
              {products.map((productOption) => (
                <option key={productOption.id} value={productOption.id}>
                  {productOption.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="app-field">
            <span className="app-field-label">Cantidad de lotes</span>
            <input
              type="number"
              min="1"
              step="1"
              value={lots}
              onChange={(event) => setLots(event.target.value)}
              onBlur={(event) =>
                setLots(
                  normalizeIntegerInput(event.target.value, {
                    fallback: '1',
                    min: 1,
                  }),
                )
              }
              className="app-input min-h-11"
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-app bg-white/72 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-main">
                Pasar a inventario general
              </div>
              <div className="mt-1 text-[12px] text-soft">
                Si el producto no esta vinculado a inventario, se creara o
                sincronizara antes de producir.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEnsureInventoryLink((current) => !current)}
              className={`inline-flex h-7 w-14 items-center rounded-full border px-1 transition ${
                ensureInventoryLink
                  ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
                  : 'border-app bg-[var(--panel-soft)]'
              }`}
              aria-pressed={ensureInventoryLink}
            >
              <span
                className={`h-5 w-5 rounded-full bg-[var(--text-main)] transition ${
                  ensureInventoryLink ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </label>

          {error && (
            <div className="rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-text)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !canProduce}
            className="app-button-primary min-h-11 w-full"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Factory className="h-4 w-4" />
            )}
            Confirmar produccion
          </button>
        </form>
      </section>

      <section className="surface p-5 sm:p-6">
        {productQuery.isLoading ? (
          <div className="flex min-h-[360px] items-center justify-center text-soft">
            <Loader2 className="mr-3 h-5 w-5 animate-spin text-[var(--accent)]" />
            Cargando receta del producto...
          </div>
        ) : !product ? (
          <div className="empty-state min-h-[360px]">
            <PackageCheck className="mb-3 h-10 w-10 text-[var(--accent)]" />
            <div className="text-base font-semibold text-main">
              Selecciona un producto para revisar la produccion.
            </div>
            <p className="body-copy mt-2 max-w-sm">
              La verificacion de ingredientes, lotes y conversiones aparece
              aqui antes de confirmar el consumo real.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex flex-col gap-4 border-b border-app pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="eyebrow">Simulacion</div>
                <h3 className="section-title mt-2">{product.nombre}</h3>
                <p className="body-copy mt-2 max-w-2xl">
                  {product.descripcion}
                </p>
              </div>

              <div
                className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                  projection.allIngredientsAvailable
                    ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] text-[var(--warning-text)]'
                }`}
              >
                {projection.allIngredientsAvailable
                  ? 'Produccion lista'
                  : 'Faltan ingredientes'}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Lotes"
                value={formatNumber(lots)}
                helper="Cantidad solicitada."
              />
              <Metric
                label="Salida total"
                value={`${formatNumber(projection.totalProduced)} ${unitLabel(product.unidad_medida)}`}
                helper="Producto terminado esperado."
              />
              <Metric
                label="Costo total"
                value={formatCurrency(projection.productionCost)}
                helper="Consumo estimado del pedido."
              />
              <Metric
                label="Inventario"
                value={product.producto_final ? 'Vinculado' : 'Sin vincular'}
                helper={
                  product.producto_final
                    ? 'Ya actualiza existencias generales.'
                    : 'Puede vincularse antes de producir.'
                }
              />
              <Metric
                label="Stock fabricado"
                value={`${formatNumber(product.stock_fabricado_disponible)} ${unitLabel(product.unidad_medida)}`}
                helper="Disponible para empaque."
              />
            </div>

            {!projection.allIngredientsAvailable && (
              <div className="mt-5 rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-text)]">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div>
                    La produccion no puede confirmarse hasta reponer los
                    ingredientes faltantes.
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {projection.items.map((item) => (
                <article
                  key={item.ingrediente_id}
                  className="rounded-xl border border-app bg-white/76 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-main">
                        {item.ingredient.nombre}
                      </div>
                      <div className="mt-2 text-[12px] text-soft">
                        Requiere {formatNumber(item.convertedLotNeed)}{' '}
                        {unitLabel(item.ingredient.unidad_medida)} para{' '}
                        {formatNumber(lots)} lote(s)
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        Disponible {formatNumber(item.stockAvailable)}{' '}
                        {unitLabel(item.ingredient.unidad_medida)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-main">
                        {formatCurrency(item.totalIngredientCost)}
                      </div>
                      <div className="mt-1 text-[12px] text-soft">
                        costo consumido
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-app bg-[var(--panel-soft)] px-4 py-4 text-[12px] text-soft">
              <div className="mb-2 flex items-center gap-2 text-main">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                Validaciones incluidas
              </div>
              <ul className="space-y-2">
                <li>Conversion automatica de unidades por ingrediente.</li>
                <li>Descuento de stock con base en la unidad del inventario.</li>
                <li>
                  Vinculo opcional con inventario general antes de producir.
                </li>
              </ul>
            </div>

            <form
              className="mt-5 rounded-xl border border-app bg-white/76 p-4"
              onSubmit={handlePackage}
            >
              <div className="flex flex-col gap-4 border-b border-app pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="eyebrow">Empaque</div>
                  <div className="mt-2 text-sm font-semibold text-main">
                    Distribuye el lote fabricado en varias presentaciones.
                  </div>
                </div>
                <div className="text-[12px] text-soft">
                  {product.presentaciones?.length || 0} presentacion
                  {Number(product.presentaciones?.length || 0) !== 1
                    ? 'es'
                    : ''}{' '}
                  configurada
                  {Number(product.presentaciones?.length || 0) !== 1
                    ? 's'
                    : ''}
                </div>
              </div>

              {!product.presentaciones?.length ? (
                <div className="mt-4 rounded-xl border border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning-text)]">
                  Agrega presentaciones al producto para poder empaquetar el
                  stock fabricado.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="app-field">
                      <span className="app-field-label">Presentacion</span>
                      <select
                        value={presentationId}
                        onChange={(event) => setPresentationId(event.target.value)}
                        className="app-select min-h-11"
                      >
                        {product.presentaciones.map((presentation) => (
                          <option key={presentation.id} value={presentation.id}>
                            {presentation.nombre}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="app-field">
                      <span className="app-field-label">
                        Cantidad a empacar
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={packageUnits}
                        onChange={(event) => setPackageUnits(event.target.value)}
                        onBlur={(event) =>
                          setPackageUnits(
                            normalizeIntegerInput(event.target.value, {
                              fallback: '1',
                              min: 1,
                            }),
                          )
                        }
                        className="app-input min-h-11"
                      />
                    </label>
                  </div>

                  {selectedPresentation && (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <Metric
                        label="Formato"
                        value={`${formatNumber(selectedPresentation.cantidad_por_unidad)} ${unitLabel(selectedPresentation.unidad_medida)}`}
                        helper="Contenido por unidad."
                      />
                      <Metric
                        label="Consumo lote"
                        value={`${formatNumber(packagingProjection.totalConsumed)} ${unitLabel(product.unidad_medida)}`}
                        helper="Stock fabricado que se descontara."
                      />
                      <Metric
                        label="Saldo restante"
                        value={`${formatNumber(packagingProjection.remainingStock)} ${unitLabel(product.unidad_medida)}`}
                        helper="Queda luego del empaque."
                      />
                      <Metric
                        label="Precio venta"
                        value={formatCurrency(selectedPresentation.precio_venta)}
                        helper="Precio por unidad vendible."
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isPackaging || !canPackage}
                    className="app-button-primary min-h-11 w-full"
                  >
                    {isPackaging ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PackageOpen className="h-4 w-4" />
                    )}
                    Confirmar empaque
                  </button>
                </div>
              )}
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, helper }) {
  return (
    <div className="rounded-xl border border-app bg-white/72 px-4 py-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-2 text-sm font-semibold text-main">{value}</div>
      <div className="mt-2 text-[12px] text-soft">{helper}</div>
    </div>
  );
}
