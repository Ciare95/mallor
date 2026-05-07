from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Callable, Dict, Iterable, List, Optional

from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.db.models import Count, Max, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from cliente.models import Cliente
from empresa.context import reset_empresa_actual, set_empresa_actual
from empresa.models import EmpresaUsuario
from informes.services import ReporteEstadisticasService
from inventario.models import Producto
from ventas.models import (
    FacturacionElectronicaConfig,
    FactusNumberingRange,
    Venta,
    VentaFacturaElectronica,
)


ADMIN_ROLES = (
    EmpresaUsuario.Rol.PROPIETARIO,
    EmpresaUsuario.Rol.ADMIN,
)
ALL_ROLES = ADMIN_ROLES + (EmpresaUsuario.Rol.EMPLEADO,)
MAX_TOOL_RESULTS = getattr(settings, 'IA_MAX_TOOL_RESULTS', 20)


class IAToolError(ValueError):
    pass


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    roles: tuple[str, ...]
    executor: Callable[[Any, Dict[str, Any]], Dict[str, Any]]
    parameters: Dict[str, Any]


def _json_safe(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value.quantize(Decimal('0.01')))
    if isinstance(value, (date,)):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    return value


def _parse_limit(value: Any, default: int = 10) -> int:
    try:
        limit = int(value)
    except (TypeError, ValueError):
        limit = default
    return max(1, min(limit, MAX_TOOL_RESULTS))


def _period_dates(params: Dict[str, Any]) -> tuple[date, date]:
    today = timezone.localdate()
    periodo = str(params.get('periodo') or '').lower().strip()
    fecha_inicio = params.get('fecha_inicio')
    fecha_fin = params.get('fecha_fin')

    if fecha_inicio and fecha_fin:
        try:
            start = date.fromisoformat(str(fecha_inicio))
            end = date.fromisoformat(str(fecha_fin))
        except ValueError as exc:
            raise IAToolError('Las fechas deben tener formato YYYY-MM-DD.') from exc
        if start > end:
            raise IAToolError('La fecha de inicio no puede ser posterior a la fecha final.')
        return start, end

    if periodo == 'hoy':
        return today, today
    if periodo == 'semana':
        return today - timedelta(days=today.weekday()), today
    if periodo == 'mes' or not periodo:
        return today.replace(day=1), today

    raise IAToolError('Periodo no soportado. Use hoy, semana, mes o fechas ISO.')


def _tool_resumen_ventas_periodo(context, params):
    start, end = _period_dates(params)
    return {
        'tipo': 'resumen_ventas_periodo',
        'datos': ReporteEstadisticasService.estadisticas_ventas_periodo(start, end),
    }


def _tool_productos_bajo_stock(context, params):
    try:
        minimo = Decimal(str(params.get('minimo') or '10'))
    except Exception as exc:
        raise IAToolError('El minimo de stock debe ser numerico.') from exc
    limit = _parse_limit(params.get('limite'))
    productos = Producto.objects.select_related('categoria').filter(
        empresa=context.empresa,
        existencias__lt=minimo,
    ).order_by('existencias', 'nombre')[:limit]
    return {
        'tipo': 'productos_bajo_stock',
        'minimo': _json_safe(minimo),
        'resultados': [
            {
                'producto_id': producto.id,
                'nombre': producto.nombre,
                'codigo_interno': producto.codigo_interno,
                'categoria': producto.categoria.nombre if producto.categoria else '',
                'existencias': _json_safe(producto.existencias),
                'precio_venta': _json_safe(producto.precio_venta),
            }
            for producto in productos
        ],
    }


def _tool_productos_mas_vendidos(context, params):
    start, end = _period_dates(params)
    limit = _parse_limit(params.get('limite'))
    return {
        'tipo': 'productos_mas_vendidos',
        'datos': ReporteEstadisticasService.productos_mas_vendidos(
            start,
            end,
            limit,
        ),
    }


def _tool_valor_inventario(context, params):
    return {
        'tipo': 'valor_inventario',
        'datos': ReporteEstadisticasService.valor_total_inventario(),
    }


def _tool_mejores_clientes(context, params):
    start, end = _period_dates(params)
    limit = _parse_limit(params.get('limite'))
    return {
        'tipo': 'mejores_clientes',
        'datos': ReporteEstadisticasService.mejores_clientes(start, end, limit),
    }


def _tool_cuentas_por_cobrar(context, params):
    return {
        'tipo': 'cuentas_por_cobrar',
        'total': ReporteEstadisticasService.total_cuentas_por_cobrar(),
        'antiguedad': ReporteEstadisticasService.antiguedad_cartera(),
    }


def _tool_clientes_con_saldo_pendiente(context, params):
    limit = _parse_limit(params.get('limite'))
    clientes = Cliente.objects.filter(
        empresa=context.empresa,
        ventas__saldo_pendiente__gt=0,
        ventas__estado=Venta.Estado.TERMINADA,
    ).annotate(
        total_pendiente=Coalesce(Sum('ventas__saldo_pendiente'), Decimal('0.00')),
        cantidad_ventas=Count('ventas', distinct=True),
        ultima_venta=Max('ventas__fecha_venta'),
    ).order_by('-total_pendiente', 'id')[:limit]
    return {
        'tipo': 'clientes_con_saldo_pendiente',
        'resultados': [
            {
                'cliente_id': cliente.id,
                'nombre': cliente.get_nombre_completo(),
                'numero_documento': cliente.numero_documento,
                'total_pendiente': _json_safe(cliente.total_pendiente),
                'cantidad_ventas': cliente.cantidad_ventas,
                'ultima_venta': _json_safe(cliente.ultima_venta.date()) if cliente.ultima_venta else None,
            }
            for cliente in clientes
        ],
    }


