import { beforeEach, describe, expect, it } from 'vitest';
import {
  persistLastTicketPreferences,
  resolveTicketPreferences,
  useAppStore,
} from './useStore';

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
      ticket_paper_width: '80',
      ticket_show_logo: true,
      ticket_copies: 1,
      ticket_footer_text: '',
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

  it('persiste empresa activa sin sobrescribir el tema elegido localmente', () => {
    useAppStore.setState({ iaSesionActivaId: 'sesion-previa' });
    localStorage.setItem('mallor_theme', 'LIGHT');

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
        ticket_paper_width: '58',
        ticket_show_logo: false,
        ticket_copies: 2,
        ticket_footer_text: 'No se aceptan devoluciones.',
      },
    });

    expect(localStorage.getItem('mallor_empresa_activa_id')).toBe('15');
    expect(localStorage.getItem('mallor_theme')).toBe('LIGHT');
    expect(useAppStore.getState().empresaActivaId).toBe('15');
    expect(useAppStore.getState().temaActual).toBe('LIGHT');
    expect(useAppStore.getState().configuracionOperativa.tema).toBe('LIGHT');
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
      ticket_paper_width: '58',
      ticket_show_logo: false,
      ticket_copies: 3,
      ticket_footer_text: 'Gracias por su compra.',
    });

    expect(useAppStore.getState().temaActual).toBe('DARK');
    expect(
      useAppStore.getState().configuracionOperativa
        .permitir_stock_negativo_ventas,
    ).toBe(true);
    expect(useAppStore.getState().configuracionOperativa.ticket_paper_width).toBe(
      '58',
    );
    expect(useAppStore.getState().configuracionOperativa.ticket_show_logo).toBe(
      false,
    );
    expect(useAppStore.getState().configuracionOperativa.ticket_copies).toBe(3);
    expect(
      useAppStore.getState().configuracionOperativa.ticket_footer_text,
    ).toBe('Gracias por su compra.');
    expect(localStorage.getItem('mallor_theme')).toBe('DARK');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('prioriza la ultima preferencia de tirilla guardada por cajero', () => {
    persistLastTicketPreferences(12, 99, {
      paperWidth: '58',
      showLogo: false,
      copies: 4,
    });

    const resolved = resolveTicketPreferences({
      empresaId: 12,
      userId: 99,
      config: {
        ticket_paper_width: '80',
        ticket_show_logo: true,
        ticket_copies: 1,
        ticket_footer_text: 'No se aceptan devoluciones.',
      },
    });

    expect(resolved).toEqual({
      paperWidth: '58',
      showLogo: false,
      copies: 4,
      footerText: 'No se aceptan devoluciones.',
    });
  });
});
