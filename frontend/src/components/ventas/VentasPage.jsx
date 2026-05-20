import { startTransition, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart3,
  CreditCard,
  ListOrdered,
  Plus,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import useToast from '../../hooks/useToast';
import { useVentasKeyboardShortcuts } from '../../hooks/useVentasKeyboardShortcuts';
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
import {
  abrirCaja,
  obtenerEstadoOffline,
  reintentarFacturacionOffline,
  reintentarSync,
} from '../../services/offline.service';
import { registrarAbonoVenta } from '../../services/abonos.service';
import {
  VENTAS_VISTAS,
  VENTA_DETALLE_TABS,
  useVentasStore,
} from '../../store/useVentasStore';
import {
  persistLastTicketPreferences,
  resolveTicketPreferences,
  useAppStore,
} from '../../store/useStore';
import {
  calculateVentaTotals,
  buildVentaPayload,
  FACTUS_NOTA_CREDITO_PENDIENTE_DIAN_CODE,
  resolveFacturaErrorMessage,
} from '../../utils/ventas';
import { ThermalTicketPreviewModal } from './ThermalTicket';
import CuentasPorCobrar from './CuentasPorCobrar';
import ReportesVentas from './ReportesVentas';
import VentaDetail from './VentaDetail';
import VentaForm from './VentaForm';
import VentasList from './VentasList';

const hasReturnedItemsOnUpdate = (venta, nextDetalles = []) => {
  if (!venta?.detalles?.length) {
    return false;
  }

  const nextByProduct = new Map(
    nextDetalles.map((detalle) => [
      Number(detalle.producto),
      Number(detalle.cantidad || 0),
    ]),
  );

  return venta.detalles.some((detalle) => {
    const productoId = Number(detalle.producto?.id || detalle.producto);
    const previousQuantity = Number(detalle.cantidad || 0);
    const nextQuantity = nextByProduct.get(productoId) || 0;
    return nextQuantity < previousQuantity;
  });
};

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
    precuentas,
    precuentaActivaId,
    agregarPrecuenta,
    setPrecuentaActiva,
    cerrarPrecuenta,
    setDraftField,
    addProductoAlDraft,
    actualizarItemDraft,
    eliminarItemDraft,
    setClienteSeleccionado,
    registrarClienteTemporal,
  } = useVentasStore();
  const [abonoError, setAbonoError] = useState(null);
  const [ticketPreviewState, setTicketPreviewState] = useState({
    open: false,
    venta: null,
    draft: null,
    settings: resolveTicketPreferences(),
  });
  const [posFocusSignal, setPosFocusSignal] = useState(0);
  const [cobroShortcutSignal, setCobroShortcutSignal] = useState(0);
  const [submitShortcutSignal, setSubmitShortcutSignal] = useState(0);
  const empresaActiva = useAppStore((state) => state.empresaActiva);
  const configuracionOperativa = useAppStore(
    (state) => state.configuracionOperativa,
  );
  const user = useAppStore((state) => state.user);
  const offlineStatusQuery = useQuery({
    queryKey: ['offline', 'status', empresaActiva?.id],
    queryFn: obtenerEstadoOffline,
    enabled: Boolean(empresaActiva?.id),
    refetchInterval: 12000,
    retry: false,
  });
  const offlineStatus = offlineStatusQuery.data;
  const isLocalMode = offlineStatus?.mode === 'local';
  const cajaAbierta = Boolean(offlineStatus?.caja?.id);

  useVentasKeyboardShortcuts({
    enabled:
      vistaActual === VENTAS_VISTAS.POS
      && configuracionOperativa.atajos_ventas_activos,
    shortcuts: configuracionOperativa.atajos_ventas,
    onRegistrarVenta: () => setSubmitShortcutSignal((current) => current + 1),
    onConfigurarCobro: () => setCobroShortcutSignal((current) => current + 1),
    onNuevaPrecuenta: agregarPrecuenta,
    onQuitarUltimoProducto: () => {
      const lastItem = draft.items[draft.items.length - 1];
      if (lastItem) {
        eliminarItemDraft(lastItem.id);
      }
    },
  });

  const invalidateVentas = () => {
    queryClient.invalidateQueries({ queryKey: ['ventas'] });
    queryClient.invalidateQueries({ queryKey: ['abonos'] });
    queryClient.invalidateQueries({ queryKey: ['inventario'] });
    queryClient.invalidateQueries({ queryKey: ['facturacion'] });
    queryClient.invalidateQueries({ queryKey: ['offline'] });
  };

  const abrirCajaMutation = useMutation({
    mutationFn: () => abrirCaja({ efectivoInicial: '0.00' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offline'] });
      toast.success('Caja abierta para esta terminal');
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible abrir la caja'));
    },
  });

  const retrySyncMutation = useMutation({
    mutationFn: reintentarSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offline'] });
      toast.success('Pendientes de sincronizacion reactivados');
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible reintentar sync'));
    },
  });

  const retryInvoicesMutation = useMutation({
    mutationFn: reintentarFacturacionOffline,
    onSuccess: () => {
      invalidateVentas();
      toast.success('Reintento de facturacion iniciado');
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible reintentar facturas'));
    },
  });

  const getPreferredTicketSettings = () =>
    resolveTicketPreferences({
      empresaId: empresaActiva?.id || empresaActiva?.empresa_id,
      userId: user?.id,
      config: configuracionOperativa,
    });

  const rememberTicketSettings = (settings) => {
    persistLastTicketPreferences(
      empresaActiva?.id || empresaActiva?.empresa_id,
      user?.id,
      settings,
    );
  };

  const buildDraftTicketSettings = (draftSource) =>
    resolveTicketPreferences({
      empresaId: empresaActiva?.id || empresaActiva?.empresa_id,
      userId: user?.id,
      config: configuracionOperativa,
      fallback: {
        paperWidth: draftSource?.ticketPaperWidth,
        showLogo: draftSource?.ticketShowLogo,
        copies: draftSource?.ticketCopies,
      },
    });

  const openTicketPreview = ({ venta = null, draft: previewDraft = null, settings }) => {
    setTicketPreviewState({
      open: true,
      venta,
      draft: previewDraft,
      settings:
        settings
        || buildDraftTicketSettings(previewDraft || draft)
        || getPreferredTicketSettings(),
    });
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
    onSuccess: (venta, variables) => {
      invalidateVentas();
      toast.success(`Venta ${venta.numero_venta} registrada`);
      if (draft.imprimirTicket) {
        openTicketPreview({
          venta,
          draft: variables,
          settings: buildDraftTicketSettings(variables),
        });
      }
      cerrarPrecuenta(variables.precuentaId);
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
    onSuccess: async (venta, variables) => {
      invalidateVentas();
      const refreshed = await obtenerVenta(venta.id);
      toast.success(
        variables.hasReturnedItems
          ? (
              `Venta ${refreshed.numero_venta} actualizada. `
              + 'Los productos devueltos volvieron al inventario.'
            )
          : `Venta ${refreshed.numero_venta} actualizada`,
      );
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
      toast.success(
        `Venta ${venta.numero_venta} anulada. `
        + 'Todos los productos volvieron al inventario.',
      );
      startTransition(() => {
        openVentaDetail(venta, detalleTab);
      });
    },
    onError: (error) => {
      const message = extractApiError(
        error,
        'No fue posible anular la venta',
      );
      const resolution = error?.response?.data?.resolution;
      toast.error(resolution ? `${message} ${resolution}` : message);
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
    mutationFn: ({ venta, reason, conceptCode, items }) =>
      crearNotaCreditoVenta(venta.id, { reason, conceptCode, items }),
    onSuccess: async (_, variables) => {
      invalidateVentas();
      await refreshVentaDetail(variables.venta.id);
      toast.success('Nota credito registrada');
    },
    onError: async (error, variables) => {
      const errorCode = error?.response?.data?.code || '';
      const message = extractApiError(
        error,
        'No fue posible generar la nota credito',
      );

      invalidateVentas();
      if (variables?.venta?.id) {
        try {
          const refreshed = await refreshVentaDetail(variables.venta.id);
          toast.error(resolveFacturaErrorMessage(refreshed.factura_documento));
          return;
        } catch {
          // If refresh fails, fall back to the API error payload.
        }
      }

      if (errorCode === FACTUS_NOTA_CREDITO_PENDIENTE_DIAN_CODE) {
        toast.error(
          'Ya existe una nota credito pendiente en la DIAN para esta factura.',
        );
        return;
      }

      toast.error(message);
    },
  });

  const handleSubmitVenta = (payload) => {
    if (isLocalMode && !cajaAbierta) {
      toast.error('Debes abrir caja en esta terminal antes de vender.');
      return;
    }

    const localPayload = isLocalMode
      ? {
          ...payload,
          terminalId: offlineStatus?.terminal?.id,
          cajaSesionId: offlineStatus?.caja?.id,
        }
      : payload;

    if (payload.ventaId) {
      const body = buildVentaPayload(localPayload);
      actualizarVentaMutation.mutate({
        id: payload.ventaId,
        datos: body,
        hasReturnedItems: hasReturnedItemsOnUpdate(
          ventaSeleccionada,
          body.detalles,
        ),
      });
      return;
    }

    crearVentaMutation.mutate(localPayload);
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
      window.prompt(`Motivo de anulacion para ${venta.numero_venta}`) || '';

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
    const isPartial = window.confirm(
      'Aceptar: nota credito parcial. Cancelar: nota credito total.',
    );
    const reason = window.prompt(
      `Motivo de nota credito para ${venta.numero_venta}`,
      isPartial
        ? 'Devolucion parcial de productos'
        : 'Anulacion fiscal total de factura electronica',
    );

    if (!reason?.trim()) {
      return;
    }

    let items;
    if (isPartial) {
      items = (venta.detalles || [])
        .map((detalle) => {
          const cantidad = window.prompt(
            `Cantidad a devolver de ${detalle.producto?.nombre}`,
            '0',
          );
          const numericCantidad = Number(cantidad || 0);
          if (!numericCantidad) {
            return null;
          }
          return {
            detalle_id: detalle.id,
            cantidad: numericCantidad.toFixed(2),
          };
        })
        .filter(Boolean);

      if (!items.length) {
        toast.info('No se seleccionaron productos para nota credito parcial.');
        return;
      }
    }

    notaCreditoMutation.mutate({
      venta,
      reason: reason.trim(),
      conceptCode: isPartial ? '1' : '2',
      items,
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
    <div className="space-y-4">
      <section className="surface p-2">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = vistaActual === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setVistaActual(tab.key)}
                className={`module-nav-card min-h-[52px] ${active ? 'module-nav-card-active' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="module-nav-icon">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="module-nav-label">
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {vistaActual === VENTAS_VISTAS.POS && (
        <>
          {isLocalMode && (
            <LocalPosStatusPanel
              status={offlineStatus}
              isLoading={offlineStatusQuery.isLoading}
              onOpenCash={() => abrirCajaMutation.mutate()}
              openCashLoading={abrirCajaMutation.isPending}
              onRetrySync={() => retrySyncMutation.mutate()}
              onRetryInvoices={() => retryInvoicesMutation.mutate()}
              retryLoading={
                retrySyncMutation.isPending || retryInvoicesMutation.isPending
              }
            />
          )}
          <PrecuentasBar
            precuentas={precuentas}
            activeId={precuentaActivaId}
            onSelect={setPrecuentaActiva}
            onAdd={agregarPrecuenta}
          />
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
            onSubmit={(payload) =>
              handleSubmitVenta({
                ...payload,
                precuentaId: precuentaActivaId,
              })
            }
            disabled={isLocalMode && !cajaAbierta}
            focusSignal={posFocusSignal}
            openCobroSignal={cobroShortcutSignal}
            submitSignal={submitShortcutSignal}
          />
        </>
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
          onOpenTicketPreview={(venta) =>
            openTicketPreview({
              venta,
              settings: getPreferredTicketSettings(),
            })
          }
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

      <ThermalTicketPreviewModal
        open={ticketPreviewState.open}
        onClose={() =>
          setTicketPreviewState((current) => ({
            ...current,
            open: false,
          }))
        }
        venta={ticketPreviewState.venta}
        draft={ticketPreviewState.draft}
        empresa={empresaActiva}
        initialSettings={ticketPreviewState.settings}
        onSettingsChange={(nextSettings) =>
          setTicketPreviewState((current) => ({
            ...current,
            settings: nextSettings,
          }))
        }
        onPrint={(nextSettings) => {
          rememberTicketSettings(nextSettings);
          setTicketPreviewState((current) => ({
            ...current,
            settings: nextSettings,
          }));
        }}
      />
    </div>
  );
}

function LocalPosStatusPanel({
  status,
  isLoading,
  onOpenCash,
  openCashLoading,
  onRetrySync,
  onRetryInvoices,
  retryLoading,
}) {
  const counts = status?.counts || {};
  const offline = status?.mode === 'local' && !status?.online;
  const caja = status?.caja;

  return (
    <section className="surface border-amber-200 bg-amber-50/60 px-4 py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-amber-700">
              Modo local LAN
            </div>
            <div className="mt-1 text-sm font-semibold text-main">
              {offline
                ? 'Sin conexión - vendiendo localmente'
                : 'Servidor local operativo'}
            </div>
            <div className="mt-1 text-xs text-soft">
              {status?.terminal?.name || 'Configura una terminal POS'} ·{' '}
              {caja ? `Caja abierta desde ${new Date(caja.opened_at).toLocaleTimeString('es-CO')}` : 'Caja cerrada'}
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[520px]">
          <LocalStatusMetric label="Sync" value={counts.sync_pending || 0} />
          <LocalStatusMetric label="Facturas" value={counts.invoice_pending || 0} />
          <LocalStatusMetric label="Errores" value={(counts.sync_errors || 0) + (counts.invoice_errors || 0)} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!caja && (
            <button
              type="button"
              onClick={onOpenCash}
              disabled={isLoading || openCashLoading || !status?.terminal}
              className="app-button-primary min-h-10"
            >
              {openCashLoading ? 'Abriendo...' : 'Abrir caja'}
            </button>
          )}
          <button
            type="button"
            onClick={onRetrySync}
            disabled={retryLoading}
            className="app-button-secondary min-h-10"
          >
            <RefreshCw className="h-4 w-4" />
            Sync
          </button>
          <button
            type="button"
            onClick={onRetryInvoices}
            disabled={retryLoading}
            className="app-button-secondary min-h-10"
          >
            Facturas
          </button>
        </div>
      </div>
    </section>
  );
}

function LocalStatusMetric({ label, value }) {
  return (
    <div className="rounded-md border border-amber-200 bg-white/80 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-main">{value}</div>
    </div>
  );
}

function PrecuentasBar({ precuentas = [], activeId, onSelect, onAdd }) {
  return (
    <section className="surface px-3 py-2">
      <div className="flex items-center gap-2 overflow-x-auto">
        {precuentas.map((precuenta) => {
          const active = precuenta.id === activeId;
          const total = calculateVentaTotals(precuenta.draft).total;
          const itemCount = precuenta.draft.items.length;

          return (
            <button
              key={precuenta.id}
              type="button"
              onClick={() => onSelect(precuenta.id)}
              className={`flex min-h-10 min-w-[148px] items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition ${
                active
                  ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-main'
                  : 'border-app bg-white/72 text-soft hover:bg-white hover:text-main'
              }`}
            >
              <span>
                <span className="block text-[12px] font-semibold">
                  {precuenta.label}
                </span>
                <span className="mt-0.5 block text-[10px] text-muted">
                  {itemCount} lineas
                </span>
              </span>
              <span className="text-[11px] font-semibold">
                ${Math.round(total).toLocaleString('es-CO')}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-10 shrink-0 items-center gap-2 rounded-md border border-app bg-white/72 px-3 py-2 text-[12px] font-semibold text-main transition hover:border-[var(--accent-line)] hover:bg-white"
        >
          <Plus className="h-4 w-4" />
          Nueva precuenta
        </button>
      </div>
    </section>
  );
}
