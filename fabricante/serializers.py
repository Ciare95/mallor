from rest_framework import serializers

from empresa.context import get_empresa_actual_or_default
from inventario.models import Producto
from inventario.serializers import ProductoListSerializer
from proveedor.models import Proveedor
from usuario.models import Usuario

from fabricante.models import (
    Ingrediente,
    IngredientesProducto,
    InventarioIngredientes,
    MovimientoEmpaquePresentacion,
    PresentacionProductoFabricado,
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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        empresa = get_empresa_actual_or_default()
        self.fields['proveedor_id'].queryset = Proveedor.objects.filter(
            empresa=empresa,
            activo=True,
        )

    def validate_nombre(self, value):
        value = value.strip()
        queryset = Ingrediente.objects.filter(
            empresa=get_empresa_actual_or_default(),
            nombre__iexact=value,
        )
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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        empresa = get_empresa_actual_or_default()
        self.fields['ingrediente_id'].queryset = Ingrediente.objects.filter(
            empresa=empresa,
        )

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
        allow_null=True,
        default=None,
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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        empresa = get_empresa_actual_or_default()
        self.fields['ingrediente_id'].queryset = Ingrediente.objects.filter(
            empresa=empresa,
        )
        self.fields['producto_fabricado_id'].queryset = (
            ProductoFabricado.objects.filter(empresa=empresa)
        )

    def validate_cantidad_necesaria(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'La cantidad necesaria debe ser mayor que cero.'
            )
        return value


class PresentacionProductoFabricadoSerializer(serializers.ModelSerializer):
    producto_inventario_detalle = ProductoListSerializer(
        source='producto_inventario',
        read_only=True,
    )
    producto_inventario_id = serializers.PrimaryKeyRelatedField(
        queryset=Producto.objects.all(),
        source='producto_inventario',
        write_only=True,
        allow_null=True,
        required=False,
    )
    producto_fabricado_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductoFabricado.objects.all(),
        source='producto_fabricado',
        write_only=True,
        required=False,
        allow_null=True,
        default=None,
    )

    class Meta:
        model = PresentacionProductoFabricado
        fields = [
            'id',
            'producto_fabricado',
            'producto_fabricado_id',
            'nombre',
            'cantidad_por_unidad',
            'unidad_medida',
            'costo_unitario_presentacion',
            'precio_venta_sugerido',
            'precio_venta',
            'margen_utilidad',
            'porcentaje_utilidad',
            'producto_inventario',
            'producto_inventario_id',
            'producto_inventario_detalle',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'producto_fabricado',
            'costo_unitario_presentacion',
            'margen_utilidad',
            'porcentaje_utilidad',
            'producto_inventario',
            'producto_inventario_detalle',
            'created_at',
            'updated_at',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        empresa = get_empresa_actual_or_default()
        self.fields['producto_inventario_id'].queryset = Producto.objects.filter(
            empresa=empresa,
        )
        self.fields['producto_fabricado_id'].queryset = (
            ProductoFabricado.objects.filter(empresa=empresa)
        )

    def validate_nombre(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError(
                'El nombre de la presentacion es obligatorio.'
            )
        return value

    def validate_cantidad_por_unidad(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'La cantidad por unidad debe ser mayor que cero.'
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


class MovimientoEmpaquePresentacionSerializer(serializers.ModelSerializer):
    presentacion = PresentacionProductoFabricadoSerializer(read_only=True)
    presentacion_id = serializers.PrimaryKeyRelatedField(
        queryset=PresentacionProductoFabricado.objects.all(),
        source='presentacion',
        write_only=True,
    )
    usuario_nombre = serializers.CharField(
        source='usuario.get_full_name',
        read_only=True,
    )

    class Meta:
        model = MovimientoEmpaquePresentacion
        fields = [
            'id',
            'presentacion',
            'presentacion_id',
            'cantidad_unidades',
            'cantidad_consumida_lote',
            'fecha_empaque',
            'usuario',
            'usuario_nombre',
        ]
        read_only_fields = [
            'id',
            'presentacion',
            'cantidad_consumida_lote',
            'usuario',
            'usuario_nombre',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['presentacion_id'].queryset = (
            PresentacionProductoFabricado.objects.filter(
                empresa=get_empresa_actual_or_default(),
            )
        )


class ProductoFabricadoSerializer(serializers.ModelSerializer):
    presentaciones = PresentacionProductoFabricadoSerializer(
        many=True,
        read_only=True,
    )
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
    presentaciones_count = serializers.IntegerField(
        source='presentaciones.count',
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
            'stock_fabricado_disponible',
            'total_producido_acumulado',
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
            'presentaciones_count',
            'presentaciones',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'stock_fabricado_disponible',
            'total_producido_acumulado',
            'costo_produccion',
            'costo_unitario',
            'margen_utilidad',
            'porcentaje_utilidad',
            'producto_final',
            'producto_final_detalle',
            'disponibilidad_ingredientes',
            'receta_count',
            'presentaciones_count',
            'presentaciones',
            'created_at',
            'updated_at',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        empresa = get_empresa_actual_or_default()
        self.fields['producto_final_id'].queryset = Producto.objects.filter(
            empresa=empresa,
        )

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
        fields = ProductoFabricadoSerializer.Meta.fields + [
            'receta',
        ]
