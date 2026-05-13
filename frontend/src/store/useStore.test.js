import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './useStore';

const resetStore = () => {
  localStorage.removeItem('mallor_theme');
  useAppStore.setState({
    user: null,
    token: null,
    sidebarOpen: true,
    loading: false,
    empresaActiva: null,
    empresaActivaId: null,
    configuracionOperativa: {
      tema: 'LIGHT',
      permitir_stock_negativo_ventas: false,
      atajos_ventas_activos: true,
      atajos_ventas: {
        registrar_venta: 'Ctrl+V',
        configurar_cobro: 'Ctrl+C',
        nueva_precuenta: 'Ctrl+N',
        quitar_ultimo_producto: 'Delete',
      },
    },
    temaActual: 'LIGHT',
    iaSesionActivaId: null,
    usuarioActivo: null,
  });
};

describe('useAppStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('persiste empresa activa y limpia la sesion IA al cambiar de empresa', () => {
    useAppStore.setState({ iaSesionActivaId: 'sesion-previa' });

    useAppStore.getState().setEmpresaActiva({
      id: 15,
      razon_social: 'Empresa A',
      configuracion_operativa: {
        tema: 'DARK',
        permitir_stock_negativo_ventas: true,
        atajos_ventas_activos: true,
        atajos_ventas: {
          registrar_venta: 'Ctrl+V',
          configurar_cobro: 'Ctrl+C',
          nueva_precuenta: 'Ctrl+N',
          quitar_ultimo_producto: 'Delete',
        },
      },
    });

    expect(localStorage.getItem('mallor_empresa_activa_id')).toBe('15');
    expect(localStorage.getItem('mallor_theme')).toBe('DARK');
    expect(useAppStore.getState().empresaActivaId).toBe('15');
    expect(useAppStore.getState().temaActual).toBe('DARK');
    expect(useAppStore.getState().iaSesionActivaId).toBeNull();
  });

  it('elimina empresa activa y estado sensible al limpiar la seleccion', () => {
    localStorage.setItem('mallor_empresa_activa_id', '15');
    useAppStore.setState({ iaSesionActivaId: 'sesion-previa' });

    useAppStore.getState().setEmpresaActiva(null);

    expect(localStorage.getItem('mallor_empresa_activa_id')).toBeNull();
    expect(useAppStore.getState().empresaActivaId).toBeNull();
    expect(useAppStore.getState().iaSesionActivaId).toBeNull();
  });

  it('sincroniza tema y configuracion operativa al actualizar preferencias', () => {
    useAppStore.getState().updateEmpresaConfiguracion({
      tema: 'DARK',
      permitir_stock_negativo_ventas: true,
      atajos_ventas_activos: false,
      atajos_ventas: {
        registrar_venta: 'Ctrl+Shift+R',
        configurar_cobro: 'Ctrl+Alt+C',
        nueva_precuenta: 'Ctrl+Shift+N',
        quitar_ultimo_producto: 'Delete',
      },
    });

    expect(useAppStore.getState().temaActual).toBe('DARK');
    expect(
      useAppStore.getState().configuracionOperativa
        .permitir_stock_negativo_ventas,
    ).toBe(true);
    expect(localStorage.getItem('mallor_theme')).toBe('DARK');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
