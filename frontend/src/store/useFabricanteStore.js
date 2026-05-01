import { create } from 'zustand';

export const FABRICANTE_VISTAS = {
  DASHBOARD: 'dashboard',
  INGREDIENTES: 'ingredientes',
  INGREDIENTE_FORM: 'ingrediente_form',
  PRODUCTOS: 'productos',
  PRODUCTO_FORM: 'producto_form',
  PRODUCCION: 'produccion',
};

const initialIngredientFilters = {
  q: '',
  unidad_medida: '',
  bajo_stock: false,
  ordering: 'nombre',
};

const initialProductFilters = {
  q: '',
  unidad_medida: '',
  con_producto_final: '',
  ordering: 'nombre',
};

export const useFabricanteStore = create((set) => ({
  vistaActual: FABRICANTE_VISTAS.DASHBOARD,
  ingredienteSeleccionado: null,
  productoSeleccionado: null,
  filtrosIngredientes: initialIngredientFilters,
  filtrosProductos: initialProductFilters,
  margenObjetivo: 45,

  setVistaActual: (vistaActual) => set({ vistaActual }),
  setIngredienteSeleccionado: (ingredienteSeleccionado) =>
    set({ ingredienteSeleccionado }),
  setProductoSeleccionado: (productoSeleccionado) =>
    set({ productoSeleccionado }),
  setMargenObjetivo: (margenObjetivo) => set({ margenObjetivo }),
  setFiltrosIngredientes: (updater) =>
    set((state) => ({
      filtrosIngredientes:
        typeof updater === 'function'
          ? updater(state.filtrosIngredientes)
          : updater,
    })),
  setFiltrosProductos: (updater) =>
    set((state) => ({
      filtrosProductos:
        typeof updater === 'function'
          ? updater(state.filtrosProductos)
          : updater,
    })),
  resetFabricanteUi: () =>
    set((state) => ({
      vistaActual: FABRICANTE_VISTAS.DASHBOARD,
      ingredienteSeleccionado: null,
      productoSeleccionado: null,
      filtrosIngredientes: initialIngredientFilters,
      filtrosProductos: initialProductFilters,
      margenObjetivo: state.margenObjetivo,
    })),
}));
