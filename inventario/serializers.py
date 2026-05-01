from rest_framework import serializers
from decimal import Decimal

from .models import (
    Categoria,
    Producto,
    FacturaCompra,
    DetalleFacturaCompra,
    HistorialInventario,
)
from usuario.models import Usuario


class CategoriaSerializer(serializers.ModelSerializer):
    productos_count = serializers.IntegerField(
        source='producto_set.count',
        read_only=True
    )

    class Meta:
        model = Categoria
        fields = [
            'id', 'nombre', 'descripcion',
            'productos_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'productos_count', 'created_at', 'updated_at']

    def validate_nombre(self, value):
        value = value.strip().upper()
        if Categoria.objects.filter(nombre__iexact=value).exists():
            raise serializers.ValidationError(
                'Ya existe una categoría con este nombre'
            )
        return value


class DetalleFacturaCompraSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(
        source='producto.nombre',
        read_only=True,
    )
    subtotal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    iva_valor = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total_detalle = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True,
        source='total'
    )

    class Meta:
        model = DetalleFacturaCompra
        fields = [
            'id', 'factura', 'producto', 'producto_nombre',
            'cantidad', 'precio_unitario', 'precio_venta_sugerido',
            'iva', 'descuento',
            'subtotal', 'iva_valor', 'total_detalle',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'factura', 'created_at', 'updated_at']


class ProductoSerializer(serializers.ModelSerializer):
    categoria = CategoriaSerializer(read_only=True)
    categoria_id = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.all(),
        source='categoria',
        write_only=True,
        allow_null=True,
    )
    valor_inventario = serializers.SerializerMethodField()
    valor_venta_total = serializers.SerializerMethodField()
    codigo_interno_formateado = serializers.ReadOnlyField()
    margen_ganancia = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = [
            'id', 'codigo_interno', 'codigo_interno_formateado',
            'codigo_barras', 'nombre', 'categoria', 'categoria_id',
            'marca', 'descripcion', 'existencias', 'invima',
            'precio_compra', 'precio_venta', 'iva',
            'imagen', 'fecha_ingreso', 'fecha_caducidad',
            'valor_inventario', 'valor_venta_total', 'margen_ganancia',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'codigo_interno', 'fecha_ingreso',
            'created_at', 'updated_at',
        ]

    def get_valor_inventario(self, obj):
        return obj.calcular_valor_inventario()

    def get_valor_venta_total(self, obj):
        return obj.calcular_valor_venta()

    def get_margen_ganancia(self, obj):
        if obj.precio_compra and obj.precio_compra > 0:
            margen = (
                (obj.precio_venta - obj.precio_compra) / obj.precio_compra
            ) * Decimal('100')
            return round(margen, 2)
        return Decimal('0.00')


class ProductoListSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(
        source='categoria.nombre',
        read_only=True,
        allow_null=True,
    )
    valor_inventario = serializers.SerializerMethodField()
    codigo_interno_formateado = serializers.ReadOnlyField()

    class Meta:
        model = Producto
        fields = [
            'id', 'codigo_interno', 'codigo_interno_formateado',
            'codigo_barras', 'nombre', 'categoria_nombre',
            'marca', 'existencias', 'precio_compra', 'precio_venta',
            'iva', 'valor_inventario',
        ]

    def get_valor_inventario(self, obj):
        return obj.calcular_valor_inventario()


class ProductoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = [
            'codigo_interno', 'codigo_barras', 'nombre',
            'categoria', 'marca', 'descripcion',
            'existencias', 'invima',
            'precio_compra', 'precio_venta', 'iva',
            'imagen', 'fecha_caducidad',
        ]

    def validate_codigo_interno(self, value):
        if value is not None:
            if Producto.objects.filter(codigo_interno=value).exists():
                raise serializers.ValidationError(
                    'Ya existe un producto con este código interno'
                )
        return value

    def validate_codigo_barras(self, value):
        if value:
            value = value.strip()
            if Producto.objects.filter(codigo_barras=value).exists():
                raise serializers.ValidationError(
                    'Ya existe un producto con este código de barras'
                )
        return value

    def validate_precio_compra(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'El precio de compra debe ser mayor que cero'
            )
        return value

    def validate_precio_venta(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'El precio de venta debe ser mayor que cero'
            )
        return value

    def validate_existencias(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'Las existencias no pueden ser negativas'
            )
        return value

    def validate_iva(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError(
                'El IVA debe estar entre 0 y 100'
            )
        return value

    def validate(self, data):
        precio_compra = data.get('precio_compra')
        precio_venta = data.get('precio_venta')
        if precio_compra and precio_venta and precio_venta < precio_compra:
            raise serializers.ValidationError(
                {'precio_venta': 'Advertencia: El precio de venta es menor '
                                  'que el precio de compra'}
            )
        return data


class ProductoUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = [
            'codigo_interno', 'codigo_barras', 'nombre',
            'categoria', 'marca', 'descripcion',
            'existencias', 'invima',
            'precio_compra', 'precio_venta', 'iva',
            'imagen', 'fecha_caducidad',
        ]
        read_only_fields = ['codigo_interno']

    def validate_codigo_barras(self, value):
        if value:
            value = value.strip()
            instance = getattr(self, 'instance', None)
            exists = Producto.objects.filter(codigo_barras=value)
            if instance:
                exists = exists.exclude(pk=instance.pk)
            if exists.exists():
                raise serializers.ValidationError(
                    'Ya existe un producto con este código de barras'
                )
        return value

    def validate_precio_compra(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError(
                'El precio de compra debe ser mayor que cero'
            )
        return value

    def validate_precio_venta(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError(
                'El precio de venta debe ser mayor que cero'
            )
        return value

    def validate_existencias(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                'Las existencias no pueden ser negativas'
            )
        return value

    def validate_iva(self, value):
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError(
                'El IVA debe estar entre 0 y 100'
            )
        return value

    def validate(self, data):
        precio_compra = data.get('precio_compra')
        precio_venta = data.get('precio_venta')
        if precio_compra and precio_venta and precio_venta < precio_compra:
            raise serializers.ValidationError(
                {'precio_venta': 'Advertencia: El precio de venta es menor '
                                  'que el precio de compra'}
            )
        return data


class DetalleFacturaCompraCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetalleFacturaCompra
        fields = [
            'producto', 'cantidad', 'precio_unitario',
            'precio_venta_sugerido',
            'iva', 'descuento',
        ]

    def validate_cantidad(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'La cantidad debe ser mayor que cero'
            )
        return value

    def validate_precio_unitario(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'El precio unitario debe ser mayor que cero'
            )
        return value

    def validate_precio_venta_sugerido(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError(
                'El precio de venta sugerido debe ser mayor que cero'
            )
        return value

    def validate_iva(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError(
                'El IVA debe estar entre 0 y 100'
            )
        return value

    def validate_descuento(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'El descuento no puede ser negativo'
            )
        return value


class FacturaCompraSerializer(serializers.ModelSerializer):
    detalles = DetalleFacturaCompraSerializer(many=True, read_only=True)
    proveedor_nombre = serializers.CharField(
        source='proveedor.razon_social',
        read_only=True,
        allow_null=True,
    )
    usuario_registro_nombre = serializers.CharField(
        source='usuario_registro.get_full_name',
        read_only=True,
    )

    class Meta:
        model = FacturaCompra
        fields = [
            'id', 'numero_factura', 'proveedor', 'proveedor_nombre',
            'fecha_factura', 'fecha_registro',
            'subtotal', 'iva', 'descuento', 'total',
            'observaciones', 'usuario_registro',
            'usuario_registro_nombre', 'estado',
            'detalles', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'subtotal', 'iva', 'total',
            'fecha_registro', 'estado',
            'created_at', 'updated_at',
        ]


class FacturaCompraCreateSerializer(serializers.ModelSerializer):
    detalles = DetalleFacturaCompraCreateSerializer(many=True)

    class Meta:
        model = FacturaCompra
        fields = [
            'numero_factura', 'proveedor', 'fecha_factura',
            'descuento', 'observaciones', 'usuario_registro',
            'detalles',
        ]

    def validate_numero_factura(self, value):
        value = value.strip().upper()
        if FacturaCompra.objects.filter(numero_factura__iexact=value).exists():
            raise serializers.ValidationError(
                'Ya existe una factura con este número'
            )
        return value

    def validate_descuento(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'El descuento no puede ser negativo'
            )
        return value

    def validate_detalles(self, value):
        if not value:
            raise serializers.ValidationError(
                'Debe incluir al menos un producto en la factura'
            )
        return value

    def validate(self, data):
        if data.get('descuento') and data.get('descuento') < 0:
            raise serializers.ValidationError(
                {'descuento': 'El descuento no puede ser negativo'}
            )
        return data

    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        factura = FacturaCompra.objects.create(**validated_data)
        for detalle_data in detalles_data:
            DetalleFacturaCompra.objects.create(
                factura=factura,
                **detalle_data
            )
        factura.calcular_totales()
        factura.save()
        return factura

    def to_representation(self, instance):
        return FacturaCompraSerializer(instance).data


class HistorialInventarioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(
        source='producto.nombre',
        read_only=True,
    )
    producto_codigo = serializers.CharField(
        source='producto.codigo_interno_formateado',
        read_only=True,
    )
    tipo_movimiento_display = serializers.CharField(
        source='get_tipo_movimiento_display',
        read_only=True,
    )
    usuario_nombre = serializers.CharField(
        source='usuario.get_full_name',
        read_only=True,
    )
    factura_numero = serializers.CharField(
        source='factura.numero_factura',
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = HistorialInventario
        fields = [
            'id', 'producto', 'producto_nombre', 'producto_codigo',
            'tipo_movimiento', 'tipo_movimiento_display',
            'cantidad', 'precio_unitario',
            'factura', 'factura_numero',
            'venta', 'motivo', 'usuario', 'usuario_nombre',
            'fecha', 'observaciones',
            'created_at',
        ]
        read_only_fields = fields


class InventarioExportSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(
        source='categoria.nombre',
        read_only=True,
        allow_null=True,
    )
    valor_inventario = serializers.SerializerMethodField()
    codigo_interno_formateado = serializers.ReadOnlyField()
    fecha_ingreso_formateada = serializers.DateField(
        source='fecha_ingreso',
        read_only=True,
    )

    class Meta:
        model = Producto
        fields = [
            'id', 'codigo_interno', 'codigo_interno_formateado',
            'codigo_barras', 'nombre', 'categoria_nombre',
            'marca', 'existencias', 'precio_compra', 'precio_venta',
            'iva', 'valor_inventario', 'fecha_ingreso_formateada',
        ]

    def get_valor_inventario(self, obj):
        return obj.calcular_valor_inventario()
