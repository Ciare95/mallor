import { create } from 'zustand';

export const useAppStore = create((set) => ({
  // Estado de autenticación
  user: null,
  token: null,
  
  // Estado de UI
  sidebarOpen: true,
  loading: false,
  
  // Acciones
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setLoading: (loading) => set({ loading }),
  
  // Reset
  reset: () => set({ user: null, token: null, sidebarOpen: true, loading: false }),
}));