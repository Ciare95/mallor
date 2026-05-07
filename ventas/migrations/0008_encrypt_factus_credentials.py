import base64
import hashlib

from django.conf import settings
from django.db import migrations


def _encrypt_if_needed(value):
    if not value or str(value).startswith('enc::'):
        return value or ''
    from cryptography.fernet import Fernet

    raw_key = getattr(settings, 'MALLOR_DATA_ENCRYPTION_KEY', '') or settings.SECRET_KEY
    digest = hashlib.sha256(raw_key.encode('utf-8')).digest()
    fernet = Fernet(base64.urlsafe_b64encode(digest))
    token = fernet.encrypt(str(value).encode('utf-8')).decode('utf-8')
    return f'enc::{token}'


def encrypt_existing_credentials(apps, schema_editor):
    FactusCredential = apps.get_model('ventas', 'FactusCredential')
    for credential in FactusCredential.objects.all():
        updated_fields = []
        encrypted_secret = _encrypt_if_needed(credential.client_secret)
        encrypted_password = _encrypt_if_needed(credential.password)
        if encrypted_secret != credential.client_secret:
            credential.client_secret = encrypted_secret
            updated_fields.append('client_secret')
        if encrypted_password != credential.password:
            credential.password = encrypted_password
            updated_fields.append('password')
        if updated_fields:
            credential.save(update_fields=updated_fields)


class Migration(migrations.Migration):

    dependencies = [
        ('ventas', '0007_factuscredential_and_more'),
    ]

    operations = [
        migrations.RunPython(encrypt_existing_credentials, migrations.RunPython.noop),
    ]
