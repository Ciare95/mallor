import { formatCurrency, formatDateTime, formatNumber } from '../../utils/formatters';
import { useAppStore } from '../../store/useStore';

export default function ImprimirCierre({ cierre }) {
  const empresaActiva = useAppStore((state) => state.empresaActiva);
  if (!cierre) {
    return null;
  }

  const expenseRows = buildExpenseRows(cierre.gastos_operativos);
  const categoryRows = Object.entries(cierre.ventas_por_categoria || {});
  const gastosPorMetodo = cierre.gastos_operativos?.por_metodo_pago || {};

  return (
    <div className="bg-white p-8 text-slate-900">
      <div className="border-b border-slate-300 pb-4">
        <div className="text-3xl font-semibold">
          {empresaActiva?.nombre_comercial ||
            empresaActiva?.razon_social ||
            'Mallor'}
        </div>
        <div className="mt-2 text-sm text-slate-500">
          {empresaActiva?.nit ? `NIT ${empresaActiva.nit}` : ''}
        </div>
        <div className="mt-2 text-sm uppercase tracking-[0.18em] text-slate-500">
          Cierre de caja diario
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <PrintInfo label="Fecha cierre" value={cierre.fecha_cierre} />
        <PrintInfo
          label="Registrado"
          value={formatDateTime(cierre.fecha_registro)}
        />
        <PrintInfo
          label="Usuario"
          value={
            cierre.usuario_cierre?.full_name ||
            cierre.usuario_cierre?.username ||
            'Sin usuario'
          }
        />
        <PrintInfo label="Observaciones" value={cierre.observaciones || '--'} />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Totales del cierre</h2>
        <table className="mt-3 w-full border-collapse text-sm">
          <tbody>
            {[
              ['Total ventas', formatCurrency(cierre.total_ventas)],
              ['Efectivo', formatCurrency(cierre.total_efectivo)],
              ['Tarjeta', formatCurrency(cierre.total_tarjeta)],
              ['Transferencia', formatCurrency(cierre.total_transferencia)],
              ['Credito', formatCurrency(cierre.total_credito)],
              ['Abonos en efectivo', formatCurrency(cierre.total_abonos)],
              ['Gastos del dia', formatCurrency(cierre.total_gastos)],
              ['Efectivo esperado', formatCurrency(cierre.efectivo_esperado)],
              ['Efectivo real', formatCurrency(cierre.efectivo_real)],
              ['Diferencia', formatCurrency(cierre.diferencia)],
            ].map(([label, value]) => (
              <tr key={label}>
                <td className="border border-slate-300 px-3 py-2 font-medium">
                  {label}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-right">
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Gastos operativos</h2>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-slate-300 px-3 py-2 text-left">
                  Concepto
                </th>
                <th className="border border-slate-300 px-3 py-2 text-right">
                  Monto
                </th>
                <th className="border border-slate-300 px-3 py-2 text-left">
                  Nota
                </th>
              </tr>
            </thead>
            <tbody>
              {expenseRows.map((item) => (
                <tr key={item.key}>
                  <td className="border border-slate-300 px-3 py-2">
                    {item.label}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-right">
                    {formatCurrency(item.monto)}
                  </td>
                  <td className="border border-slate-300 px-3 py-2">
                    {item.descripcion || '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Gastos por metodo</h2>
          <table className="mt-3 w-full border-collapse text-sm">
            <tbody>
              {[
                ['Efectivo', gastosPorMetodo.EFECTIVO || 0],
                ['Transferencia', gastosPorMetodo.TRANSFERENCIA || 0],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="border border-slate-300 px-3 py-2">
                    {label}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-right">
                    {formatCurrency(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Ventas por categoria</h2>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-slate-300 px-3 py-2 text-left">
                  Categoria
                </th>
                <th className="border border-slate-300 px-3 py-2 text-right">
                  Venta
                </th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.map(([label, value]) => (
                <tr key={label}>
                  <td className="border border-slate-300 px-3 py-2">{label}</td>
                  <td className="border border-slate-300 px-3 py-2 text-right">
                    {formatCurrency(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {cierre.resumen && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Resumen</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {Object.entries(cierre.resumen).map(([label, value]) => (
              <div key={label} className="border border-slate-300 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {label.replaceAll('_', ' ')}
                </div>
                <div className="mt-2 text-sm font-medium">
                  {typeof value === 'number'
                    ? formatNumber(value)
                    : String(value)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PrintInfo({ label, value }) {
  return (
    <div className="border border-slate-300 px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  );
}

function buildExpenseRows(gastosOperativos = {}) {
  const rows = [
    {
      key: 'compras_mercancia',
      label: 'Compras de mercancia',
      monto: gastosOperativos?.compras_mercancia?.monto || 0,
      descripcion: extractExpenseDescription(
        gastosOperativos?.compras_mercancia,
        'Detalle de facturas del dia',
      ),
    },
  ];
  ['servicios_publicos', 'arriendos', 'salarios', 'otros_gastos'].forEach((key) => {
    const expense = gastosOperativos?.[key];
    if (!expense || typeof expense !== 'object') return;
    const detail = Array.isArray(expense.detalle) ? expense.detalle : [];
    const detailedItems = detail.filter(
      (item) => item && typeof item === 'object' && (item.monto || item.total),
    );
    if (detailedItems.length > 0) {
      detailedItems.forEach((item, index) => {
        const metodo = formatPurchasePaymentMethod(
          item.metodo_pago || expense.metodo_pago,
        );
        rows.push({
          key: `${key}-${index}`,
          label: 'Gasto',
          monto: item.monto || item.total || 0,
          descripcion: `${item.descripcion || item.detalle || '--'}${metodo ? ` - ${metodo}` : ''}`,
        });
      });
      return;
    }
    rows.push({
      key,
      label: key.replaceAll('_', ' '),
      monto: expense.monto || 0,
      descripcion: extractExpenseDescription(expense),
    });
  });

  return rows;
}

function extractExpenseDescription(expense, fallback = '') {
  if (!expense || typeof expense !== 'object') {
    return fallback || '';
  }

  if (expense.descripcion) {
    const metodo = formatPurchasePaymentMethod(expense.metodo_pago);
    return `${expense.descripcion}${metodo ? ` - ${metodo}` : ''}`;
  }

  const detail = Array.isArray(expense.detalle) ? expense.detalle : [];
  const invoiceItems = detail.filter((item) => item?.numero_factura);
  if (invoiceItems.length > 0) {
    return invoiceItems
      .map((item) => {
        const metodo = formatPurchasePaymentMethod(item.metodo_pago);
        return `Factura ${item.numero_factura}${metodo ? ` - ${metodo}` : ''}`;
      })
      .join('; ');
  }

  const firstItem = detail[0];

  if (typeof firstItem === 'string') {
    return firstItem;
  }

  if (firstItem?.descripcion) {
    return firstItem.descripcion;
  }

  return fallback || '';
}

function formatPurchasePaymentMethod(value) {
  const labels = {
    EFECTIVO: 'Efectivo',
    TRANSFERENCIA: 'Transferencia',
  };
  return labels[value] || value || '';
}
