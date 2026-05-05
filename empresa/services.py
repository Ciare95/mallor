from typing import Optional

from django.core.exceptions import PermissionDenied
from django.db import transaction

from empresa.models import Empresa, EmpresaUsuario


class EmpresaService:
    HEADER_EMPRESA_ID = 'HTTP_X_EMPRESA_ID'
    SESSION_EMPRESA_ID = 'empresa_activa_id'

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

