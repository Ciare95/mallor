import { describe, expect, it } from 'vitest';
import {
  canAccessRoute,
  getDefaultAuthenticatedPath,
} from './roleAccess';

describe('roleAccess', () => {
  it('redirige empleados a ventas por defecto', () => {
    expect(
      getDefaultAuthenticatedPath({
        role: 'EMPLEADO',
        user: { is_staff: false, is_superuser: false },
      }),
    ).toBe('/ventas');
  });

  it('mantiene inicio como destino por defecto para admin y propietario', () => {
    expect(getDefaultAuthenticatedPath({ role: 'ADMIN', user: {} })).toBe('/');
    expect(getDefaultAuthenticatedPath({ role: 'PROPIETARIO', user: {} })).toBe('/');
  });

  it('bloquea home, fabricante, informes e ia para empleado', () => {
    const context = {
      role: 'EMPLEADO',
      user: { is_staff: false, is_superuser: false },
    };

    expect(canAccessRoute('home', context)).toBe(false);
    expect(canAccessRoute('fabricante', context)).toBe(false);
    expect(canAccessRoute('informes', context)).toBe(false);
    expect(canAccessRoute('ia', context)).toBe(false);
    expect(canAccessRoute('ventas', context)).toBe(true);
  });
});
