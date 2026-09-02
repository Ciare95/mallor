import pytest
from django.core.exceptions import ImproperlyConfigured

from config import settings


def test_secret_key_requerida_en_produccion_sin_variable():
    with pytest.raises(ImproperlyConfigured):
        settings._resolve_secret_key(debug=False, provided=None)


def test_secret_key_acepta_variable_en_produccion():
    assert (
        settings._resolve_secret_key(debug=False, provided='clave-produccion')
        == 'clave-produccion'
    )


def test_secret_key_fallback_solo_en_desarrollo():
    assert settings._resolve_secret_key(debug=True, provided=None).startswith(
        'django-insecure-'
    )
