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


class EmpresaSeleccionSerializer(serializers.Serializer):
    empresa_id = serializers.IntegerField(min_value=1)


class EmpresaUsuarioSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(
        source='usuario.get_full_name',
        read_only=True,
    )
    usuario_email = serializers.EmailField(source='usuario.email', read_only=True)

    class Meta:
        model = EmpresaUsuario
        fields = [
            'id',
            'empresa',
            'usuario',
            'usuario_nombre',
            'usuario_email',
            'rol',
            'activo',
        ]
        read_only_fields = ['id']


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
