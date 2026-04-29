"""
Utilidades de conversion de unidades para el modulo de fabricante.

Centraliza las reglas de compatibilidad, factores de conversion y
calculo de costos por unidad para mantener una sola fuente de verdad.
"""

from decimal import Decimal, InvalidOperation

CONVERSION_QUANTIZER = Decimal('0.0001')
COST_QUANTIZER = Decimal('0.0001')
ONE_UNIT = Decimal('1')
ZERO = Decimal('0.0000')

TIPO_VOLUMEN = 'VOLUMEN'
TIPO_MASA = 'MASA'
TIPO_CONTEO = 'CONTEO'
TIPOS_CONVERSION_LIQUIDA = {TIPO_VOLUMEN, TIPO_MASA}

UNIDADES_SOPORTADAS = {
    'GARRAFAS': {
        'categoria': TIPO_VOLUMEN,
        'factor_base': Decimal('18927.0590'),
        'label': 'Garrafas',
    },
    'GALONES': {
        'categoria': TIPO_VOLUMEN,
        'factor_base': Decimal('3785.4118'),
        'label': 'Galones',
    },
    'LITROS': {
        'categoria': TIPO_VOLUMEN,
        'factor_base': Decimal('1000'),
        'label': 'Litros',
    },
    'MILILITROS': {
        'categoria': TIPO_VOLUMEN,
        'factor_base': Decimal('1'),
        'label': 'Mililitros',
    },
    'ONZAS_LIQUIDAS': {
        'categoria': TIPO_VOLUMEN,
        'factor_base': Decimal('29.5735'),
        'label': 'Onzas liquidas',
    },
    'KILOGRAMOS': {
        'categoria': TIPO_MASA,
        'factor_base': Decimal('1000'),
        'label': 'Kilogramos',
    },
    'GRAMOS': {
        'categoria': TIPO_MASA,
        'factor_base': Decimal('1'),
        'label': 'Gramos',
    },
    'LIBRAS': {
        'categoria': TIPO_MASA,
        'factor_base': Decimal('453.5924'),
        'label': 'Libras',
    },
    'ONZAS': {
        'categoria': TIPO_MASA,
        'factor_base': Decimal('28.3495'),
        'label': 'Onzas',
    },
    'UNIDADES': {
        'categoria': TIPO_CONTEO,
        'factor_base': Decimal('1'),
        'label': 'Unidades',
    },
}


def _normalizar_unidad(unidad):
    """
    Normaliza el codigo de una unidad de medida.
    """
    return str(unidad or '').strip().upper()


def _obtener_configuracion_unidad(unidad):
    """
    Retorna la configuracion de una unidad o lanza un error si no existe.
    """
    unidad_normalizada = _normalizar_unidad(unidad)
    configuracion = UNIDADES_SOPORTADAS.get(unidad_normalizada)

    if configuracion is None:
        raise ValueError(
            f'La unidad de medida "{unidad}" no esta soportada.'
        )

    return unidad_normalizada, configuracion


def _convertir_a_decimal(valor, nombre_campo):
    """
    Convierte un valor numerico a Decimal con validacion consistente.
    """
    try:
        return Decimal(str(valor))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(
            f'El valor de "{nombre_campo}" debe ser numerico.'
        ) from exc


def validar_compatibilidad_unidades(unidad1, unidad2):
    """
    Valida si dos unidades pertenecen a un tipo compatible de medida.

    Para formulas liquidas se usa una equivalencia por defecto de
    ``1 mililitro = 1 gramo``, por lo que masa y volumen se consideran
    compatibles entre si.
    """
    try:
        _, configuracion_unidad1 = _obtener_configuracion_unidad(unidad1)
        _, configuracion_unidad2 = _obtener_configuracion_unidad(unidad2)
    except ValueError:
        return False

    categoria_unidad1 = configuracion_unidad1['categoria']
    categoria_unidad2 = configuracion_unidad2['categoria']

    if (
        categoria_unidad1 in TIPOS_CONVERSION_LIQUIDA and
        categoria_unidad2 in TIPOS_CONVERSION_LIQUIDA
    ):
        return True

    return (
        categoria_unidad1 == categoria_unidad2
    )


def convertir_unidad(cantidad, unidad_origen, unidad_destino):
    """
    Convierte una cantidad entre dos unidades compatibles.

    Para conversiones entre volumen y masa se usa la equivalencia
    liquida por defecto de ``1 mililitro = 1 gramo``.
    """
    cantidad_decimal = _convertir_a_decimal(cantidad, 'cantidad')
    codigo_origen, configuracion_origen = _obtener_configuracion_unidad(
        unidad_origen,
    )
    codigo_destino, configuracion_destino = _obtener_configuracion_unidad(
        unidad_destino,
    )

    categoria_origen = configuracion_origen['categoria']
    categoria_destino = configuracion_destino['categoria']
    categorias_son_compatibles = (
        categoria_origen == categoria_destino or
        (
            categoria_origen in TIPOS_CONVERSION_LIQUIDA and
            categoria_destino in TIPOS_CONVERSION_LIQUIDA
        )
    )

    if not categorias_son_compatibles:
        raise ValueError(
            'Las unidades de origen y destino no son compatibles.'
        )

    if codigo_origen == codigo_destino:
        return cantidad_decimal.quantize(CONVERSION_QUANTIZER)

    cantidad_base = cantidad_decimal * configuracion_origen['factor_base']
    cantidad_convertida = (
        cantidad_base / configuracion_destino['factor_base']
    )

    return cantidad_convertida.quantize(CONVERSION_QUANTIZER)


def calcular_costo_por_unidad_destino(
    costo_origen,
    unidad_origen,
    unidad_destino,
):
    """
    Calcula el costo equivalente para una unidad de destino.

    Se asume que ``costo_origen`` corresponde al costo de 1 unidad de
    ``unidad_origen``.
    """
    costo_decimal = _convertir_a_decimal(costo_origen, 'costo_origen')
    if costo_decimal < ZERO:
        raise ValueError('El costo de origen no puede ser negativo.')

    cantidad_destino = convertir_unidad(
        ONE_UNIT,
        unidad_origen,
        unidad_destino,
    )
    if cantidad_destino <= ZERO:
        raise ValueError(
            'La conversion produjo una cantidad invalida para el destino.'
        )

    return (costo_decimal / cantidad_destino).quantize(COST_QUANTIZER)
