import { create } from 'zustand';

const storedUser = localStorage.getItem('user');
const initialUser = (() => {
  if (!storedUser) {
    return null;
  }
  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
})();

export const useAppStore = create((set) => ({
  // ─── Autenticación ──────────────────────────────────────────────────────────
  user: initialUser,
  token: localStorage.getItem('token') || null,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),

  // ─── UI Global ──────────────────────────────────────────────────────────────
  sidebarOpen: true,
  loading: false,
  empresaActivaId: localStorage.getItem('mallor_empresa_activa_id') || null,
  empresaActiva: null,
  iaSesionActivaId: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setLoading: (loading) => set({ loading }),
  setEmpresaActiva: (empresa) => {
    if (empresa?.id) {
      localStorage.setItem('mallor_empresa_activa_id', String(empresa.id));
    } else {
      localStorage.removeItem('mallor_empresa_activa_id');
    }
    set({
      empresaActiva: empresa || null,
      empresaActivaId: empresa?.id ? String(empresa.id) : null,
      iaSesionActivaId: null,
    });
  },
  setIaSesionActivaId: (sesionId) => set({ iaSesionActivaId: sesionId || null }),
  resetIaSession: () => set({ iaSesionActivaId: null }),

  // ─── Usuarios (estado de selección para pasar entre vistas) ────────────────
  /**
   * Usuario actualmente seleccionado en la interfaz de gestión.
   * Se usa para compartir el contexto entre componentes sin prop drilling.
   */
  usuarioActivo: null,
  setUsuarioActivo: (usuario) => set({ usuarioActivo: usuario }),
  clearUsuarioActivo: () => set({ usuarioActivo: null }),

  // ─── Reset global ───────────────────────────────────────────────────────────
  reset: () =>
    set({
      user: null,
      token: null,
      sidebarOpen: true,
      loading: false,
      usuarioActivo: null,
      empresaActiva: null,
      empresaActivaId: null,
      iaSesionActivaId: null,
    }),
}));
