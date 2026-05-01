import { startTransition, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useToast from '../../hooks/useToast';
import { listarAbonos } from '../../services/abonos.service';
import { listarFacturasCompra } from '../../services/inventario.service';
import {
  actualizarCierreCaja,
  descargarReportePdf,
  generarCierreCaja,
  generarReporteInforme,
  listarCierresCaja,
  obtenerCierreCaja,
  obtenerEstadisticasVentasInforme,
  triggerBrowserDownload,
} from '../../services/informes.service';
import { ToastContainer } from '../ui/Toast';
import {
  extractApiError,
  normalizeCollection,
  toDecimalString,
} from '../../utils/ventas';
import { formatCurrency } from '../../utils/formatters';
import CierresList from './CierresList';
import DetalleCierre from './DetalleCierre';
import GenerarCierreForm from './GenerarCierreForm';
import InformesModuleNav from './InformesModuleNav';

const TODAY = new Date().toISOString().slice(0, 10);

const createExpenseState = () => ({
  servicios_publicos: { monto: '', descripcion: '' },
  arriendos: { monto: '', descripcion: '' },
  salarios: { monto: '', descripcion: '' },
  otros_gastos: { monto: '', descripcion: '' },
});

export default function CierresCajaPage() {
  const queryClient = useQueryClient();
  const { toasts, toast, closeToast } = useToast();
  const [filters, setFilters] = useState({
    fecha_inicio: TODAY,
    fecha_fin: TODAY,
    q: '',
    page: 1,
    page_size: 10,
  });
  const [selectedCierreId, setSelectedCierreId] = useState(null);
  const [form, setForm] = useState({
    fecha: TODAY,
    efectivo_real: '',
    observaciones: '',
    gastos: createExpenseState(),
  });

  const selectedDateParams = useMemo(
    () => ({
      fecha_inicio: form.fecha,
      fecha_fin: form.fecha,
      anio: Number(form.fecha.slice(0, 4)),
    }),
    [form.fecha],
  );

  const cierresQuery = useQuery({
    queryKey: ['informes', 'cierres', 'list', filters],
    queryFn: () => listarCierresCaja(filters),
    placeholderData: (previousData) => previousData,
  });

  const cierreDelDiaQuery = useQuery({
    queryKey: ['informes', 'cierres', 'dia', form.fecha],
    queryFn: () =>
      listarCierresCaja({
        fecha_inicio: form.fecha,
        fecha_fin: form.fecha,
        page_size: 10,
      }),
    placeholderData: (previousData) => previousData,
  });

  const detalleQuery = useQuery({
    queryKey: ['informes', 'cierres', 'detalle', selectedCierreId],
    queryFn: () => obtenerCierreCaja(selectedCierreId),
    enabled: Boolean(selectedCierreId),
  });

  const ventasPreviewQuery = useQuery({
    queryKey: ['informes', 'cierres', 'preview', 'ventas', selectedDateParams],
    queryFn: () => obtenerEstadisticasVentasInforme(selectedDateParams),
    placeholderData: (previousData) => previousData,
  });

  const abonosPreviewQuery = useQuery({
    queryKey: ['informes', 'cierres', 'preview', 'abonos', form.fecha],
    queryFn: () =>
      listarAbonos({
        fecha_inicio: form.fecha,
        fecha_fin: form.fecha,
        metodo_pago: 'EFECTIVO',
        page_size: 200,
      }),
    placeholderData: (previousData) => previousData,
  });

  const facturasPreviewQuery = useQuery({
    queryKey: ['informes', 'cierres', 'preview', 'facturas', form.fecha],
    queryFn: () =>
      listarFacturasCompra({
        fecha_desde: form.fecha,
        fecha_hasta: form.fecha,
      }),
    placeholderData: (previousData) => previousData,
  });

  const invalidateCierres = () => {
    queryClient.invalidateQueries({ queryKey: ['informes', 'cierres'] });
    queryClient.invalidateQueries({ queryKey: ['informes', 'dashboard'] });
  };

  const generateMutation = useMutation({
    mutationFn: generarCierreCaja,
    onSuccess: (cierre) => {
      invalidateCierres();
      toast.success(`Cierre ${cierre.fecha_cierre} generado correctamente.`);
      setSelectedCierreId(cierre.id);
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible generar el cierre de caja.'),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, datos }) => actualizarCierreCaja(id, datos),
    onSuccess: (cierre) => {
      invalidateCierres();
      queryClient.setQueryData(
        ['informes', 'cierres', 'detalle', cierre.id],
        cierre,
      );
      toast.success(`Cierre ${cierre.fecha_cierre} ajustado correctamente.`);
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible ajustar el cierre.'),
      );
    },
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async (cierreId) => {
      const reporte = await generarReporteInforme({
        tipo_reporte: 'CIERRE_CAJA',
        formato: 'pdf',
        cierre_id: cierreId,
      });
      const response = await descargarReportePdf(reporte.id);

      triggerBrowserDownload(response, `cierre-caja-${cierreId}.pdf`);
      return reporte;
    },
    onSuccess: () => {
      toast.success('Reporte PDF descargado correctamente.');
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible descargar el PDF del cierre.'),
      );
    },
  });

  const exactDateClosure =
    normalizeCollection(cierreDelDiaQuery.data).results[0] || null;
  const currentSalesSummary =
    ventasPreviewQuery.data?.estadisticas_generales?.resumen || {};
  const paymentMethods =
    ventasPreviewQuery.data?.ventas_por_metodo_pago?.distribucion || [];
  const abonos = normalizeCollection(abonosPreviewQuery.data).results;
  const facturas = Array.isArray(facturasPreviewQuery.data)
    ? facturasPreviewQuery.data
    : [];
  const manualExpensesTotal = Object.values(form.gastos).reduce(
    (accumulator, item) => accumulator + Number(item.monto || 0),
    0,
  );
  const totalAbonos = abonos.reduce(
    (accumulator, item) => accumulator + Number(item.monto_abonado || 0),
    0,
  );
  const comprasMercancia = facturas.reduce(
    (accumulator, item) => accumulator + Number(item.total || 0),
    0,
  );
  const totalEfectivo =
    paymentMethods.find((item) => item.metodo_pago === 'EFECTIVO')
      ?.total_vendido || 0;
  const efectivoEsperado = Number(totalEfectivo) + totalAbonos;
  const totalGastos = comprasMercancia + manualExpensesTotal;
  const diferencia = Number(form.efectivo_real || 0) - efectivoEsperado;

  const preview = {
    totalVentas: currentSalesSummary.total_ventas || 0,
    totalAbonos,
    comprasMercancia,
    totalGastos,
    efectivoEsperado,
    diferencia,
    metodosPago: paymentMethods,
  };

  const handleFormChange = (path, value) => {
    if (path.startsWith('gastos.')) {
      const [, expenseKey, field] = path.split('.');
      setForm((current) => ({
        ...current,
        gastos: {
          ...current.gastos,
          [expenseKey]: {
            ...current.gastos[expenseKey],
            [field]: value,
          },
        },
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [path]: value,
    }));
  };

  const handleGenerate = (event) => {
    event.preventDefault();

    if (!form.fecha) {
      toast.error('Debes seleccionar una fecha para el cierre.');
      return;
    }

    if (Number(form.efectivo_real || 0) < 0) {
      toast.error('El efectivo real no puede ser negativo.');
      return;
    }

    generateMutation.mutate({
      fecha: form.fecha,
      efectivo_real: toDecimalString(form.efectivo_real || 0),
      observaciones: form.observaciones,
      gastos_operativos: buildExpensePayload(form.gastos),
    });
  };

  const handleSelectCierre = (cierreId) => {
    startTransition(() => {
      setSelectedCierreId(cierreId);
    });
  };

  const handleSaveCierre = (cierreId, detailForm, onDone) => {
    updateMutation.mutate(
      {
        id: cierreId,
        datos: {
          efectivo_real: toDecimalString(detailForm.efectivo_real || 0),
          observaciones: detailForm.observaciones,
          gastos_operativos: buildExpensePayload(detailForm.gastos),
        },
      },
      {
        onSuccess: () => onDone?.(),
      },
    );
  };

  const handlePrintById = async (cierreId) => {
    try {
      const cierre =
        cierreId === selectedCierreId && detalleQuery.data
          ? detalleQuery.data
          : await obtenerCierreCaja(cierreId);
      openPrintWindow(cierre);
    } catch (error) {
      toast.error(
        extractApiError(error, 'No fue posible preparar la impresion del cierre.'),
      );
    }
  };

  const handleFiltersChange = (updater) => {
    setFilters((current) =>
      typeof updater === 'function' ? updater(current) : updater,
    );
  };

  return (
    <div className="space-y-6">
      <InformesModuleNav />

      <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
        <div className="space-y-6">
          <GenerarCierreForm
            form={form}
            onChange={handleFormChange}
            preview={preview}
            onSubmit={handleGenerate}
            isSubmitting={generateMutation.isPending}
            exactDateClosure={exactDateClosure}
            error={
              generateMutation.isError
                ? extractApiError(
                    generateMutation.error,
                    'No fue posible generar el cierre.',
                  )
                : ''
            }
          />

          <CierresList
            data={normalizeCollection(cierresQuery.data)}
            filters={filters}
            onChangeFilters={handleFiltersChange}
            onPageChange={(page) =>
              setFilters((current) => ({
                ...current,
                page,
              }))
            }
            onSelect={handleSelectCierre}
            onPrint={handlePrintById}
            onDownloadPdf={(cierreId) => downloadPdfMutation.mutate(cierreId)}
            isLoading={cierresQuery.isLoading}
            selectedId={selectedCierreId}
          />
        </div>

        <DetalleCierre
          cierre={detalleQuery.data}
          onSave={handleSaveCierre}
          onPrint={openPrintWindow}
          onDownloadPdf={(cierreId) => downloadPdfMutation.mutate(cierreId)}
          isSaving={updateMutation.isPending}
        />
      </div>

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}

function buildExpensePayload(expenses) {
  return {
    servicios_publicos: buildManualExpense(expenses.servicios_publicos),
    arriendos: buildManualExpense(expenses.arriendos),
    salarios: buildManualExpense(expenses.salarios),
    otros_gastos: buildManualExpense(expenses.otros_gastos),
  };
}

function buildManualExpense(expense = {}) {
  const monto = Number(expense.monto || 0);
  const descripcion = String(expense.descripcion || '').trim();

  return {
    monto: toDecimalString(monto),
    descripcion,
    detalle: descripcion ? [{ descripcion }] : [],
  };
}

function openPrintWindow(cierre) {
  if (!cierre) {
    return;
  }

  const popup = window.open('', '_blank', 'width=1080,height=860');
  if (!popup) {
    return;
  }

  const expenseRows = buildPrintableExpenseRows(cierre.gastos_operativos);
  const categoryRows = Object.entries(cierre.ventas_por_categoria || {});
  const rowsMarkup = expenseRows
    .map(
      (item) => `
        <tr>
          <td>${item.label}</td>
          <td style="text-align:right;">${formatCurrency(item.monto)}</td>
          <td>${item.descripcion || '--'}</td>
        </tr>
      `,
    )
    .join('');
  const categoriesMarkup = categoryRows
    .map(
      ([label, value]) => `
        <tr>
          <td>${label}</td>
          <td style="text-align:right;">${formatCurrency(value)}</td>
        </tr>
      `,
    )
    .join('');

  popup.document.write(`
    <html>
      <head>
        <title>Cierre ${cierre.fecha_cierre}</title>
        <style>
          body { font-family: Georgia, serif; margin: 32px; color: #0f172a; }
          h1, h2 { margin: 0; }
          .header { border-bottom: 1px solid #cbd5e1; padding-bottom: 16px; }
          .eyebrow { margin-top: 8px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #64748b; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 24px; }
          .box { border: 1px solid #cbd5e1; padding: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; }
          th { background: #e2e8f0; }
          .section { margin-top: 28px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Mallor</h1>
          <div class="eyebrow">Cierre de caja diario</div>
        </div>

        <div class="grid">
          <div class="box"><strong>Fecha cierre:</strong> ${cierre.fecha_cierre}</div>
          <div class="box"><strong>Registrado:</strong> ${cierre.fecha_registro}</div>
          <div class="box"><strong>Usuario:</strong> ${
            cierre.usuario_cierre?.full_name ||
            cierre.usuario_cierre?.username ||
            'Sin usuario'
          }</div>
          <div class="box"><strong>Observaciones:</strong> ${cierre.observaciones || '--'}</div>
        </div>

        <div class="section">
          <h2>Totales del cierre</h2>
          <table>
            <tbody>
              <tr><td>Total ventas</td><td style="text-align:right;">${formatCurrency(cierre.total_ventas)}</td></tr>
              <tr><td>Efectivo</td><td style="text-align:right;">${formatCurrency(cierre.total_efectivo)}</td></tr>
              <tr><td>Tarjeta</td><td style="text-align:right;">${formatCurrency(cierre.total_tarjeta)}</td></tr>
              <tr><td>Transferencia</td><td style="text-align:right;">${formatCurrency(cierre.total_transferencia)}</td></tr>
              <tr><td>Credito</td><td style="text-align:right;">${formatCurrency(cierre.total_credito)}</td></tr>
              <tr><td>Abonos efectivo</td><td style="text-align:right;">${formatCurrency(cierre.total_abonos)}</td></tr>
              <tr><td>Total gastos</td><td style="text-align:right;">${formatCurrency(cierre.total_gastos)}</td></tr>
              <tr><td>Efectivo esperado</td><td style="text-align:right;">${formatCurrency(cierre.efectivo_esperado)}</td></tr>
              <tr><td>Efectivo real</td><td style="text-align:right;">${formatCurrency(cierre.efectivo_real)}</td></tr>
              <tr><td>Diferencia</td><td style="text-align:right;">${formatCurrency(cierre.diferencia)}</td></tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Gastos operativos</h2>
          <table>
            <thead>
              <tr><th>Concepto</th><th>Monto</th><th>Nota</th></tr>
            </thead>
            <tbody>${rowsMarkup}</tbody>
          </table>
        </div>

        <div class="section">
          <h2>Ventas por categoria</h2>
          <table>
            <thead>
              <tr><th>Categoria</th><th>Venta</th></tr>
            </thead>
            <tbody>${categoriesMarkup}</tbody>
          </table>
        </div>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

function buildPrintableExpenseRows(gastosOperativos = {}) {
  return [
    {
      label: 'Compras de mercancia',
      monto: gastosOperativos?.compras_mercancia?.monto || 0,
      descripcion: extractPrintableExpenseDescription(
        gastosOperativos?.compras_mercancia,
        'Facturas del dia',
      ),
    },
    {
      label: 'Servicios publicos',
      monto: gastosOperativos?.servicios_publicos?.monto || 0,
      descripcion: extractPrintableExpenseDescription(
        gastosOperativos?.servicios_publicos,
      ),
    },
    {
      label: 'Arriendos',
      monto: gastosOperativos?.arriendos?.monto || 0,
      descripcion: extractPrintableExpenseDescription(gastosOperativos?.arriendos),
    },
    {
      label: 'Salarios',
      monto: gastosOperativos?.salarios?.monto || 0,
      descripcion: extractPrintableExpenseDescription(gastosOperativos?.salarios),
    },
    {
      label: 'Otros gastos',
      monto: gastosOperativos?.otros_gastos?.monto || 0,
      descripcion: extractPrintableExpenseDescription(
        gastosOperativos?.otros_gastos,
      ),
    },
  ];
}

function extractPrintableExpenseDescription(expense, fallback = '') {
  if (!expense || typeof expense !== 'object') {
    return fallback;
  }

  if (expense.descripcion) {
    return expense.descripcion;
  }

  const detail = Array.isArray(expense.detalle) ? expense.detalle : [];
  const firstItem = detail[0];

  if (typeof firstItem === 'string') {
    return firstItem;
  }

  if (firstItem?.descripcion) {
    return firstItem.descripcion;
  }

  if (firstItem?.numero_factura) {
    return `Factura ${firstItem.numero_factura}`;
  }

  return fallback;
}
