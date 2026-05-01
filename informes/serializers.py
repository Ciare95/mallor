from decimal import Decimal
from typing import Any

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from core.exceptions import InformeError
from usuario.models import Usuario

from .models import CierreCaja, Informe


class UsuarioInformeInfoSerializer(serializers.ModelSerializer):
    """
    Informacion resumida del usuario en respuestas del modulo informes.
    """

    full_name = serializers.CharField(
        source='get_full_name',
        read_only=True,
    )

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'full_name', 'email', 'role']
        read_only_fields = fields


class CierreCajaListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listados de cierres de caja.
    """

    usuario_cierre_nombre = serializers.CharField(
        source='usuario_cierre.get_full_name',
        read_only=True,
    )

    class Meta:
        model = CierreCaja
        fields = [
            'id',
            'fecha_cierre',
            'fecha_registro',
            'total_ventas',
            'total_efectivo',
            'total_abonos',
            'total_gastos',
            'efectivo_esperado',
            'efectivo_real',
            'diferencia',
            'usuario_cierre',
            'usuario_cierre_nombre',
        ]
        read_only_fields = fields


class CierreCajaDetailSerializer(serializers.ModelSerializer):
    """
    Serializer completo para detalle de cierre de caja.
    """

    usuario_cierre = UsuarioInformeInfoSerializer(read_only=True)
    resumen = serializers.SerializerMethodField()

    class Meta:
        model = CierreCaja
        fields = [
            'id',
            'fecha_cierre',
            'fecha_registro',
            'total_ventas',
            'total_efectivo',
            'total_tarjeta',
            'total_transferencia',
            'total_credito',
            'total_abonos',
            'total_gastos',
            'gastos_operativos',
            'ventas_por_categoria',
            'efectivo_esperado',
            'efectivo_real',
            'diferencia',
            'observaciones',
            'usuario_cierre',
            'resumen',
        ]
        read_only_fields = fields

    def get_resumen(self, obj):
        return obj.generar_resumen()


class BaseCierreCajaWriteSerializer(serializers.Serializer):
    """
    Serializer base para creacion y ajuste de cierres de caja.
    """

    efectivo_real = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
    )
    gastos_operativos = serializers.JSONField(
        required=False,
        default=dict,
    )
    observaciones = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
    )
    usuario_cierre = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )

    def validate_efectivo_real(self, value):
        if value < Decimal('0.00'):
            raise serializers.ValidationError(
                _('El efectivo real no puede ser negativo.'),
            )
        return value

    def validate_gastos_operativos(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                _('Los gastos operativos deben enviarse como objeto JSON.'),
            )
        return value


class CierreCajaCreateSerializer(BaseCierreCajaWriteSerializer):
    """
    Serializer para registrar un cierre mediante el endpoint REST.
    """

    fecha_cierre = serializers.DateField()


class CierreCajaGenerateSerializer(BaseCierreCajaWriteSerializer):
    """
    Serializer para el endpoint explicito de generacion de cierre.
    """

    fecha = serializers.DateField()


class CierreCajaUpdateSerializer(BaseCierreCajaWriteSerializer):
    """
    Serializer para ajustes posteriores sobre un cierre existente.
    """

    fecha_cierre = serializers.DateField(required=False)


class InformeListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listados de informes generados.
    """

    usuario_genero_nombre = serializers.CharField(
        source='usuario_genero.get_full_name',
        read_only=True,
    )
    tiene_pdf = serializers.SerializerMethodField()
    tiene_excel = serializers.SerializerMethodField()

    class Meta:
        model = Informe
        fields = [
            'id',
            'tipo_informe',
            'fecha_generacion',
            'fecha_inicio',
            'fecha_fin',
            'usuario_genero',
            'usuario_genero_nombre',
            'tiene_pdf',
            'tiene_excel',
        ]
        read_only_fields = fields

    def get_tiene_pdf(self, obj):
        return bool(obj.archivo_pdf)

    def get_tiene_excel(self, obj):
        return bool(obj.archivo_excel)


class InformeDetailSerializer(serializers.ModelSerializer):
    """
    Serializer completo para detalle de informes.
    """

    usuario_genero = UsuarioInformeInfoSerializer(read_only=True)
    archivo_pdf_url = serializers.SerializerMethodField()
    archivo_excel_url = serializers.SerializerMethodField()

    class Meta:
        model = Informe
        fields = [
            'id',
            'tipo_informe',
            'fecha_generacion',
            'fecha_inicio',
            'fecha_fin',
            'datos',
            'archivo_pdf',
            'archivo_excel',
            'archivo_pdf_url',
            'archivo_excel_url',
            'usuario_genero',
        ]
        read_only_fields = fields

    def _build_file_url(self, file_field) -> str | None:
        if not file_field:
            return None

        request = self.context.get('request')
        if request is None:
            return file_field.url

        return request.build_absolute_uri(file_field.url)

    def get_archivo_pdf_url(self, obj):
        return self._build_file_url(obj.archivo_pdf)

    def get_archivo_excel_url(self, obj):
        return self._build_file_url(obj.archivo_excel)


