import { create } from 'zustand';
import {
  CONSUMIDOR_FINAL,
  createLineItem,
  createTemporaryClient,
} from '../utils/ventas';

export const VENTAS_VISTAS = {
  POS: 'pos',
  LISTA: 'lista',
  DETALLE: 'detalle',
  CARTERA: 'cartera',
  REPORTES: 'reportes',
};

export const VENTA_DETALLE_TABS = {
  RESUMEN: 'resumen',
  ABONOS: 'abonos',
  HISTORIAL: 'historial',
};

const getDraftInicial = () => ({
  ventaId: null,
  clienteSeleccionado: CONSUMIDOR_FINAL,
  items: [],
  descuentoGlobal: 0,
  metodoPago: 'EFECTIVO',
  estado: 'TERMINADA',
  facturaElectronica: false,
  imprimirTicket: false,
  efectivoRecibido: '',
  abonoInicial: '',
  metodoAbonoInicial: 'EFECTIVO',
  referenciaAbonoInicial: '',
  observaciones: '',
});

const filtrosVentasIniciales = {
  q: '',
  cliente_id: '',
  estado: '',
  estado_pago: '',
  fecha_inicio: '',
  fecha_fin: '',
  metodo_pago: '',
  ordering: '-fecha_venta',
  page: 1,
  page_size: 10,
};

const filtrosCarteraIniciales = {
  q: '',
  cliente_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  antiguedad: 'todas',
  page: 1,
  page_size: 10,
};

export const useVentasStore = create((set) => ({
  vistaActual: VENTAS_VISTAS.POS,
  detalleTab: VENTA_DETALLE_TABS.RESUMEN,
  ventaSeleccionada: null,
  draft: getDraftInicial(),
  filtrosVentas: filtrosVentasIniciales,
  filtrosCartera: filtrosCarteraIniciales,
  clientesTemporales: [],

  setVistaActual: (vistaActual) => set({ vistaActual }),
  setDetalleTab: (detalleTab) => set({ detalleTab }),
  setVentaSeleccionada: (ventaSeleccionada) => set({ ventaSeleccionada }),
  openVentaDetail: (
    ventaSeleccionada,
    detalleTab = VENTA_DETALLE_TABS.RESUMEN,
  ) =>
    set({
      ventaSeleccionada,
      detalleTab,
      vistaActual: VENTAS_VISTAS.DETALLE,
    }),
  resetDraft: () => set({ draft: getDraftInicial() }),
  cargarVentaEnDraft: (venta) =>
    set({
      draft: {
        ventaId: venta.id,
        clienteSeleccionado: venta.cliente || CONSUMIDOR_FINAL,
        items: (venta.detalles || []).map((detalle) => ({
          id: `line-${detalle.id}`,
          producto: detalle.producto,
          cantidad: Number(detalle.cantidad || 0),
          precio_unitario: Number(detalle.precio_unitario || 0),
          descuento: Number(detalle.descuento || 0),
        })),
        descuentoGlobal: Number(venta.descuento || 0),
        metodoPago: venta.metodo_pago || 'EFECTIVO',
        estado: venta.estado || 'TERMINADA',
        facturaElectronica: Boolean(venta.factura_electronica),
        imprimirTicket: false,
        efectivoRecibido: '',
        abonoInicial: '',
        metodoAbonoInicial: 'EFECTIVO',
        referenciaAbonoInicial: '',
        observaciones: venta.observaciones || '',
      },
      vistaActual: VENTAS_VISTAS.POS,
    }),
  setDraftField: (field, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        [field]: value,
      },
    })),
  setClienteSeleccionado: (clienteSeleccionado) =>
    set((state) => ({
      draft: {
        ...state.draft,
        clienteSeleccionado,
      },
    })),
  addProductoAlDraft: (producto) =>
    set((state) => {
      const existing = state.draft.items.find(
        (item) => item.producto.id === producto.id,
      );

      if (existing) {
        return {
          draft: {
            ...state.draft,
            items: state.draft.items.map((item) =>
              item.producto.id === producto.id
                ? {
                    ...item,
                    cantidad: Number(item.cantidad || 0) + 1,
                  }
                : item,
            ),
          },
        };
      }

      return {
        draft: {
          ...state.draft,
          items: [...state.draft.items, createLineItem(producto)],
        },
      };
    }),
  actualizarItemDraft: (lineId, changes) =>
    set((state) => ({
      draft: {
        ...state.draft,
        items: state.draft.items.map((item) =>
          item.id === lineId ? { ...item, ...changes } : item,
        ),
      },
    })),
  eliminarItemDraft: (lineId) =>
    set((state) => ({
      draft: {
        ...state.draft,
        items: state.draft.items.filter((item) => item.id !== lineId),
      },
    })),
  registrarClienteTemporal: (payload) =>
    set((state) => {
      const cliente = payload.esTemporal
        ? payload
        : createTemporaryClient(payload);
      return {
        clientesTemporales: [
          cliente,
          ...state.clientesTemporales.filter((item) => item.id !== cliente.id),
        ],
        draft: {
          ...state.draft,
          clienteSeleccionado: cliente,
        },
      };
    }),
  setFiltrosVentas: (updater) =>
    set((state) => ({
      filtrosVentas:
        typeof updater === 'function'
          ? updater(state.filtrosVentas)
          : updater,
    })),
  resetFiltrosVentas: () => set({ filtrosVentas: filtrosVentasIniciales }),
  setFiltrosCartera: (updater) =>
    set((state) => ({
      filtrosCartera:
        typeof updater === 'function'
          ? updater(state.filtrosCartera)
          : updater,
    })),
  resetFiltrosCartera: () => set({ filtrosCartera: filtrosCarteraIniciales }),
}));
