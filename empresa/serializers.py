from rest_framework import serializers

from empresa.models import Empresa, EmpresaUsuario
from empresa.services import EmpresaService
from ventas.models import FactusCredential


class EmpresaSerializer(serializers.ModelSerializer):
    rol_usuario = serializers.SerializerMethodField()

    class Meta:
        model = Empresa
        fields = [
            'id',
            'nit',
            'digito_verificacion',
            'razon_social',
            'nombre_comercial',
            'email',
            'telefono',
            'direccion',
            'municipio_codigo',
            'ambiente_facturacion',
            'activo',
            'rol_usuario',
        ]
        read_only_fields = ['id', 'rol_usuario']

    def get_rol_usuario(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        return EmpresaService.rol_usuario(request.user, obj)

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

    class Meta(EmpresaSerializer.Meta):
        fields = EmpresaSerializer.Meta.fields + [
            'usuarios_count',
            'factus_configured',
            'factus_enabled',
        ]

    def get_usuarios_count(self, obj):
        return obj.usuarios.filter(activo=True, usuario__is_active=True).count()

    def get_factus_configured(self, obj):
        return obj.factus_credentials.filter(activo=True).exists()

    def get_factus_enabled(self, obj):
        config = getattr(obj, 'facturacion_config', None)
        return bool(config and config.is_enabled)


class EmpresaAdminCreateSerializer(serializers.ModelSerializer):
    propietario = UsuarioEmpresaInputSerializer(required=False)

    class Meta:
        model = Empresa
        fields = [
            'nit',
            'digito_verificacion',
            'razon_social',
            'nombre_comercial',
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
