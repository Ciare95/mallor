import { beforeEach, describe, expect, it } from 'vitest';
import { useVentasStore } from './useVentasStore';

const producto = {
  id: 10,
  nombre: 'Producto POS',
  precio_venta: 12000,
  iva: 0,
};

describe('useVentasStore precuentas', () => {
  beforeEach(() => {
    useVentasStore.setState(useVentasStore.getInitialState(), true);
  });

  it('mantiene borradores independientes por precuenta', () => {
    const store = useVentasStore.getState();
    const primeraId = store.precuentaActivaId;

    store.addProductoAlDraft(producto);
    store.agregarPrecuenta();

    const segundaId = useVentasStore.getState().precuentaActivaId;
    expect(segundaId).not.toBe(primeraId);
    expect(useVentasStore.getState().draft.items).toHaveLength(0);

    useVentasStore.getState().setDraftField('observaciones', 'Caja 2');
    useVentasStore.getState().setPrecuentaActiva(primeraId);

    expect(useVentasStore.getState().draft.items).toHaveLength(1);
    expect(useVentasStore.getState().draft.observaciones).toBe('');

    useVentasStore.getState().setPrecuentaActiva(segundaId);
    expect(useVentasStore.getState().draft.items).toHaveLength(0);
    expect(useVentasStore.getState().draft.observaciones).toBe('Caja 2');
  });

  it('cierra la precuenta activa y vuelve a otra disponible', () => {
    const store = useVentasStore.getState();
    const primeraId = store.precuentaActivaId;
    store.agregarPrecuenta();

    useVentasStore.getState().cerrarPrecuentaActiva();

    expect(useVentasStore.getState().precuentas).toHaveLength(1);
    expect(useVentasStore.getState().precuentaActivaId).toBe(primeraId);
  });

  it('puede cerrar una precuenta no activa sin cambiar la activa actual', () => {
    const store = useVentasStore.getState();
    const primeraId = store.precuentaActivaId;
    store.agregarPrecuenta();
    const segundaId = useVentasStore.getState().precuentaActivaId;

    useVentasStore.getState().setPrecuentaActiva(primeraId);
    useVentasStore.getState().cerrarPrecuenta(segundaId);

    expect(useVentasStore.getState().precuentas).toHaveLength(1);
    expect(useVentasStore.getState().precuentaActivaId).toBe(primeraId);
  });
});