def _tool_resumen_facturacion_electronica(context, params):
    config = FacturacionElectronicaConfig.objects.filter(
        empresa=context.empresa,
    ).first()
    documentos = VentaFacturaElectronica.objects.filter(
        empresa=context.empresa,
    )
    por_estado = {
        item['status']: item['total']
        for item in documentos.values('status').annotate(total=Count('id'))
    }
    rangos = FactusNumberingRange.objects.filter(
        empresa=context.empresa,
    ).values(
        'document_code',
        'prefix',
        'from_number',
        'to_number',
        'current_number',
        'is_active',
        'is_credit_note_range',
    )[:MAX_TOOL_RESULTS]
    return {
        'tipo': 'resumen_facturacion_electronica',
        'configuracion': {
            'habilitada': bool(config and config.is_enabled),
            'ambiente': config.environment if config else None,
            'auto_emitir_al_terminar': bool(config and config.auto_emitir_al_terminar),
            'auto_enviar_email': bool(config and config.auto_enviar_email),
            'ultima_conexion_estado': config.last_connection_status if config else '',
            'ultima_conexion_fecha': (
                config.last_connection_checked_at.isoformat()
                if config and config.last_connection_checked_at else None
            ),
        },
        'documentos_por_estado': por_estado,
        'rangos': list(rangos),
    }


TOOLS: Dict[str, ToolDefinition] = {
    'resumen_ventas_periodo': ToolDefinition(
        name='resumen_ventas_periodo',
        description='Resumen de ventas por periodo.',
        roles=ALL_ROLES,
        executor=_tool_resumen_ventas_periodo,
        parameters={'periodo': 'hoy|semana|mes', 'fecha_inicio': 'YYYY-MM-DD', 'fecha_fin': 'YYYY-MM-DD'},
    ),
    'productos_bajo_stock': ToolDefinition(
        name='productos_bajo_stock',
        description='Productos con existencias por debajo del minimo.',
        roles=ALL_ROLES,
        executor=_tool_productos_bajo_stock,
        parameters={'minimo': 'decimal', 'limite': '1..20'},
    ),
    'productos_mas_vendidos': ToolDefinition(
        name='productos_mas_vendidos',
        description='Productos mas vendidos por periodo.',
        roles=ALL_ROLES,
        executor=_tool_productos_mas_vendidos,
        parameters={'periodo': 'hoy|semana|mes', 'limite': '1..20'},
    ),
    'valor_inventario': ToolDefinition(
        name='valor_inventario',
        description='Valor actual del inventario.',
        roles=ALL_ROLES,
        executor=_tool_valor_inventario,
        parameters={},
    ),
    'mejores_clientes': ToolDefinition(
        name='mejores_clientes',
        description='Clientes con mayor compra en un periodo.',
        roles=ADMIN_ROLES,
        executor=_tool_mejores_clientes,
        parameters={'periodo': 'hoy|semana|mes', 'limite': '1..20'},
    ),
    'cuentas_por_cobrar': ToolDefinition(
        name='cuentas_por_cobrar',
        description='Resumen de cartera y antiguedad.',
        roles=ALL_ROLES,
        executor=_tool_cuentas_por_cobrar,
        parameters={},
    ),
    'clientes_con_saldo_pendiente': ToolDefinition(
        name='clientes_con_saldo_pendiente',
        description='Detalle de clientes con saldo pendiente y monto adeudado.',
        roles=ALL_ROLES,
        executor=_tool_clientes_con_saldo_pendiente,
        parameters={'limite': '1..20'},
    ),
    'resumen_facturacion_electronica': ToolDefinition(
        name='resumen_facturacion_electronica',
        description='Resumen saneado de estado de facturacion electronica.',
        roles=ADMIN_ROLES,
        executor=_tool_resumen_facturacion_electronica,
        parameters={},
    ),
}


def allowed_tools_for_role(rol: str) -> Dict[str, ToolDefinition]:
    return {
        name: tool
        for name, tool in TOOLS.items()
        if rol in tool.roles
    }


def execute_tool(name: str, params: Optional[Dict[str, Any]], context) -> Dict[str, Any]:
    tool = TOOLS.get(name)
    if tool is None:
        raise IAToolError('La herramienta solicitada no existe.')
    if context.rol_empresa not in tool.roles:
        raise PermissionDenied('El rol activo no puede usar esta herramienta IA.')

    token = set_empresa_actual(context.empresa)
    try:
        return _json_safe(tool.executor(context, params or {}))
    finally:
        reset_empresa_actual(token)


def tool_catalog_for_prompt(rol: str) -> List[Dict[str, Any]]:
    return [
        {
            'name': tool.name,
            'description': tool.description,
            'parameters': tool.parameters,
        }
        for tool in allowed_tools_for_role(rol).values()
    ]
