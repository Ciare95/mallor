from decimal import Decimal

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from cliente.models import Cliente
from ventas.models import Venta


class ClienteReadSerializer(serializers.ModelSerializer):
    """
    Base de lectura para clientes con metricas de cartera y compras.
    """

    nombre_completo = serializers.CharField(
        source='get_nombre_completo',
        read_only=True,
    )
    saldo_pendiente = serializers.SerializerMethodField()
    total_compras = serializers.SerializerMethodField()
    ultima_compra = serializers.SerializerMethodField()
    cantidad_compras = serializers.SerializerMethodField()

    def get_saldo_pendiente(self, obj):
        return f"{obj.calcular_saldo_pendiente():.2f}"

    def get_total_compras(self, obj):
        return f"{obj.calcular_total_compras():.2f}"

    def get_ultima_compra(self, obj):
        ultima_venta = obj.ventas.exclude(
            estado=Venta.Estado.CANCELADA,
        ).order_by('-fecha_venta').only('fecha_venta').first()

        if ultima_venta is None:
            return None

        return ultima_venta.fecha_venta

    def get_cantidad_compras(self, obj):
        return obj.ventas.exclude(
            estado=Venta.Estado.CANCELADA,
        ).count()


class ClienteSerializer(ClienteReadSerializer):
    """
    Serializer completo de lectura para clientes.
    """

    class Meta:
        model = Cliente
        fields = [
            'id',
            'tipo_documento',
            'numero_documento',
            'digito_verificacion',
            'nombre',
            'razon_social',
            'nombre_comercial',
            'nombre_completo',
            'email',
            'telefono',
            'celular',
            'direccion',
            'ciudad',
            'departamento',
            'codigo_postal',
            'municipio_codigo',
            'tipo_cliente',
            'regimen_tributario',
            'responsable_iva',
            'credito_disponible',
            'limite_credito',
            'dias_plazo',
            'observaciones',
            'activo',
            'saldo_pendiente',
            'total_compras',
            'ultima_compra',
            'cantidad_compras',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class ClienteListSerializer(ClienteReadSerializer):
    """
    Serializer resumido para listados de clientes.
    """

    class Meta:
        model = Cliente
        fields = [
            'id',
            'tipo_documento',
            'numero_documento',
            'digito_verificacion',
            'nombre_completo',
            'telefono',
            'ciudad',
            'municipio_codigo',
            'tipo_cliente',
            'activo',
            'saldo_pendiente',
            'total_compras',
            'ultima_compra',
            'cantidad_compras',
        ]
        read_only_fields = fields


class ClienteWriteSerializer(serializers.ModelSerializer):
    """
    Base de escritura con validaciones compartidas de clientes.
    """

    email = serializers.EmailField(
        required=False,
        allow_blank=True,
    )
    telefono = serializers.CharField(
        required=True,
        allow_blank=False,
    )

    class Meta:
        model = Cliente
        fields = [
            'tipo_documento',
            'numero_documento',
            'digito_verificacion',
            'nombre',
            'razon_social',
            'nombre_comercial',
            'email',
            'telefono',
            'celular',
            'direccion',
            'ciudad',
            'departamento',
            'codigo_postal',
            'municipio_codigo',
            'tipo_cliente',
            'regimen_tributario',
            'responsable_iva',
            'limite_credito',
            'dias_plazo',
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

    def validate_limite_credito(self, value):
        if value < Decimal('0.00'):
            raise serializers.ValidationError(
                _('El limite de credito no puede ser negativo.'),
            )

        return value

    def validate_dias_plazo(self, value):
        if value < 0:
            raise serializers.ValidationError(
                _('Los dias de plazo no pueden ser negativos.'),
            )

        return value

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

        limite_credito = attrs.get(
            'limite_credito',
            getattr(self.instance, 'limite_credito', Decimal('0.00')),
        )
        saldo_pendiente = (
            self.instance.calcular_saldo_pendiente()
            if self.instance is not None
            else Decimal('0.00')
        )

        if limite_credito < saldo_pendiente:
            raise serializers.ValidationError({
                'limite_credito': _(
                    'El limite de credito no puede ser menor al saldo '
                    'pendiente actual del cliente.'
                ),
            })

        municipio_codigo = attrs.get(
            'municipio_codigo',
            getattr(self.instance, 'municipio_codigo', ''),
        )
        if municipio_codigo and not municipio_codigo.isdigit():
            raise serializers.ValidationError({
                'municipio_codigo': _(
                    'El codigo de municipio debe ser numerico.'
                ),
            })

        digito_verificacion = attrs.get(
            'digito_verificacion',
            getattr(self.instance, 'digito_verificacion', ''),
        )
        if digito_verificacion and not digito_verificacion.isdigit():
            raise serializers.ValidationError({
                'digito_verificacion': _(
                    'El digito de verificacion debe ser numerico.'
                ),
            })

        return attrs

    def _normalizar_campos_texto(self, attrs):
        campos = [
            'nombre',
            'razon_social',
            'nombre_comercial',
            'email',
            'telefono',
            'celular',
            'direccion',
            'ciudad',
            'departamento',
            'codigo_postal',
            'municipio_codigo',
            'digito_verificacion',
            'observaciones',
        ]

        for campo in campos:
            valor = attrs.get(campo)
            if isinstance(valor, str):
                attrs[campo] = valor.strip()

    def _validar_documento_unico(self, tipo_documento, numero_documento):
        if not tipo_documento or not numero_documento:
            return

        queryset = Cliente.objects.filter(
            tipo_documento=tipo_documento,
            numero_documento=numero_documento,
        )

        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError({
                'numero_documento': _(
                    'Ya existe un cliente con este tipo y numero de '
                    'documento.'
                ),
            })


class ClienteCreateSerializer(ClienteWriteSerializer):
    """
    Serializer de creacion de clientes.
    """


class ClienteUpdateSerializer(ClienteWriteSerializer):
    """
    Serializer de actualizacion de clientes.
    """

    telefono = serializers.CharField(
        required=False,
        allow_blank=False,
    )


class ClienteDetailSerializer(ClienteSerializer):
    """
    Serializer detallado de cliente con estadisticas de compras.
    """

