import { startTransition, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart3, CreditCard, ListOrdered, Wallet } from 'lucide-react';
import useToast from '../../hooks/useToast';
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

  const invalidateVentas = () => {
    queryClient.invalidateQueries({ queryKey: ['ventas'] });
    queryClient.invalidateQueries({ queryKey: ['abonos'] });
    queryClient.invalidateQueries({ queryKey: ['inventario'] });
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
      setVentaSeleccionada(venta);
      startTransition(() => {
        openVentaDetail(venta, VENTA_DETALLE_TABS.RESUMEN);
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
      startTransition(() => {
        openVentaDetail(refreshed, VENTA_DETALLE_TABS.RESUMEN);
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
    toast.info(
      venta.factura_electronica
        ? 'La integracion de emision electronica queda lista para conectarse al endpoint final.'
        : 'Activa factura electronica en la venta para continuar.',
    );
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
      <section className="surface rounded-[28px] p-5 sm:p-6 xl:p-7">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              Modulo de ventas
            </div>
            <h2 className="font-display text-3xl text-white sm:text-4xl">
              Punto de venta, cartera y reporte operacional en una misma vista.
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-400">
              La interfaz privilegia velocidad de caja y trazabilidad: crear,
              editar, consultar, cobrar y revisar el historial sin salir del
              flujo principal.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = vistaActual === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setVistaActual(tab.key)}
                  className={`rounded-[24px] border px-4 py-4 text-left transition ${
                    active
                      ? 'border-emerald-400/30 bg-emerald-400/12'
                      : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <Icon
                      className={`h-5 w-5 ${
                        active ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                      {tab.note}
                    </span>
                  </div>
                  <div className="mt-4 font-display text-xl text-white">
                    {tab.label}
                  </div>
                </button>
              );
            })}
          </div>
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
