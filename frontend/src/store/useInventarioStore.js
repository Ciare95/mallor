import { create } from 'zustand';

export const INVENTARIO_VISTAS = {
  LISTA: 'lista',
  CREAR: 'crear',
  EDITAR: 'editar',
  DETALLE: 'detalle',
  CATEGORIAS: 'categorias',
  FACTURA: 'factura',
  PROCESAR_FACTURA: 'procesar_factura',
};

const filtrosIniciales = {
  q: '',
  categoria_id: '',
  marca: '',
  stock_bajo: false,
  ordering: 'nombre',
  page: 1,
  page_size: 10,
};

export const useInventarioStore = create((set) => ({
  vistaActual: INVENTARIO_VISTAS.LISTA,
  productoSeleccionado: null,
  productoAEliminar: null,
  productoAjuste: null,
  facturaSeleccionada: null,
  modoVista: 'tabla',
  filtrosProductos: filtrosIniciales,

  setVistaActual: (vistaActual) => set({ vistaActual }),
  setProductoSeleccionado: (productoSeleccionado) => set({ productoSeleccionado }),
  setFacturaSeleccionada: (facturaSeleccionada) => set({ facturaSeleccionada }),
  setModoVista: (modoVista) => set({ modoVista }),
  setFiltrosProductos: (updater) =>
    set((state) => ({
      filtrosProductos:
        typeof updater === 'function' ? updater(state.filtrosProductos) : updater,
    })),
  resetFiltrosProductos: () => set({ filtrosProductos: filtrosIniciales }),
  resetInventarioUi: () =>
    set({
      vistaActual: INVENTARIO_VISTAS.LISTA,
      productoSeleccionado: null,
      productoAEliminar: null,
      productoAjuste: null,
      facturaSeleccionada: null,
      modoVista: 'tabla',
      filtrosProductos: filtrosIniciales,
    }),
}));
