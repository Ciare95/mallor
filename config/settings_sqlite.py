from .settings import *  # noqa: F403, F401


DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',  # noqa: F405
    }
}

SILENCED_SYSTEM_CHECKS = ['fields.E210']
