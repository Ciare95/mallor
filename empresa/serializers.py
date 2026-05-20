from django.utils import timezone
from rest_framework import serializers

from empresa.models import Empresa, EmpresaConfiguracion, EmpresaUsuario
from empresa.services import EmpresaService
from ventas.models import (
    FactusCredential,
    FactusEnvironment,
)


FACTUS_BASE_URLS = {
    FactusEnvironment.SANDBOX: 'https://api-sandbox.factus.com.co',
    FactusEnvironment.PRODUCCION: 'https://api.factus.com.co',
}


def _active_ranges(queryset):
    today = timezone.localdate()
    return queryset.filter(is_active=True).filter(
        end_date__isnull=True,
    ) | queryset.filter(is_active=True, end_date__gte=today)


def build_factus_admin_summary(empresa):
    config = getattr(empresa, 'facturacion_config', None)
    credentials = {
        credential.environment: credential
        for credential in empresa.factus_credentials.filter(activo=True)
    }
    ranges = empresa.factus_numbering_ranges.all()
    active_ranges = _active_ranges(ranges)
    bill_ranges = active_ranges.filter(is_credit_note_range=False)
    credit_note_ranges = active_ranges.filter(is_credit_note_range=True)
    environment = (
        getattr(config, 'environment', '')
        or empresa.ambiente_facturacion
        or FactusEnvironment.SANDBOX
    )
    has_current_credential = environment in credentials
    has_ranges = bill_ranges.exists() and credit_note_ranges.exists()

    last_connection_status = getattr(config, 'last_connection_status', '')
    last_connection_checked_at = getattr(
        config,
        'last_connection_checked_at',
        None,
    )

    if last_connection_status and last_connection_status != 'ok':
        status = 'ERROR'
    elif not has_current_credential:
        status = 'SIN_CREDENCIALES'
    elif not last_connection_checked_at:
        status = 'CREDENCIALES_SIN_VALIDAR'
    elif not has_ranges:
        status = 'SIN_RANGOS_DIAN'
    elif environment == FactusEnvironment.PRODUCCION:
        status = 'LISTA_PRODUCCION'
    else:
        status = 'LISTA_SANDBOX'

    return {
        'environment': environment,
        'sandbox_configured': FactusEnvironment.SANDBOX in credentials,
        'production_configured': FactusEnvironment.PRODUCCION in credentials,
        'last_connection_status': last_connection_status,
        'last_connection_checked_at': last_connection_checked_at,
        'bill_ranges_count': bill_ranges.count(),
        'credit_note_ranges_count': credit_note_ranges.count(),
        'active_bill_range': (
            config.active_bill_range.prefix
            if config and config.active_bill_range_id else ''
        ),
        'active_credit_note_range': (
            config.active_credit_note_range.prefix
            if config and config.active_credit_note_range_id else ''
        ),
        'status': status,
        'ready': status in {'LISTA_SANDBOX', 'LISTA_PRODUCCION'},
    }


class EmpresaConfiguracionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmpresaConfiguracion
        fields = [
            'tema',
            'permitir_stock_negativo_ventas',
            'atajos_ventas_activos',
            'atajos_ventas',
            'ticket_paper_width',
            'ticket_show_logo',
            'ticket_copies',
            'ticket_footer_text',
        ]

    def validate_ticket_paper_width(self, value):
        if value not in {
            EmpresaConfiguracion.TicketPaperWidth.MM58,
            EmpresaConfiguracion.TicketPaperWidth.MM80,
        }:
            raise serializers.ValidationError(
                'El papel solo puede ser 58 o 80 mm.',
            )
        return value

    def validate_ticket_copies(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError(
                'Las copias deben estar entre 1 y 5.',
            )
        return value

    def validate_ticket_footer_text(self, value):
        value = str(value or '').strip()
        if len(value) > 500:
            raise serializers.ValidationError(
                'El texto de la tirilla no puede superar 500 caracteres.',
            )
        return value

    @staticmethod
    def _normalizar_atajo(value: str) -> str:
        aliases = {
            'DEL': 'Delete',
            'DELETE': 'Delete',
            'SUPR': 'Delete',
            'ESC': 'Escape',
            'ESCAPE': 'Escape',
            'ENTER': 'Enter',
            'RETURN': 'Enter',
            'SPACE': 'Space',
            'TAB': 'Tab',
        }
        modifiers_order = ['Ctrl', 'Alt', 'Shift', 'Meta']
        modifiers_map = {
            'CTRL': 'Ctrl',
            'CONTROL': 'Ctrl',
            'ALT': 'Alt',
            'SHIFT': 'Shift',
            'META': 'Meta',
            'CMD': 'Meta',
            'COMMAND': 'Meta',
        }
        parts = [part.strip() for part in str(value).split('+') if part.strip()]
        if not parts:
            return ''

        normalized_modifiers = []
        main_key = None

        for part in parts:
            upper = part.upper()
            if upper in modifiers_map:
                modifier = modifiers_map[upper]
                if modifier not in normalized_modifiers:
                    normalized_modifiers.append(modifier)
                continue

            if len(part) == 1:
                main_key = part.upper()
            else:
                main_key = aliases.get(upper, part.title())

        ordered_modifiers = [
            modifier
            for modifier in modifiers_order
            if modifier in normalized_modifiers
        ]
        if main_key:
            ordered_modifiers.append(main_key)
        return '+'.join(ordered_modifiers)

    def validate_atajos_ventas(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                'Los atajos deben enviarse como objeto JSON.',
            )

        allowed_keys = set(EmpresaConfiguracion.ATAJOS_VENTAS_KEYS)
        incoming_keys = set(value.keys())
        if incoming_keys != allowed_keys:
            raise serializers.ValidationError(
                'Los atajos deben incluir exactamente las llaves esperadas.',
            )

        normalized = {}
        seen = set()
        for key in EmpresaConfiguracion.ATAJOS_VENTAS_KEYS:
            shortcut = self._normalizar_atajo(value.get(key, ''))
            if not shortcut:
                raise serializers.ValidationError({
                    key: 'Este atajo no puede estar vacio.',
                })
            if shortcut in seen:
                raise serializers.ValidationError({
                    key: 'No puede repetir atajos entre acciones.',
                })
            normalized[key] = shortcut
            seen.add(shortcut)

        return normalized

    def validate(self, attrs):
        atajos_activos = attrs.get(
            'atajos_ventas_activos',
            getattr(self.instance, 'atajos_ventas_activos', True),
        )
        atajos_ventas = attrs.get(
            'atajos_ventas',
            getattr(
                self.instance,
                'atajos_ventas',
                EmpresaConfiguracion.get_default_atajos_ventas(),
            ),
        )
        if atajos_activos:
            for key in EmpresaConfiguracion.ATAJOS_VENTAS_KEYS:
                if not str(atajos_ventas.get(key, '')).strip():
                    raise serializers.ValidationError({
                        'atajos_ventas': (
                            'Todos los atajos deben tener valor cuando '
                            'estan activos.'
                        ),
                    })
        return attrs


class EmpresaSerializer(serializers.ModelSerializer):
    rol_usuario = serializers.SerializerMethodField()
    configuracion_operativa = serializers.SerializerMethodField()

    class Meta:
        model = Empresa
        fields = [
            'id',
            'nit',
            'digito_verificacion',
            'razon_social',
            'nombre_comercial',
            'logo',
            'email',
            'telefono',
            'direccion',
            'municipio_codigo',
            'ambiente_facturacion',
            'activo',
            'rol_usuario',
            'configuracion_operativa',
        ]
        read_only_fields = ['id', 'rol_usuario', 'configuracion_operativa']

    def get_rol_usuario(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        return EmpresaService.rol_usuario(request.user, obj)

    def get_configuracion_operativa(self, obj):
        config = EmpresaConfiguracion.get_or_create_for_empresa(obj)
        return EmpresaConfiguracionSerializer(config).data

    def validate(self, attrs):
        request = self.context.get('request')
        usuario = getattr(request, 'user', None)

        if self.instance and 'nit' in attrs and attrs['nit'] != self.instance.nit:
            rol = EmpresaService.rol_usuario(usuario, self.instance)
            if rol != EmpresaUsuario.Rol.PROPIETARIO and not (
                EmpresaService.es_admin_interno(usuario)
            ):
                raise serializers.ValidationError({
                    'nit': 'Solo propietario o admin interno puede editar NIT.',
                })

        if self.instance and 'activo' in attrs:
            if not EmpresaService.es_admin_interno(usuario):
                raise serializers.ValidationError({
                    'activo': 'Solo admin interno puede cambiar estado.',
                })

        return attrs


class UsuarioEmpresaInputSerializer(serializers.Serializer):
    usuario_id = serializers.IntegerField(required=False, min_value=1)
    username = serializers.CharField(required=False, max_length=150)
    email = serializers.EmailField(required=False)
    password = serializers.CharField(
        required=False,
        write_only=True,
        min_length=8,
        max_length=128,
    )
    confirm_password = serializers.CharField(
        required=False,
        write_only=True,
        min_length=8,
        max_length=128,
    )
    first_name = serializers.CharField(required=False, max_length=150)
    last_name = serializers.CharField(required=False, max_length=150)
    phone = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs.get('usuario_id'):
            return attrs

        required = ('username', 'email', 'password', 'confirm_password')
        missing = [field for field in required if not attrs.get(field)]
        if missing:
            raise serializers.ValidationError({
                field: 'Este campo es requerido al crear usuario.'
                for field in missing
            })

        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Las contrasenas no coinciden.',
            })

        return attrs


