from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from django.core.validators import EmailValidator, RegexValidator
from django.utils.translation import gettext_lazy as _

from .models import Usuario


class UsuarioSerializer(serializers.ModelSerializer):
    """
    Serializer completo para lectura de usuarios.
    
    Incluye todos los campos del modelo, excluyendo campos sensibles
    como password y permisos internos.
    """
    
    role_display = serializers.CharField(
        source='get_role_display',
        read_only=True,
        help_text=_('Nombre legible del rol')
    )
    
    class Meta:
        model = Usuario
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'role_display',
            'phone',
            'is_active',
            'is_staff',
            'is_superuser',
            'date_joined',
            'last_login',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'is_staff',
            'is_superuser',
            'date_joined',
            'last_login',
            'created_at',
            'updated_at',
        ]


class UsuarioListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listados de usuarios.
    
    Incluye solo información básica para optimizar rendimiento
    en listados y búsquedas.
    """
    
    full_name = serializers.CharField(
        source='get_full_name',
        read_only=True,
        help_text=_('Nombre completo del usuario')
    )
    
    role_display = serializers.CharField(
        source='get_role_display',
        read_only=True,
        help_text=_('Nombre legible del rol')
    )
    
    class Meta:
        model = Usuario
        fields = [
            'id',
            'username',
            'email',
            'full_name',
            'role',
            'role_display',
            'phone',
            'is_active',
            'date_joined',
        ]
        read_only_fields = fields


class UsuarioCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para creación de usuarios.
    
    Incluye validaciones específicas para creación:
    - Password mínimo 8 caracteres
    - Email único
    - Username único
    - Validación de formato de teléfono
    """
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        max_length=128,
        style={'input_type': 'password'},
        help_text=_('Contraseña del usuario (mínimo 8 caracteres)'),
        error_messages={
            'min_length': _('La contraseña debe tener al menos 8 caracteres.'),
            'max_length': _('La contraseña no puede exceder 128 caracteres.')
        }
    )
    
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text=_('Confirmación de la contraseña'),
        error_messages={
            'required': _('Debe confirmar la contraseña.')
        }
    )
    
    email = serializers.EmailField(
        required=True,
        validators=[EmailValidator()],
        help_text=_('Dirección de correo electrónico única')
    )
    
    username = serializers.CharField(
        required=True,
        min_length=3,
        max_length=150,
        help_text=_('Nombre de usuario único para el sistema')
    )
    
    phone = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=20,
        validators=[
            RegexValidator(
                regex=r'^\+?[0-9\s\-\(\)]{7,20}$',
                message=_('Formato de teléfono inválido. Use números, espacios, guiones y paréntesis.'),
                code='invalid_phone'
            )
        ],
        help_text=_('Número de teléfono (opcional)')
    )
    
    class Meta:
        model = Usuario
        fields = [
            'username',
            'email',
            'password',
            'confirm_password',
            'first_name',
            'last_name',
            'role',
            'phone',
            'is_active',
        ]
        extra_kwargs = {
            'first_name': {
                'required': True,
                'help_text': _('Nombre del usuario'),
                'max_length': 150,
            },
            'last_name': {
                'required': True,
                'help_text': _('Apellido del usuario'),
                'max_length': 150,
            },
            'role': {
                'help_text': _('Rol del usuario en el sistema'),
                'default': Usuario.Rol.EMPLEADO,
            },
            'is_active': {
                'help_text': _('Indica si el usuario está activo'),
                'default': True,
            },
        }
    
    def validate_username(self, value):
        """
        Valida que el username sea único.
        
        Args:
            value (str): Nombre de usuario a validar
            
        Returns:
            str: Username validado
            
        Raises:
            serializers.ValidationError: Si el username ya existe
        """
        if Usuario.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                _('Este nombre de usuario ya está en uso.')
            )
        return value
    
    def validate_email(self, value):
        """
        Valida que el email sea único.
        
        Args:
            value (str): Email a validar
            
        Returns:
            str: Email validado
            
        Raises:
            serializers.ValidationError: Si el email ya existe
        """
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                _('Este correo electrónico ya está registrado.')
            )
        return value
    
    def validate_role(self, value):
        """
        Valida que el rol sea válido.
        
        Args:
            value (str): Rol a validar
            
        Returns:
            str: Rol validado
            
        Raises:
            serializers.ValidationError: Si el rol no es válido
        """
        valid_roles = [choice[0] for choice in Usuario.Rol.choices]
        if value not in valid_roles:
            raise serializers.ValidationError(
                _('Rol inválido. Opciones válidas: %(roles)s') % {
                    'roles': ', '.join(valid_roles)
                }
            )
        return value
    
    def validate(self, data):
        """
        Valida los datos del serializer.
        
        Args:
            data (dict): Datos a validar
            
        Returns:
            dict: Datos validados
            
        Raises:
            serializers.ValidationError: Si las contraseñas no coinciden
        """
        # Validar que las contraseñas coincidan
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        
        if password and confirm_password and password != confirm_password:
            raise serializers.ValidationError({
                'confirm_password': _('Las contraseñas no coinciden.')
            })
        
        return data
    
    def create(self, validated_data):
        """
        Crea un nuevo usuario con los datos validados.
        
        Args:
            validated_data (dict): Datos validados del usuario
            
        Returns:
            Usuario: Instancia del usuario creado
        """
        # Extraer campos especiales
        password = validated_data.pop('password')
        confirm_password = validated_data.pop('confirm_password')
        
        # Hashear password
        validated_data['password'] = make_password(password)
        
        # Crear usuario
        usuario = Usuario.objects.create(**validated_data)
        
        return usuario


class UsuarioUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer para actualización de usuarios.
    
    Permite actualizar información básica del usuario sin modificar
    campos sensibles como password (se maneja en endpoint separado).
    """
    
    email = serializers.EmailField(
        required=False,
        validators=[EmailValidator()],
        help_text=_('Dirección de correo electrónico única')
    )
    
    username = serializers.CharField(
        required=False,
        min_length=3,
        max_length=150,
        help_text=_('Nombre de usuario único para el sistema')
    )
    
    phone = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=20,
        validators=[
            RegexValidator(
                regex=r'^\+?[0-9\s\-\(\)]{7,20}$',
                message=_('Formato de teléfono inválido. Use números, espacios, guiones y paréntesis.'),
                code='invalid_phone'
            )
        ],
        help_text=_('Número de teléfono (opcional)')
    )
    
    class Meta:
        model = Usuario
        fields = [
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'phone',
            'is_active',
        ]
        extra_kwargs = {
            'first_name': {
                'help_text': _('Nombre del usuario'),
                'max_length': 150,
                'required': False,
            },
            'last_name': {
                'help_text': _('Apellido del usuario'),
                'max_length': 150,
                'required': False,
            },
            'role': {
                'help_text': _('Rol del usuario en el sistema'),
                'required': False,
            },
            'is_active': {
                'help_text': _('Indica si el usuario está activo'),
                'required': False,
            },
        }
    
    def validate_username(self, value):
        """
        Valida que el username sea único (excluyendo el usuario actual).
        
        Args:
            value (str): Nombre de usuario a validar
            
        Returns:
            str: Username validado
            
        Raises:
            serializers.ValidationError: Si el username ya existe
        """
        instance = self.instance
        if instance and Usuario.objects.filter(username=value).exclude(id=instance.id).exists():
            raise serializers.ValidationError(
                _('Este nombre de usuario ya está en uso.')
            )
        return value
    
    def validate_email(self, value):
        """
        Valida que el email sea único (excluyendo el usuario actual).
        
        Args:
            value (str): Email a validar
            
        Returns:
            str: Email validado
            
        Raises:
            serializers.ValidationError: Si el email ya existe
        """
        instance = self.instance
        if instance and Usuario.objects.filter(email=value).exclude(id=instance.id).exists():
            raise serializers.ValidationError(
                _('Este correo electrónico ya está registrado.')
            )
        return value
    
    def validate_role(self, value):
        """
        Valida que el rol sea válido.
        
        Args:
            value (str): Rol a validar
            
        Returns:
            str: Rol validado
            
        Raises:
            serializers.ValidationError: Si el rol no es válido
        """
        valid_roles = [choice[0] for choice in Usuario.Rol.choices]
        if value not in valid_roles:
            raise serializers.ValidationError(
                _('Rol inválido. Opciones válidas: %(roles)s') % {
                    'roles': ', '.join(valid_roles)
                }
            )
        return value
    
    def update(self, instance, validated_data):
        """
        Actualiza un usuario existente.
        
        Args:
            instance (Usuario): Instancia del usuario a actualizar
            validated_data (dict): Datos validados para actualizar
            
        Returns:
            Usuario: Instancia del usuario actualizado
        """
        # Actualizar campos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance