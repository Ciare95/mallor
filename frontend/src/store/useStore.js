import { create } from 'zustand';

const THEME_STORAGE_KEY = 'mallor_theme';
const EMPRESA_STORAGE_KEY = 'mallor_empresa_activa_id';
const API_ORIGIN = 'http://localhost:8000';

export const DEFAULT_ATAJOS_VENTAS = {
  registrar_venta: 'Ctrl+V',
  configurar_cobro: 'Ctrl+C',
  nueva_precuenta: 'Ctrl+N',
  quitar_ultimo_producto: 'Delete',
};

export const DEFAULT_TICKET_PREFERENCES = {
  paperWidth: '80',
  showLogo: true,
  copies: 1,
  footerText: '',
};

export const DEFAULT_CONFIGURACION_OPERATIVA = {
  tema: 'LIGHT',
  permitir_stock_negativo_ventas: false,
  atajos_ventas_activos: true,
  atajos_ventas: DEFAULT_ATAJOS_VENTAS,
  ticket_paper_width: DEFAULT_TICKET_PREFERENCES.paperWidth,
  ticket_show_logo: DEFAULT_TICKET_PREFERENCES.showLogo,
  ticket_copies: DEFAULT_TICKET_PREFERENCES.copies,
  ticket_footer_text: DEFAULT_TICKET_PREFERENCES.footerText,
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

export const getTicketPreferencesStorageKey = (empresaId, userId) =>
  `mallor_ticket_settings_${empresaId || 'sin-empresa'}_${userId || 'anon'}`;

export const normalizeTicketPreferences = (settings = {}) => ({
  paperWidth:
    settings.paperWidth === '58' || settings.ticket_paper_width === '58'
      ? '58'
      : '80',
  showLogo: settings.showLogo ?? settings.ticket_show_logo ?? true,
  copies: Math.min(
    Math.max(
      Number(settings.copies ?? settings.ticket_copies ?? 1) || 1,
      1,
    ),
    5,
  ),
  footerText: String(settings.footerText ?? settings.ticket_footer_text ?? ''),
});

export const loadLastTicketPreferences = (empresaId, userId) => {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(
    getTicketPreferencesStorageKey(empresaId, userId),
  );
  if (!raw) {
    return null;
  }

  try {
    return normalizeTicketPreferences(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const persistLastTicketPreferences = (empresaId, userId, settings) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(
    getTicketPreferencesStorageKey(empresaId, userId),
    JSON.stringify({
      paperWidth: normalizeTicketPreferences(settings).paperWidth,
      showLogo: normalizeTicketPreferences(settings).showLogo,
      copies: normalizeTicketPreferences(settings).copies,
    }),
  );
};

export const resolveTicketPreferences = ({
  empresaId,
  userId,
  config = {},
  fallback = {},
} = {}) => {
  const lastUsed = loadLastTicketPreferences(empresaId, userId);
  if (lastUsed) {
    return normalizeTicketPreferences({
      ...lastUsed,
      footerText: config?.ticket_footer_text || '',
    });
  }

  return normalizeTicketPreferences({
    ...config,
    ...fallback,
  });
};

const normalizeConfiguracionOperativa = (config = {}) => ({
  ...DEFAULT_CONFIGURACION_OPERATIVA,
  ...config,
  atajos_ventas: {
    ...DEFAULT_ATAJOS_VENTAS,
    ...(config?.atajos_ventas || {}),
  },
  ticket_paper_width: normalizeTicketPreferences(config).paperWidth,
  ticket_show_logo: normalizeTicketPreferences(config).showLogo,
  ticket_copies: normalizeTicketPreferences(config).copies,
  ticket_footer_text: normalizeTicketPreferences(config).footerText,
});

const normalizeEmpresaMedia = (empresa) => {
  if (!empresa || typeof empresa !== 'object') {
    return empresa || null;
  }

  const logo = empresa.logo;
  if (!logo || typeof logo !== 'string') {
    return empresa;
  }

  if (/^https?:\/\//i.test(logo)) {
    return empresa;
  }

  return {
    ...empresa,
    logo: logo.startsWith('/')
      ? `${API_ORIGIN}${logo}`
      : `${API_ORIGIN}/${logo}`,
  };
};

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
    const normalizedEmpresa = normalizeEmpresaMedia(empresa);
    if (empresa?.id) {
      localStorage.setItem(EMPRESA_STORAGE_KEY, String(empresa.id));
    } else {
      localStorage.removeItem(EMPRESA_STORAGE_KEY);
    }

    const storedTheme = getStoredTheme();
    const nextConfig = normalizedEmpresa?.configuracion_operativa
      ? normalizeConfiguracionOperativa(normalizedEmpresa.configuracion_operativa)
      : normalizeConfiguracionOperativa({ tema: storedTheme });
    const configWithUserTheme = {
      ...nextConfig,
      tema: storedTheme,
    };
    applyTheme(storedTheme);

    set({
      empresaActiva: normalizedEmpresa || null,
      empresaActivaId: normalizedEmpresa?.id ? String(normalizedEmpresa.id) : null,
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
