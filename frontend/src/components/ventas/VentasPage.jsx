import { startTransition, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart3, CreditCard, ListOrdered, Wallet } from 'lucide-react';
import useToast from '../../hooks/useToast';
import {
  crearNotaCreditoVenta,
  descargarFacturaVentaPdf,
  descargarFacturaVentaXml,
  emitirFacturaVenta,
  enviarFacturaVentaEmail,
  reintentarFacturaVenta,
} from '../../services/facturacion.service';
import { extractApiError } from '../../utils/ventas';
import { ToastContainer } from '../ui/Toast';
import {
  cancelarVenta,
  crearVentaCompleta,
  obtenerVenta,
  actualizarVenta,
} from '../../services/ventas.service';
import { registrarAbonoVenta } from '../../services/abonos.service';
import {
  VENTAS_VISTAS,
  VENTA_DETALLE_TABS,
  useVentasStore,
} from '../../store/useVentasStore';
import {
  buildVentaPayload,
  printVentaTicket,
} from '../../utils/ventas';
import CuentasPorCobrar from './CuentasPorCobrar';
import ReportesVentas from './ReportesVentas';
import VentaDetail from './VentaDetail';
import VentaForm from './VentaForm';
import VentasList from './VentasList';

export default function VentasPage() {
  const queryClient = useQueryClient();
  const { toasts, toast, closeToast } = useToast();
  const {
    vistaActual,
    draft,
    ventaSeleccionada,
    clientesTemporales,
    setVistaActual,
    setVentaSeleccionada,
    openVentaDetail,
    detalleTab,
    cargarVentaEnDraft,
    resetDraft,
    setDraftField,
    addProductoAlDraft,
    actualizarItemDraft,
    eliminarItemDraft,
    setClienteSeleccionado,
    registrarClienteTemporal,
  } = useVentasStore();
  const [abonoError, setAbonoError] = useState(null);
  const [posFocusSignal, setPosFocusSignal] = useState(0);

  const invalidateVentas = () => {
    queryClient.invalidateQueries({ queryKey: ['ventas'] });
    queryClient.invalidateQueries({ queryKey: ['abonos'] });
    queryClient.invalidateQueries({ queryKey: ['inventario'] });
    queryClient.invalidateQueries({ queryKey: ['facturacion'] });
  };

  const refreshVentaDetail = async (ventaId, tab = detalleTab) => {
    const refreshed = await obtenerVenta(ventaId);
    startTransition(() => {
      openVentaDetail(refreshed, tab);
    });
    return refreshed;
  };

  const crearVentaMutation = useMutation({
    mutationFn: crearVentaCompleta,
    onSuccess: (venta) => {
      invalidateVentas();
      toast.success(`Venta ${venta.numero_venta} registrada`);
      if (draft.imprimirTicket) {
        printVentaTicket(venta);
      }
      resetDraft();
      setVentaSeleccionada(null);
      setPosFocusSignal((current) => current + 1);
      startTransition(() => {
        setVistaActual(VENTAS_VISTAS.POS);
      });
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible registrar la venta'));
    },
  });

  const actualizarVentaMutation = useMutation({
    mutationFn: ({ id, datos }) => actualizarVenta(id, datos),
    onSuccess: async (venta) => {
      invalidateVentas();
      const refreshed = await obtenerVenta(venta.id);
      toast.success(`Venta ${refreshed.numero_venta} actualizada`);
      resetDraft();
      setVentaSeleccionada(null);
      setPosFocusSignal((current) => current + 1);
      startTransition(() => {
        setVistaActual(VENTAS_VISTAS.POS);
      });
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible actualizar la venta'));
    },
  });

  const cancelarVentaMutation = useMutation({
    mutationFn: ({ id, motivo }) => cancelarVenta(id, motivo),
    onSuccess: (venta) => {
      invalidateVentas();
      toast.success(`Venta ${venta.numero_venta} cancelada`);
      startTransition(() => {
        openVentaDetail(venta, detalleTab);
      });
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible cancelar la venta'));
    },
  });

  const registrarAbonoMutation = useMutation({
    mutationFn: ({ ventaId, datos }) => registrarAbonoVenta(ventaId, datos),
    onSuccess: async (_, variables) => {
      setAbonoError(null);
      invalidateVentas();
      const venta = await obtenerVenta(variables.ventaId);
      toast.success(`Abono registrado en ${venta.numero_venta}`);
      startTransition(() => {
        openVentaDetail(venta, VENTA_DETALLE_TABS.ABONOS);
      });
    },
    onError: (error) => {
      const message = extractApiError(
        error,
        'No fue posible registrar el abono',
      );
      setAbonoError(message);
      toast.error(message);
    },
  });

  const emitirFacturaMutation = useMutation({
    mutationFn: (venta) => emitirFacturaVenta(venta.id),
    onSuccess: async (_, venta) => {
      invalidateVentas();
      const refreshed = await refreshVentaDetail(venta.id);
      toast.success(
        refreshed.factura_documento?.bill_number
          ? `Factura ${refreshed.factura_documento.bill_number} emitida`
          : 'Emision electronica procesada',
      );
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible emitir la factura'));
    },
  });

  const reintentarFacturaMutation = useMutation({
    mutationFn: (venta) => reintentarFacturaVenta(venta.id),
    onSuccess: async (_, venta) => {
      invalidateVentas();
      await refreshVentaDetail(venta.id);
      toast.success('Se reintento la emision electronica');
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible reintentar la factura'));
    },
  });

  const enviarFacturaEmailMutation = useMutation({
    mutationFn: ({ venta, email }) => enviarFacturaVentaEmail(venta.id, email),
    onSuccess: async (_, variables) => {
      invalidateVentas();
      await refreshVentaDetail(variables.venta.id);
      toast.success('Factura enviada por correo');
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible enviar el correo de la factura'),
      );
    },
  });

  const notaCreditoMutation = useMutation({
    mutationFn: ({ venta, reason }) =>
      crearNotaCreditoVenta(venta.id, { reason }),
    onSuccess: async (_, variables) => {
      invalidateVentas();
      await refreshVentaDetail(variables.venta.id);
      toast.success('Nota credito registrada');
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible generar la nota credito'),
      );
    },
  });

  const handleSubmitVenta = (payload) => {
    if (payload.ventaId) {
      const body = buildVentaPayload(payload);
      actualizarVentaMutation.mutate({
        id: payload.ventaId,
        datos: body,
      });
      return;
    }

    crearVentaMutation.mutate(payload);
  };

  const handleOpenPos = () => {
    resetDraft();
    setVentaSeleccionada(null);
    startTransition(() => {
      setVistaActual(VENTAS_VISTAS.POS);
    });
  };

  const handleViewVenta = async (venta, tab = VENTA_DETALLE_TABS.RESUMEN) => {
    try {
      const fullVenta = await obtenerVenta(venta.id);
      startTransition(() => {
        openVentaDetail(fullVenta, tab);
      });
    } catch (error) {
      toast.error(extractApiError(error, 'No fue posible abrir la venta'));
    }
  };

  const handleEditVenta = async (venta) => {
    try {
      const fullVenta = venta.detalles ? venta : await obtenerVenta(venta.id);
      cargarVentaEnDraft(fullVenta);
      startTransition(() => {
        setVistaActual(VENTAS_VISTAS.POS);
      });
      toast.info(`Editando ${fullVenta.numero_venta}`);
    } catch (error) {
      toast.error(extractApiError(error, 'No fue posible preparar la venta'));
    }
  };

  const handleCancelVenta = (venta) => {
    const motivo =
      window.prompt(`Motivo de cancelacion para ${venta.numero_venta}`) || '';

    if (!motivo.trim()) {
      return;
    }

    cancelarVentaMutation.mutate({
      id: venta.id,
      motivo,
    });
  };

  const handleFacturar = (venta) => {
    if (!venta.factura_electronica) {
      toast.info('Activa factura electronica en la venta para continuar.');
      return;
    }

    const status = venta.factura_documento?.status;
    if (status === 'EMITIDA') {
      toast.info('La venta ya tiene factura electronica emitida.');
      handleViewVenta(venta, VENTA_DETALLE_TABS.RESUMEN);
      return;
    }

    if (status === 'ERROR') {
      reintentarFacturaMutation.mutate(venta);
      return;
    }

    emitirFacturaMutation.mutate(venta);
  };

  const handleDescargarFacturaPdf = async (venta) => {
    try {
      await descargarFacturaVentaPdf(venta.id);
      toast.success('PDF de factura descargado');
    } catch (error) {
      toast.error(extractApiError(error, 'No fue posible descargar el PDF'));
    }
  };

  const handleDescargarFacturaXml = async (venta) => {
    try {
      await descargarFacturaVentaXml(venta.id);
      toast.success('XML de factura descargado');
    } catch (error) {
      toast.error(extractApiError(error, 'No fue posible descargar el XML'));
    }
  };

  const handleEnviarFacturaEmail = (venta) => {
    const emailSugerido = venta.cliente?.email || '';
    const email = window.prompt(
      `Correo destino para ${venta.numero_venta}`,
      emailSugerido,
    );

    if (!email?.trim()) {
      return;
    }

    enviarFacturaEmailMutation.mutate({
      venta,
      email: email.trim(),
    });
  };

  const handleCrearNotaCredito = (venta) => {
    const reason = window.prompt(
      `Motivo de nota credito para ${venta.numero_venta}`,
      'Anulacion fiscal de factura electronica',
    );

    if (!reason?.trim()) {
      return;
    }

    notaCreditoMutation.mutate({
      venta,
      reason: reason.trim(),
    });
  };

  const handleSubmitAbono = async (datos) => {
    if (!ventaSeleccionada?.id) {
      return;
    }

    await registrarAbonoMutation.mutateAsync({
      ventaId: ventaSeleccionada.id,
      datos,
    });
  };

  const tabs = [
    {
      key: VENTAS_VISTAS.POS,
      label: 'POS',
      icon: CreditCard,
      note: 'Caja y captura',
    },
    {
      key: VENTAS_VISTAS.LISTA,
      label: 'Ventas',
      icon: ListOrdered,
      note: 'Listado operativo',
    },
    {
      key: VENTAS_VISTAS.CARTERA,
      label: 'Cartera',
      icon: Wallet,
      note: 'Cobros pendientes',
    },
    {
      key: VENTAS_VISTAS.REPORTES,
      label: 'Reportes',
      icon: BarChart3,
      note: 'Lectura gerencial',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface p-3">
        <div className="mb-2 text-[8px] font-semibold uppercase tracking-[0.2em] text-muted">
          Modulo de ventas
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = vistaActual === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setVistaActual(tab.key)}
                className={`tab-card min-h-[68px] px-3 py-2.5 ${active ? 'tab-card-active' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      active ? 'text-[var(--accent)]' : 'text-soft'
                    }`}
                  />
                  <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-muted">
                    {tab.note}
                  </span>
                </div>
                <div className="mt-2.5 font-display text-[1.15rem] leading-none text-main">
                  {tab.label}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {vistaActual === VENTAS_VISTAS.POS && (
        <VentaForm
          draft={draft}
          localClients={clientesTemporales}
          isLoading={
            crearVentaMutation.isPending || actualizarVentaMutation.isPending
          }
          error={
            crearVentaMutation.isError
              ? extractApiError(
                  crearVentaMutation.error,
                  'No fue posible registrar la venta',
                )
              : actualizarVentaMutation.isError
                ? extractApiError(
                    actualizarVentaMutation.error,
                    'No fue posible actualizar la venta',
                  )
                : null
          }
          onChangeField={setDraftField}
          onAddProduct={addProductoAlDraft}
          onUpdateItem={actualizarItemDraft}
          onRemoveItem={eliminarItemDraft}
          onSelectClient={setClienteSeleccionado}
          onCreateQuickClient={registrarClienteTemporal}
          onReset={handleOpenPos}
          onSubmit={handleSubmitVenta}
          focusSignal={posFocusSignal}
        />
      )}

      {vistaActual === VENTAS_VISTAS.LISTA && (
        <VentasList
          onView={(venta) => handleViewVenta(venta, VENTA_DETALLE_TABS.RESUMEN)}
          onEdit={handleEditVenta}
          onAbonar={(venta) =>
            handleViewVenta(venta, VENTA_DETALLE_TABS.ABONOS)
          }
          onCancel={handleCancelVenta}
          onFacturar={handleFacturar}
          onCreate={handleOpenPos}
        />
      )}

      {vistaActual === VENTAS_VISTAS.DETALLE && ventaSeleccionada && (
        <VentaDetail
          ventaId={ventaSeleccionada.id}
          onBack={() => setVistaActual(VENTAS_VISTAS.LISTA)}
          onEdit={handleEditVenta}
          onAbonar={handleSubmitAbono}
          onCancel={handleCancelVenta}
          onFacturar={handleFacturar}
          onReintentarFactura={(venta) => reintentarFacturaMutation.mutate(venta)}
          onDescargarFacturaPdf={handleDescargarFacturaPdf}
          onDescargarFacturaXml={handleDescargarFacturaXml}
          onEnviarFacturaEmail={handleEnviarFacturaEmail}
          onCrearNotaCredito={handleCrearNotaCredito}
          abonoSubmitting={registrarAbonoMutation.isPending}
          abonoError={abonoError}
        />
      )}

      {vistaActual === VENTAS_VISTAS.CARTERA && (
        <CuentasPorCobrar
          onAbonar={(venta) =>
            handleViewVenta(venta, VENTA_DETALLE_TABS.ABONOS)
          }
          onOpenVenta={(venta) =>
            handleViewVenta(venta, VENTA_DETALLE_TABS.RESUMEN)
          }
        />
      )}

      {vistaActual === VENTAS_VISTAS.REPORTES && <ReportesVentas />}

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}
