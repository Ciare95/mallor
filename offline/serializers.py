import secrets
import string
from decimal import Decimal

from rest_framework import serializers

from empresa.models import Empresa

from .models import (
    CajaSesion,
    LocalLicense,
    POSTerminal,
    SyncOutbox,
)


class POSTerminalSerializer(serializers.ModelSerializer):
    class Meta:
        model = POSTerminal
        fields = [
            'id',
            'uuid',
            'code',
            'name',
            'ip_address',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'uuid', 'created_at', 'updated_at']


class CajaSesionSerializer(serializers.ModelSerializer):
    terminal = POSTerminalSerializer(read_only=True)

    class Meta:
        model = CajaSesion
        fields = [
            'id',
            'uuid',
            'terminal',
            'usuario_apertura',
            'usuario_cierre',
            'estado',
            'opened_at',
            'closed_at',
            'efectivo_inicial',
            'efectivo_final',
            'observaciones',
        ]
        read_only_fields = fields


class AbrirCajaSerializer(serializers.Serializer):
    terminal_id = serializers.IntegerField(required=False)
    terminal_code = serializers.CharField(required=False, allow_blank=True)
    efectivo_inicial = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
    )


class CerrarCajaSerializer(serializers.Serializer):
    caja_sesion_id = serializers.IntegerField(required=False)
    terminal_id = serializers.IntegerField(required=False)
    terminal_code = serializers.CharField(required=False, allow_blank=True)
    efectivo_final = serializers.DecimalField(max_digits=12, decimal_places=2)
    observaciones = serializers.CharField(required=False, allow_blank=True)


class SyncOutboxSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncOutbox
        fields = [
            'id',
            'uuid',
            'aggregate_type',
            'aggregate_uuid',
            'event_type',
            'idempotency_key',
            'status',
            'attempts',
            'next_retry_at',
            'last_error',
            'sent_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class LocalLicenseSerializer(serializers.ModelSerializer):
    support_active = serializers.SerializerMethodField()

    class Meta:
        model = LocalLicense
        fields = [
            'uuid',
            'license_key',
            'plan',
            'purchased_at',
            'support_until',
            'support_active',
            'last_validated_at',
            'status',
            'metadata',
        ]
        read_only_fields = fields

    def get_support_active(self, obj):
        from django.utils import timezone

        return bool(obj.support_until and obj.support_until >= timezone.localdate())


def _generar_license_key(plan_prefix: str) -> str:
    chars = string.ascii_uppercase + string.digits
    seg1 = ''.join(secrets.choice(chars) for _ in range(8))
    seg2 = ''.join(secrets.choice(chars) for _ in range(4))
    return f'MALLOR-{plan_prefix}-{seg1}-{seg2}'


class LocalLicenseAdminSerializer(serializers.ModelSerializer):
    empresa_id = serializers.PrimaryKeyRelatedField(
        queryset=Empresa.objects.filter(activo=True),
        source='empresa',
        write_only=True,
    )
    empresa_nombre = serializers.SerializerMethodField(read_only=True)
    support_active = serializers.SerializerMethodField(read_only=True)
    license_key = serializers.CharField(read_only=True)

    class Meta:
        model = LocalLicense
        fields = [
            'id',
            'uuid',
            'empresa_id',
            'empresa_nombre',
            'license_key',
            'plan',
            'status',
            'purchased_at',
            'support_until',
            'support_active',
            'last_validated_at',
            'metadata',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'uuid', 'license_key', 'last_validated_at', 'created_at', 'updated_at',
        ]

    def get_empresa_nombre(self, obj):
        return obj.empresa.razon_social if obj.empresa_id else ''

    def get_support_active(self, obj):
        from django.utils import timezone
        return bool(obj.support_until and obj.support_until >= timezone.localdate())

    def create(self, validated_data):
        plan = validated_data.get('plan', 'HYBRID')
        prefix = plan[:3].upper() if plan else 'LOC'
        validated_data['license_key'] = _generar_license_key(prefix)
        return super().create(validated_data)


class LicenseActivarSerializer(serializers.Serializer):
    license_key = serializers.CharField(max_length=120, trim_whitespace=True)
