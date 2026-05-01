export const REPORT_TYPE_META = {
  VENTAS_PERIODO: {
    label: 'Ventas por periodo',
    description: 'Resumen comercial, tendencia y mezcla de pago del rango seleccionado.',
    supports: ['pdf', 'excel'],
    requiresDateRange: true,
    previewKind: 'ventas',
  },
  PRODUCTOS_MAS_VENDIDOS: {
    label: 'Productos mas vendidos',
    description: 'Top de productos, baja rotacion y articulos sin movimiento.',
    supports: ['excel'],
    requiresDateRange: true,
    previewKind: 'productos',
  },
  CLIENTES_TOP: {
    label: 'Clientes top',
    description: 'Ranking de clientes y lectura de recurrencia comercial.',
    supports: ['excel'],
    requiresDateRange: true,
    previewKind: 'clientes',
  },
  INVENTARIO_VALORIZADO: {
    label: 'Inventario valorizado',
    description: 'Valor compra, potencial de venta y rotacion del inventario.',
    supports: ['pdf'],
    requiresDateRange: true,
    previewKind: 'inventario',
  },
  CUENTAS_POR_COBRAR: {
    label: 'Cuentas por cobrar',
    description: 'Cartera vigente, antiguedad y proyeccion de ingresos.',
    supports: ['pdf', 'excel'],
    requiresDateRange: true,
    previewKind: 'financiero',
  },
  CIERRE_CAJA: {
    label: 'Cierre de caja',
    description: 'Detalle diario del cierre con diferencia de efectivo y gastos.',
    supports: ['pdf'],
    requiresDateRange: false,
    requiresCierre: true,
    previewKind: 'cierre',
  },
  ANALISIS_FINANCIERO: {
    label: 'Analisis financiero',
    description: 'Vista previa financiera consolidada. No tiene exportador backend configurado.',
    supports: [],
    requiresDateRange: true,
    previewKind: 'financiero',
    previewOnly: true,
  },
};

export const REPORT_TYPE_OPTIONS = Object.entries(REPORT_TYPE_META).map(
  ([value, meta]) => ({
    value,
    ...meta,
  }),
);

export const getReportMeta = (reportType) =>
  REPORT_TYPE_META[reportType] || REPORT_TYPE_META.VENTAS_PERIODO;

export const supportsFormat = (reportType, format) =>
  getReportMeta(reportType).supports.includes(format);
