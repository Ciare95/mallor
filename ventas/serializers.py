from collections import defaultdict
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from cliente.models import Cliente
from core.exceptions import FacturacionValidacionError
from empresa.context import get_empresa_actual_or_default
from empresa.services import EmpresaService
from inventario.models import Producto
from usuario.models import Usuario
from ventas.factus_transformers import validar_empresa_facturable
from ventas.models import (
    Abono,
    DetalleVenta,
    FacturacionElectronicaConfig,
    FacturaElectronicaEntrega,
    FacturaElectronicaIntento,
    FacturaElectronicaSoporte,
    FactusCredential,
    FactusEnvironment,
    FactusNumberingRange,
    Venta,
    VentaFacturaElectronica,
)


class ProductoVentaInfoSerializer(serializers.ModelSerializer):
    """
    Serializer reducido con la informacion del producto en una venta.
    """

    codigo_interno_formateado = serializers.ReadOnlyField()

    class Meta:
        model = Producto
        fields = [
            'id',
            'codigo_interno',
            'codigo_interno_formateado',
            'codigo_barras',
            'nombre',
            'marca',
            'precio_venta',
            'es_producto_especial',
            'iva',
            'unidad_medida_codigo',
            'estandar_codigo',
        ]
        read_only_fields = fields


def build_producto_temporal_info(detalle: DetalleVenta) -> dict:
    return {
        'id': f'temporal-{detalle.id}',
        'codigo_interno': None,
        'codigo_interno_formateado': '',
        'codigo_barras': '',
        'nombre': detalle.producto_temporal_nombre,
        'marca': '',
        'precio_venta': detalle.precio_unitario,
        'es_producto_especial': False,
        'es_producto_temporal': True,
        'iva': Decimal('0.00'),
        'unidad_medida_codigo': '94',
        'estandar_codigo': '999',
    }


class ClienteVentaInfoSerializer(serializers.ModelSerializer):
    """
    Informacion resumida del cliente para respuestas de ventas.
    """

    nombre_completo = serializers.CharField(
        source='get_nombre_completo',
        read_only=True,
    )

    class Meta:
        model = Cliente
        fields = [
            'id',
            'tipo_documento',
            'numero_documento',
            'digito_verificacion',
            'nombre_completo',
            'telefono',
            'email',
            'municipio_codigo',
        ]
        read_only_fields = fields


class UsuarioVentaInfoSerializer(serializers.ModelSerializer):
    """
    Informacion resumida del usuario para respuestas de ventas.
    """

    full_name = serializers.CharField(
        source='get_full_name',
        read_only=True,
    )

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'full_name', 'email']
        read_only_fields = fields


