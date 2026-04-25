import { create } from 'zustand';

export const PROVEEDORES_VISTAS = {
  LISTA: 'lista',
  FORMULARIO: 'formulario',
  DETALLE: 'detalle',
};

export const PROVEEDOR_DETALLE_TABS = {
  RESUMEN: 'resumen',
  HISTORIAL: 'historial',
};

const filtrosIniciales = {
  q: '',
  tipo_documento: '',
  ciudad: '',
  forma_pago: '',
  activo: '',
  ordering: 'razon_social',
  page: 1,
  page_size: 10,
};

export const useProveedoresStore = create((set) => ({
  vistaActual: PROVEEDORES_VISTAS.LISTA,
  detalleTab: PROVEEDOR_DETALLE_TABS.RESUMEN,
  modoFormulario: 'create',
  proveedorSeleccionado: null,
  filtros: filtrosIniciales,

  setVistaActual: (vistaActual) => set({ vistaActual }),
  setDetalleTab: (detalleTab) => set({ detalleTab }),
  setModoFormulario: (modoFormulario) => set({ modoFormulario }),
  setProveedorSeleccionado: (proveedorSeleccionado) =>
    set({ proveedorSeleccionado }),
  openProveedorDetail: (
    proveedorSeleccionado,
    detalleTab = PROVEEDOR_DETALLE_TABS.RESUMEN,
  ) =>
    set({
      proveedorSeleccionado,
      detalleTab,
      vistaActual: PROVEEDORES_VISTAS.DETALLE,
    }),
  openCreateProveedor: () =>
    set({
      proveedorSeleccionado: null,
      modoFormulario: 'create',
      vistaActual: PROVEEDORES_VISTAS.FORMULARIO,
    }),
  openEditProveedor: (proveedorSeleccionado) =>
    set({
      proveedorSeleccionado,
      modoFormulario: 'edit',
      vistaActual: PROVEEDORES_VISTAS.FORMULARIO,
    }),
  setFiltros: (updater) =>
    set((state) => ({
      filtros:
        typeof updater === 'function'
          ? updater(state.filtros)
          : updater,
    })),
  resetFiltros: () => set({ filtros: filtrosIniciales }),
}));
