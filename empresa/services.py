from typing import Any, Dict, Optional

from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.utils.translation import gettext_lazy as _

from empresa.models import Empresa, EmpresaUsuario
from usuario.models import Usuario
from usuario.services import UsuarioService


class EmpresaService:
    HEADER_EMPRESA_ID = 'HTTP_X_EMPRESA_ID'
    SESSION_EMPRESA_ID = 'empresa_activa_id'
    EMPLEADO_ALLOWED_ACTIONS = {
        'crear_cliente',
        'ver_cliente',
        'actualizar_cliente',
        'listar_clientes',
        'crear_proveedor',
        'ver_proveedor',
        'actualizar_proveedor',
        'listar_proveedores',
        'crear_producto',
        'ver_producto',
        'actualizar_producto',
        'listar_productos',
        'crear_venta',
        'ver_venta',
        'actualizar_venta',
        'listar_ventas',
        'registrar_abono',
        'ver_abono',
        'listar_abonos',
        'crear_factura',
        'ver_factura',
        'listar_facturas',
    }

    @staticmethod
    def asegurar_empresa_inicial() -> Empresa:
        return Empresa.get_default()

    @staticmethod
    def asegurar_membresia_inicial(usuario) -> Optional[EmpresaUsuario]:
        if not getattr(usuario, 'is_authenticated', False):
            return None

        empresa = EmpresaService.asegurar_empresa_inicial()
        rol = (
            EmpresaUsuario.Rol.PROPIETARIO
            if getattr(usuario, 'is_superuser', False) or getattr(usuario, 'is_admin', False)
            else EmpresaUsuario.Rol.EMPLEADO
        )
        membresia, _ = EmpresaUsuario.objects.get_or_create(
            empresa=empresa,
            usuario=usuario,
            defaults={'rol': rol, 'activo': True},
        )
        return membresia

    @staticmethod
    def empresas_usuario(usuario):
        if not getattr(usuario, 'is_authenticated', False):
            return Empresa.objects.none()

        if getattr(usuario, 'is_superuser', False):
            return Empresa.objects.filter(activo=True)

        return Empresa.objects.filter(
            usuarios__usuario=usuario,
            usuarios__activo=True,
            activo=True,
        ).distinct()

    @staticmethod
    def resolver_empresa_request(request) -> Optional[Empresa]:
        usuario = getattr(request, 'user', None)
        if not getattr(usuario, 'is_authenticated', False):
            return None

        EmpresaService.asegurar_membresia_inicial(usuario)
        empresa_id = (
            request.META.get(EmpresaService.HEADER_EMPRESA_ID)
            or request.session.get(EmpresaService.SESSION_EMPRESA_ID)
        )

        queryset = EmpresaService.empresas_usuario(usuario)
        if empresa_id:
            try:
                return queryset.get(pk=empresa_id)
            except Empresa.DoesNotExist as exc:
                raise PermissionDenied(
                    'El usuario no pertenece a la empresa indicada.',
                ) from exc

        empresa = queryset.order_by('id').first()
        if empresa:
            request.session[EmpresaService.SESSION_EMPRESA_ID] = empresa.id
        return empresa

    @staticmethod
    @transaction.atomic
    def seleccionar_empresa(usuario, empresa_id: int) -> Empresa:
        EmpresaService.asegurar_membresia_inicial(usuario)
        try:
            empresa = EmpresaService.empresas_usuario(usuario).get(pk=empresa_id)
        except Empresa.DoesNotExist as exc:
            raise PermissionDenied(
                'El usuario no pertenece a la empresa indicada.',
            ) from exc
        return empresa

    @staticmethod
    def rol_usuario(usuario, empresa: Empresa) -> Optional[str]:
        if getattr(usuario, 'is_superuser', False):
            return EmpresaUsuario.Rol.PROPIETARIO
        membresia = EmpresaUsuario.objects.filter(
            usuario=usuario,
            empresa=empresa,
            activo=True,
        ).first()
        return membresia.rol if membresia else None

    @staticmethod
    def es_admin_interno(usuario) -> bool:
        return bool(
            getattr(usuario, 'is_authenticated', False)
            and (
                getattr(usuario, 'is_superuser', False)
                or getattr(usuario, 'is_staff', False)
            )
        )

    @staticmethod
    def validar_admin_interno(usuario) -> None:
        if not EmpresaService.es_admin_interno(usuario):
            raise PermissionDenied(
                _('Solo un administrador interno de Mallor puede operar aqui.'),
            )

    @staticmethod
    def validar_empresa_activa(empresa: Empresa) -> None:
        if empresa is None or not empresa.activo:
            raise PermissionDenied(
                _('La empresa activa esta inactiva y no puede operar.'),
            )

    @staticmethod
    def validar_permiso_operacion(usuario, empresa: Empresa, accion: str) -> bool:
        if not getattr(usuario, 'is_authenticated', False):
            return False

        if EmpresaService.es_admin_interno(usuario):
            return True

        if empresa is None or not empresa.activo:
            return False

        rol = EmpresaService.rol_usuario(usuario, empresa)
        if rol in (EmpresaUsuario.Rol.PROPIETARIO, EmpresaUsuario.Rol.ADMIN):
            return True

        if rol == EmpresaUsuario.Rol.EMPLEADO:
            return accion in EmpresaService.EMPLEADO_ALLOWED_ACTIONS

        return False

    @staticmethod
    def _crear_usuario_propietario(
        propietario_data: Optional[Dict[str, Any]],
        usuario_solicitante,
    ) -> Optional[Usuario]:
        if not propietario_data:
            return None

        usuario_id = propietario_data.get('usuario_id')
        if usuario_id:
            try:
                return Usuario.objects.get(pk=usuario_id, is_active=True)
            except Usuario.DoesNotExist as exc:
                raise ValueError(
                    _('El usuario propietario indicado no existe.'),
                ) from exc

        data = propietario_data.copy()
        data['role'] = Usuario.Rol.ADMIN
        data.setdefault('is_active', True)
        return UsuarioService.crear_usuario(
            data,
            usuario_solicitante=usuario_solicitante,
        )

    @staticmethod
    @transaction.atomic
    def crear_empresa_admin(
        empresa_data: Dict[str, Any],
        *,
        propietario_data: Optional[Dict[str, Any]] = None,
        usuario_solicitante=None,
    ) -> Empresa:
        EmpresaService.validar_admin_interno(usuario_solicitante)
        propietario = EmpresaService._crear_usuario_propietario(
            propietario_data,
            usuario_solicitante,
        )
        empresa = Empresa.objects.create(**empresa_data)

        if propietario:
            EmpresaUsuario.objects.update_or_create(
                empresa=empresa,
                usuario=propietario,
                defaults={
                    'rol': EmpresaUsuario.Rol.PROPIETARIO,
                    'activo': True,
                },
            )

        return empresa

    @staticmethod
    @transaction.atomic
    def actualizar_empresa_admin(
        empresa: Empresa,
        data: Dict[str, Any],
        *,
        usuario_solicitante=None,
    ) -> Empresa:
        EmpresaService.validar_admin_interno(usuario_solicitante)
        for field, value in data.items():
            setattr(empresa, field, value)
        empresa.save()
        return empresa

    @staticmethod
    def membresias_empresa(empresa: Empresa):
        return EmpresaUsuario.objects.filter(
            empresa=empresa,
        ).select_related('usuario').order_by(
            '-activo',
            'rol',
            'usuario__username',
        )

    @staticmethod
    def _propietarios_activos_count(empresa: Empresa) -> int:
        return EmpresaUsuario.objects.filter(
            empresa=empresa,
            rol=EmpresaUsuario.Rol.PROPIETARIO,
            activo=True,
            usuario__is_active=True,
        ).count()

    @staticmethod
    def _validar_no_deja_sin_propietario(
        membresia: EmpresaUsuario,
        next_rol: str,
        next_activo: bool,
    ) -> None:
        if (
            membresia.rol != EmpresaUsuario.Rol.PROPIETARIO
            or not membresia.activo
        ):
            return

        sigue_propietario = (
            next_rol == EmpresaUsuario.Rol.PROPIETARIO
            and next_activo
        )
        if sigue_propietario:
            return

        if EmpresaService._propietarios_activos_count(membresia.empresa) <= 1:
            raise ValueError(
                _('No se puede dejar la empresa sin propietario activo.'),
            )

    @staticmethod
    def _resolver_usuario_membresia(
        data: Dict[str, Any],
        usuario_solicitante,
    ) -> Usuario:
        usuario_id = data.get('usuario_id')
        if usuario_id:
            try:
                return Usuario.objects.get(pk=usuario_id, is_active=True)
            except Usuario.DoesNotExist as exc:
                raise ValueError(_('El usuario indicado no existe.')) from exc

        usuario_data = data.get('usuario') or {}
        if not usuario_data:
            raise ValueError(
                _('Debe indicar usuario_id o datos para crear el usuario.'),
            )

        usuario_data = usuario_data.copy()
        usuario_data['role'] = (
            Usuario.Rol.ADMIN
            if data.get('rol') in (
                EmpresaUsuario.Rol.PROPIETARIO,
                EmpresaUsuario.Rol.ADMIN,
            )
            else Usuario.Rol.EMPLEADO
        )
        usuario_data.setdefault('is_active', True)
        return UsuarioService.crear_usuario(
            usuario_data,
            usuario_solicitante=usuario_solicitante,
        )

    @staticmethod
    @transaction.atomic
    def crear_o_actualizar_membresia(
        empresa: Empresa,
        data: Dict[str, Any],
        *,
        usuario_solicitante=None,
    ) -> EmpresaUsuario:
        usuario = EmpresaService._resolver_usuario_membresia(
            data,
            usuario_solicitante,
        )
        rol = data.get('rol') or EmpresaUsuario.Rol.EMPLEADO
        activo = data.get('activo', True)
        membresia, _ = EmpresaUsuario.objects.update_or_create(
            empresa=empresa,
            usuario=usuario,
            defaults={'rol': rol, 'activo': activo},
        )
        return membresia

    @staticmethod
    @transaction.atomic
    def actualizar_membresia(
        membresia: EmpresaUsuario,
        data: Dict[str, Any],
    ) -> EmpresaUsuario:
        next_rol = data.get('rol', membresia.rol)
        next_activo = data.get('activo', membresia.activo)
        EmpresaService._validar_no_deja_sin_propietario(
            membresia,
            next_rol,
            next_activo,
        )

        if 'rol' in data:
            membresia.rol = data['rol']
        if 'activo' in data:
            membresia.activo = data['activo']
        membresia.save(update_fields=['rol', 'activo', 'updated_at'])
        return membresia
