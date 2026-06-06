const EMPRESA_ADMIN_ROLES = new Set(['PROPIETARIO', 'ADMIN']);
const CONTADOR_ROLES = new Set(['PROPIETARIO', 'ADMIN', 'CONTADOR']);

export function isAdminInterno(user) {
  return Boolean(user?.is_superuser || user?.is_staff);
}

export function isEmpleadoRole(role) {
  return role === 'EMPLEADO';
}

export function isContadorRole(role) {
  return role === 'CONTADOR';
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
      return !isEmpleadoRole(role) && !isContadorRole(role);
    case 'contadores':
      return CONTADOR_ROLES.has(role);
    case 'facturacion':
    case 'usuarios':
      return EMPRESA_ADMIN_ROLES.has(role);
    case 'fabricante':
    case 'informes':
    case 'ia':
      return !isEmpleadoRole(role);
    case 'empresas-admin':
    case 'admin-licencias':
      return false; // only isAdminInterno (checked above) may access these
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

  if (isContadorRole(role)) {
    return '/contadores';
  }

  return isEmpleadoRole(role) ? '/ventas' : '/';
}
