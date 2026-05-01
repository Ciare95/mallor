import { create } from 'zustand';
import { DEFAULT_SALE_RULES, normalizeSaleRules } from '../utils/inventarioPricing';

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

const SALE_RULES_STORAGE_KEY = 'inventario_sale_pricing_rules';

const getStoredSalePricingRules = () => {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SALE_RULES };
  }

  try {
    const raw = window.localStorage.getItem(SALE_RULES_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SALE_RULES };
    }
    return normalizeSaleRules(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SALE_RULES };
  }
};

const persistSalePricingRules = (rules) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    SALE_RULES_STORAGE_KEY,
    JSON.stringify(normalizeSaleRules(rules)),
  );
};

export const useInventarioStore = create((set) => ({
  vistaActual: INVENTARIO_VISTAS.LISTA,
  productoSeleccionado: null,
  productoAEliminar: null,
  productoAjuste: null,
  facturaSeleccionada: null,
  modoVista: 'tabla',
  filtrosProductos: filtrosIniciales,
  salePricingRules: getStoredSalePricingRules(),

  setVistaActual: (vistaActual) => set({ vistaActual }),
  setProductoSeleccionado: (productoSeleccionado) => set({ productoSeleccionado }),
  setFacturaSeleccionada: (facturaSeleccionada) => set({ facturaSeleccionada }),
  setModoVista: (modoVista) => set({ modoVista }),
  setSalePricingRules: (updater) =>
    set((state) => {
      const nextRules = normalizeSaleRules(
        typeof updater === 'function'
          ? updater(state.salePricingRules)
          : updater,
      );
      persistSalePricingRules(nextRules);
      return { salePricingRules: nextRules };
    }),
  setFiltrosProductos: (updater) =>
    set((state) => ({
      filtrosProductos:
        typeof updater === 'function' ? updater(state.filtrosProductos) : updater,
    })),
  resetFiltrosProductos: () => set({ filtrosProductos: filtrosIniciales }),
  resetInventarioUi: () =>
    set((state) => ({
      vistaActual: INVENTARIO_VISTAS.LISTA,
      productoSeleccionado: null,
      productoAEliminar: null,
      productoAjuste: null,
      facturaSeleccionada: null,
      modoVista: 'tabla',
      salePricingRules: state.salePricingRules,
      filtrosProductos: filtrosIniciales,
    })),
}));
