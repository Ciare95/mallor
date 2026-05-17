import { describe, expect, it } from 'vitest';
import { buildClientePayload, createClienteFormState } from './clientes';
import { getMunicipioSelection } from './municipios';
import { calculateNitVerificationDigit, sanitizeNumeric } from './nit';

describe('calculateNitVerificationDigit', () => {
  it('calcula el DV de un NIT numerico', () => {
    expect(calculateNitVerificationDigit('800197268')).toBe('4');
    expect(calculateNitVerificationDigit('900373913')).toBe('4');
  });

  it('ignora caracteres no numericos y devuelve vacio si no hay NIT', () => {
    expect(calculateNitVerificationDigit('800.197.268')).toBe('4');
    expect(sanitizeNumeric('900.373.913-4')).toBe('9003739134');
    expect(calculateNitVerificationDigit('')).toBe('');
  });
});

describe('cliente DV behavior', () => {
  it('calcula el DV al crear el estado de un cliente NIT', () => {
    const form = createClienteFormState({
      tipo_documento: 'NIT',
      numero_documento: '800197268',
      digito_verificacion: '9',
    });

    expect(form.digito_verificacion).toBe('4');
  });

  it('solo envia DV en payload cuando el documento es NIT', () => {
    expect(buildClientePayload({
      tipo_documento: 'NIT',
      numero_documento: '800197268',
      digito_verificacion: '',
      nombre: '',
      razon_social: 'Mallor SAS',
      nombre_comercial: '',
      email: '',
      telefono: '',
      celular: '',
      direccion: '',
      ciudad: '',
      departamento: '',
      municipio_codigo: '',
      codigo_postal: '',
      tipo_cliente: 'JURIDICO',
      regimen_tributario: '',
      responsable_iva: false,
      limite_credito: 0,
      dias_plazo: 0,
      observaciones: '',
      activo: true,
    }).digito_verificacion).toBe('4');

    expect(buildClientePayload({
      tipo_documento: 'CC',
      numero_documento: '123456789',
      digito_verificacion: '7',
      nombre: 'Cliente',
      razon_social: '',
      nombre_comercial: '',
      email: '',
      telefono: '',
      celular: '',
      direccion: '',
      ciudad: '',
      departamento: '',
      municipio_codigo: '',
      codigo_postal: '',
      tipo_cliente: 'NATURAL',
      regimen_tributario: '',
      responsable_iva: false,
      limite_credito: 0,
      dias_plazo: 0,
      observaciones: '',
      activo: true,
    }).digito_verificacion).toBe('');
  });

  it('deriva ciudad, departamento y codigo desde el municipio seleccionado', () => {
    const selection = getMunicipioSelection('Bogota, D.C.');
    expect(selection).toEqual({
      code: '11001',
      city: 'BOGOTÁ, D.C.',
      department: 'Bogota, D.C.',
    });

    const form = createClienteFormState({
      municipio_codigo: '11001',
    });
    expect(form.ciudad).toBe('BOGOTÁ, D.C.');
    expect(form.departamento).toBe('Bogota, D.C.');

    const payload = buildClientePayload({
      ...form,
      tipo_documento: 'CC',
      numero_documento: '123456789',
      nombre: 'Cliente',
      telefono: '3000000000',
      direccion: 'Calle 1',
      activo: true,
      tipo_cliente: 'NATURAL',
      responsable_iva: false,
      limite_credito: 0,
      dias_plazo: 0,
      email: '',
      celular: '',
      codigo_postal: '',
      observaciones: '',
      razon_social: '',
      nombre_comercial: '',
      regimen_tributario: '',
      digito_verificacion: '',
    });

    expect(payload.municipio_codigo).toBe('11001');
    expect(payload.ciudad).toBe('BOGOTÁ, D.C.');
    expect(payload.departamento).toBe('Bogota, D.C.');
  });
});
