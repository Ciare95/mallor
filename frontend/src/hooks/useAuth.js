import { useAppStore } from '../store/useStore';
import {
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
} from '../services/auth.service';
import { queryClient } from '../services/queryClient';

export function useAuth() {
  const {
    user,
    token,
    authReady,
    setUser,
    setToken,
    setEmpresaActiva,
    setAuthReady,
    reset,
  } = useAppStore();

  const isAuthenticated = Boolean(user && token);

  const applySession = (data) => {
    setUser(data.user);
    setToken(data.access);
    sessionStorage.setItem('mallor_user', JSON.stringify(data.user));
    const empresa = data.empresas?.find(
      (item) => String(item.id) === String(data.empresa_activa),
    );
    setEmpresaActiva(empresa || null);
    setAuthReady(true);
    return data;
  };

  const login = async (credentials) => applySession(
    await loginRequest(credentials),
  );

  const restoreSession = async () => {
    try {
      return applySession(await refreshSession());
    } catch (error) {
      reset();
      setAuthReady(true);
      sessionStorage.removeItem('mallor_user');
      localStorage.removeItem('mallor_empresa_activa_id');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // La limpieza local debe ocurrir aunque el refresh ya no exista.
    }
    reset();
    setAuthReady(true);
    queryClient.clear();
    sessionStorage.removeItem('mallor_user');
    localStorage.removeItem('mallor_empresa_activa_id');
  };

  return {
    user,
    token,
    authReady,
    isAuthenticated,
    login,
    restoreSession,
    logout,
  };
}
