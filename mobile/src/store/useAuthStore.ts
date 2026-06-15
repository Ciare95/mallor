import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { KEYS } from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
}

interface Empresa {
  id: number;
  nit: string;
  razon_social: string;
  nombre_comercial: string;
  rol_usuario: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  empresaActiva: Empresa | null;
  empresas: Empresa[];
  isReady: boolean;

  setSession: (data: { access: string; refresh: string; user: User; empresas: Empresa[]; empresa_activa: number | null }) => Promise<void>;
  setEmpresaActiva: (empresa: Empresa) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  empresaActiva: null,
  empresas: [],
  isReady: false,

  setSession: async ({ access, refresh, user, empresas, empresa_activa }) => {
    await SecureStore.setItemAsync(KEYS.ACCESS, access);
    await SecureStore.setItemAsync(KEYS.REFRESH, refresh);

    const empresa = empresas.find((e) => e.id === empresa_activa) ?? empresas[0] ?? null;
    if (empresa) {
      await SecureStore.setItemAsync(KEYS.EMPRESA_ID, String(empresa.id));
    }

    set({ token: access, user, empresas, empresaActiva: empresa });
  },

  setEmpresaActiva: async (empresa) => {
    await SecureStore.setItemAsync(KEYS.EMPRESA_ID, String(empresa.id));
    set({ empresaActiva: empresa });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(KEYS.ACCESS);
    await SecureStore.deleteItemAsync(KEYS.REFRESH);
    await SecureStore.deleteItemAsync(KEYS.EMPRESA_ID);
    set({ token: null, user: null, empresaActiva: null, empresas: [] });
  },

  loadFromStorage: async () => {
    const token = await SecureStore.getItemAsync(KEYS.ACCESS);
    set({ token: token ?? null, isReady: true });
  },
}));

export const useRol = () => {
  const empresaActiva = useAuthStore((s) => s.empresaActiva);
  return empresaActiva?.rol_usuario ?? null;
};
