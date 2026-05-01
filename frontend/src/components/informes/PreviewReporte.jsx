import { BarChart3, FileText } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../../utils/formatters';
import { EmptyPanel, PanelShell } from './shared';
import { getReportMeta } from './reportes-config';

export default function PreviewReporte({
  reportType,
  previewData,
  historicalReport,
  isLoading,
}) {
  const reportMeta = getReportMeta(reportType);
  const title = historicalReport
    ? `${getReportMeta(historicalReport.tipo_informe).label} guardado`
    : `Vista previa: ${reportMeta.label}`;
  const subtitle = historicalReport
    ? `Generado ${formatDateTime(historicalReport.fecha_generacion)}`
    : reportMeta.description;

  return (
    <PanelShell title={title} subtitle={subtitle}>
      {isLoading ? (
        <div className="rounded-[22px] border border-app bg-[var(--panel-soft)] px-4 py-12 text-center text-soft">
          Construyendo vista previa...
        </div>
      ) : historicalReport ? (
        <HistoricalReportPreview report={historicalReport} />
      ) : previewData ? (
        <LivePreview reportType={reportType} data={previewData} />
      ) : (
        <EmptyPanel
          icon={FileText}
          title="Sin datos de vista previa"
          description="Configura un tipo de reporte o selecciona uno del historial para revisar los datos."
        />
      )}
    </PanelShell>
  );
}

function HistoricalReportPreview({ report }) {
  const meta = getReportMeta(report.tipo_informe);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <PreviewStat label="Tipo" value={meta.label} />
        <PreviewStat
          label="Periodo"
          value={`${formatDate(report.fecha_inicio)} - ${formatDate(report.fecha_fin)}`}
        />
      </div>

      <LivePreview reportType={report.tipo_informe} data={report.datos || {}} />
    </div>
  );
}

