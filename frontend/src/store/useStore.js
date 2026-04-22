import { create } from 'zustand';

export const useAppStore = create((set) => ({
  // ─── Autenticación ──────────────────────────────────────────────────────────
  user: null,
  token: null,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),

  // ─── UI Global ──────────────────────────────────────────────────────────────
  sidebarOpen: true,
  loading: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setLoading: (loading) => set({ loading }),

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
    }),
}));