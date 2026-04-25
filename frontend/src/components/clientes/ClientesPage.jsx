import { startTransition, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  ListOrdered,
  UserRoundPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  cambiarEstadoCliente,
  crearCliente,
  eliminarCliente,
  obtenerCliente,
  actualizarCliente,
} from '../../services/clientes.service';
import {
  CLIENTES_VISTAS,
  useClientesStore,
} from '../../store/useClientesStore';
import {
  VENTA_DETALLE_TABS,
  useVentasStore,
} from '../../store/useVentasStore';
import useToast from '../../hooks/useToast';
import { extractApiError } from '../../utils/clientes';
import { ToastContainer } from '../ui/Toast';
import ClienteDetail from './ClienteDetail';
import ClienteForm from './ClienteForm';
import ClientesList from './ClientesList';
import MejoresClientes from './MejoresClientes';

export default function ClientesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, toast, closeToast } = useToast();
  const {
    vistaActual,
    clienteSeleccionado,
    modoFormulario,
    setVistaActual,
    setClienteSeleccionado,
    openClienteDetail,
    openCreateCliente,
    openEditCliente,
  } = useClientesStore();
  const [submitError, setSubmitError] = useState(null);

  const invalidateClientes = () => {
    queryClient.invalidateQueries({ queryKey: ['clientes'] });
  };

  const createMutation = useMutation({
    mutationFn: crearCliente,
    onSuccess: async (cliente) => {
      setSubmitError(null);
      invalidateClientes();
      const refreshed = await obtenerCliente(cliente.id);
      toast.success(`Cliente ${refreshed.nombre_completo} creado`);
      startTransition(() => {
        openClienteDetail(refreshed);
      });
    },
    onError: (error) => {
      const message = extractApiError(error, 'No fue posible crear el cliente');
      setSubmitError(message);
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, datos }) => actualizarCliente(id, datos),
    onSuccess: async (cliente) => {
      setSubmitError(null);
      invalidateClientes();
      const refreshed = await obtenerCliente(cliente.id);
      toast.success(`Cliente ${refreshed.nombre_completo} actualizado`);
      startTransition(() => {
        openClienteDetail(refreshed);
      });
    },
    onError: (error) => {
      const message = extractApiError(
        error,
        'No fue posible actualizar el cliente',
      );
      setSubmitError(message);
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: eliminarCliente,
    onSuccess: () => {
      invalidateClientes();
      toast.success('Cliente desactivado del listado operativo');
      setClienteSeleccionado(null);
      startTransition(() => {
        setVistaActual(CLIENTES_VISTAS.LISTA);
      });
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible eliminar el cliente'),
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, activo }) => cambiarEstadoCliente(id, activo),
    onSuccess: async (cliente) => {
      invalidateClientes();
      const refreshed = await obtenerCliente(cliente.id);
      toast.success(
        refreshed.activo
          ? 'Cliente activado para operacion'
          : 'Cliente marcado como inactivo',
      );
      startTransition(() => {
        if (vistaActual === CLIENTES_VISTAS.DETALLE) {
          openClienteDetail(refreshed);
        }
      });
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible cambiar el estado'),
      );
    },
  });

  const tabs = [
    {
      key: CLIENTES_VISTAS.LISTA,
      label: 'Clientes',
      note: 'Base operativa',
      icon: ListOrdered,
    },
    {
      key: CLIENTES_VISTAS.FORMULARIO,
      label: 'Formulario',
      note: 'Alta y edicion',
      icon: UserRoundPlus,
    },
    {
      key: CLIENTES_VISTAS.DASHBOARD,
      label: 'Dashboard',
      note: 'Top y riesgo',
      icon: BarChart3,
    },
  ];

  const handleTabChange = (tabKey) => {
    if (tabKey === CLIENTES_VISTAS.FORMULARIO) {
      setSubmitError(null);
      openCreateCliente();
      return;
    }

    startTransition(() => {
      setVistaActual(tabKey);
    });
  };

  const handleViewCliente = async (cliente, tab) => {
    try {
      const fullCliente = await obtenerCliente(cliente.id);
      startTransition(() => {
        openClienteDetail(fullCliente, tab);
      });
    } catch (error) {
      toast.error(extractApiError(error, 'No fue posible abrir el cliente'));
    }
  };

  const handleDeleteCliente = (cliente) => {
    const accepted = window.confirm(
      `Eliminar a ${cliente.nombre_completo || 'este cliente'} del modulo de clientes?`,
    );
    if (!accepted) {
      return;
    }

    deleteMutation.mutate(cliente.id);
  };

  const handleToggleCliente = (cliente) => {
    toggleMutation.mutate({
      id: cliente.id,
      activo: !cliente.activo,
    });
  };

  const handleSubmit = (payload) => {
    if (modoFormulario === 'edit' && clienteSeleccionado?.id) {
      updateMutation.mutate({
        id: clienteSeleccionado.id,
        datos: payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const openDashboard = () => {
    startTransition(() => {
      setVistaActual(CLIENTES_VISTAS.DASHBOARD);
    });
  };

  const openVentasAbono = (venta) => {
    useVentasStore
      .getState()
      .openVentaDetail(venta, VENTA_DETALLE_TABS.ABONOS);
    navigate('/ventas');
  };

  const openVentaResumen = (venta) => {
    useVentasStore
      .getState()
      .openVentaDetail(venta, VENTA_DETALLE_TABS.RESUMEN);
    navigate('/ventas');
  };

  return (
    <div className="space-y-6">
      <section className="surface rounded-[28px] p-5 sm:p-6 xl:p-7">
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              Modulo de clientes
            </div>
            <h2 className="font-display text-3xl text-white sm:text-4xl">
              Perfil comercial, cartera y lectura de valor del cliente en una sola consola.
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-400">
              El flujo une base maestra, analitica y seguimiento de pagos para
              que ventas y cartera operen sobre la misma vista de cliente.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = vistaActual === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={`rounded-[24px] border px-4 py-4 text-left transition ${
                    active
                      ? 'border-emerald-400/30 bg-emerald-400/12 shadow-[0_20px_60px_rgba(16,185,129,0.15)]'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <Icon
                      className={`h-5 w-5 ${
                        active ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    />
                    {tab.key === CLIENTES_VISTAS.FORMULARIO && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {modoFormulario === 'edit' ? 'edicion' : 'alta'}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 font-display text-xl text-white">
                    {tab.label}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">{tab.note}</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {vistaActual === CLIENTES_VISTAS.LISTA && (
        <ClientesList
          onCreate={() => {
            setSubmitError(null);
            openCreateCliente();
          }}
          onView={handleViewCliente}
          onEdit={(cliente) => {
            setSubmitError(null);
            openEditCliente(cliente);
          }}
          onDelete={handleDeleteCliente}
          onToggleActive={handleToggleCliente}
          onOpenDashboard={openDashboard}
        />
      )}

      {vistaActual === CLIENTES_VISTAS.FORMULARIO && (
        <ClienteForm
          key={`${modoFormulario}-${clienteSeleccionado?.id || 'nuevo'}`}
          cliente={clienteSeleccionado}
          mode={modoFormulario}
          saldoPendiente={Number(clienteSeleccionado?.saldo_pendiente || 0)}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          submitError={submitError}
          onBack={() => setVistaActual(CLIENTES_VISTAS.LISTA)}
          onSubmit={handleSubmit}
        />
      )}

      {vistaActual === CLIENTES_VISTAS.DETALLE && clienteSeleccionado?.id && (
        <ClienteDetail
          clienteId={clienteSeleccionado.id}
          onBack={() => setVistaActual(CLIENTES_VISTAS.LISTA)}
          onEdit={(cliente) => {
            setSubmitError(null);
            openEditCliente(cliente);
          }}
          onDelete={handleDeleteCliente}
          onToggleActive={handleToggleCliente}
          onAbonarVenta={openVentasAbono}
          onOpenVenta={openVentaResumen}
        />
      )}

      {vistaActual === CLIENTES_VISTAS.DASHBOARD && (
        <MejoresClientes onOpenCliente={handleViewCliente} />
      )}

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}
