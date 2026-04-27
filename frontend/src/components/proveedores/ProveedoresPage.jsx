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
      <section className="surface p-3">
        <div className="mb-2 text-[8px] font-semibold uppercase tracking-[0.2em] text-muted">
          Modulo de proveedores
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = vistaActual === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`tab-card min-h-[68px] px-3 py-2.5 ${active ? 'tab-card-active' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      active ? 'text-[var(--accent)]' : 'text-soft'
                    }`}
                  />
                  {tab.key === PROVEEDORES_VISTAS.FORMULARIO ? (
                    <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-muted">
                      {modoFormulario === 'edit' ? 'edicion' : 'alta'}
                    </span>
                  ) : (
                    <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-muted">
                      {tab.note}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 font-display text-[1.15rem] leading-none text-main">
                  {tab.label}
                </div>
              </button>
            );
          })}
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
