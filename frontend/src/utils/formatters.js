const asDate = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const safeNumber = (value = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeNumber(value));

export const formatNumber = (value) =>
  new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safeNumber(value));

export const formatPercent = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(safeNumber(value));

export const formatDate = (value) => {
  const date = asDate(value);
  if (!date) {
    return '--';
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const formatShortDate = (value) => {
  const date = asDate(value);
  if (!date) {
    return '--';
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
  }).format(date);
};

export const formatDateTime = (value) => {
  const date = asDate(value);
  if (!date) {
    return '--';
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const getRelativeAgeLabel = (value) => {
  const date = asDate(value);
  if (!date) {
    return '0 dias';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.max(Math.floor(diffMs / 86400000), 0);

  if (diffDays === 0) {
    return 'Hoy';
  }

  if (diffDays === 1) {
    return '1 dia';
  }

  return `${diffDays} dias`;
};
