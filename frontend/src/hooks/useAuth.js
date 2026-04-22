import { useAppStore } from '../store/useStore';

export function useAuth() {
  const { user, token, setUser, setToken, reset } = useAppStore();
  
  const isAuthenticated = !!user && !!token;
  
  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    // Aquí podríamos guardar en localStorage
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };
  
  const logout = () => {
    reset();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };
  
  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
  };
}