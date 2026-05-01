import { startTransition, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useToast from '../../hooks/useToast';
import {
  descargarReporteExcel,
  descargarReportePdf,
  generarReporteInforme,
  listarCierresCaja,
  listarReportesInforme,
  obtenerCierreCaja,
  obtenerEstadisticasClientesInforme,
  obtenerEstadisticasFinancierasInforme,
  obtenerEstadisticasProductosInforme,
  obtenerEstadisticasVentasInforme,
  obtenerReporteInforme,
  triggerBrowserDownload,
} from '../../services/informes.service';
import { ToastContainer } from '../ui/Toast';
import { extractApiError, normalizeCollection } from '../../utils/ventas';
import GenerarReporteForm from './GenerarReporteForm';
import HistorialReportes from './HistorialReportes';
import InformesModuleNav from './InformesModuleNav';
import PreviewReporte from './PreviewReporte';
import { getReportMeta, supportsFormat } from './reportes-config';

const TODAY = new Date().toISOString().slice(0, 10);
const MONTH_START = `${TODAY.slice(0, 8)}01`;

export default function ReportesPage() {
  const queryClient = useQueryClient();
  const { toasts, toast, closeToast } = useToast();
  const [form, setForm] = useState({
    tipo_reporte: 'VENTAS_PERIODO',
    formato: 'pdf',
    fecha_inicio: MONTH_START,
    fecha_fin: TODAY,
    cierre_id: '',
    limite: '10',
  });
  const [historyFilters, setHistoryFilters] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    q: '',
    page: 1,
    page_size: 10,
  });
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [formError, setFormError] = useState('');

  const reportMeta = getReportMeta(form.tipo_reporte);

  const cierresQuery = useQuery({
    queryKey: ['informes', 'reportes', 'cierres-options'],
    queryFn: () =>
      listarCierresCaja({
        ordering: '-fecha_cierre',
        page_size: 50,
      }),
    placeholderData: (previousData) => previousData,
  });

  const historyQuery = useQuery({
    queryKey: ['informes', 'reportes', 'history', historyFilters],
    queryFn: () => listarReportesInforme(historyFilters),
    placeholderData: (previousData) => previousData,
  });

  const reportDetailQuery = useQuery({
    queryKey: ['informes', 'reportes', 'detail', selectedReportId],
    queryFn: () => obtenerReporteInforme(selectedReportId),
    enabled: Boolean(selectedReportId),
  });

  const ventasPreviewQuery = useQuery({
    queryKey: ['informes', 'reportes', 'preview', 'ventas', form],
    queryFn: () =>
      obtenerEstadisticasVentasInforme({
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        anio: Number(form.fecha_fin.slice(0, 4)),
      }),
    enabled:
      reportMeta.previewKind === 'ventas' &&
      Boolean(form.fecha_inicio && form.fecha_fin),
    placeholderData: (previousData) => previousData,
  });

  const productosPreviewQuery = useQuery({
    queryKey: ['informes', 'reportes', 'preview', 'productos', form],
    queryFn: () =>
      obtenerEstadisticasProductosInforme({
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        limite: Number(form.limite || 10),
      }),
    enabled:
      reportMeta.previewKind === 'productos' &&
      Boolean(form.fecha_inicio && form.fecha_fin),
    placeholderData: (previousData) => previousData,
  });

  const clientesPreviewQuery = useQuery({
    queryKey: ['informes', 'reportes', 'preview', 'clientes', form],
    queryFn: () =>
      obtenerEstadisticasClientesInforme({
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        limite: Number(form.limite || 10),
      }),
    enabled:
      reportMeta.previewKind === 'clientes' &&
      Boolean(form.fecha_inicio && form.fecha_fin),
    placeholderData: (previousData) => previousData,
  });

  const financieroPreviewQuery = useQuery({
    queryKey: ['informes', 'reportes', 'preview', 'financiero', form],
    queryFn: () =>
      obtenerEstadisticasFinancierasInforme({
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
      }),
    enabled:
      reportMeta.previewKind === 'financiero' &&
      Boolean(form.fecha_inicio && form.fecha_fin),
    placeholderData: (previousData) => previousData,
  });

  const inventarioPreviewQuery = useQuery({
    queryKey: ['informes', 'reportes', 'preview', 'inventario', form],
    queryFn: () =>
      obtenerEstadisticasProductosInforme({
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        limite: Number(form.limite || 10),
      }),
    enabled:
      reportMeta.previewKind === 'inventario' &&
      Boolean(form.fecha_inicio && form.fecha_fin),
    placeholderData: (previousData) => previousData,
  });

  const cierrePreviewQuery = useQuery({
    queryKey: ['informes', 'reportes', 'preview', 'cierre', form.cierre_id],
    queryFn: () => obtenerCierreCaja(Number(form.cierre_id)),
    enabled:
      reportMeta.previewKind === 'cierre' && Boolean(form.cierre_id),
    placeholderData: (previousData) => previousData,
  });

  const generateMutation = useMutation({
    mutationFn: generarReporteInforme,
    onSuccess: async (report) => {
      queryClient.invalidateQueries({ queryKey: ['informes', 'reportes', 'history'] });
      toast.success(`Reporte ${report.id} generado correctamente.`);
      setSelectedReportId(report.id);

      try {
        if (report.archivo_pdf_url && form.formato === 'pdf') {
          const response = await descargarReportePdf(report.id);
          triggerBrowserDownload(response, `reporte-${report.id}.pdf`);
        } else if (report.archivo_excel_url && form.formato === 'excel') {
          const response = await descargarReporteExcel(report.id);
          triggerBrowserDownload(response, `reporte-${report.id}.xlsx`);
        } else if (form.formato === 'pdf') {
          const response = await descargarReportePdf(report.id);
          triggerBrowserDownload(response, `reporte-${report.id}.pdf`);
        } else if (form.formato === 'excel') {
          const response = await descargarReporteExcel(report.id);
          triggerBrowserDownload(response, `reporte-${report.id}.xlsx`);
        }
      } catch (error) {
        toast.warning(
          extractApiError(error, 'El reporte se genero, pero la descarga no pudo completarse.'),
        );
      }
    },
    onError: (error) => {
      setFormError(
        extractApiError(error, 'No fue posible generar el reporte.'),
      );
      toast.error(
        extractApiError(error, 'No fue posible generar el reporte.'),
      );
    },
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async (reportId) => {
      const response = await descargarReportePdf(reportId);
      triggerBrowserDownload(response, `reporte-${reportId}.pdf`);
    },
    onSuccess: () => {
      toast.success('PDF descargado correctamente.');
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible descargar el PDF.'),
      );
    },
  });

  const downloadExcelMutation = useMutation({
    mutationFn: async (reportId) => {
      const response = await descargarReporteExcel(reportId);
      triggerBrowserDownload(response, `reporte-${reportId}.xlsx`);
    },
    onSuccess: () => {
      toast.success('Excel descargado correctamente.');
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible descargar el Excel.'),
      );
    },
  });

  const livePreviewData = resolveLivePreviewData({
    kind: reportMeta.previewKind,
    ventas: ventasPreviewQuery.data,
    productos: productosPreviewQuery.data,
    clientes: clientesPreviewQuery.data,
    financiero: financieroPreviewQuery.data,
    inventario: inventarioPreviewQuery.data,
    cierre: cierrePreviewQuery.data,
  });

  const livePreviewLoading =
    ventasPreviewQuery.isLoading ||
    productosPreviewQuery.isLoading ||
    clientesPreviewQuery.isLoading ||
    financieroPreviewQuery.isLoading ||
    inventarioPreviewQuery.isLoading ||
    cierrePreviewQuery.isLoading;

  const handleFormChange = (field, value) => {
    setSelectedReportId(null);
    setFormError('');
    setForm((current) => {
      const nextForm = {
        ...current,
        [field]: value,
      };

      if (field === 'tipo_reporte') {
        const nextMeta = getReportMeta(value);
        if (
          nextMeta.supports.length > 0 &&
          !nextMeta.supports.includes(nextForm.formato)
        ) {
          nextForm.formato = nextMeta.supports[0];
        }
      }

      return nextForm;
    });
  };

  const handleGenerate = (event) => {
    event.preventDefault();

    if (reportMeta.previewOnly) {
      setFormError('Este tipo solo tiene vista previa. No existe exportador backend configurado.');
      return;
    }

    if (reportMeta.requiresDateRange) {
      if (!form.fecha_inicio || !form.fecha_fin) {
        setFormError('Debes indicar fecha de inicio y fecha de fin.');
        return;
      }

      if (form.fecha_inicio > form.fecha_fin) {
        setFormError('La fecha de fin no puede ser anterior a la fecha inicial.');
        return;
      }
    }

    if (reportMeta.requiresCierre && !form.cierre_id) {
      setFormError('Debes seleccionar un cierre de caja para este reporte.');
      return;
    }

    if (!supportsFormat(form.tipo_reporte, form.formato)) {
      setFormError('El formato seleccionado no esta soportado para este tipo de reporte.');
      return;
    }

    setFormError('');

    generateMutation.mutate({
      tipo_reporte: form.tipo_reporte,
      formato: form.formato,
      fecha_inicio: reportMeta.requiresDateRange ? form.fecha_inicio : undefined,
      fecha_fin: reportMeta.requiresDateRange ? form.fecha_fin : undefined,
      cierre_id: reportMeta.requiresCierre ? Number(form.cierre_id) : undefined,
      limite: Number(form.limite || 10),
    });
  };

  return (
    <div className="space-y-6">
      <InformesModuleNav />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <GenerarReporteForm
            form={form}
            onChange={handleFormChange}
            onSubmit={handleGenerate}
            cierresOptions={normalizeCollection(cierresQuery.data).results}
            isSubmitting={generateMutation.isPending}
            error={formError}
          />

          <HistorialReportes
            data={normalizeCollection(historyQuery.data)}
            filters={historyFilters}
            onChangeFilters={setHistoryFilters}
            onPageChange={(page) =>
              setHistoryFilters((current) => ({
                ...current,
                page,
              }))
            }
            onSelect={(reportId) =>
              startTransition(() => {
                setSelectedReportId(reportId);
              })
            }
            onDownloadPdf={(reportId) => downloadPdfMutation.mutate(reportId)}
            onDownloadExcel={(reportId) =>
              downloadExcelMutation.mutate(reportId)
            }
            isLoading={historyQuery.isLoading}
            selectedId={selectedReportId}
          />
        </div>

        <PreviewReporte
          reportType={form.tipo_reporte}
          previewData={livePreviewData}
          historicalReport={reportDetailQuery.data}
          isLoading={livePreviewLoading || reportDetailQuery.isLoading}
        />
      </div>

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}

function resolveLivePreviewData({
  kind,
  ventas,
  productos,
  clientes,
  financiero,
  inventario,
  cierre,
}) {
  if (kind === 'ventas') {
    return ventas;
  }

  if (kind === 'productos') {
    return productos;
  }

  if (kind === 'clientes') {
    return clientes;
  }

  if (kind === 'financiero') {
    return financiero;
  }

  if (kind === 'inventario') {
    return {
      inventario: productosToInventarioPayload(inventario),
    };
  }

  if (kind === 'cierre') {
    return cierre;
  }

  return null;
}

function productosToInventarioPayload(productosData = {}) {
  return productosData?.inventario || {};
}
