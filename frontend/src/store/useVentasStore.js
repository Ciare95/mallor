import { create } from 'zustand';
import {
  resolveTicketPreferences,
  useAppStore,
} from './useStore';
import {
  CONSUMIDOR_FINAL,
  createLineItem,
  createTemporaryClient,
  inferVentaDiscountPercent,
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

const getTicketDefaults = () => {
  const appState = useAppStore.getState();
  return resolveTicketPreferences({
    empresaId: appState.empresaActivaId,
    userId: appState.user?.id,
    config: appState.configuracionOperativa,
  });
};

const getDraftInicial = () => {
  const ticketDefaults = getTicketDefaults();
  return {
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
  ticketPaperWidth: ticketDefaults.paperWidth,
  ticketShowLogo: ticketDefaults.showLogo,
  ticketCopies: ticketDefaults.copies,
  };
};

const createPrecuenta = (number = 1, draft = getDraftInicial()) => ({
  id: `precuenta-${Date.now()}-${number}`,
  label: `Precuenta ${number}`,
  draft,
});

const primeraPrecuenta = createPrecuenta(1);

const updateActivePrecuentaDraft = (state, updater) => {
  const nextDraft =
    typeof updater === 'function' ? updater(state.draft) : updater;

  return {
    draft: nextDraft,
    precuentas: state.precuentas.map((precuenta) =>
      precuenta.id === state.precuentaActivaId
        ? { ...precuenta, draft: nextDraft }
        : precuenta,
    ),
  };
};

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
  draft: primeraPrecuenta.draft,
  precuentas: [primeraPrecuenta],
  precuentaActivaId: primeraPrecuenta.id,
  nextPrecuentaNumber: 2,
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
  agregarPrecuenta: () =>
    set((state) => {
      const precuenta = createPrecuenta(state.nextPrecuentaNumber);

      return {
        precuentas: [...state.precuentas, precuenta],
        precuentaActivaId: precuenta.id,
        draft: precuenta.draft,
        nextPrecuentaNumber: state.nextPrecuentaNumber + 1,
      };
    }),
  setPrecuentaActiva: (precuentaId) =>
    set((state) => {
      const precuenta = state.precuentas.find(
        (item) => item.id === precuentaId,
      );

      if (!precuenta) {
        return {};
      }

      return {
        precuentaActivaId: precuenta.id,
        draft: precuenta.draft,
      };
    }),
  cerrarPrecuenta: (precuentaId) =>
    set((state) => {
      const targetId = precuentaId || state.precuentaActivaId;
      const remaining = state.precuentas.filter(
        (precuenta) => precuenta.id !== targetId,
      );

      if (!remaining.length) {
        const precuenta = createPrecuenta(1);
        return {
          precuentas: [precuenta],
          precuentaActivaId: precuenta.id,
          draft: precuenta.draft,
          nextPrecuentaNumber: 2,
        };
      }

      const currentStillOpen = remaining.find(
        (precuenta) => precuenta.id === state.precuentaActivaId,
      );
      const nextActive = currentStillOpen || remaining[remaining.length - 1];
      return {
        precuentas: remaining,
        precuentaActivaId: nextActive.id,
        draft: nextActive.draft,
      };
    }),
  cerrarPrecuentaActiva: () =>
    set((state) => {
      const targetId = state.precuentaActivaId;
      const remaining = state.precuentas.filter(
        (precuenta) => precuenta.id !== targetId,
      );

      if (!remaining.length) {
        const precuenta = createPrecuenta(1);
        return {
          precuentas: [precuenta],
          precuentaActivaId: precuenta.id,
          draft: precuenta.draft,
          nextPrecuentaNumber: 2,
        };
      }

      const nextActive = remaining[remaining.length - 1];
      return {
        precuentas: remaining,
        precuentaActivaId: nextActive.id,
        draft: nextActive.draft,
      };
    }),
  resetDraft: () =>
    set((state) => updateActivePrecuentaDraft(state, getDraftInicial())),
  cargarVentaEnDraft: (venta) =>
    set((state) => {
      const ticketDefaults = getTicketDefaults();
      const nextDraft = {
        ventaId: venta.id,
        clienteSeleccionado: venta.cliente || CONSUMIDOR_FINAL,
        items: (venta.detalles || []).map((detalle) => ({
          id: `line-${detalle.id}`,
          producto: detalle.producto,
          cantidad: Number(detalle.cantidad || 0),
          precio_unitario: Number(detalle.precio_unitario || 0),
          descuento: Number(detalle.descuento || 0),
        })),
        descuentoGlobal: inferVentaDiscountPercent(venta),
        metodoPago: venta.metodo_pago || 'EFECTIVO',
        estado: venta.estado || 'TERMINADA',
        facturaElectronica: Boolean(venta.factura_electronica),
        imprimirTicket: false,
        efectivoRecibido: '',
        abonoInicial: '',
        metodoAbonoInicial: 'EFECTIVO',
        referenciaAbonoInicial: '',
        observaciones: venta.observaciones || '',
        ticketPaperWidth: ticketDefaults.paperWidth,
        ticketShowLogo: ticketDefaults.showLogo,
        ticketCopies: ticketDefaults.copies,
      };

      return {
        ...updateActivePrecuentaDraft(state, nextDraft),
        vistaActual: VENTAS_VISTAS.POS,
      };
    }),
  setDraftField: (field, value) =>
    set((state) =>
      updateActivePrecuentaDraft(state, {
        ...state.draft,
        [field]: value,
      }),
    ),
  setClienteSeleccionado: (clienteSeleccionado) =>
    set((state) =>
      updateActivePrecuentaDraft(state, {
        ...state.draft,
        clienteSeleccionado,
      }),
    ),
  addProductoAlDraft: (producto, overrides = {}) =>
    set((state) => {
      if (producto.es_producto_especial) {
        return updateActivePrecuentaDraft(state, {
          ...state.draft,
          items: [
            ...state.draft.items,
            createLineItem(producto, overrides),
          ],
        });
      }

      if (producto.es_producto_temporal) {
        return updateActivePrecuentaDraft(state, {
          ...state.draft,
          items: [
            ...state.draft.items,
            createLineItem(producto, overrides),
          ],
        });
      }

      const existing = state.draft.items.find(
        (item) => item.producto.id === producto.id,
      );

      if (existing) {
        return updateActivePrecuentaDraft(state, {
          ...state.draft,
          items: state.draft.items.map((item) =>
            item.producto.id === producto.id
              ? {
                  ...item,
                  cantidad: Number(item.cantidad || 0) + 1,
                }
              : item,
          ),
        });
      }

      return updateActivePrecuentaDraft(state, {
        ...state.draft,
        items: [...state.draft.items, createLineItem(producto, overrides)],
      });
    }),
  actualizarItemDraft: (lineId, changes) =>
    set((state) =>
      updateActivePrecuentaDraft(state, {
        ...state.draft,
        items: state.draft.items.map((item) =>
          item.id === lineId ? { ...item, ...changes } : item,
        ),
      }),
    ),
  eliminarItemDraft: (lineId) =>
    set((state) =>
      updateActivePrecuentaDraft(state, {
        ...state.draft,
        items: state.draft.items.filter((item) => item.id !== lineId),
      }),
    ),
  registrarClienteTemporal: (payload) =>
    set((state) => {
      const cliente = payload?.id && !payload?.esTemporal
        ? {
            ...payload,
            persisted: true,
            esTemporal: false,
          }
        : payload.esTemporal
          ? payload
          : createTemporaryClient(payload);
      const nextDraft = {
        ...state.draft,
        clienteSeleccionado: cliente,
      };

      return {
        clientesTemporales: [
          cliente,
          ...state.clientesTemporales.filter((item) => item.id !== cliente.id),
        ],
        ...updateActivePrecuentaDraft(state, nextDraft),
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
