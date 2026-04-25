import { startTransition, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Factory, FilePenLine, ListOrdered } from 'lucide-react';
import useToast from '../../hooks/useToast';
import {
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  obtenerProveedor,
} from '../../services/proveedores.service';
import {
  PROVEEDORES_VISTAS,
  useProveedoresStore,
} from '../../store/useProveedoresStore';
import { extractApiError } from '../../utils/proveedores';
import { ToastContainer } from '../ui/Toast';
import ProveedorDetail from './ProveedorDetail';
import ProveedorForm from './ProveedorForm';
import ProveedoresList from './ProveedoresList';

export default function ProveedoresPage() {
  const queryClient = useQueryClient();
  const { toasts, toast, closeToast } = useToast();
  const {
    vistaActual,
    proveedorSeleccionado,
    modoFormulario,
    setVistaActual,
    setProveedorSeleccionado,
    openProveedorDetail,
    openCreateProveedor,
    openEditProveedor,
  } = useProveedoresStore();
  const [submitError, setSubmitError] = useState(null);

  const invalidateProveedores = () => {
    queryClient.invalidateQueries({ queryKey: ['proveedores'] });
  };

  const createMutation = useMutation({
    mutationFn: crearProveedor,
    onSuccess: async (proveedor) => {
      setSubmitError(null);
      invalidateProveedores();
      const refreshed = await obtenerProveedor(proveedor.id);
      toast.success(`Proveedor ${refreshed.nombre_completo} creado`);
      startTransition(() => {
        openProveedorDetail(refreshed);
      });
    },
    onError: (error) => {
      const message = extractApiError(
        error,
        'No fue posible crear el proveedor',
      );
      setSubmitError(message);
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, datos }) => actualizarProveedor(id, datos),
    onSuccess: async (proveedor) => {
      setSubmitError(null);
      invalidateProveedores();
      const refreshed = await obtenerProveedor(proveedor.id);
      toast.success(`Proveedor ${refreshed.nombre_completo} actualizado`);
      startTransition(() => {
        openProveedorDetail(refreshed);
      });
    },
    onError: (error) => {
      const message = extractApiError(
        error,
        'No fue posible actualizar el proveedor',
      );
      setSubmitError(message);
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: eliminarProveedor,
    onSuccess: () => {
      invalidateProveedores();
      toast.success('Proveedor archivado del listado operativo');
      setProveedorSeleccionado(null);
      startTransition(() => {
        setVistaActual(PROVEEDORES_VISTAS.LISTA);
      });
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible archivar el proveedor'),
      );
    },
  });

  const tabs = [
    {
      key: PROVEEDORES_VISTAS.LISTA,
      label: 'Proveedores',
      note: 'Base operativa',
      icon: ListOrdered,
    },
    {
      key: PROVEEDORES_VISTAS.FORMULARIO,
      label: 'Formulario',
      note: 'Alta y edicion',
      icon: FilePenLine,
    },
  ];

  const handleTabChange = (tabKey) => {
    if (tabKey === PROVEEDORES_VISTAS.FORMULARIO) {
      setSubmitError(null);
      openCreateProveedor();
      return;
    }

    startTransition(() => {
      setVistaActual(tabKey);
    });
  };

  const handleViewProveedor = async (proveedor, tab) => {
    try {
      const fullProveedor = await obtenerProveedor(proveedor.id);
      startTransition(() => {
        openProveedorDetail(fullProveedor, tab);
      });
    } catch (error) {
      toast.error(extractApiError(error, 'No fue posible abrir el proveedor'));
    }
  };

  const handleDeleteProveedor = (proveedor) => {
    const accepted = window.confirm(
      `Archivar a ${proveedor.nombre_completo || 'este proveedor'} del modulo de proveedores?`,
    );
    if (!accepted) {
      return;
    }

    deleteMutation.mutate(proveedor.id);
  };

  const handleSubmit = (payload) => {
    if (modoFormulario === 'edit' && proveedorSeleccionado?.id) {
      updateMutation.mutate({
        id: proveedorSeleccionado.id,
        datos: payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <section className="surface rounded-[28px] p-5 sm:p-6 xl:p-7">
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              Modulo de proveedores
            </div>
            <h2 className="font-display text-3xl text-white sm:text-4xl">
              Red de abastecimiento, contacto y trazabilidad de compras en una misma consola.
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-400">
              La vista prioriza lectura rapida del proveedor, su volumen de compra
              y la calidad operativa de la relacion comercial.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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
                    {tab.key === PROVEEDORES_VISTAS.FORMULARIO && (
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

      {vistaActual === PROVEEDORES_VISTAS.LISTA && (
        <ProveedoresList
          onCreate={() => {
            setSubmitError(null);
            openCreateProveedor();
          }}
          onView={handleViewProveedor}
          onEdit={(proveedor) => {
            setSubmitError(null);
            openEditProveedor(proveedor);
          }}
          onDelete={handleDeleteProveedor}
        />
      )}

      {vistaActual === PROVEEDORES_VISTAS.FORMULARIO && (
        <ProveedorForm
          key={`${modoFormulario}-${proveedorSeleccionado?.id || 'nuevo'}`}
          proveedor={proveedorSeleccionado}
          mode={modoFormulario}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          submitError={submitError}
          onBack={() => setVistaActual(PROVEEDORES_VISTAS.LISTA)}
          onSubmit={handleSubmit}
        />
      )}

      {vistaActual === PROVEEDORES_VISTAS.DETALLE &&
        proveedorSeleccionado?.id && (
          <ProveedorDetail
            proveedorId={proveedorSeleccionado.id}
            onBack={() => setVistaActual(PROVEEDORES_VISTAS.LISTA)}
            onEdit={(proveedor) => {
              setSubmitError(null);
              openEditProveedor(proveedor);
            }}
            onDelete={handleDeleteProveedor}
          />
        )}

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}
