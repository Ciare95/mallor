import { formatCurrency, formatNumber } from './formatters';

export const FABRICANTE_UNIT_OPTIONS = [
  ['Garrafas', 'GARRAFAS'],
  ['Galones', 'GALONES'],
  ['Litros', 'LITROS'],
  ['Mililitros', 'MILILITROS'],
  ['Onzas liquidas', 'ONZAS_LIQUIDAS'],
  ['Kilogramos', 'KILOGRAMOS'],
  ['Gramos', 'GRAMOS'],
  ['Libras', 'LIBRAS'],
  ['Onzas', 'ONZAS'],
  ['Unidades', 'UNIDADES'],
];

const UNIT_TEXT = {
  GARRAFAS: { singular: 'garrafa', plural: 'garrafas' },
  GALONES: { singular: 'galon', plural: 'galones' },
  LITROS: { singular: 'litro', plural: 'litros' },
  MILILITROS: { singular: 'mililitro', plural: 'mililitros' },
  ONZAS_LIQUIDAS: { singular: 'onza liquida', plural: 'onzas liquidas' },
  KILOGRAMOS: { singular: 'kilogramo', plural: 'kilogramos' },
  GRAMOS: { singular: 'gramo', plural: 'gramos' },
  LIBRAS: { singular: 'libra', plural: 'libras' },
  ONZAS: { singular: 'onza', plural: 'onzas' },
  UNIDADES: { singular: 'unidad', plural: 'unidades' },
};

const UNIT_CATEGORY = {
  GARRAFAS: 'volumen',
  GALONES: 'volumen',
  LITROS: 'volumen',
  MILILITROS: 'volumen',
  ONZAS_LIQUIDAS: 'volumen',
  KILOGRAMOS: 'masa',
  GRAMOS: 'masa',
  LIBRAS: 'masa',
  ONZAS: 'masa',
  UNIDADES: 'conteo',
};

const LIQUID_EQUIVALENT_CATEGORIES = new Set(['volumen', 'masa']);

const UNIT_TO_BASE = {
  GARRAFAS: 18.927059,
  GALONES: 3.7854,
  LITROS: 1,
  MILILITROS: 0.001,
  ONZAS_LIQUIDAS: 0.0295735,
  KILOGRAMOS: 1,
  GRAMOS: 0.001,
  LIBRAS: 0.453592,
  ONZAS: 0.0283495,
  UNIDADES: 1,
};

export const getResults = (data) => data?.results || data || [];

const asArray = (value) => (Array.isArray(value) ? value : []);

