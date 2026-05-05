from contextvars import ContextVar
from typing import Optional

from empresa.models import Empresa


_empresa_actual: ContextVar[Optional[Empresa]] = ContextVar(
    'empresa_actual',
    default=None,
)


def set_empresa_actual(empresa: Optional[Empresa]):
    return _empresa_actual.set(empresa)


def reset_empresa_actual(token) -> None:
    _empresa_actual.reset(token)


def get_empresa_actual() -> Optional[Empresa]:
    return _empresa_actual.get()


def get_empresa_actual_or_default() -> Empresa:
    return get_empresa_actual() or Empresa.get_default()

