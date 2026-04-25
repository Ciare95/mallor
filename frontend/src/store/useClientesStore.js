import { create } from 'zustand';

export const CLIENTES_VISTAS = {
  LISTA: 'lista',
  FORMULARIO: 'formulario',
  DETALLE: 'detalle',
  DASHBOARD: 'dashboard',
};

export const CLIENTE_DETALLE_TABS = {
  RESUMEN: 'resumen',
  HISTORIAL: 'historial',
  CARTERA: 'cartera',
};

const filtrosIniciales = {
  q: '',
  tipo_cliente: '',
  ciudad: '',
  activo: '',
  con_saldo_pendiente: '',
  ordering: 'nombre',
  page: 1,
  page_size: 10,
};

export const useClientesStore = create((set) => ({
  vistaActual: CLIENTES_VISTAS.LISTA,
  detalleTab: CLIENTE_DETALLE_TABS.RESUMEN,
  modoFormulario: 'create',
  clienteSeleccionado: null,
  filtros: filtrosIniciales,

  setVistaActual: (vistaActual) => set({ vistaActual }),
  setDetalleTab: (detalleTab) => set({ detalleTab }),
  setModoFormulario: (modoFormulario) => set({ modoFormulario }),
  setClienteSeleccionado: (clienteSeleccionado) => set({ clienteSeleccionado }),
  openClienteDetail: (
    clienteSeleccionado,
    detalleTab = CLIENTE_DETALLE_TABS.RESUMEN,
  ) =>
    set({
      clienteSeleccionado,
      detalleTab,
      vistaActual: CLIENTES_VISTAS.DETALLE,
    }),
  openCreateCliente: () =>
    set({
      clienteSeleccionado: null,
      modoFormulario: 'create',
      vistaActual: CLIENTES_VISTAS.FORMULARIO,
    }),
  openEditCliente: (clienteSeleccionado) =>
    set({
      clienteSeleccionado,
      modoFormulario: 'edit',
      vistaActual: CLIENTES_VISTAS.FORMULARIO,
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