export const safeNumber = (value = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const roundNumber = (value, digits = 4) => {
  const factor = 10 ** digits;
  return Math.round(safeNumber(value) * factor) / factor;
};

const INTERMEDIATE_NUMBER_VALUES = new Set(['', '-', '.', '-.', ',']);

const stripTrailingZeros = (value) =>
  value.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');

export const normalizeDecimalInput = (
  value,
  {
    digits = 4,
    fallback = '',
    min = null,
    max = null,
  } = {},
) => {
  const raw = String(value ?? '').trim().replace(',', '.');
  if (INTERMEDIATE_NUMBER_VALUES.has(raw)) {
    return fallback;
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  let nextValue = roundNumber(numeric, digits);

  if (min !== null) {
    nextValue = Math.max(nextValue, min);
  }

  if (max !== null) {
    nextValue = Math.min(nextValue, max);
  }

  return stripTrailingZeros(nextValue.toFixed(digits));
};

export const normalizeIntegerInput = (
  value,
  {
    fallback = '',
    min = null,
    max = null,
  } = {},
) => {
  const raw = String(value ?? '').trim().replace(',', '.');
  if (INTERMEDIATE_NUMBER_VALUES.has(raw)) {
    return fallback;
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  let nextValue = Math.round(numeric);

  if (min !== null) {
    nextValue = Math.max(nextValue, min);
  }

  if (max !== null) {
    nextValue = Math.min(nextValue, max);
  }

  return String(nextValue);
};

export const unitLabel = (value) =>
  FABRICANTE_UNIT_OPTIONS.find(([, unit]) => unit === value)?.[0] || value;

export const formatUnitQuantityLabel = (quantity, unit) => {
  const normalizedQuantity = safeNumber(quantity);
  const names = UNIT_TEXT[unit];

  if (!names) {
    return `${formatNumber(normalizedQuantity)} ${String(unit || '').toLowerCase()}`;
  }

  const variant = Math.abs(normalizedQuantity) === 1
    ? names.singular
    : names.plural;

  return `${formatNumber(normalizedQuantity)} ${variant}`;
};

export const isUnitCompatible = (unitA, unitB) =>
  (() => {
    const categoryA = UNIT_CATEGORY[unitA];
    const categoryB = UNIT_CATEGORY[unitB];

    if (!categoryA || !categoryB) {
      return false;
    }

    if (
      LIQUID_EQUIVALENT_CATEGORIES.has(categoryA) &&
      LIQUID_EQUIVALENT_CATEGORIES.has(categoryB)
    ) {
      return true;
    }

    return categoryA === categoryB;
  })();

export const convertUnit = (amount, originUnit, targetUnit) => {
  if (!originUnit || !targetUnit) {
    return safeNumber(amount);
  }

  if (originUnit === targetUnit) {
    return roundNumber(amount);
  }

  const originFactor = UNIT_TO_BASE[originUnit];
  const targetFactor = UNIT_TO_BASE[targetUnit];
  if (!isUnitCompatible(originUnit, targetUnit) || !originFactor || !targetFactor) {
    return roundNumber(amount);
  }

  return roundNumber((safeNumber(amount) * originFactor) / targetFactor);
};

export const calculateCostPerUnitInTarget = (
  sourceCost,
  sourceUnit,
  targetUnit,
) => {
  if (!sourceUnit || !targetUnit) {
    return safeNumber(sourceCost);
  }

  if (sourceUnit === targetUnit) {
    return roundNumber(sourceCost);
  }

  const quantityInTarget = convertUnit(1, sourceUnit, targetUnit);
  if (quantityInTarget <= 0) {
    return roundNumber(sourceCost);
  }

  return roundNumber(safeNumber(sourceCost) / quantityInTarget);
};

export const createIngredientFormState = (ingredient) => ({
  nombre: ingredient?.nombre || '',
  descripcion: ingredient?.descripcion || '',
  unidad_medida: ingredient?.unidad_medida || 'GRAMOS',
  precio_por_unidad:
    ingredient?.precio_por_unidad !== undefined
      ? String(ingredient.precio_por_unidad)
      : '',
  proveedor_id:
    ingredient?.proveedor?.id ||
    ingredient?.proveedor_id ||
    ingredient?.proveedor ||
    '',
  stock_actual:
    ingredient?.stock_actual !== undefined
      ? String(ingredient.stock_actual)
      : '0',
  stock_minimo:
    ingredient?.stock_minimo !== undefined
      ? String(ingredient.stock_minimo)
      : '0',
});

export const createRecipeDraft = (ingredient) => ({
  ingrediente_id: ingredient?.id || '',
  cantidad_necesaria: '',
  unidad_medida: ingredient?.unidad_medida || 'GRAMOS',
});

export const createProductFabricadoFormState = (product) => ({
  nombre: product?.nombre || '',
  descripcion: product?.descripcion || '',
  unidad_medida: product?.unidad_medida || 'UNIDADES',
  cantidad_producida:
    product?.cantidad_producida !== undefined
      ? String(product.cantidad_producida)
      : '',
  precio_venta:
    product?.precio_venta !== undefined ? String(product.precio_venta) : '',
  tiempo_produccion:
    product?.tiempo_produccion !== undefined
      ? String(product.tiempo_produccion)
      : '0',
});

export const createPresentationDraft = (product) => ({
  id: product?.id || null,
  local_id: product?.local_id || `presentation-${Date.now()}`,
  nombre: product?.nombre || '',
  cantidad_por_unidad:
    product?.cantidad_por_unidad !== undefined
      ? String(product.cantidad_por_unidad)
      : '1',
  unidad_medida: product?.unidad_medida || 'UNIDADES',
  precio_venta:
    product?.precio_venta !== undefined ? String(product.precio_venta) : '',
  precio_venta_sugerido:
    product?.precio_venta_sugerido !== undefined
      ? String(product.precio_venta_sugerido)
      : '',
  producto_inventario: product?.producto_inventario || null,
  producto_inventario_detalle: product?.producto_inventario_detalle || null,
});

export const mapRecipeItem = (item) => ({
  local_id:
    item?.local_id ||
    `recipe-${item?.ingrediente_id || item?.ingrediente?.id || Date.now()}`,
  ingrediente_id: item?.ingrediente_id || item?.ingrediente?.id,
  ingrediente: item?.ingrediente || null,
  cantidad_necesaria:
    item?.cantidad_necesaria !== undefined
      ? String(item.cantidad_necesaria)
      : '',
  unidad_medida: item?.unidad_medida || item?.ingrediente?.unidad_medida,
  costo_ingrediente: item?.costo_ingrediente,
});

export const mapPresentationItem = (item) => ({
  id: item?.id || null,
  local_id: item?.local_id || `presentation-${item?.id || Date.now()}`,
  nombre: item?.nombre || '',
  cantidad_por_unidad:
    item?.cantidad_por_unidad !== undefined
      ? String(item.cantidad_por_unidad)
      : '1',
  unidad_medida: item?.unidad_medida || 'UNIDADES',
  precio_venta:
    item?.precio_venta !== undefined ? String(item.precio_venta) : '',
  precio_venta_sugerido:
    item?.precio_venta_sugerido !== undefined
      ? String(item.precio_venta_sugerido)
      : '',
  costo_unitario_presentacion: item?.costo_unitario_presentacion,
  margen_utilidad: item?.margen_utilidad,
  porcentaje_utilidad: item?.porcentaje_utilidad,
  producto_inventario: item?.producto_inventario || null,
  producto_inventario_detalle: item?.producto_inventario_detalle || null,
});

export const buildPresentationMetrics = ({
  productUnitMeasure,
  productUnitCost,
  quantityPerUnit,
  presentationUnitMeasure,
  price = 0,
  marginTarget = 45,
}) => {
  const normalizedQuantity = Math.max(safeNumber(quantityPerUnit), 0);
  const normalizedCost = Math.max(safeNumber(productUnitCost), 0);
  const normalizedPrice = Math.max(safeNumber(price), 0);
  const compatible = isUnitCompatible(
    productUnitMeasure,
    presentationUnitMeasure,
  );
  const quantityInLotUnit =
    compatible && normalizedQuantity > 0
      ? convertUnit(
          normalizedQuantity,
          presentationUnitMeasure,
          productUnitMeasure,
        )
      : 0;
  const unitCost = roundNumber(quantityInLotUnit * normalizedCost, 4);
  const suggestedPrice = roundNumber(
    unitCost * (1 + safeNumber(marginTarget) / 100),
    2,
  );
  const margin = roundNumber(normalizedPrice - unitCost, 4);
  const profitability =
    unitCost > 0 ? roundNumber((margin / unitCost) * 100, 2) : 0;

  return {
    compatible,
    quantityInLotUnit,
    unitCost,
    suggestedPrice,
    margin,
    profitability,
  };
};

export const buildRecipeMetrics = ({
  recipeItems = [],
  cantidadProducida = 0,
  precioVenta = 0,
  margenObjetivo = 45,
  lotes = 1,
  saleUnitAmount = 1,
  saleUnitMeasure = null,
  productionUnitMeasure = null,
}) => {
  const normalizedQuantity = Math.max(safeNumber(cantidadProducida), 0);
  const normalizedLots = Math.max(safeNumber(lotes), 0);
  const normalizedPrice = Math.max(safeNumber(precioVenta), 0);
  const normalizedMargin = Math.max(safeNumber(margenObjetivo), 0);
  const normalizedSaleUnitAmount = Math.max(safeNumber(saleUnitAmount), 0);

  const items = recipeItems
    .map((item) => {
      const ingredient = item.ingrediente;
      if (!ingredient) {
        return null;
      }

      const amountNeeded = safeNumber(item.cantidad_necesaria);
      const convertedStockNeed = convertUnit(
        amountNeeded,
        item.unidad_medida,
        ingredient.unidad_medida,
      );
      const convertedLotNeed = roundNumber(convertedStockNeed * normalizedLots);
      const costPerTargetUnit = calculateCostPerUnitInTarget(
        ingredient.precio_por_unidad,
        ingredient.unidad_medida,
        item.unidad_medida,
      );
      const ingredientCost = roundNumber(amountNeeded * costPerTargetUnit);
      const totalIngredientCost = roundNumber(ingredientCost * normalizedLots);
      const stockAvailable = safeNumber(ingredient.stock_actual);
      const remainingAfterProduction = roundNumber(
        stockAvailable - convertedLotNeed,
      );

      return {
        ...item,
        ingrediente_id: item.ingrediente_id || ingredient.id,
        ingredient,
        amountNeeded,
        convertedStockNeed,
        convertedLotNeed,
        costPerTargetUnit,
        ingredientCost,
        totalIngredientCost,
        stockAvailable,
        isAvailable: stockAvailable >= convertedLotNeed,
        remainingAfterProduction,
        conversionLabel:
          item.unidad_medida !== ingredient.unidad_medida
            ? `${formatNumber(amountNeeded)} ${unitLabel(item.unidad_medida)} = ${formatNumber(convertedStockNeed)} ${unitLabel(ingredient.unidad_medida)}`
            : null,
      };
    })
    .filter(Boolean);

  const productionCost = roundNumber(
    items.reduce((total, item) => total + item.totalIngredientCost, 0),
  );
  const unitCost =
    normalizedQuantity > 0
      ? roundNumber(productionCost / normalizedQuantity)
      : 0;
  const normalizedSaleUnitMeasure =
    saleUnitMeasure || productionUnitMeasure || null;
  const saleMeasureCompatible =
    !productionUnitMeasure ||
    !normalizedSaleUnitMeasure ||
    isUnitCompatible(productionUnitMeasure, normalizedSaleUnitMeasure);
  const totalBatchInSaleMeasure =
    normalizedSaleUnitMeasure && saleMeasureCompatible
      ? convertUnit(
          normalizedQuantity,
          productionUnitMeasure,
          normalizedSaleUnitMeasure,
        )
      : saleMeasureCompatible
        ? normalizedQuantity
        : 0;
  const saleUnitsCount =
    normalizedSaleUnitAmount > 0
      ? roundNumber(totalBatchInSaleMeasure / normalizedSaleUnitAmount, 4)
      : 0;
  const costPerSaleUnit =
    saleUnitsCount > 0 ? roundNumber(productionCost / saleUnitsCount, 4) : 0;
  const suggestedPrice = roundNumber(
    costPerSaleUnit * (1 + normalizedMargin / 100),
    2,
  );
  const utilityMargin = roundNumber(normalizedPrice - costPerSaleUnit, 4);
  const profitability =
    costPerSaleUnit > 0
      ? roundNumber((utilityMargin / costPerSaleUnit) * 100, 2)
      : 0;

  const composition = items.map((item) => ({
    ...item,
    share:
      productionCost > 0
        ? roundNumber((item.totalIngredientCost / productionCost) * 100, 2)
        : 0,
  }));

  return {
    items,
    composition,
    productionCost,
    unitCost,
    totalBatchInSaleMeasure,
    saleUnitAmount: normalizedSaleUnitAmount,
    saleUnitMeasure: normalizedSaleUnitMeasure,
    saleMeasureCompatible,
    saleUnitsCount,
    costPerSaleUnit,
    suggestedPrice,
    utilityMargin,
    profitability,
    allIngredientsAvailable: items.every((item) => item.isAvailable),
    missingIngredients: items.filter((item) => !item.isAvailable),
    totalProduced: roundNumber(normalizedQuantity * normalizedLots),
  };
};

export const buildProductionProjection = (product, lotes = 1) =>
  buildRecipeMetrics({
    recipeItems: product?.receta || [],
    cantidadProducida: product?.cantidad_producida,
    precioVenta: product?.precio_venta || product?.precio_venta_sugerido,
    margenObjetivo: product?.porcentaje_utilidad || 45,
    lotes,
    saleUnitAmount: 1,
    saleUnitMeasure: product?.unidad_medida,
    productionUnitMeasure: product?.unidad_medida,
  });

export const buildPackagingProjection = (
  product,
  presentation,
  units = 1,
) => {
  if (!product || !presentation) {
    return {
      quantityInLotUnit: 0,
      totalConsumed: 0,
      remainingStock: safeNumber(product?.stock_fabricado_disponible),
      compatible: false,
    };
  }

  const presentationMetrics = buildPresentationMetrics({
    productUnitMeasure: product.unidad_medida,
    productUnitCost: product.costo_unitario,
    quantityPerUnit: presentation.cantidad_por_unidad,
    presentationUnitMeasure: presentation.unidad_medida,
    price: presentation.precio_venta,
  });
  const totalConsumed = roundNumber(
    presentationMetrics.quantityInLotUnit * safeNumber(units),
    4,
  );

  return {
    ...presentationMetrics,
    totalConsumed,
    remainingStock: roundNumber(
      safeNumber(product.stock_fabricado_disponible) - totalConsumed,
      4,
    ),
  };
};

export const buildPresentationPerformanceSummary = (product) =>
  asArray(product?.presentaciones).map((presentation) => {
    const metrics = buildPresentationMetrics({
      productUnitMeasure: product?.unidad_medida,
      productUnitCost: product?.costo_unitario,
      quantityPerUnit: presentation?.cantidad_por_unidad,
      presentationUnitMeasure: presentation?.unidad_medida,
      price: presentation?.precio_venta,
    });

    return {
      id: presentation?.id || presentation?.local_id,
      displayName: `${product?.nombre || presentation?.nombre || 'Presentacion'} - ${formatUnitQuantityLabel(
        presentation?.cantidad_por_unidad,
        presentation?.unidad_medida,
      )}`,
      netMargin: safeNumber(
        presentation?.margen_utilidad ?? metrics.margin,
      ),
      profitability: safeNumber(
        presentation?.porcentaje_utilidad ?? metrics.profitability,
      ),
      price: safeNumber(presentation?.precio_venta),
      unitCost: safeNumber(
        presentation?.costo_unitario_presentacion ?? metrics.unitCost,
      ),
    };
  });

export const getIngredientInventoryStats = (ingredients = []) => {
  const totalValue = ingredients.reduce(
    (acc, item) =>
      acc + safeNumber(item.stock_actual) * safeNumber(item.precio_por_unidad),
    0,
  );
  const totalStock = ingredients.reduce(
    (acc, item) => acc + safeNumber(item.stock_actual),
    0,
  );
  const underStock = ingredients.filter(
    (item) => safeNumber(item.stock_actual) <= safeNumber(item.stock_minimo),
  );

  return {
    totalValue,
    totalStock,
    underStockCount: underStock.length,
    activeSuppliers: new Set(
      ingredients
        .map(
          (item) =>
            item.proveedor?.id || item.proveedor_id || item.proveedor || null,
        )
        .filter(Boolean),
    ).size,
  };
};

export const getManufacturingStats = ({
  ingredients = [],
  products = [],
  lowStock = [],
}) => {
  const inventory = getIngredientInventoryStats(ingredients);
  const readyProducts = products.filter(
    (product) => product.disponibilidad_ingredientes,
  );

  return {
    totalIngredients: ingredients.length,
    totalProducts: products.length,
    lowStockCount: lowStock.length || inventory.underStockCount,
    readyProductsCount: readyProducts.length,
    inventoryValue: inventory.totalValue,
    activeSuppliers: inventory.activeSuppliers,
  };
};

export const buildIngredientPayload = (form) => ({
  nombre: form.nombre.trim(),
  descripcion: form.descripcion.trim(),
  unidad_medida: form.unidad_medida,
  precio_por_unidad: safeNumber(form.precio_por_unidad).toFixed(4),
  proveedor_id: form.proveedor_id || null,
  stock_actual: safeNumber(form.stock_actual).toFixed(4),
  stock_minimo: safeNumber(form.stock_minimo).toFixed(4),
});

export const buildProductPayload = ({
  form,
  recipeItems,
  suggestedPrice,
  presentations = [],
}) => ({
  nombre: form.nombre.trim(),
  descripcion: form.descripcion.trim(),
  unidad_medida: form.unidad_medida,
  cantidad_producida: safeNumber(form.cantidad_producida).toFixed(4),
  precio_venta_sugerido: safeNumber(
    presentations[0]?.precio_venta_sugerido || suggestedPrice,
  ).toFixed(2),
  precio_venta: safeNumber(
    presentations[0]?.precio_venta || form.precio_venta || suggestedPrice,
  ).toFixed(2),
  tiempo_produccion: Math.round(safeNumber(form.tiempo_produccion)),
  receta: recipeItems.map((item) => ({
    ingrediente_id: item.ingrediente_id || item.ingrediente?.id,
    cantidad_necesaria: safeNumber(item.cantidad_necesaria).toFixed(4),
    unidad_medida: item.unidad_medida,
  })),
  presentaciones: presentations.map((item) => ({
    id: item.id || undefined,
    nombre: item.nombre.trim(),
    cantidad_por_unidad: safeNumber(item.cantidad_por_unidad).toFixed(4),
    unidad_medida: item.unidad_medida,
    precio_venta_sugerido: safeNumber(
      item.precio_venta_sugerido,
    ).toFixed(2),
    precio_venta: safeNumber(item.precio_venta).toFixed(2),
  })),
});

export const extractApiError = (error, fallback) => {
  const data = error?.response?.data;
  if (!data) {
    return fallback;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (data.detail) {
    return data.detail;
  }

  if (data.error) {
    return data.error;
  }

  const firstKey = Object.keys(data)[0];
  if (!firstKey) {
    return fallback;
  }

  const value = data[firstKey];
  return `${firstKey}: ${Array.isArray(value) ? value[0] : value}`;
};

export const getProductStatusTone = (product) => {
  if (!product.disponibilidad_ingredientes) {
    return {
      label: 'Faltantes',
      className:
        'border-[rgba(149,100,0,0.18)] bg-[var(--warning-soft)] text-[var(--warning-text)]',
    };
  }

  if (safeNumber(product.costo_unitario) <= 0) {
    return {
      label: 'Sin costos',
      className:
        'border-[rgba(31,108,159,0.18)] bg-[var(--info-soft)] text-[var(--info-text)]',
    };
  }

  return {
    label: 'Listo',
    className:
      'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]',
  };
};

export const formatCostNote = (value) => {
  if (safeNumber(value) <= 0) {
    return 'Pendiente';
  }

  return formatCurrency(value);
};
