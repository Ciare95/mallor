from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from inventario.models import FacturaCompra
from proveedor.models import Proveedor


class ProveedorReadSerializer(serializers.ModelSerializer):
    """
    Base de lectura para proveedores con metricas simples de compras.
    """

    nombre_completo = serializers.CharField(read_only=True)
    total_compras = serializers.SerializerMethodField()
    ultima_compra = serializers.SerializerMethodField()

    def get_total_compras(self, obj):
        return f"{obj.calcular_total_compras():.2f}"

    def get_ultima_compra(self, obj):
        return obj.obtener_ultima_compra()


class ProveedorSerializer(ProveedorReadSerializer):
    """
    Serializer completo de lectura para proveedores.
    """

    class Meta:
        model = Proveedor
        fields = [
            'id',
            'tipo_documento',
            'numero_documento',
            'razon_social',
            'nombre_comercial',
            'nombre_completo',
            'nombre_contacto',
            'email',
            'telefono',
            'celular',
            'direccion',
            'ciudad',
            'departamento',
            'tipo_productos',
            'forma_pago',
            'cuenta_bancaria',
            'banco',
            'observaciones',
            'activo',
            'total_compras',
            'ultima_compra',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class ProveedorListSerializer(ProveedorReadSerializer):
    """
    Serializer resumido para listados de proveedores.
    """

    cantidad_compras = serializers.SerializerMethodField()

    def get_cantidad_compras(self, obj):
        return FacturaCompra.objects.filter(
            proveedor=obj,
            estado=FacturaCompra.ESTADO_PROCESADA,
        ).count()

    class Meta:
        model = Proveedor
        fields = [
            'id',
            'tipo_documento',
            'numero_documento',
            'razon_social',
            'nombre_comercial',
            'nombre_completo',
            'nombre_contacto',
            'telefono',
            'ciudad',
            'forma_pago',
            'activo',
            'total_compras',
            'ultima_compra',
            'cantidad_compras',
        ]
        read_only_fields = fields


class ProveedorWriteSerializer(serializers.ModelSerializer):
    """
    Base de escritura con validaciones compartidas.
    """

    class Meta:
        model = Proveedor
        fields = [
            'tipo_documento',
            'numero_documento',
            'razon_social',
            'nombre_comercial',
            'nombre_contacto',
            'email',
            'telefono',
            'celular',
            'direccion',
            'ciudad',
            'departamento',
            'tipo_productos',
            'forma_pago',
            'cuenta_bancaria',
            'banco',
            'observaciones',
            'activo',
        ]
        validators = []

    def validate_numero_documento(self, value):
        numero_documento = value.strip()
        if not numero_documento:
            raise serializers.ValidationError(
                _('El numero de documento es obligatorio.'),
            )
        return numero_documento

    def validate_telefono(self, value):
        telefono = value.strip()
        if not telefono:
            raise serializers.ValidationError(
                _('El telefono es obligatorio.'),
            )
        return telefono

    def validate(self, attrs):
        attrs = super().validate(attrs)
        self._normalizar_campos_texto(attrs)

        tipo_documento = attrs.get(
            'tipo_documento',
            getattr(self.instance, 'tipo_documento', None),
        )
        numero_documento = attrs.get(
            'numero_documento',
            getattr(self.instance, 'numero_documento', ''),
        )
        self._validar_documento_unico(tipo_documento, numero_documento)
        return attrs

    def _normalizar_campos_texto(self, attrs):
        campos = [
            'numero_documento',
            'razon_social',
            'nombre_comercial',
            'nombre_contacto',
            'telefono',
            'celular',
            'direccion',
            'ciudad',
            'departamento',
            'tipo_productos',
            'cuenta_bancaria',
            'banco',
            'observaciones',
        ]

        for campo in campos:
            valor = attrs.get(campo)
            if isinstance(valor, str):
                attrs[campo] = valor.strip()

    def _validar_documento_unico(self, tipo_documento, numero_documento):
        if not tipo_documento or not numero_documento:
            return

        queryset = Proveedor.objects.filter(
            numero_documento=numero_documento,
        )

        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError({
                'numero_documento': _(
                    'Ya existe un proveedor con este numero de documento.'
                ),
            })


class ProveedorCreateSerializer(ProveedorWriteSerializer):
    """
    Serializer de creacion de proveedores.
    """


class ProveedorUpdateSerializer(ProveedorWriteSerializer):
    """
    Serializer de actualizacion de proveedores.
    """

    telefono = serializers.CharField(
        required=False,
        allow_blank=False,
    )
