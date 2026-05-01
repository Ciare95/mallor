const toFiniteNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const DEFAULT_SALE_RULES = {
  threshold: 1000,
  markupBelowOrEqual: 119,
  markupAbove: 69,
};

export const normalizeSaleRules = (rules = {}) => ({
  threshold: toFiniteNumber(
    rules.threshold ?? rules.umbral,
    DEFAULT_SALE_RULES.threshold,
  ),
  markupBelowOrEqual: toFiniteNumber(
    rules.markupBelowOrEqual ?? rules.margen_menor_igual,
    DEFAULT_SALE_RULES.markupBelowOrEqual,
  ),
  markupAbove: toFiniteNumber(
    rules.markupAbove ?? rules.margen_mayor,
    DEFAULT_SALE_RULES.markupAbove,
  ),
});

export const calculateSuggestedSalePrice = (basePrice, rules = DEFAULT_SALE_RULES) => {
  const normalizedRules = normalizeSaleRules(rules);
  const safeBasePrice = toFiniteNumber(basePrice);

  if (safeBasePrice <= 0) {
    return 0;
  }

  const markup =
    safeBasePrice <= normalizedRules.threshold
      ? normalizedRules.markupBelowOrEqual
      : normalizedRules.markupAbove;

  return safeBasePrice * (1 + markup / 100);
};

export const roundCurrencyInput = (value) =>
  String(Math.round(toFiniteNumber(value)));
