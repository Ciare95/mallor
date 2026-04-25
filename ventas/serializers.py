from collections import defaultdict
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from cliente.models import Cliente
from inventario.models import Producto
from usuario.models import Usuario
from ventas.models import Abono, DetalleVenta, Venta


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
            'iva',
        ]
        read_only_fields = fields


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
            'nombre_completo',
            'telefono',
            'email',
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

    producto = ProductoVentaInfoSerializer(read_only=True)
    producto_id = serializers.PrimaryKeyRelatedField(
        queryset=Producto.objects.all(),
        source='producto',
        write_only=True,
    )

    class Meta:
        model = DetalleVenta
        fields = [
            'id',
            'venta',
            'producto',
            'producto_id',
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
            'venta',
            'subtotal',
            'iva',
            'total',
            'created_at',
            'updated_at',
        ]


class DetalleVentaCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear o validar detalles de una venta.
    """

    producto = serializers.PrimaryKeyRelatedField(
        queryset=Producto.objects.all(),
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
        producto = attrs['producto']
        precio_unitario = attrs.get('precio_unitario', producto.precio_venta)
        cantidad = attrs['cantidad']
        descuento = attrs.get('descuento', Decimal('0.00'))
        subtotal = cantidad * precio_unitario

        if descuento > subtotal:
            raise serializers.ValidationError({
                'descuento': _(
                    'El descuento no puede exceder el subtotal del detalle.'
                ),
            })

        attrs['precio_unitario'] = precio_unitario
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
            'numero_venta',
            'cliente',
            'cliente_nombre',
            'fecha_venta',
            'total',
            'estado',
            'estado_pago',
            'saldo_pendiente',
            'metodo_pago',
            'factura_electronica',
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

    class Meta:
        model = Venta
        fields = [
            'id',
            'numero_venta',
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
            'observaciones',
            'usuario_registro',
            'detalles',
            'detalles_count',
            'puede_facturar',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_puede_facturar(self, obj):
        return obj.puede_facturar()


class VentaCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para crear ventas con detalles anidados.
    """

    cliente = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.filter(activo=True),
        required=False,
        allow_null=True,
    )
    detalles = DetalleVentaCreateSerializer(many=True)

    class Meta:
        model = Venta
        fields = [
            'cliente',
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
        stock_requerido = defaultdict(lambda: Decimal('0.00'))
        subtotal = Decimal('0.00')

        for detalle in detalles:
            producto = detalle['producto']
            stock_requerido[producto.pk] += detalle['cantidad']
            subtotal += detalle['cantidad'] * detalle['precio_unitario']

        for producto_id, cantidad_requerida in stock_requerido.items():
            producto = Producto.objects.get(pk=producto_id)
            if not producto.validar_stock(cantidad_requerida):
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
        subtotal_disponible = instance.subtotal

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
