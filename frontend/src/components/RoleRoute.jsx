import { Navigate } from 'react-router-dom';
import { useAppStore } from '../store/useStore';
import {
  canAccessRoute,
  getDefaultAuthenticatedPath,
} from '../utils/roleAccess';

export default function RoleRoute({ route, children }) {
  const empresaActiva = useAppStore((state) => state.empresaActiva);
  const user = useAppStore((state) => state.user);
  const role = empresaActiva?.rol_usuario;

  if (canAccessRoute(route, { role, user })) {
    return children;
  }

  return (
    <Navigate
      to={getDefaultAuthenticatedPath({ role, user })}
      replace
    />
  );
}