class EmpresaAdminSerializer(EmpresaSerializer):
    usuarios_count = serializers.SerializerMethodField()
    factus_configured = serializers.SerializerMethodField()
    factus_enabled = serializers.SerializerMethodField()
    factus_admin_summary = serializers.SerializerMethodField()

    class Meta(EmpresaSerializer.Meta):
        fields = EmpresaSerializer.Meta.fields + [
            'usuarios_count',
            'factus_configured',
            'factus_enabled',
            'factus_admin_summary',
        ]

    def get_usuarios_count(self, obj):
        return obj.usuarios.filter(activo=True, usuario__is_active=True).count()

    def get_factus_configured(self, obj):
        return obj.factus_credentials.filter(activo=True).exists()

    def get_factus_enabled(self, obj):
        config = getattr(obj, 'facturacion_config', None)
        return bool(config and config.is_enabled)

    def get_factus_admin_summary(self, obj):
        return build_factus_admin_summary(obj)


class EmpresaAdminCreateSerializer(serializers.ModelSerializer):
    propietario = UsuarioEmpresaInputSerializer(required=False)

    class Meta:
        model = Empresa
        fields = [
            'nit',
            'digito_verificacion',
            'razon_social',
            'nombre_comercial',
            'logo',
            'email',
            'telefono',
            'direccion',
            'municipio_codigo',
            'ambiente_facturacion',
            'activo',
            'propietario',
        ]

    def validate_nit(self, value):
        if Empresa.objects.filter(nit=value).exists():
            raise serializers.ValidationError('Ya existe una empresa con NIT.')
        return value


class EmpresaSeleccionSerializer(serializers.Serializer):
    empresa_id = serializers.IntegerField(min_value=1)


class EmpresaUsuarioSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(source='usuario.username', read_only=True)
    usuario_nombre = serializers.CharField(
        source='usuario.get_full_name',
        read_only=True,
    )
    usuario_email = serializers.EmailField(source='usuario.email', read_only=True)
    usuario_phone = serializers.CharField(source='usuario.phone', read_only=True)
    usuario_activo = serializers.BooleanField(
        source='usuario.is_active',
        read_only=True,
    )

    class Meta:
        model = EmpresaUsuario
        fields = [
            'id',
            'empresa',
            'usuario',
            'usuario_username',
            'usuario_nombre',
            'usuario_email',
            'usuario_phone',
            'usuario_activo',
            'rol',
            'activo',
        ]
        read_only_fields = [
            'id',
            'empresa',
            'usuario',
            'usuario_username',
            'usuario_nombre',
            'usuario_email',
            'usuario_phone',
            'usuario_activo',
        ]


class EmpresaUsuarioCreateSerializer(serializers.Serializer):
    usuario_id = serializers.IntegerField(required=False, min_value=1)
    usuario = UsuarioEmpresaInputSerializer(required=False)
    rol = serializers.ChoiceField(
        choices=EmpresaUsuario.Rol.choices,
        default=EmpresaUsuario.Rol.EMPLEADO,
    )
    activo = serializers.BooleanField(default=True)

    def validate(self, attrs):
        if not attrs.get('usuario_id') and not attrs.get('usuario'):
            raise serializers.ValidationError(
                'Debe indicar usuario_id o datos de usuario.',
            )
        return attrs


class EmpresaUsuarioUpdateSerializer(serializers.Serializer):
    rol = serializers.ChoiceField(
        choices=EmpresaUsuario.Rol.choices,
        required=False,
    )
    activo = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('No hay campos para actualizar.')
        return attrs


class FactusCredentialSerializer(serializers.ModelSerializer):
    client_id_masked = serializers.CharField(read_only=True)
    has_client_secret = serializers.BooleanField(read_only=True)
    has_password = serializers.BooleanField(read_only=True)
    client_secret = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = FactusCredential
        fields = [
            'id',
            'empresa',
            'environment',
            'base_url',
            'client_id',
            'client_id_masked',
            'has_client_secret',
            'client_secret',
            'username',
            'has_password',
            'password',
            'timeout',
            'max_retries',
            'verify_ssl',
            'activo',
        ]
        read_only_fields = [
            'id',
            'empresa',
            'client_id_masked',
            'has_client_secret',
            'has_password',
        ]

    def update(self, instance, validated_data):
        for field in ('client_secret', 'password'):
            if validated_data.get(field) in (None, ''):
                validated_data.pop(field, None)
        return super().update(instance, validated_data)

    def validate(self, attrs):
        environment = attrs.get(
            'environment',
            getattr(self.instance, 'environment', FactusEnvironment.SANDBOX),
        )
        base_url = attrs.get(
            'base_url',
            getattr(self.instance, 'base_url', FACTUS_BASE_URLS[environment]),
        )
        expected_url = FACTUS_BASE_URLS.get(environment)
        if expected_url and str(base_url).rstrip('/') != expected_url:
            raise serializers.ValidationError({
                'base_url': (
                    f'El ambiente {environment} debe usar {expected_url}.'
                ),
            })

        if self.instance is None:
            required = ('client_id', 'client_secret', 'username', 'password')
            missing = [
                field for field in required
                if not str(attrs.get(field) or '').strip()
            ]
            if missing:
                raise serializers.ValidationError({
                    field: 'Este campo es requerido para crear credenciales.'
                    for field in missing
                })

        return attrs