class InformeGenerateSerializer(serializers.Serializer):
    """
    Serializer para solicitudes de generacion de informes exportables.
    """

    tipo_reporte = serializers.ChoiceField(
        choices=Informe.TipoInforme.choices,
        required=False,
    )
    tipo_informe = serializers.ChoiceField(
        choices=Informe.TipoInforme.choices,
        required=False,
    )
    formato = serializers.ChoiceField(
        choices=(
            ('pdf', 'PDF'),
            ('excel', 'Excel'),
        ),
    )
    fecha_inicio = serializers.DateField(required=False)
    fecha_fin = serializers.DateField(required=False)
    cierre_id = serializers.IntegerField(required=False, min_value=1)
    limite = serializers.IntegerField(
        required=False,
        default=10,
        min_value=1,
        max_value=500,
    )

    def validate(self, attrs):
        tipo_informe = attrs.get('tipo_informe') or attrs.get('tipo_reporte')
        if not tipo_informe:
            raise serializers.ValidationError({
                'tipo_reporte': _(
                    'Debe indicar el tipo de reporte a generar.'
                ),
            })

        fecha_inicio = attrs.get('fecha_inicio')
        fecha_fin = attrs.get('fecha_fin')

        if (fecha_inicio and not fecha_fin) or (fecha_fin and not fecha_inicio):
            raise serializers.ValidationError({
                'fecha_fin': _(
                    'fecha_inicio y fecha_fin deben enviarse juntas.'
                ),
            })

        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            raise serializers.ValidationError({
                'fecha_fin': _(
                    'La fecha de fin no puede ser anterior a la inicial.'
                ),
            })

        if (
            tipo_informe == Informe.TipoInforme.CIERRE_CAJA
            and not attrs.get('cierre_id')
            and not fecha_fin
        ):
            raise serializers.ValidationError({
                'cierre_id': _(
                    'Los reportes de cierre requieren cierre_id o fecha.'
                ),
            })

        attrs['tipo_informe'] = tipo_informe
        attrs.pop('tipo_reporte', None)
        return attrs


class InformeFilterSerializer(serializers.Serializer):
    """
    Serializer de validacion para filtros de listados de informes.
    """

    tipo_informe = serializers.ChoiceField(
        choices=Informe.TipoInforme.choices,
        required=False,
    )
    fecha_inicio = serializers.DateField(required=False)
    fecha_fin = serializers.DateField(required=False)
    usuario_id = serializers.IntegerField(required=False, min_value=1)
    q = serializers.CharField(required=False, allow_blank=True)
    ordering = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        fecha_inicio = attrs.get('fecha_inicio')
        fecha_fin = attrs.get('fecha_fin')
        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            raise serializers.ValidationError({
                'fecha_fin': _(
                    'La fecha de fin no puede ser anterior a la inicial.'
                ),
            })
        return attrs


class CierreCajaFilterSerializer(serializers.Serializer):
    """
    Serializer de validacion para filtros de cierres de caja.
    """

    fecha_inicio = serializers.DateField(required=False)
    fecha_fin = serializers.DateField(required=False)
    usuario_id = serializers.IntegerField(required=False, min_value=1)
    diferencia_min = serializers.DecimalField(
        required=False,
        max_digits=12,
        decimal_places=2,
    )
    diferencia_max = serializers.DecimalField(
        required=False,
        max_digits=12,
        decimal_places=2,
    )
    q = serializers.CharField(required=False, allow_blank=True)
    ordering = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        fecha_inicio = attrs.get('fecha_inicio')
        fecha_fin = attrs.get('fecha_fin')
        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            raise serializers.ValidationError({
                'fecha_fin': _(
                    'La fecha de fin no puede ser anterior a la inicial.'
                ),
            })
        return attrs


class EstadisticasPeriodoSerializer(serializers.Serializer):
    """
    Serializer para validar parametros de endpoints estadisticos.
    """

    fecha_inicio = serializers.DateField(required=False)
    fecha_fin = serializers.DateField(required=False)
    anio = serializers.IntegerField(required=False, min_value=2000)
    limite = serializers.IntegerField(
        required=False,
        default=10,
        min_value=1,
        max_value=500,
    )
    dias = serializers.IntegerField(
        required=False,
        default=30,
        min_value=1,
        max_value=3650,
    )
    dias_proyeccion = serializers.IntegerField(
        required=False,
        default=30,
        min_value=1,
        max_value=365,
    )

    def validate(self, attrs):
        fecha_inicio = attrs.get('fecha_inicio')
        fecha_fin = attrs.get('fecha_fin')

        if (fecha_inicio and not fecha_fin) or (fecha_fin and not fecha_inicio):
            raise serializers.ValidationError({
                'fecha_fin': _(
                    'fecha_inicio y fecha_fin deben enviarse juntas.'
                ),
            })

        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            raise serializers.ValidationError({
                'fecha_fin': _(
                    'La fecha de fin no puede ser anterior a la inicial.'
                ),
            })

        return attrs
