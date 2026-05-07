import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './useStore';

const resetStore = () => {
  useAppStore.setState({
    user: null,
    token: null,
    sidebarOpen: true,
    loading: false,
    empresaActiva: null,
    empresaActivaId: null,
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
    });

    expect(localStorage.getItem('mallor_empresa_activa_id')).toBe('15');
    expect(useAppStore.getState().empresaActivaId).toBe('15');
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
});