function LivePreview({ reportType, data }) {
  if (reportType === 'VENTAS_PERIODO') {
    const stats = data.estadisticas_generales || data.estadisticas_ventas_periodo || {};
    const resumen = stats.resumen || {};
    const categorias = data.ventas_por_categoria?.distribucion || [];
    const metodos = data.ventas_por_metodo_pago?.distribucion || [];

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <PreviewStat label="Total ventas" value={formatCurrency(resumen.total_ventas)} />
          <PreviewStat label="Cantidad" value={formatNumber(resumen.cantidad_ventas)} />
          <PreviewStat label="Ticket promedio" value={formatCurrency(resumen.ticket_promedio)} />
        </div>
        <PreviewList
          title="Categorias"
          items={categorias.map((item) => ({
            label: item.categoria,
            value: formatCurrency(item.total_vendido),
            helper: `${formatNumber(item.porcentaje)} %`,
          }))}
        />
        <PreviewList
          title="Metodos de pago"
          items={metodos.map((item) => ({
            label: item.label,
            value: formatCurrency(item.total_vendido),
            helper: `${formatNumber(item.cantidad_ventas)} ventas`,
          }))}
        />
      </div>
    );
  }

  if (reportType === 'PRODUCTOS_MAS_VENDIDOS') {
    const productos = data.productos_mas_vendidos?.resultados || [];
    const sinMovimiento = data.productos_sin_movimiento?.resultados || [];

    return (
      <div className="space-y-4">
        <PreviewList
          title="Top productos"
          items={productos.slice(0, 8).map((item) => ({
            label: item.nombre,
            value: formatCurrency(item.total_vendido),
            helper: `${formatNumber(item.cantidad_vendida)} unidades`,
          }))}
        />
        <PreviewList
          title="Sin movimiento"
          items={sinMovimiento.slice(0, 5).map((item) => ({
            label: item.nombre,
            value: formatNumber(item.dias_sin_movimiento || 0),
            helper: 'dias sin movimiento',
          }))}
        />
      </div>
    );
  }

  if (reportType === 'CLIENTES_TOP') {
    const clientes = data.mejores_clientes?.resultados || [];
    const recurrencia =
      data.analisis_recurrencia?.resumen ||
      data.analisis_recurrencia_clientes?.resumen ||
      {};

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <PreviewStat label="Clientes evaluados" value={formatNumber(recurrencia.total_clientes)} />
          <PreviewStat label="Recurrentes" value={formatNumber(recurrencia.clientes_recurrentes)} />
          <PreviewStat label="% recurrentes" value={`${formatNumber(recurrencia.porcentaje_recurrentes)} %`} />
        </div>
        <PreviewList
          title="Top clientes"
          items={clientes.slice(0, 8).map((item) => ({
            label: item.nombre,
            value: formatCurrency(item.total_comprado),
            helper: `${formatNumber(item.cantidad_compras)} compras`,
          }))}
        />
      </div>
    );
  }

  if (reportType === 'INVENTARIO_VALORIZADO') {
    const inventario =
      data.inventario?.valor_total ||
      data.valor_total_inventario ||
      {};
    const rotacion =
      data.inventario?.rotacion ||
      data.rotacion_inventario ||
      {};

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <PreviewStat label="Valor compra" value={formatCurrency(inventario.valor_compra)} />
          <PreviewStat label="Valor venta" value={formatCurrency(inventario.valor_venta)} />
          <PreviewStat label="Margen potencial" value={formatCurrency(inventario.margen_potencial)} />
        </div>
        <PreviewList
          title="Rotacion destacada"
          items={(rotacion.productos_rotacion || []).slice(0, 6).map((item) => ({
            label: item.nombre,
            value: formatNumber(item.indice_rotacion),
            helper: `${formatNumber(item.unidades_vendidas)} uds`,
          }))}
        />
      </div>
    );
  }

  if (reportType === 'CUENTAS_POR_COBRAR' || reportType === 'ANALISIS_FINANCIERO') {
    const cartera =
      data.cuentas_por_cobrar ||
      data.total_cuentas_por_cobrar ||
      {};
    const antiguedad = data.antiguedad_cartera || {};
    const proyeccion = data.proyeccion_ingresos || {};

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <PreviewStat label="Cartera total" value={formatCurrency(cartera.total_cartera)} />
          <PreviewStat label="Clientes con saldo" value={formatNumber(cartera.clientes_con_saldo)} />
          <PreviewStat label="Proyeccion" value={formatCurrency(proyeccion.total_proyectado)} />
        </div>
        <PreviewList
          title="Antiguedad"
          items={(antiguedad.distribucion || []).map((item) => ({
            label: item.label,
            value: formatCurrency(item.total),
            helper: `${formatNumber(item.cantidad_ventas)} ventas`,
          }))}
        />
      </div>
    );
  }

  if (reportType === 'CIERRE_CAJA') {
    const cierre = data.cierre_caja || data;
    const categorias = cierre.ventas_por_categoria || {};
    const gastos = cierre.gastos_operativos || {};

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <PreviewStat label="Total ventas" value={formatCurrency(cierre.total_ventas)} />
          <PreviewStat label="Efectivo esperado" value={formatCurrency(cierre.efectivo_esperado)} />
          <PreviewStat label="Diferencia" value={formatCurrency(cierre.diferencia)} />
        </div>
        <PreviewList
          title="Categorias"
          items={Object.entries(categorias).map(([label, value]) => ({
            label,
            value: formatCurrency(value),
          }))}
        />
        <PreviewList
          title="Gastos"
          items={Object.entries(gastos)
            .filter(([key]) => key !== 'total')
            .map(([key, value]) => ({
              label: key.replaceAll('_', ' '),
              value: formatCurrency(value?.monto || 0),
              helper: value?.descripcion || '',
            }))}
        />
      </div>
    );
  }

  return (
    <EmptyPanel
      icon={BarChart3}
      title="Vista previa no disponible"
      description="No hay renderer de vista previa para este conjunto de datos."
    />
  );
}

function PreviewStat({ label, value }) {
  return (
    <div className="rounded-[20px] border border-app bg-white/72 px-4 py-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-3 font-display text-[1.6rem] leading-none text-main">
        {value || '--'}
      </div>
    </div>
  );
}

function PreviewList({ title, items = [] }) {
  return (
    <div className="rounded-[22px] border border-app bg-white/72 p-4">
      <div className="eyebrow">{title}</div>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-[13px] text-soft">Sin elementos para esta vista.</div>
        ) : (
          items.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="rounded-[16px] border border-app bg-[var(--panel-soft)] px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-semibold text-main">{item.label}</div>
                  {item.helper && (
                    <div className="mt-1 text-[12px] text-soft">{item.helper}</div>
                  )}
                </div>
                <div className="text-sm font-semibold text-main">{item.value}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
