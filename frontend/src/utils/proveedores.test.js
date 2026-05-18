import { describe, expect, it } from 'vitest';
import {
  buildProveedorPayload,
  createProveedorFormState,
} from './proveedores';

describe('proveedores municipio normalization', () => {
  it('deriva ciudad y departamento desde una ciudad conocida', () => {
    const form = createProveedorFormState({
      ciudad: 'Bogota, D.C.',
    });

    expect(form.municipio_codigo).toBe('11001');
    expect(form.ciudad).toBe('BOGOTÁ, D.C.');
    expect(form.departamento).toBe('Bogota, D.C.');
  });

  it('normaliza payload usando el municipio seleccionado', () => {
    const payload = buildProveedorPayload({
      tipo_documento: 'NIT',
      numero_documento: '900123456',
      razon_social: 'Proveedor SAS',
      nombre_comercial: '',
      nombre_contacto: 'Ana',
      email: 'ana@proveedor.test',
      telefono: '3001112233',
      celular: '',
      direccion: 'Calle 1',
      ciudad: '',
      departamento: '',
      municipio_codigo: '11001',
      tipo_productos: 'Abarrotes',
      forma_pago: 'CONTADO',
      cuenta_bancaria: '',
      banco: '',
      observaciones: '',
      activo: true,
    });

    expect(payload.ciudad).toBe('BOGOTÁ, D.C.');
    expect(payload.departamento).toBe('Bogota, D.C.');
  });
});
