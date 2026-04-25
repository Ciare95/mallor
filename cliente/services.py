from datetime import timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.db import transaction
from django.db.models import Avg, Count, Max, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.translation import gettext_lazy as _

from cliente.models import Cliente
from core.exceptions import (
    ClienteConVentasError,
    ClienteCreditoInsuficienteError,
    ClienteDuplicadoError,
    ClienteInactivoError,
    ClienteNoEncontradoError,
)
from ventas.models import Venta


QUANTIZER = Decimal('0.01')


class ClienteService:
    """
    Servicio de lógica de negocio para el módulo de clientes.
    """

    @staticmethod
    def _queryset_base():
        return Cliente.objects.all()

    @staticmethod
    def _queryset_historial(cliente_id: int):
        return Venta.objects.select_related(
            'cliente',
            'usuario_registro',
        ).prefetch_related(
            'detalles__producto',
            'abonos__usuario_registro',
        ).filter(cliente_id=cliente_id)

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
    def _apply_cliente_filters(queryset, filtros: Optional[Dict[str, Any]]):
        if not filtros:
            return queryset

        q_objects = Q()

        if filtros.get('q'):
            termino = filtros['q']
            q_objects &= (
                Q(nombre__icontains=termino) |
                Q(razon_social__icontains=termino) |
                Q(nombre_comercial__icontains=termino) |
                Q(numero_documento__icontains=termino) |
                Q(email__icontains=termino) |
                Q(telefono__icontains=termino) |
                Q(celular__icontains=termino)
            )

        if filtros.get('tipo_cliente'):
            q_objects &= Q(tipo_cliente=filtros['tipo_cliente'])

        if filtros.get('tipo_documento'):
            q_objects &= Q(tipo_documento=filtros['tipo_documento'])

        if filtros.get('ciudad'):
            q_objects &= Q(ciudad__icontains=filtros['ciudad'])

        if filtros.get('departamento'):
            q_objects &= Q(departamento__icontains=filtros['departamento'])

        activo = ClienteService._to_bool(filtros.get('activo'))
        if activo is not None:
            q_objects &= Q(activo=activo)

        responsable_iva = ClienteService._to_bool(
            filtros.get('responsable_iva')
        )
        if responsable_iva is not None:
            q_objects &= Q(responsable_iva=responsable_iva)

        if ClienteService._to_bool(filtros.get('con_saldo_pendiente')):
            q_objects &= Q(ventas__saldo_pendiente__gt=Decimal('0.00'))

        if q_objects:
            queryset = queryset.filter(q_objects)

        return queryset.distinct()

    @staticmethod
    def _apply_historial_filters(queryset, filtros: Optional[Dict[str, Any]]):
        if not filtros:
            return queryset.exclude(estado=Venta.Estado.CANCELADA)

        include_canceladas = filtros.get('include_canceladas', False)
        if not include_canceladas:
            queryset = queryset.exclude(estado=Venta.Estado.CANCELADA)

        fecha_desde = ClienteService._to_date(
            filtros.get('fecha_desde') or filtros.get('fecha_inicio')
        )
        if fecha_desde:
            queryset = queryset.filter(fecha_venta__date__gte=fecha_desde)

        fecha_hasta = ClienteService._to_date(
            filtros.get('fecha_hasta') or filtros.get('fecha_fin')
        )
        if fecha_hasta:
            queryset = queryset.filter(fecha_venta__date__lte=fecha_hasta)

        if filtros.get('estado'):
            queryset = queryset.filter(estado=filtros['estado'])

        if filtros.get('estado_pago'):
            queryset = queryset.filter(estado_pago=filtros['estado_pago'])

        if filtros.get('metodo_pago'):
            queryset = queryset.filter(metodo_pago=filtros['metodo_pago'])

        if filtros.get('q'):
            termino = filtros['q']
            queryset = queryset.filter(
                Q(numero_venta__icontains=termino) |
                Q(observaciones__icontains=termino)
            )

        ordering = filtros.get('ordering', '-fecha_venta')
        ordering_permitido = {
            'fecha_venta',
            '-fecha_venta',
            'total',
            '-total',
            'saldo_pendiente',
            '-saldo_pendiente',
            'numero_venta',
            '-numero_venta',
        }
        if ordering not in ordering_permitido:
            ordering = '-fecha_venta'

        return queryset.order_by(ordering)

    @staticmethod
    def _ventas_vencidas_queryset(cliente: Cliente):
        today = timezone.localdate()
        dias_plazo = max(cliente.dias_plazo, 0)
        fecha_limite = today - timedelta(days=dias_plazo)

        queryset = cliente.ventas.exclude(
            estado=Venta.Estado.CANCELADA,
        ).filter(
            saldo_pendiente__gt=Decimal('0.00'),
        )

        if dias_plazo == 0:
            return queryset.filter(fecha_venta__date__lt=today)

        return queryset.filter(fecha_venta__date__lt=fecha_limite)

    @staticmethod
    def _calcular_metricas_cliente(cliente: Cliente) -> Dict[str, Any]:
        ventas_queryset = cliente.ventas.exclude(
            estado=Venta.Estado.CANCELADA,
        )
        cartera_queryset = ventas_queryset.filter(
            saldo_pendiente__gt=Decimal('0.00'),
        )
        ventas_vencidas = ClienteService._ventas_vencidas_queryset(cliente)
        agregados = ventas_queryset.aggregate(
            total_compras=Coalesce(
                Sum('total'),
                Decimal('0.00'),
            ),
            cantidad_compras=Coalesce(
                Count('id'),
                0,
            ),
            ticket_promedio=Coalesce(
                Avg('total'),
                Decimal('0.00'),
            ),
            ultima_compra=Max('fecha_venta'),
        )
        saldo_pendiente = cartera_queryset.aggregate(
            total=Coalesce(
                Sum('saldo_pendiente'),
                Decimal('0.00'),
            ),
        )['total']
        total_vencido = ventas_vencidas.aggregate(
            total=Coalesce(
                Sum('saldo_pendiente'),
                Decimal('0.00'),
            ),
        )['total']

        return {
            'cliente_id': cliente.id,
            'nombre_completo': cliente.get_nombre_completo(),
            'cantidad_compras': agregados['cantidad_compras'],
            'total_compras': agregados['total_compras'].quantize(
                QUANTIZER,
            ),
            'saldo_pendiente': saldo_pendiente.quantize(QUANTIZER),
            'ticket_promedio': agregados['ticket_promedio'].quantize(
                QUANTIZER,
            ),
            'ultima_compra': agregados['ultima_compra'],
            'ventas_con_saldo': cartera_queryset.count(),
            'ventas_vencidas': ventas_vencidas.count(),
            'total_vencido': total_vencido.quantize(QUANTIZER),
            'credito_disponible': cliente._calcular_credito_disponible_actual(),
            'limite_credito': cliente.limite_credito,
            'dias_plazo': cliente.dias_plazo,
        }

    @staticmethod
    def _asignar_estadisticas(cliente: Cliente) -> Cliente:
        cliente.estadisticas = ClienteService._calcular_metricas_cliente(
            cliente,
        )
        return cliente

    @staticmethod
    @transaction.atomic
    def crear_cliente(data: Dict[str, Any]) -> Cliente:
        """
        Crea un cliente aplicando las reglas de negocio del dominio.
        """
        datos = data.copy()
        ClienteService.validar_documento_unico(
            datos.get('tipo_documento'),
            datos.get('numero_documento'),
        )
        cliente = Cliente.objects.create(**datos)
        return ClienteService._asignar_estadisticas(cliente)

    @staticmethod
    def obtener_cliente(cliente_id: int) -> Cliente:
        """
        Obtiene un cliente con sus estadísticas de negocio calculadas.
        """
        try:
            cliente = ClienteService._queryset_base().get(pk=cliente_id)
        except Cliente.DoesNotExist as exc:
            raise ClienteNoEncontradoError(cliente_id) from exc

        return ClienteService._asignar_estadisticas(cliente)

    @staticmethod
    def listar_clientes(
        filtros: Optional[Dict[str, Any]] = None,
    ) -> List[Cliente]:
        """
        Lista clientes con filtros opcionales y ordenamiento controlado.
        """
        queryset = ClienteService._apply_cliente_filters(
            ClienteService._queryset_base(),
            filtros,
        )

        ordering = (filtros or {}).get('ordering', 'nombre')
        ordering_permitido = {
            'nombre',
            '-nombre',
            'created_at',
            '-created_at',
            'numero_documento',
            '-numero_documento',
            'limite_credito',
            '-limite_credito',
            'ciudad',
            '-ciudad',
        }
        if ordering not in ordering_permitido:
            ordering = 'nombre'

        return list(queryset.order_by(ordering))

    @staticmethod
    @transaction.atomic
    def actualizar_cliente(
        cliente_id: int,
        data: Dict[str, Any],
    ) -> Cliente:
        """
        Actualiza un cliente existente respetando reglas de cartera.
        """
        cliente = ClienteService.obtener_cliente(cliente_id)
        datos = data.copy()

        tipo_documento = datos.get('tipo_documento', cliente.tipo_documento)
        numero_documento = datos.get(
            'numero_documento',
            cliente.numero_documento,
        )
        ClienteService.validar_documento_unico(
            tipo_documento,
            numero_documento,
            cliente_id=cliente.id,
        )

        for campo, valor in datos.items():
            if hasattr(cliente, campo):
                setattr(cliente, campo, valor)

        cliente.save()
        return ClienteService._asignar_estadisticas(cliente)

    @staticmethod
    @transaction.atomic
    def eliminar_cliente(cliente_id: int) -> Cliente:
        """
        Realiza soft delete de un cliente si no tiene ventas asociadas.
        """
        cliente = ClienteService.obtener_cliente(cliente_id)

        if cliente.ventas.exists():
            raise ClienteConVentasError(cliente.get_nombre_completo())

        cliente.activo = False
        cliente.save(update_fields=['activo', 'updated_at'])
        return cliente

    @staticmethod
    @transaction.atomic
    def activar_desactivar_cliente(
        cliente_id: int,
        activo: bool,
    ) -> Cliente:
        """
        Cambia el estado activo/inactivo del cliente.
        """
        cliente = ClienteService.obtener_cliente(cliente_id)
        cliente.activo = bool(activo)
        cliente.save(update_fields=['activo', 'updated_at'])
        return ClienteService._asignar_estadisticas(cliente)

    @staticmethod
    def obtener_historial_compras(
        cliente_id: int,
        filtros: Optional[Dict[str, Any]] = None,
    ) -> List[Venta]:
        """
        Retorna el historial de ventas del cliente con filtros opcionales.
        """
        ClienteService.obtener_cliente(cliente_id)
        queryset = ClienteService._queryset_historial(cliente_id)
        return list(
            ClienteService._apply_historial_filters(queryset, filtros),
        )

    @staticmethod
    def obtener_cartera_cliente(cliente_id: int) -> List[Venta]:
        """
        Obtiene las ventas del cliente que aún tienen saldo pendiente.
        """
        ClienteService.obtener_cliente(cliente_id)
        return list(
            ClienteService._queryset_historial(cliente_id).exclude(
                estado=Venta.Estado.CANCELADA,
            ).filter(
                saldo_pendiente__gt=Decimal('0.00'),
            ).order_by('fecha_venta', 'created_at')
        )

    @staticmethod
    def calcular_estadisticas_cliente(cliente_id: int) -> Dict[str, Any]:
        """
        Calcula indicadores comerciales y de cartera para un cliente.
        """
        cliente = ClienteService.obtener_cliente(cliente_id)
        return ClienteService._calcular_metricas_cliente(cliente)

    @staticmethod
    def validar_credito_disponible(cliente_id: int, monto) -> bool:
        """
        Valida si el cliente tiene crédito suficiente para un monto dado.
        """
        cliente = ClienteService.obtener_cliente(cliente_id)

        if not cliente.activo:
            raise ClienteInactivoError(cliente.get_nombre_completo())

        monto_decimal = Decimal(str(monto)).quantize(QUANTIZER)
        disponible = cliente._calcular_credito_disponible_actual()

        if disponible < monto_decimal:
            raise ClienteCreditoInsuficienteError(
                cliente.get_nombre_completo(),
                disponible.quantize(QUANTIZER),
                monto_decimal,
            )

        return True

    @staticmethod
    def validar_documento_unico(
        tipo_documento: str,
        numero_documento: str,
        cliente_id: Optional[int] = None,
    ) -> bool:
        """
        Valida que no exista otro cliente con el mismo tipo y documento.
        """
        if not tipo_documento or not numero_documento:
            return True

        queryset = Cliente.objects.filter(
            tipo_documento=tipo_documento,
            numero_documento=str(numero_documento).strip(),
        )

        if cliente_id is not None:
            queryset = queryset.exclude(pk=cliente_id)

        if queryset.exists():
            raise ClienteDuplicadoError(
                tipo_documento,
                str(numero_documento).strip(),
            )

        return True

    @staticmethod
    def obtener_mejores_clientes(limite: int = 10) -> List[Cliente]:
        """
        Obtiene los clientes con mayor volumen histórico de compras.
        """
        limite = max(int(limite or 10), 1)
        queryset = ClienteService._queryset_base().filter(
            activo=True,
        ).annotate(
            total_compras_calculado=Coalesce(
                Sum(
                    'ventas__total',
                    filter=~Q(ventas__estado=Venta.Estado.CANCELADA),
                ),
                Decimal('0.00'),
            ),
            cantidad_compras_calculada=Coalesce(
                Count(
                    'ventas',
                    filter=~Q(ventas__estado=Venta.Estado.CANCELADA),
                    distinct=True,
                ),
                0,
            ),
            ultima_compra_fecha=Max(
                'ventas__fecha_venta',
                filter=~Q(ventas__estado=Venta.Estado.CANCELADA),
            ),
        ).filter(
            cantidad_compras_calculada__gt=0,
        ).order_by(
            '-total_compras_calculado',
            'nombre',
            'razon_social',
        )[:limite]

        return list(queryset)

    @staticmethod
    def obtener_clientes_morosos() -> List[Dict[str, Any]]:
        """
        Obtiene clientes con cartera vencida según su plazo comercial.
        """
        clientes = ClienteService._queryset_base().filter(
            activo=True,
            ventas__saldo_pendiente__gt=Decimal('0.00'),
        ).distinct()
        resultado = []

        for cliente in clientes:
            ventas_vencidas = ClienteService._ventas_vencidas_queryset(
                cliente,
            )
            if not ventas_vencidas.exists():
                continue

            total_vencido = ventas_vencidas.aggregate(
                total=Coalesce(
                    Sum('saldo_pendiente'),
                    Decimal('0.00'),
                ),
            )['total']

            resultado.append({
                'cliente': cliente,
                'total_vencido': total_vencido.quantize(QUANTIZER),
                'cantidad_ventas_vencidas': ventas_vencidas.count(),
                'ventas': list(
                    ventas_vencidas.order_by('fecha_venta', 'created_at')
                ),
            })

        resultado.sort(
            key=lambda item: item['total_vencido'],
            reverse=True,
        )
        return resultado

    @staticmethod
    def obtener_clientes_nuevos(dias: int = 30) -> List[Cliente]:
        """
        Obtiene clientes creados recientemente.
        """
        dias = max(int(dias or 30), 1)
        fecha_limite = timezone.now() - timedelta(days=dias)
        return list(
            ClienteService._queryset_base().filter(
                created_at__gte=fecha_limite,
            ).order_by('-created_at')
        )
