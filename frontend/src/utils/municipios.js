import { findMunicipioByCode, findMunicipioByName } from '../data/dianMunicipios';

export const DEPARTAMENTOS_BY_PREFIX = {
  '05': 'Antioquia',
  '08': 'Atlantico',
  '11': 'Bogota, D.C.',
  '13': 'Bolivar',
  '15': 'Boyaca',
  '17': 'Caldas',
  '18': 'Caqueta',
  '19': 'Cauca',
  '20': 'Cesar',
  '23': 'Cordoba',
  '25': 'Cundinamarca',
  '27': 'Choco',
  '41': 'Huila',
  '44': 'La Guajira',
  '47': 'Magdalena',
  '50': 'Meta',
  '52': 'Nariño',
  '54': 'Norte de Santander',
  '63': 'Quindio',
  '66': 'Risaralda',
  '68': 'Santander',
  '70': 'Sucre',
  '73': 'Tolima',
  '76': 'Valle del Cauca',
  '81': 'Arauca',
  '85': 'Casanare',
  '86': 'Putumayo',
  '88': 'Archipielago de San Andres, Providencia y Santa Catalina',
  '91': 'Amazonas',
  '94': 'Guainia',
  '95': 'Guaviare',
  '97': 'Vaupes',
  '99': 'Vichada',
};

export const getDepartamentoByMunicipioCode = (code = '') =>
  DEPARTAMENTOS_BY_PREFIX[String(code).trim().slice(0, 2)] || '';

export const getMunicipioSelection = (value = '') => {
  const byCode = findMunicipioByCode(value);
  const byName = byCode ? null : findMunicipioByName(value);
  const municipio = byCode || byName;

  if (!municipio) {
    return null;
  }

  return {
    code: municipio.code,
    city: municipio.name,
    department: getDepartamentoByMunicipioCode(municipio.code),
  };
};

export const normalizeMunicipioFields = (fields = {}) => {
  const selected = getMunicipioSelection(
    fields.municipio_codigo || fields.ciudad || '',
  );

  if (!selected) {
    return {
      ciudad: fields.ciudad || '',
      departamento: fields.departamento || '',
      municipio_codigo: fields.municipio_codigo || '',
    };
  }

  return {
    ciudad: selected.city,
    departamento: selected.department,
    municipio_codigo: selected.code,
  };
};
