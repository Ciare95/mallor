import { create } from 'zustand';

const THEME_STORAGE_KEY = 'mallor_theme';
const EMPRESA_STORAGE_KEY = 'mallor_empresa_activa_id';

export const DEFAULT_ATAJOS_VENTAS = {
  registrar_venta: 'Ctrl+V',
  configurar_cobro: 'Ctrl+C',
  nueva_precuenta: 'Ctrl+N',
  quitar_ultimo_producto: 'Delete',
};

export const DEFAULT_CONFIGURACION_OPERATIVA = {
  tema: 'LIGHT',
  permitir_stock_negativo_ventas: false,
  atajos_ventas_activos: true,
  atajos_ventas: DEFAULT_ATAJOS_VENTAS,
};

const storedUser = sessionStorage.getItem('mallor_user');
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

const getStoredTheme = () => {
  const theme = localStorage.getItem(THEME_STORAGE_KEY);
  return theme === 'DARK' ? 'DARK' : 'LIGHT';
};

const applyTheme = (theme) => {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.setAttribute(
    'data-theme',
    theme === 'DARK' ? 'dark' : 'light',
  );
};

const normalizeConfiguracionOperativa = (config = {}) => ({
  ...DEFAULT_CONFIGURACION_OPERATIVA,
  ...config,
  atajos_ventas: {
    ...DEFAULT_ATAJOS_VENTAS,
    ...(config?.atajos_ventas || {}),
  },
});

const initialTheme = getStoredTheme();
applyTheme(initialTheme);

export const useAppStore = create((set) => ({
  user: initialUser,
  token: null,
  authReady: false,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setAuthReady: (authReady) => set({ authReady }),

  sidebarOpen: true,
  loading: false,
  empresaActivaId: localStorage.getItem(EMPRESA_STORAGE_KEY) || null,
  empresaActiva: null,
  configuracionOperativa: normalizeConfiguracionOperativa({
    tema: initialTheme,
  }),
  temaActual: initialTheme,
  iaSesionActivaId: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setLoading: (loading) => set({ loading }),
  setTemaActual: (temaActual) => {
    const nextTheme = temaActual === 'DARK' ? 'DARK' : 'LIGHT';
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    set((state) => ({
      temaActual: nextTheme,
      configuracionOperativa: {
        ...state.configuracionOperativa,
        tema: nextTheme,
      },
      empresaActiva: state.empresaActiva
        ? {
            ...state.empresaActiva,
            configuracion_operativa: {
              ...state.empresaActiva.configuracion_operativa,
              tema: nextTheme,
            },
          }
        : state.empresaActiva,
    }));
  },
  setConfiguracionOperativa: (configuracionOperativa) => {
    const nextConfig = normalizeConfiguracionOperativa(configuracionOperativa);
    localStorage.setItem(THEME_STORAGE_KEY, nextConfig.tema);
    applyTheme(nextConfig.tema);
    set((state) => ({
      configuracionOperativa: nextConfig,
      temaActual: nextConfig.tema,
      empresaActiva: state.empresaActiva
        ? {
            ...state.empresaActiva,
            configuracion_operativa: nextConfig,
          }
        : state.empresaActiva,
    }));
  },
  updateEmpresaConfiguracion: (configuracionOperativa) =>
    set((state) => {
      const nextConfig = normalizeConfiguracionOperativa(configuracionOperativa);
      localStorage.setItem(THEME_STORAGE_KEY, nextConfig.tema);
      applyTheme(nextConfig.tema);
      return {
        configuracionOperativa: nextConfig,
        temaActual: nextConfig.tema,
        empresaActiva: state.empresaActiva
          ? {
              ...state.empresaActiva,
              configuracion_operativa: nextConfig,
            }
          : state.empresaActiva,
      };
    }),
  setEmpresaActiva: (empresa) => {
    if (empresa?.id) {
      localStorage.setItem(EMPRESA_STORAGE_KEY, String(empresa.id));
    } else {
      localStorage.removeItem(EMPRESA_STORAGE_KEY);
    }

    const storedTheme = getStoredTheme();
    const nextConfig = empresa?.configuracion_operativa
      ? normalizeConfiguracionOperativa(empresa.configuracion_operativa)
      : normalizeConfiguracionOperativa({ tema: storedTheme });
    const configWithUserTheme = {
      ...nextConfig,
      tema: storedTheme,
    };
    applyTheme(storedTheme);

    set({
      empresaActiva: empresa || null,
      empresaActivaId: empresa?.id ? String(empresa.id) : null,
      configuracionOperativa: configWithUserTheme,
      temaActual: storedTheme,
      iaSesionActivaId: null,
    });
  },
  setIaSesionActivaId: (sesionId) => set({ iaSesionActivaId: sesionId || null }),
  resetIaSession: () => set({ iaSesionActivaId: null }),

  usuarioActivo: null,
  setUsuarioActivo: (usuario) => set({ usuarioActivo: usuario }),
  clearUsuarioActivo: () => set({ usuarioActivo: null }),

  reset: () =>
    set({
      user: null,
      token: null,
      authReady: false,
      sidebarOpen: true,
      loading: false,
      usuarioActivo: null,
      empresaActiva: null,
      empresaActivaId: null,
      configuracionOperativa: normalizeConfiguracionOperativa({
        tema: getStoredTheme(),
      }),
      temaActual: getStoredTheme(),
      iaSesionActivaId: null,
    }),
}));
