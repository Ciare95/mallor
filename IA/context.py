import uuid
from dataclasses import dataclass
from typing import Optional

from django.core.exceptions import PermissionDenied

from empresa.models import Empresa, EmpresaUsuario
from empresa.services import EmpresaService


@dataclass(frozen=True)
class IAContext:
    empresa: Empresa
    usuario: object
    rol_empresa: str
    sesion_id: uuid.UUID

    @property
    def es_admin(self) -> bool:
        return self.rol_empresa in (
            EmpresaUsuario.Rol.PROPIETARIO,
            EmpresaUsuario.Rol.ADMIN,
        )

    @property
    def es_empleado(self) -> bool:
        return self.rol_empresa == EmpresaUsuario.Rol.EMPLEADO


def resolver_contexto_ia(request, sesion_id: Optional[str] = None) -> IAContext:
    usuario = getattr(request, 'user', None)
    empresa = getattr(request, 'empresa', None)

    if not getattr(usuario, 'is_authenticated', False):
        raise PermissionDenied('Debe iniciar sesion para usar el asistente IA.')

    EmpresaService.validar_empresa_activa(empresa)
    rol = EmpresaService.rol_usuario(usuario, empresa)
    if rol is None:
        raise PermissionDenied('El usuario no pertenece a la empresa activa.')

    try:
        sesion_uuid = uuid.UUID(str(sesion_id)) if sesion_id else uuid.uuid4()
    except (TypeError, ValueError) as exc:
        raise ValueError('El sesion_id no tiene un formato UUID valido.') from exc

    return IAContext(
        empresa=empresa,
        usuario=usuario,
        rol_empresa=rol,
        sesion_id=sesion_uuid,
    )