class DetalleVentaSerializer(serializers.ModelSerializer):
    """
    Serializer completo de detalle de venta con informacion del producto.
    """

    producto = serializers.SerializerMethodField()
    producto_id = serializers.PrimaryKeyRelatedField(
        queryset=Producto.objects.all(),
        source='producto',
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = DetalleVenta
        fields = [
            'id',
            'uuid',
            'venta',
            'producto',
            'producto_id',
            'producto_temporal_nombre',
            'cantidad',
            'precio_unitario',
            'subtotal',
            'descuento',
            'iva',
            'total',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'uuid',
            'venta',
            'subtotal',
            'iva',
            'total',
            'created_at',
            'updated_at',
        ]

    def get_producto(self, obj):
        if obj.producto_id:
            return ProductoVentaInfoSerializer(obj.producto).data
        return build_producto_temporal_info(obj)


class DetalleVentaCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear o validar detalles de una venta.
    """

    producto = serializers.PrimaryKeyRelatedField(
        queryset=Producto.objects.all(),
        required=False,
        allow_null=True,
    )
    producto_temporal_nombre = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=200,
    )
    precio_unitario = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
    )

    class Meta:
        model = DetalleVenta
        fields = [
            'producto',
            'producto_temporal_nombre',
            'cantidad',
            'precio_unitario',
            'descuento',
        ]

    def validate_cantidad(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError(
                _('La cantidad debe ser mayor que cero.'),
            )
        return value

    def validate_precio_unitario(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError(
                _('El precio unitario debe ser mayor que cero.'),
            )
        return value

    def validate_descuento(self, value):
        if value < Decimal('0.00'):
            raise serializers.ValidationError(
                _('El descuento no puede ser negativo.'),
            )
        return value

    def validate(self, attrs):
        producto = attrs.get('producto')
        producto_temporal_nombre = str(
            attrs.get('producto_temporal_nombre') or '',
        ).strip()
        if producto is None and not producto_temporal_nombre:
            raise serializers.ValidationError({
                'producto': _(
                    'Debe seleccionar un producto o indicar un producto temporal.'
                ),
            })
        if producto is not None and producto_temporal_nombre:
            raise serializers.ValidationError({
                'producto_temporal_nombre': _(
                    'No mezcles producto de inventario con producto temporal.'
                ),
            })

        precio_definido = 'precio_unitario' in attrs
        precio_unitario = attrs.get(
            'precio_unitario',
            producto.precio_venta if producto is not None else None,
        )
        if precio_unitario is None:
            raise serializers.ValidationError({
                'precio_unitario': _(
                    'El precio es obligatorio para productos temporales.'
                ),
            })
        cantidad = attrs['cantidad']
        descuento = attrs.get('descuento', Decimal('0.00'))
        subtotal = cantidad * precio_unitario

        if (
            producto is not None
            and
            not producto.es_producto_especial
            and precio_definido
            and precio_unitario.quantize(Decimal('0.01'))
            != producto.precio_venta.quantize(Decimal('0.01'))
        ):
            raise serializers.ValidationError({
                'precio_unitario': _(
                    'El precio solo se puede cambiar en productos especiales.'
                ),
            })

        if descuento > subtotal:
            raise serializers.ValidationError({
                'descuento': _(
                    'El descuento no puede exceder el subtotal del detalle.'
                ),
            })

        attrs['precio_unitario'] = precio_unitario
        attrs['producto_temporal_nombre'] = producto_temporal_nombre
        return attrs


class VentaListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listados de ventas.
    """

    cliente_nombre = serializers.CharField(
        source='cliente.get_nombre_completo',
        read_only=True,
        allow_null=True,
    )
    usuario_registro_nombre = serializers.CharField(
        source='usuario_registro.get_full_name',
        read_only=True,
    )
    detalles_count = serializers.IntegerField(
        source='detalles.count',
        read_only=True,
    )

    class Meta:
        model = Venta
        fields = [
            'id',
            'uuid',
            'numero_venta',
            'terminal',
            'caja_sesion',
            'cliente',
            'cliente_nombre',
            'fecha_venta',
            'total',
            'estado',
            'estado_pago',
            'saldo_pendiente',
            'metodo_pago',
            'factura_electronica',
            'sync_status',
            'invoice_status',
            'prefactura_numero',
            'usuario_registro',
            'usuario_registro_nombre',
            'detalles_count',
        ]
        read_only_fields = fields


class VentaSerializer(serializers.ModelSerializer):
    """
    Serializer completo de ventas con detalles anidados.
    """

    cliente = ClienteVentaInfoSerializer(read_only=True)
    usuario_registro = UsuarioVentaInfoSerializer(read_only=True)
    detalles = DetalleVentaSerializer(many=True, read_only=True)
    detalles_count = serializers.IntegerField(
        source='detalles.count',
        read_only=True,
    )
    puede_facturar = serializers.SerializerMethodField()
    factura_documento = serializers.SerializerMethodField()

    class Meta:
        model = Venta
        fields = [
            'id',
            'uuid',
            'numero_venta',
            'terminal',
            'caja_sesion',
            'cliente',
            'fecha_venta',
            'subtotal',
            'descuento',
            'impuestos',
            'total',
            'estado',
            'estado_pago',
            'total_abonado',
            'saldo_pendiente',
            'metodo_pago',
            'factura_electronica',
            'numero_factura_electronica',
            'fecha_facturacion',
            'sync_status',
            'invoice_status',
            'cloud_id',
            'prefactura_numero',
            'observaciones',
            'usuario_registro',
            'detalles',
            'detalles_count',
            'puede_facturar',
            'factura_documento',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_puede_facturar(self, obj):
        return obj.puede_facturar()

    def get_factura_documento(self, obj):
        documento = getattr(obj, 'factura_documento', None)
        if documento is None:
            return None
        return VentaFacturaElectronicaSerializer(documento).data


class VentaCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear ventas con detalles anidados.
    """

    cliente = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.filter(activo=True),
        required=False,
        allow_null=True,
    )
    usuario_registro = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(),
        required=False,
    )
    detalles = DetalleVentaCreateSerializer(many=True)

    class Meta:
        model = Venta
        fields = [
            'cliente',
            'terminal',
            'caja_sesion',
            'descuento',
            'estado',
            'metodo_pago',
            'factura_electronica',
            'observaciones',
            'usuario_registro',
            'detalles',
        ]

    def validate_descuento(self, value):
        if value < Decimal('0.00'):
            raise serializers.ValidationError(
                _('El descuento no puede ser negativo.'),
            )
        return value

    def validate_detalles(self, value):
        if not value:
            raise serializers.ValidationError(
                _('Debe incluir al menos un producto en la venta.'),
            )
        return value

    def validate(self, attrs):
        detalles = attrs.get('detalles', [])
        descuento_global = attrs.get('descuento', Decimal('0.00'))
        factura_electronica = attrs.get('factura_electronica', False)
        cliente = attrs.get('cliente')
        empresa = get_empresa_actual_or_default()
        allow_negative = EmpresaService.permite_stock_negativo_ventas(empresa)
        stock_requerido = defaultdict(lambda: Decimal('0.00'))
        subtotal = Decimal('0.00')

        for detalle in detalles:
            producto = detalle.get('producto')
            if producto is None:
                subtotal += detalle['cantidad'] * detalle['precio_unitario']
                continue
            if producto.es_producto_especial:
                subtotal += detalle['cantidad'] * detalle['precio_unitario']
                continue
            stock_requerido[producto.pk] += detalle['cantidad']
            subtotal += detalle['cantidad'] * detalle['precio_unitario']

        for producto_id, cantidad_requerida in stock_requerido.items():
            producto = Producto.objects.get(pk=producto_id)
            if not allow_negative and not producto.validar_stock(
                cantidad_requerida,
            ):
                raise serializers.ValidationError({
                    'detalles': _(
                        'Stock insuficiente para %(producto)s.'
                    ) % {'producto': producto.nombre},
                })

        if descuento_global > subtotal:
            raise serializers.ValidationError({
                'descuento': _(
                    'El descuento global no puede exceder el subtotal '
                    'de la venta.'
                ),
            })

        if factura_electronica:
            cliente_validar = cliente or Cliente.get_consumidor_final()
            if not cliente_validar.municipio_codigo:
                raise serializers.ValidationError({
                    'cliente': _(
                        'El cliente debe tener codigo de municipio para '
                        'facturacion electronica.'
                    ),
                })
            try:
                validar_empresa_facturable(empresa)
            except FacturacionValidacionError as exc:
                raise serializers.ValidationError({
                    'empresa': str(exc),
                }) from exc

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        cliente = validated_data.pop('cliente', None)

        if cliente is None:
            cliente = Cliente.get_consumidor_final()

        venta = Venta.objects.create(cliente=cliente, **validated_data)

        for detalle_data in detalles_data:
            DetalleVenta.objects.create(
                venta=venta,
                **detalle_data,
            )

        venta.refresh_from_db()
        return venta

    def to_representation(self, instance):
        return VentaSerializer(instance).data


class VentaUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para actualizar campos editables de una venta.
    """

    cliente = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.filter(activo=True),
        required=False,
        allow_null=True,
    )
    detalles = DetalleVentaCreateSerializer(
        many=True,
        required=False,
    )

    class Meta:
        model = Venta
        fields = [
            'cliente',
            'descuento',
            'estado',
            'metodo_pago',
            'factura_electronica',
            'numero_factura_electronica',
            'fecha_facturacion',
            'observaciones',
            'detalles',
        ]

    def validate_descuento(self, value):
        if value < Decimal('0.00'):
            raise serializers.ValidationError(
                _('El descuento no puede ser negativo.'),
            )
        return value

    def validate(self, attrs):
        instance = self.instance
        descuento = attrs.get('descuento', instance.descuento)
        detalles = attrs.get('detalles')
        subtotal_disponible = instance.subtotal

        if detalles is not None:
            subtotal_disponible = sum(
                detalle['cantidad'] * detalle['precio_unitario']
                for detalle in detalles
            )

        if descuento > subtotal_disponible:
            raise serializers.ValidationError({
                'descuento': _(
                    'El descuento global no puede exceder el subtotal '
                    'de la venta.'
                ),
            })

        if attrs.get('numero_factura_electronica') and not attrs.get(
            'factura_electronica',
            instance.factura_electronica,
        ):
            raise serializers.ValidationError({
                'numero_factura_electronica': _(
                    'La factura electronica debe estar activa para '
                    'registrar un numero de factura.'
                ),
            })

        factura_electronica = attrs.get(
            'factura_electronica',
            instance.factura_electronica,
        )
        cliente = attrs.get('cliente', instance.cliente)
        if factura_electronica and cliente and not cliente.municipio_codigo:
            raise serializers.ValidationError({
                'cliente': _(
                    'El cliente debe tener codigo de municipio para '
                    'facturacion electronica.'
                ),
            })
        if factura_electronica:
            try:
                validar_empresa_facturable(instance.empresa)
            except FacturacionValidacionError as exc:
                raise serializers.ValidationError({
                    'empresa': str(exc),
                }) from exc

        return attrs

    def update(self, instance, validated_data):
        if 'cliente' in validated_data and validated_data['cliente'] is None:
            validated_data['cliente'] = Cliente.get_consumidor_final()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class AbonoListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listados de abonos.
    """

    venta_numero = serializers.CharField(
        source='venta.numero_venta',
        read_only=True,
    )
    usuario_registro_nombre = serializers.CharField(
        source='usuario_registro.get_full_name',
        read_only=True,
    )

    class Meta:
        model = Abono
        fields = [
            'id',
            'uuid',
            'venta',
            'venta_numero',
            'monto_abonado',
            'fecha_abono',
            'metodo_pago',
            'referencia_pago',
            'usuario_registro',
            'usuario_registro_nombre',
        ]
        read_only_fields = fields


class AbonoSerializer(serializers.ModelSerializer):
    """
    Serializer completo para lectura de abonos.
    """

    venta = VentaListSerializer(read_only=True)
    usuario_registro = UsuarioVentaInfoSerializer(read_only=True)

    class Meta:
        model = Abono
        fields = [
            'id',
            'uuid',
            'venta',
            'monto_abonado',
            'fecha_abono',
            'metodo_pago',
            'referencia_pago',
            'observaciones',
            'usuario_registro',
            'created_at',
        ]
        read_only_fields = fields


class AbonoCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para registrar abonos en una venta.
    """

    venta = serializers.PrimaryKeyRelatedField(
        queryset=Venta.objects.all(),
    )

    class Meta:
        model = Abono
        fields = [
            'venta',
            'monto_abonado',
            'metodo_pago',
            'referencia_pago',
            'observaciones',
            'usuario_registro',
        ]

    def validate_monto_abonado(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError(
                _('El monto abonado debe ser mayor que cero.'),
            )
        return value

    def validate(self, attrs):
        abono = Abono(**attrs)
        try:
            abono.full_clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc
        return attrs

    def create(self, validated_data):
        abono = Abono.objects.create(**validated_data)
        return abono

    def to_representation(self, instance):
        return AbonoSerializer(instance).data


class FactusNumberingRangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FactusNumberingRange
        fields = [
            'id',
            'factus_id',
            'document_code',
            'prefix',
            'from_number',
            'to_number',
            'current_number',
            'resolution_number',
            'start_date',
            'end_date',
            'is_active',
            'is_credit_note_range',
            'synced_at',
        ]
        read_only_fields = fields


class FacturacionElectronicaConfigSerializer(serializers.ModelSerializer):
    active_bill_range = FactusNumberingRangeSerializer(read_only=True)
    active_credit_note_range = FactusNumberingRangeSerializer(read_only=True)
    active_bill_range_id = serializers.PrimaryKeyRelatedField(
        queryset=FactusNumberingRange.objects.filter(
            is_credit_note_range=False,
        ),
        source='active_bill_range',
        write_only=True,
        required=False,
        allow_null=True,
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        empresa = getattr(self.instance, 'empresa', None)
        if empresa is None:
            request = self.context.get('request') if self.context else None
            empresa = getattr(request, 'empresa', None)
        if empresa is not None:
            self.fields['active_bill_range_id'].queryset = (
                FactusNumberingRange.objects.filter(
                    empresa=empresa,
                    is_credit_note_range=False,
                )
            )
            self.fields['active_credit_note_range_id'].queryset = (
                FactusNumberingRange.objects.filter(
                    empresa=empresa,
                    is_credit_note_range=True,
                )
            )
    active_credit_note_range_id = serializers.PrimaryKeyRelatedField(
        queryset=FactusNumberingRange.objects.filter(
            is_credit_note_range=True,
        ),
        source='active_credit_note_range',
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = FacturacionElectronicaConfig
        fields = [
            'is_enabled',
            'environment',
            'auto_emitir_al_terminar',
            'auto_enviar_email',
            'active_bill_range',
            'active_credit_note_range',
            'active_bill_range_id',
            'active_credit_note_range_id',
            'company_snapshot',
            'last_connection_status',
            'last_connection_checked_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'company_snapshot',
            'last_connection_status',
            'last_connection_checked_at',
            'created_at',
            'updated_at',
        ]

    def validate(self, attrs):
        environment = attrs.get(
            'environment',
            getattr(self.instance, 'environment', FactusEnvironment.SANDBOX),
        )
        empresa = getattr(self.instance, 'empresa', None)
        if empresa is None:
            request = self.context.get('request') if self.context else None
            empresa = getattr(request, 'empresa', None)

        if empresa is None:
            return attrs

        is_enabled = attrs.get(
            'is_enabled',
            getattr(self.instance, 'is_enabled', False),
        )
        active_bill_range = attrs.get(
            'active_bill_range',
            getattr(self.instance, 'active_bill_range', None),
        )
        active_credit_note_range = attrs.get(
            'active_credit_note_range',
            getattr(self.instance, 'active_credit_note_range', None),
        )
        has_credential = FactusCredential.objects.filter(
            empresa=empresa,
            environment=environment,
            activo=True,
        ).exists()

        errors = {}
        requires_ready_config = (
            is_enabled
            or environment == FactusEnvironment.PRODUCCION
        )
        if requires_ready_config and not has_credential:
            errors['environment'] = (
                'Debe configurar credenciales Factus activas para este ambiente.'
            )
        if requires_ready_config and active_bill_range is None:
            errors['active_bill_range_id'] = (
                'Debe sincronizar y seleccionar un rango de factura.'
            )

        if environment != FactusEnvironment.PRODUCCION:
            if errors:
                raise serializers.ValidationError(errors)
            return attrs

        if getattr(self.instance, 'last_connection_status', '') != 'ok':
            errors['last_connection_status'] = (
                'Debe validar la conexion productiva con Factus.'
            )
        if active_credit_note_range is None:
            errors['active_credit_note_range_id'] = (
                'Debe sincronizar y seleccionar un rango productivo de nota credito.'
            )
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class FacturaElectronicaIntentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacturaElectronicaIntento
        fields = [
            'id',
            'action',
            'is_success',
            'response_status_code',
            'error_message',
            'created_at',
        ]
        read_only_fields = fields


class FacturaElectronicaEntregaSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(
        source='usuario.username',
        read_only=True,
    )

    class Meta:
        model = FacturaElectronicaEntrega
        fields = [
            'id',
            'medio',
            'destino',
            'resultado',
            'mensaje',
            'metadata',
            'usuario',
            'usuario_nombre',
            'created_at',
        ]
        read_only_fields = fields


class FacturaElectronicaSoporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacturaElectronicaSoporte
        fields = [
            'id',
            'tipo',
            'filename',
            'content_type',
            'metadata',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class VentaFacturaElectronicaSerializer(serializers.ModelSerializer):
    numbering_range = FactusNumberingRangeSerializer(read_only=True)
    entregas = FacturaElectronicaEntregaSerializer(many=True, read_only=True)
    intentos = FacturaElectronicaIntentoSerializer(many=True, read_only=True)
    soportes = FacturaElectronicaSoporteSerializer(many=True, read_only=True)

    class Meta:
        model = VentaFacturaElectronica
        fields = [
            'id',
            'status',
            'reference_code',
            'bill_number',
            'cufe',
            'numbering_range',
            'resolution_number',
            'validated_at',
            'email_last_sent_at',
            'last_error_code',
            'last_error_message',
            'offline_reason',
            'request_payload',
            'response_payload',
            'qr_payload',
            'qr_svg',
            'credit_note_number',
            'credit_note_payload',
            'entregas',
            'intentos',
            'soportes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields
