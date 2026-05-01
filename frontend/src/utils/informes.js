const DAY_MS = 86400000;
const MONTH_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  month: 'short',
});
const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
});
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
});

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

export const DASHBOARD_PRESETS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'ayer', label: 'Ayer' },
  { value: 'ultimos_7_dias', label: 'Ultimos 7 dias' },
  { value: 'ultimos_30_dias', label: 'Ultimos 30 dias' },
  { value: 'este_mes', label: 'Este mes' },
  { value: 'mes_anterior', label: 'Mes anterior' },
  { value: 'este_anio', label: 'Este anio' },
  { value: 'personalizado', label: 'Rango personalizado' },
];

const createDate = (year, monthIndex, day) => new Date(year, monthIndex, day);

export const parseIsoDate = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [, year, month, day] = match;
  return createDate(Number(year), Number(month) - 1, Number(day));
};

export const formatDateInput = (value) => {
  const date = value instanceof Date ? value : parseIsoDate(value);
  if (!date) {
    return '';
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const clampDate = (value) => {
  const date = value instanceof Date ? new Date(value) : parseIsoDate(value);
  if (!date) {
    return null;
  }

  return createDate(date.getFullYear(), date.getMonth(), date.getDate());
};

const addDays = (value, days) => {
  const nextDate = clampDate(value);
  nextDate.setDate(nextDate.getDate() + days);
  return clampDate(nextDate);
};

const startOfMonth = (value) =>
  createDate(value.getFullYear(), value.getMonth(), 1);

const endOfMonth = (value) =>
  createDate(value.getFullYear(), value.getMonth() + 1, 0);

const startOfYear = (value) => createDate(value.getFullYear(), 0, 1);

export const getDaysBetween = (fechaInicio, fechaFin) => {
  const startDate = clampDate(fechaInicio);
  const endDate = clampDate(fechaFin);
  if (!startDate || !endDate) {
    return 0;
  }

  return Math.floor((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1;
};

export const resolveDashboardRange = (preset, customRange = {}) => {
  const today = clampDate(new Date());
  let startDate = today;
  let endDate = today;

  switch (preset) {
    case 'hoy':
      break;
    case 'ayer':
      startDate = addDays(today, -1);
      endDate = addDays(today, -1);
      break;
    case 'ultimos_7_dias':
      startDate = addDays(today, -6);
      break;
    case 'ultimos_30_dias':
      startDate = addDays(today, -29);
      break;
    case 'este_mes':
      startDate = startOfMonth(today);
      endDate = today;
      break;
    case 'mes_anterior': {
      const previousMonthAnchor = createDate(
        today.getFullYear(),
        today.getMonth() - 1,
        1,
      );
      startDate = startOfMonth(previousMonthAnchor);
      endDate = endOfMonth(previousMonthAnchor);
      break;
    }
    case 'este_anio':
      startDate = startOfYear(today);
      endDate = today;
      break;
    case 'personalizado': {
      const customStart = clampDate(customRange.fechaInicio);
      const customEnd = clampDate(customRange.fechaFin);

      if (customStart && customEnd && customStart <= customEnd) {
        startDate = customStart;
        endDate = customEnd;
      } else {
        startDate = addDays(today, -29);
      }
      break;
    }
    default:
      startDate = addDays(today, -29);
      break;
  }

  return {
    preset,
    fechaInicio: startDate,
    fechaFin: endDate,
    fechaInicioIso: formatDateInput(startDate),
    fechaFinIso: formatDateInput(endDate),
    totalDias: getDaysBetween(startDate, endDate),
  };
};

export const getDefaultGranularity = (range) => {
  const totalDias = range?.totalDias || 0;

  if (totalDias <= 31) {
    return 'dia';
  }

  if (totalDias <= 120) {
    return 'semana';
  }

  return 'mes';
};

export const buildDashboardQueryParams = (range) => ({
  fecha_inicio: range.fechaInicioIso,
  fecha_fin: range.fechaFinIso,
  anio: range.fechaFin.getFullYear(),
  limite: 50,
  dias: Math.max(range.totalDias, 30),
  dias_proyeccion: Math.min(Math.max(range.totalDias, 7), 60),
});

export const getRangeLabel = (range) => {
  if (!range?.fechaInicio || !range?.fechaFin) {
    return 'Periodo sin definir';
  }

  if (range.fechaInicioIso === range.fechaFinIso) {
    return DAY_MONTH_FORMATTER.format(range.fechaInicio);
  }

  return [
    DAY_MONTH_FORMATTER.format(range.fechaInicio),
    DAY_MONTH_FORMATTER.format(range.fechaFin),
  ].join(' - ');
};

export const getRangeSupportLabel = (range) => {
  if (!range) {
    return '';
  }

  const suffix = range.totalDias === 1 ? '1 dia visible' : `${range.totalDias} dias visibles`;
  return `${getRangeLabel(range)} | ${suffix}`;
};

export const sumBy = (items = [], key) =>
  items.reduce((accumulator, item) => accumulator + Number(item?.[key] || 0), 0);

const aggregatePoint = (points) => {
  const totalVentas = sumBy(points, 'total_ventas');
  const cantidadVentas = sumBy(points, 'cantidad_ventas');

  return {
    total_ventas: totalVentas,
    cantidad_ventas: cantidadVentas,
    ticket_promedio: cantidadVentas > 0 ? totalVentas / cantidadVentas : 0,
  };
};

export const aggregateSeriesByGranularity = (series = [], granularity = 'dia') => {
  if (!Array.isArray(series) || !series.length) {
    return [];
  }

  if (granularity === 'dia') {
    return series.map((item) => ({
      ...item,
      label: DAY_MONTH_FORMATTER.format(parseIsoDate(item.fecha)),
    }));
  }

  if (granularity === 'semana') {
    const groupedSeries = [];

    for (let index = 0; index < series.length; index += 7) {
      const slice = series.slice(index, index + 7);
      const firstDate = parseIsoDate(slice[0]?.fecha);
      const lastDate = parseIsoDate(slice[slice.length - 1]?.fecha);
      const aggregate = aggregatePoint(slice);

      groupedSeries.push({
        fecha: slice[0]?.fecha,
        fecha_fin: slice[slice.length - 1]?.fecha,
        label: `${DAY_MONTH_FORMATTER.format(firstDate)} - ${DAY_MONTH_FORMATTER.format(lastDate)}`,
        ...aggregate,
      });
    }

    return groupedSeries;
  }

  const buckets = new Map();

  series.forEach((item) => {
    const pointDate = parseIsoDate(item.fecha);
    if (!pointDate) {
      return;
    }

    const bucketKey = `${pointDate.getFullYear()}-${String(pointDate.getMonth() + 1).padStart(2, '0')}`;
    const currentBucket = buckets.get(bucketKey) || [];
    currentBucket.push(item);
    buckets.set(bucketKey, currentBucket);
  });

  return Array.from(buckets.entries()).map(([bucketKey, items]) => {
    const [year, month] = bucketKey.split('-');
    const label = `${MONTH_FORMATTER.format(createDate(Number(year), Number(month) - 1, 1))} ${year}`;
    const aggregate = aggregatePoint(items);

    return {
      fecha: items[0]?.fecha,
      label,
      ...aggregate,
    };
  });
};

export const mergeComparisonSeries = (currentSeries = [], previousSeries = []) =>
  currentSeries.map((item, index) => ({
    ...item,
    total_anterior: Number(previousSeries[index]?.total_ventas || 0),
    label_anterior: previousSeries[index]?.label || previousSeries[index]?.fecha || '',
  }));

const normalizeWeekdayIndex = (value) => (value + 6) % 7;

export const buildWeeklyTrend = (series = []) => {
  const buckets = WEEKDAY_LABELS.map((label) => ({
    label,
    total_ventas: 0,
    cantidad_ventas: 0,
  }));

  series.forEach((item) => {
    const pointDate = parseIsoDate(item.fecha);
    if (!pointDate) {
      return;
    }

    const index = normalizeWeekdayIndex(pointDate.getDay());
    buckets[index].total_ventas += Number(item.total_ventas || 0);
    buckets[index].cantidad_ventas += Number(item.cantidad_ventas || 0);
  });

  return buckets.map((item) => ({
    ...item,
    ticket_promedio:
      item.cantidad_ventas > 0
        ? item.total_ventas / item.cantidad_ventas
        : 0,
  }));
};

export const formatDelta = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'Sin base';
  }

  const numericValue = Number(value);
  const sign = numericValue > 0 ? '+' : '';
  return `${sign}${numericValue.toFixed(1)} %`;
};

export const getDeltaTone = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'neutral';
  }

  if (Number(value) > 0) {
    return 'success';
  }

  if (Number(value) < 0) {
    return 'danger';
  }

  return 'neutral';
};

export const buildSparklineStatus = (series = []) => {
  if (series.length < 2) {
    return 'estable';
  }

  const firstValue = Number(series[0]?.total_ventas || 0);
  const lastValue = Number(series[series.length - 1]?.total_ventas || 0);

  if (lastValue > firstValue) {
    return 'en ascenso';
  }

  if (lastValue < firstValue) {
    return 'en ajuste';
  }

  return 'estable';
};

export const getTopCategories = (items = [], limit = 6) => items.slice(0, limit);

export const getWeekdayHint = (dateValue) => {
  const parsedDate = parseIsoDate(dateValue);
  if (!parsedDate) {
    return '';
  }

  const weekday = WEEKDAY_FORMATTER.format(parsedDate);
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
};
