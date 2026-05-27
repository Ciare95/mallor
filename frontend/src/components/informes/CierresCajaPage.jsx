import { startTransition, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useToast from '../../hooks/useToast';
import { listarAbonos } from '../../services/abonos.service';
import { listarFacturasCompra } from '../../services/inventario.service';
import {
  actualizarCierreCaja,
  actualizarGastoCaja,
  crearGastoCaja,
  descargarReportePdf,
  eliminarGastoCaja,
  generarCierreCaja,
  generarReporteInforme,
  listarGastosCaja,
  listarCierresCaja,
  obtenerCierreCaja,
  obtenerResumenCierrePeriodo,
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
import { useAppStore } from '../../store/useStore';

const TODAY = new Date().toISOString().slice(0, 10);
const CURRENT_MONTH = TODAY.slice(0, 7);

const getMonthRange = (monthValue) => {
  const [year, month] = String(monthValue || CURRENT_MONTH)
    .split('-')
    .map((item) => Number(item));
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    fecha_inicio: start.toISOString().slice(0, 10),
    fecha_fin: end.toISOString().slice(0, 10),
  };
};

const createExpenseId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `gasto-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createExpenseItem = (expense = {}) => ({
  id: createExpenseId(),
  registro_id: expense.id || expense.registro_id || null,
  monto: expense.monto ? String(expense.monto) : '',
  descripcion: expense.descripcion || '',
  metodo_pago: expense.metodo_pago || '',
});

const createExpenseState = () => [createExpenseItem()];

export default function CierresCajaPage() {
  const empresaActiva = useAppStore((state) => state.empresaActiva);
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
    tipo_cierre: 'DIA',
    fecha: TODAY,
    mes: CURRENT_MONTH,
    efectivo_real: '',
    observaciones: '',
    gastos: createExpenseState(),
  });
  const isMonthlyClosure = form.tipo_cierre === 'MES';
  const selectedPeriod = isMonthlyClosure
    ? getMonthRange(form.mes)
    : { fecha_inicio: form.fecha, fecha_fin: form.fecha };

  const selectedDateParams = useMemo(
    () => ({
      fecha_inicio: selectedPeriod.fecha_inicio,
      fecha_fin: selectedPeriod.fecha_fin,
      anio: Number(selectedPeriod.fecha_fin.slice(0, 4)),
    }),
    [selectedPeriod.fecha_fin, selectedPeriod.fecha_inicio],
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
    enabled: !isMonthlyClosure,
  });

  const detalleQuery = useQuery({
    queryKey: ['informes', 'cierres', 'detalle', selectedCierreId],
    queryFn: () => obtenerCierreCaja(selectedCierreId),
    enabled: Boolean(selectedCierreId),
  });

  const gastosCajaQuery = useQuery({
    queryKey: ['informes', 'gastos-caja', form.fecha],
    queryFn: () => listarGastosCaja({ fecha: form.fecha, page_size: 200 }),
    enabled: !isMonthlyClosure && Boolean(form.fecha),
  });

  const ventasPreviewQuery = useQuery({
    queryKey: ['informes', 'cierres', 'preview', 'ventas', selectedDateParams],
    queryFn: () => obtenerEstadisticasVentasInforme(selectedDateParams),
    placeholderData: (previousData) => previousData,
  });

  const abonosPreviewQuery = useQuery({
    queryKey: ['informes', 'cierres', 'preview', 'abonos', selectedPeriod],
    queryFn: () =>
      listarAbonos({
        fecha_inicio: selectedPeriod.fecha_inicio,
        fecha_fin: selectedPeriod.fecha_fin,
        metodo_pago: 'EFECTIVO',
        page_size: 200,
      }),
    placeholderData: (previousData) => previousData,
    enabled: !isMonthlyClosure,
  });

  const facturasPreviewQuery = useQuery({
    queryKey: ['informes', 'cierres', 'preview', 'facturas', selectedPeriod],
    queryFn: () =>
      listarFacturasCompra({
        fecha_desde: selectedPeriod.fecha_inicio,
        fecha_hasta: selectedPeriod.fecha_fin,
      }),
    placeholderData: (previousData) => previousData,
    enabled: !isMonthlyClosure,
  });

  const monthlySummaryQuery = useQuery({
    queryKey: ['informes', 'cierres', 'preview', 'mensual', selectedPeriod],
    queryFn: () => obtenerResumenCierrePeriodo(selectedPeriod),
    placeholderData: (previousData) => previousData,
    enabled: isMonthlyClosure,
  });

  useEffect(() => {
    if (isMonthlyClosure || gastosCajaQuery.isLoading) return;
    const gastosGuardados = normalizeCollection(gastosCajaQuery.data).results;
    setForm((current) => ({
      ...current,
      gastos: gastosGuardados.length
        ? gastosGuardados.map((expense) => createExpenseItem(expense))
        : [createExpenseItem()],
    }));
  }, [form.fecha, gastosCajaQuery.data, gastosCajaQuery.isLoading, isMonthlyClosure]);

  const invalidateCierres = () => {
    queryClient.invalidateQueries({ queryKey: ['informes', 'cierres'] });
    queryClient.invalidateQueries({ queryKey: ['informes', 'dashboard'] });
  };

  const invalidateGastosCaja = () => {
    queryClient.invalidateQueries({ queryKey: ['informes', 'gastos-caja'] });
    queryClient.invalidateQueries({ queryKey: ['informes', 'cierres'] });
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
  const downloadMonthlyPdfMutation = useMutation({
    mutationFn: async () => {
      const reporte = await generarReporteInforme({
        tipo_reporte: 'CIERRE_CAJA',
        formato: 'pdf',
        fecha_inicio: selectedPeriod.fecha_inicio,
        fecha_fin: selectedPeriod.fecha_fin,
      });
      const response = await descargarReportePdf(reporte.id);

      triggerBrowserDownload(
        response,
        `cierre-caja-${selectedPeriod.fecha_inicio}-${selectedPeriod.fecha_fin}.pdf`,
      );
      return reporte;
    },
    onSuccess: () => {
      toast.success('Cierre mensual PDF descargado correctamente.');
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible descargar el cierre mensual.'),
      );
    },
  });

  const saveExpenseMutation = useMutation({
    mutationFn: ({ expense }) => {
      const payload = {
        fecha: form.fecha,
        descripcion: String(expense.descripcion || '').trim(),
        monto: toDecimalString(expense.monto || 0),
        metodo_pago: expense.metodo_pago,
      };
      return expense.registro_id
        ? actualizarGastoCaja(expense.registro_id, payload)
        : crearGastoCaja(payload);
    },
    onSuccess: () => {
      invalidateGastosCaja();
      toast.success('Gasto guardado correctamente.');
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible guardar el gasto.'),
      );
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: eliminarGastoCaja,
    onSuccess: () => {
      invalidateGastosCaja();
      toast.success('Gasto eliminado correctamente.');
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible eliminar el gasto.'),
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
  const manualExpensesTotal = form.gastos.reduce(
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
  const comprasMercanciaEfectivo = facturas.reduce(
    (accumulator, item) =>
      item.metodo_pago === 'EFECTIVO'
        ? accumulator + Number(item.total || 0)
        : accumulator,
    0,
  );
  const gastosManualesPorMetodo = form.gastos.reduce(
    (accumulator, item) => {
      const monto = Number(item.monto || 0);
      const metodo = item.metodo_pago || '';
      if (monto <= 0 || !metodo) return accumulator;
      return {
        ...accumulator,
        [metodo]: (accumulator[metodo] || 0) + monto,
      };
    },
    {},
  );
  const gastosPorMetodo = {
    EFECTIVO: comprasMercanciaEfectivo + (gastosManualesPorMetodo.EFECTIVO || 0),
    TRANSFERENCIA:
      facturas.reduce(
        (accumulator, item) =>
          item.metodo_pago === 'TRANSFERENCIA'
            ? accumulator + Number(item.total || 0)
            : accumulator,
        0,
      ) + (gastosManualesPorMetodo.TRANSFERENCIA || 0),
  };
  const totalEfectivo =
    paymentMethods.find((item) => item.metodo_pago === 'EFECTIVO')
      ?.total_vendido || 0;
  const efectivoEsperado = Math.max(
    Number(totalEfectivo) + totalAbonos - gastosPorMetodo.EFECTIVO,
    0,
  );
  const totalGastos = comprasMercancia + manualExpensesTotal;
  const diferencia = Number(form.efectivo_real || 0) - efectivoEsperado;

  const monthlySummary = monthlySummaryQuery.data || null;
  const preview = isMonthlyClosure && monthlySummary
    ? {
        totalVentas: monthlySummary.total_ventas || 0,
        totalAbonos: monthlySummary.total_abonos || 0,
        comprasMercancia:
          monthlySummary.gastos_operativos?.compras_mercancia?.monto || 0,
        totalGastos: monthlySummary.total_gastos || 0,
        efectivoEsperado: monthlySummary.efectivo_esperado || 0,
        diferencia: monthlySummary.diferencia || 0,
        metodosPago: [
          {
            label: 'Efectivo',
            metodo_pago: 'EFECTIVO',
            cantidad_ventas: 0,
            total_vendido: monthlySummary.total_efectivo || 0,
          },
          {
            label: 'Tarjeta',
            metodo_pago: 'TARJETA',
            cantidad_ventas: 0,
            total_vendido: monthlySummary.total_tarjeta || 0,
          },
          {
            label: 'Transferencia',
            metodo_pago: 'TRANSFERENCIA',
            cantidad_ventas: 0,
            total_vendido: monthlySummary.total_transferencia || 0,
          },
          {
            label: 'Credito',
            metodo_pago: 'CREDITO',
            cantidad_ventas: 0,
            total_vendido: monthlySummary.total_credito || 0,
          },
        ],
        gastosPorMetodo:
          monthlySummary.gastos_operativos?.por_metodo_pago || {},
      }
    : {
        totalVentas: currentSalesSummary.total_ventas || 0,
        totalAbonos,
        comprasMercancia,
        totalGastos,
        efectivoEsperado,
        diferencia,
        metodosPago: paymentMethods,
        gastosPorMetodo,
      };

  const handleFormChange = (path, value) => {
    if (path === 'gastos.add') {
      setForm((current) => ({
        ...current,
        gastos: [...current.gastos, createExpenseItem()],
      }));
      toast.info('Fila agregada. Usa Guardar gasto para conservarla.');
      return;
    }

    if (path === 'gastos.save') {
      const expense = form.gastos.find((item) => item.id === value);
      if (!expense) return;
      if (!String(expense.descripcion || '').trim()) {
        toast.error('Debes indicar el detalle del gasto.');
        return;
      }
      if (Number(expense.monto || 0) <= 0) {
        toast.error('El valor del gasto debe ser mayor a cero.');
        return;
      }
      if (!expense.metodo_pago) {
        toast.error('Debes indicar el metodo de pago del gasto.');
        return;
      }
      saveExpenseMutation.mutate({ expense });
      return;
    }

    if (path === 'gastos.remove') {
      const expense = form.gastos.find((item) => item.id === value);
      if (expense?.registro_id) {
        deleteExpenseMutation.mutate(expense.registro_id);
        return;
      }
      setForm((current) => ({
        ...current,
        gastos:
          current.gastos.length <= 1
            ? [createExpenseItem()]
            : current.gastos.filter((expense) => expense.id !== value),
      }));
      return;
    }

    if (path.startsWith('gastos.')) {
      const [, indexValue, field] = path.split('.');
      const expenseIndex = Number(indexValue);
      setForm((current) => ({
        ...current,
        gastos: current.gastos.map((expense, index) =>
          index === expenseIndex
            ? {
                ...expense,
                [field]: value,
              }
            : expense,
        ),
      }));
      return;
    }

    if (path === 'gastos.reset-empty') {
      setForm((current) => ({
        ...current,
        gastos:
          current.gastos.length === 0
            ? [createExpenseItem()]
            : current.gastos,
      }));
      return;
    }

    if (path === 'gastos.replace') {
      setForm((current) => ({
        ...current,
        gastos: Array.isArray(value) && value.length ? value : [createExpenseItem()],
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

    if (isMonthlyClosure) {
      if (!form.mes) {
        toast.error('Debes seleccionar el mes del cierre.');
        return;
      }
      downloadMonthlyPdfMutation.mutate();
      return;
    }

    if (!form.fecha) {
      toast.error('Debes seleccionar una fecha para el cierre.');
      return;
    }

    if (Number(form.efectivo_real || 0) < 0) {
      toast.error('El efectivo real no puede ser negativo.');
      return;
    }
    const gastoSinMetodo = form.gastos.some(
      (gasto) => Number(gasto.monto || 0) > 0 && !gasto.metodo_pago,
    );
    if (gastoSinMetodo) {
      toast.error('Debes indicar el metodo de pago de cada gasto.');
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
      openPrintWindow(cierre, empresaActiva);
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
            isMonthlySubmitting={downloadMonthlyPdfMutation.isPending}
            isSavingExpense={saveExpenseMutation.isPending}
            exactDateClosure={exactDateClosure}
            selectedPeriod={selectedPeriod}
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
  const expenseItems = Array.isArray(expenses) ? expenses : [];
  const validItems = expenseItems
    .map((expense) => ({
      monto: Number(expense.monto || 0),
      metodo_pago: expense.metodo_pago || '',
      descripcion: String(expense.descripcion || '').trim(),
      gasto_caja_id: expense.registro_id || null,
    }))
    .filter((expense) => expense.monto > 0);
  const total = validItems.reduce(
    (accumulator, expense) => accumulator + expense.monto,
    0,
  );

  return {
    servicios_publicos: buildManualExpense(),
    arriendos: buildManualExpense(),
    salarios: buildManualExpense(),
    otros_gastos: {
      monto: toDecimalString(total),
      metodo_pago: validItems[0]?.metodo_pago || '',
      descripcion: '',
      detalle: validItems.map((expense) => ({
        gasto_caja_id: expense.gasto_caja_id,
        descripcion: expense.descripcion,
        monto: toDecimalString(expense.monto),
        metodo_pago: expense.metodo_pago,
      })),
    },
  };
}

function buildManualExpense(expense = {}) {
  const monto = Number(expense.monto || 0);
  const descripcion = String(expense.descripcion || '').trim();

  return {
    monto: toDecimalString(monto),
    metodo_pago: expense.metodo_pago || '',
    descripcion,
    detalle: descripcion ? [{ descripcion }] : [],
  };
}

function openPrintWindow(cierre, empresa) {
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
  const gastosPorMetodo = cierre.gastos_operativos?.por_metodo_pago || {};
  const gastosMetodoMarkup = `
    <tr><td>Efectivo</td><td style="text-align:right;">${formatCurrency(gastosPorMetodo.EFECTIVO || 0)}</td></tr>
    <tr><td>Transferencia</td><td style="text-align:right;">${formatCurrency(gastosPorMetodo.TRANSFERENCIA || 0)}</td></tr>
  `;
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
  const empresaNombre =
    empresa?.nombre_comercial || empresa?.razon_social || 'Mallor';
  const empresaMeta = [
    empresa?.nit
      ? `NIT ${empresa.nit}${empresa.digito_verificacion ? `-${empresa.digito_verificacion}` : ''}`
      : null,
    empresa?.telefono,
    empresa?.email,
  ].filter(Boolean).join(' · ');

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
          <h1>${empresaNombre}</h1>
          <div class="eyebrow">${empresaMeta}</div>
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
          <h2>Gastos por metodo de pago</h2>
          <table>
            <thead>
              <tr><th>Metodo</th><th>Total</th></tr>
            </thead>
            <tbody>${gastosMetodoMarkup}</tbody>
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
  const rows = [
    {
      label: 'Compras de mercancia',
      monto: gastosOperativos?.compras_mercancia?.monto || 0,
      descripcion: extractPrintableExpenseDescription(
        gastosOperativos?.compras_mercancia,
        'Facturas del dia',
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
      detailedItems.forEach((item) => {
        const metodo = formatPurchasePaymentMethod(
          item.metodo_pago || expense.metodo_pago,
        );
        rows.push({
          label: 'Gasto',
          monto: item.monto || item.total || 0,
          descripcion: `${item.descripcion || item.detalle || '--'}${metodo ? ` - ${metodo}` : ''}`,
        });
      });
      return;
    }
    rows.push({
      label: key.replaceAll('_', ' '),
      monto: expense.monto || 0,
      descripcion: extractPrintableExpenseDescription(expense),
    });
  });

  return rows;
}

function extractPrintableExpenseDescription(expense, fallback = '') {
  if (!expense || typeof expense !== 'object') {
    return fallback;
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

  return fallback;
}

function formatPurchasePaymentMethod(value) {
  const labels = {
    EFECTIVO: 'Efectivo',
    TRANSFERENCIA: 'Transferencia',
  };
  return labels[value] || value || '';
}
