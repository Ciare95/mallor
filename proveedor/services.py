from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.db import transaction
from django.db.models import Avg, Count, Max, Q, Sum
from django.db.models.functions import Coalesce
from django.utils.dateparse import parse_date

from core.exceptions import (
    ProveedorDuplicadoError,
    ProveedorNoEncontradoError,
)
from empresa.context import get_empresa_actual_or_default
from inventario.models import FacturaCompra
from proveedor.models import Proveedor


QUANTIZER = Decimal('0.01')


class ProveedorService:
    """
    Servicio de logica de negocio para proveedores.
    """

    @staticmethod
    def _queryset_base():
        return Proveedor.objects.filter(empresa=get_empresa_actual_or_default())

    @staticmethod
    def _queryset_historial(proveedor_id: int):
        empresa = get_empresa_actual_or_default()
        return FacturaCompra.objects.select_related(
            'proveedor',
            'usuario_registro',
        ).prefetch_related(
            'detalles__producto',
        ).filter(proveedor_id=proveedor_id, empresa=empresa)

    @staticmethod
    def _to_bool(value):
        if isinstance(value, bool):
            return value

        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {'true', '1', 'si', 'sí', 'yes'}:
                return True
            if normalized in {'false', '0', 'no'}:
                return False

        return value

    @staticmethod
    def _to_date(value):
        if value in (None, ''):
            return None

        if hasattr(value, 'year') and hasattr(value, 'month'):
            return value

        if isinstance(value, str):
            return parse_date(value)

        return None

    @staticmethod
    def _apply_proveedor_filters(
        queryset,
        filtros: Optional[Dict[str, Any]],
    ):
        if not filtros:
            return queryset

        q_objects = Q()

        if filtros.get('q'):
            termino = filtros['q']
            q_objects &= (
                Q(numero_documento__icontains=termino) |
                Q(razon_social__icontains=termino) |
                Q(nombre_comercial__icontains=termino) |
                Q(nombre_contacto__icontains=termino) |
                Q(email__icontains=termino) |
                Q(telefono__icontains=termino) |
                Q(celular__icontains=termino) |
                Q(ciudad__icontains=termino) |
                Q(tipo_productos__icontains=termino)
            )

        if filtros.get('tipo_documento'):
            q_objects &= Q(tipo_documento=filtros['tipo_documento'])

        if filtros.get('ciudad'):
            q_objects &= Q(ciudad__icontains=filtros['ciudad'])

        if filtros.get('forma_pago'):
            q_objects &= Q(forma_pago=filtros['forma_pago'])

        activo = ProveedorService._to_bool(filtros.get('activo'))
        if activo is not None:
            q_objects &= Q(activo=activo)

        if q_objects:
            queryset = queryset.filter(q_objects)

        return queryset.distinct()

    @staticmethod
    def _apply_historial_filters(
        queryset,
        filtros: Optional[Dict[str, Any]],
    ):
        if not filtros:
            return queryset.order_by('-fecha_factura', '-created_at')

        fecha_desde = ProveedorService._to_date(filtros.get('fecha_desde'))
        if fecha_desde:
            queryset = queryset.filter(fecha_factura__gte=fecha_desde)

        fecha_hasta = ProveedorService._to_date(filtros.get('fecha_hasta'))
        if fecha_hasta:
            queryset = queryset.filter(fecha_factura__lte=fecha_hasta)

        if filtros.get('estado'):
            queryset = queryset.filter(estado=filtros['estado'])

        if filtros.get('q'):
            termino = filtros['q']
            queryset = queryset.filter(
                Q(numero_factura__icontains=termino) |
                Q(observaciones__icontains=termino)
            )

        ordering = filtros.get('ordering', '-fecha_factura')
        ordering_permitido = {
            'fecha_factura',
            '-fecha_factura',
            'total',
            '-total',
            'numero_factura',
            '-numero_factura',
            'created_at',
            '-created_at',
        }
        if ordering not in ordering_permitido:
            ordering = '-fecha_factura'

        return queryset.order_by(ordering, '-created_at')

    @staticmethod
    def _calcular_estadisticas(proveedor: Proveedor) -> Dict[str, Any]:
        queryset = FacturaCompra.objects.filter(
            proveedor=proveedor,
            empresa=get_empresa_actual_or_default(),
        )
        procesadas = queryset.filter(estado=FacturaCompra.ESTADO_PROCESADA)
        pendientes = queryset.filter(estado=FacturaCompra.ESTADO_PENDIENTE)

        agregados = queryset.aggregate(
            cantidad_compras=Coalesce(Count('id'), 0),
            compras_procesadas=Coalesce(
                Count('id', filter=Q(
                    estado=FacturaCompra.ESTADO_PROCESADA,
                )),
                0,
            ),
            compras_pendientes=Coalesce(
                Count('id', filter=Q(
                    estado=FacturaCompra.ESTADO_PENDIENTE,
                )),
                0,
            ),
            total_compras=Coalesce(
                Sum('total', filter=Q(
                    estado=FacturaCompra.ESTADO_PROCESADA,
                )),
                Decimal('0.00'),
            ),
            ticket_promedio=Coalesce(
                Avg('total', filter=Q(
                    estado=FacturaCompra.ESTADO_PROCESADA,
                )),
                Decimal('0.00'),
            ),
            total_impuestos=Coalesce(
                Sum('iva', filter=Q(
                    estado=FacturaCompra.ESTADO_PROCESADA,
                )),
                Decimal('0.00'),
            ),
            total_descuentos=Coalesce(
                Sum('descuento'),
                Decimal('0.00'),
            ),
            ultima_compra=Max(
                'fecha_factura',
                filter=Q(estado=FacturaCompra.ESTADO_PROCESADA),
            ),
        )

        total_pendiente = pendientes.aggregate(
            total=Coalesce(Sum('total'), Decimal('0.00')),
        )['total']

        return {
            'proveedor_id': proveedor.id,
            'razon_social': proveedor.razon_social,
            'nombre_comercial': proveedor.nombre_comercial,
            'cantidad_compras': agregados['cantidad_compras'],
            'compras_procesadas': agregados['compras_procesadas'],
            'compras_pendientes': agregados['compras_pendientes'],
            'total_compras': agregados['total_compras'].quantize(QUANTIZER),
            'ticket_promedio': agregados['ticket_promedio'].quantize(
                QUANTIZER,
            ),
            'total_impuestos': agregados['total_impuestos'].quantize(
                QUANTIZER,
            ),
            'total_descuentos': agregados['total_descuentos'].quantize(
                QUANTIZER,
            ),
            'total_pendiente_procesar': total_pendiente.quantize(
                QUANTIZER,
            ),
            'ultima_compra': agregados['ultima_compra'],
            'facturas_relacionadas': queryset.count(),
            'facturas_procesadas_ids': list(
                procesadas.values_list('id', flat=True),
            ),
        }

    @staticmethod
    @transaction.atomic
    def crear_proveedor(data: Dict[str, Any]) -> Proveedor:
        datos = data.copy()
        datos['empresa'] = get_empresa_actual_or_default()
        ProveedorService.validar_documento_unico(
            datos.get('numero_documento'),
        )
        return Proveedor.objects.create(**datos)

    @staticmethod
    def obtener_proveedor(proveedor_id: int) -> Proveedor:
        try:
            return ProveedorService._queryset_base().get(pk=proveedor_id)
        except Proveedor.DoesNotExist as exc:
            raise ProveedorNoEncontradoError(proveedor_id) from exc

    @staticmethod
    def listar_proveedores(
        filtros: Optional[Dict[str, Any]] = None,
    ) -> List[Proveedor]:
        queryset = ProveedorService._apply_proveedor_filters(
            ProveedorService._queryset_base(),
            filtros,
        )

        ordering = (filtros or {}).get('ordering', 'razon_social')
        ordering_permitido = {
            'razon_social',
            '-razon_social',
            'numero_documento',
            '-numero_documento',
            'ciudad',
            '-ciudad',
            'created_at',
            '-created_at',
        }
        if ordering not in ordering_permitido:
            ordering = 'razon_social'

        return list(queryset.order_by(ordering))

    @staticmethod
    @transaction.atomic
    def actualizar_proveedor(
        proveedor_id: int,
        data: Dict[str, Any],
    ) -> Proveedor:
        proveedor = ProveedorService.obtener_proveedor(proveedor_id)
        datos = data.copy()

        numero_documento = datos.get(
            'numero_documento',
            proveedor.numero_documento,
        )
        ProveedorService.validar_documento_unico(
            numero_documento,
            proveedor_id=proveedor.id,
        )

        for campo, valor in datos.items():
            if hasattr(proveedor, campo):
                setattr(proveedor, campo, valor)

        proveedor.save()
        return proveedor

    @staticmethod
    @transaction.atomic
    def eliminar_proveedor(proveedor_id: int) -> Proveedor:
        proveedor = ProveedorService.obtener_proveedor(proveedor_id)
        proveedor.activo = False
        proveedor.save(update_fields=['activo', 'updated_at'])
        return proveedor

    @staticmethod
    def obtener_historial_compras(
        proveedor_id: int,
        filtros: Optional[Dict[str, Any]] = None,
    ) -> List[FacturaCompra]:
        ProveedorService.obtener_proveedor(proveedor_id)
        queryset = ProveedorService._queryset_historial(proveedor_id)
        return list(
            ProveedorService._apply_historial_filters(queryset, filtros),
        )

    @staticmethod
    def obtener_estadisticas_proveedor(
        proveedor_id: int,
    ) -> Dict[str, Any]:
        proveedor = ProveedorService.obtener_proveedor(proveedor_id)
        return ProveedorService._calcular_estadisticas(proveedor)

    @staticmethod
    def validar_documento_unico(
        numero_documento: Optional[str],
        proveedor_id: Optional[int] = None,
    ) -> bool:
        if not numero_documento:
            return True

        queryset = Proveedor.objects.filter(
            empresa=get_empresa_actual_or_default(),
            numero_documento=numero_documento,
        )

        if proveedor_id is not None:
            queryset = queryset.exclude(pk=proveedor_id)

        if queryset.exists():
            raise ProveedorDuplicadoError(numero_documento)

        return True
