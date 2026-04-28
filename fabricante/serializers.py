from rest_framework import serializers

from inventario.models import Producto
from inventario.serializers import ProductoListSerializer
from proveedor.models import Proveedor
from usuario.models import Usuario

from fabricante.models import (
    Ingrediente,
    IngredientesProducto,
    InventarioIngredientes,
    ProductoFabricado,
)


class IngredienteSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(
        source='proveedor.nombre_completo',
        read_only=True,
        allow_null=True,
    )
    stock_bajo_minimo = serializers.ReadOnlyField()
    proveedor_id = serializers.PrimaryKeyRelatedField(
        queryset=Proveedor.objects.all(),
        source='proveedor',
        write_only=True,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Ingrediente
        fields = [
            'id',
            'nombre',
            'descripcion',
            'unidad_medida',
            'precio_por_unidad',
            'proveedor',
            'proveedor_id',
            'proveedor_nombre',
            'stock_actual',
            'stock_minimo',
            'stock_bajo_minimo',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'proveedor', 'created_at', 'updated_at']

    def validate_nombre(self, value):
        value = value.strip()
        queryset = Ingrediente.objects.filter(nombre__iexact=value)
        instance = getattr(self, 'instance', None)

        if instance is not None:
            queryset = queryset.exclude(pk=instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                'Ya existe un ingrediente con este nombre.'
            )

        return value

    def validate_precio_por_unidad(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'El precio por unidad debe ser mayor que cero.'
            )
        return value

    def validate_stock_actual(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'El stock actual no puede ser negativo.'
            )
        return value

    def validate_stock_minimo(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'El stock minimo no puede ser negativo.'
            )
        return value


class InventarioIngredientesSerializer(serializers.ModelSerializer):
    ingrediente = IngredienteSerializer(read_only=True)
    ingrediente_id = serializers.PrimaryKeyRelatedField(
        queryset=Ingrediente.objects.all(),
        source='ingrediente',
        write_only=True,
    )
    factura_numero = serializers.CharField(
        source='factura.numero_factura',
        read_only=True,
        allow_null=True,
    )
    usuario_nombre = serializers.CharField(
        source='usuario.get_full_name',
        read_only=True,
    )
    usuario_id = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(),
        source='usuario',
        write_only=True,
    )

    class Meta:
        model = InventarioIngredientes
        fields = [
            'id',
            'ingrediente',
            'ingrediente_id',
            'cantidad',
            'precio_unitario',
            'fecha_ingreso',
            'factura',
            'factura_numero',
            'usuario',
            'usuario_id',
            'usuario_nombre',
        ]
        read_only_fields = ['id', 'ingrediente', 'usuario', 'factura_numero']

    def validate_cantidad(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'La cantidad debe ser mayor que cero.'
            )
        return value

    def validate_precio_unitario(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'El precio unitario debe ser mayor que cero.'
            )
        return value


class IngredientesProductoSerializer(serializers.ModelSerializer):
    ingrediente = IngredienteSerializer(read_only=True)
    ingrediente_id = serializers.PrimaryKeyRelatedField(
        queryset=Ingrediente.objects.all(),
        source='ingrediente',
        write_only=True,
    )
    producto_fabricado_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductoFabricado.objects.all(),
        source='producto_fabricado',
        write_only=True,
        required=False,
    )

    class Meta:
        model = IngredientesProducto
        fields = [
            'id',
            'producto_fabricado',
            'producto_fabricado_id',
            'ingrediente',
            'ingrediente_id',
            'cantidad_necesaria',
            'unidad_medida',
            'costo_ingrediente',
        ]
        read_only_fields = [
            'id',
            'producto_fabricado',
            'ingrediente',
            'costo_ingrediente',
        ]

    def validate_cantidad_necesaria(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'La cantidad necesaria debe ser mayor que cero.'
            )
        return value


class ProductoFabricadoSerializer(serializers.ModelSerializer):
    producto_final_detalle = ProductoListSerializer(
        source='producto_final',
        read_only=True,
    )
    producto_final_id = serializers.PrimaryKeyRelatedField(
        queryset=Producto.objects.all(),
        source='producto_final',
        write_only=True,
        allow_null=True,
        required=False,
    )
    disponibilidad_ingredientes = serializers.SerializerMethodField()
    receta_count = serializers.IntegerField(
        source='receta.count',
        read_only=True,
    )

    class Meta:
        model = ProductoFabricado
        fields = [
            'id',
            'nombre',
            'descripcion',
            'unidad_medida',
            'cantidad_producida',
            'costo_produccion',
            'costo_unitario',
            'precio_venta_sugerido',
            'precio_venta',
            'margen_utilidad',
            'porcentaje_utilidad',
            'tiempo_produccion',
            'producto_final',
            'producto_final_id',
            'producto_final_detalle',
            'disponibilidad_ingredientes',
            'receta_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'costo_produccion',
            'costo_unitario',
            'margen_utilidad',
            'porcentaje_utilidad',
            'producto_final',
            'producto_final_detalle',
            'disponibilidad_ingredientes',
            'receta_count',
            'created_at',
            'updated_at',
        ]

    def get_disponibilidad_ingredientes(self, obj):
        return obj.validar_disponibilidad_ingredientes()

    def validate_cantidad_producida(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'La cantidad producida debe ser mayor que cero.'
            )
        return value

    def validate_tiempo_produccion(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'El tiempo de produccion no puede ser negativo.'
            )
        return value

    def validate_precio_venta_sugerido(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'El precio de venta sugerido no puede ser negativo.'
            )
        return value

    def validate_precio_venta(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'El precio de venta no puede ser negativo.'
            )
        return value


class ProductoFabricadoDetailSerializer(ProductoFabricadoSerializer):
    receta = IngredientesProductoSerializer(many=True, read_only=True)

    class Meta(ProductoFabricadoSerializer.Meta):
        fields = ProductoFabricadoSerializer.Meta.fields + ['receta']
