import base64
import hashlib
from typing import Optional

from django.conf import settings

from cryptography.fernet import Fernet, InvalidToken


ENCRYPTED_PREFIX = 'enc::'


def _build_fernet() -> Fernet:
    raw_key = getattr(settings, 'MALLOR_DATA_ENCRYPTION_KEY', '') or settings.SECRET_KEY
    digest = hashlib.sha256(raw_key.encode('utf-8')).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def is_encrypted_value(value: Optional[str]) -> bool:
    return bool(value and value.startswith(ENCRYPTED_PREFIX))


def encrypt_value(value: Optional[str]) -> str:
    if value in (None, ''):
        return ''
    if is_encrypted_value(value):
        return value
    token = _build_fernet().encrypt(str(value).encode('utf-8')).decode('utf-8')
    return f'{ENCRYPTED_PREFIX}{token}'


def decrypt_value(value: Optional[str]) -> str:
    if value in (None, ''):
        return ''
    if not is_encrypted_value(value):
        return value
    token = value[len(ENCRYPTED_PREFIX):]
    try:
        return _build_fernet().decrypt(token.encode('utf-8')).decode('utf-8')
    except InvalidToken as exc:
        raise ValueError('No fue posible descifrar el secreto almacenado.') from exc
