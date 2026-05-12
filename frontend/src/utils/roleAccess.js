const EMPRESA_ADMIN_ROLES = new Set(['PROPIETARIO', 'ADMIN']);

export function isAdminInterno(user) {
  return Boolean(user?.is_superuser || user?.is_staff);
}

export function isEmpleadoRole(role) {
  return role === 'EMPLEADO';
}

export function canManageEmpresa(role, user) {
  return isAdminInterno(user) || EMPRESA_ADMIN_ROLES.has(role);
}

export function canAccessRoute(route, { role, user } = {}) {
  if (isAdminInterno(user)) {
    return true;
  }

  switch (route) {
    case 'home':
      return !isEmpleadoRole(role);
    case 'facturacion':
    case 'usuarios':
      return EMPRESA_ADMIN_ROLES.has(role);
    case 'fabricante':
    case 'informes':
    case 'ia':
      return !isEmpleadoRole(role);
    default:
      return true;
  }
}

export function getDefaultAuthenticatedPath({ role, user, nextPath } = {}) {
  if (nextPath) {
    return nextPath;
  }

  if (isAdminInterno(user)) {
    return '/';
  }

  return isEmpleadoRole(role) ? '/ventas' : '/';
}
