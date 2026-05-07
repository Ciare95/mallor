from pathlib import Path

from .settings import *  # noqa: F403

TESTING = True
DEBUG = False
SECRET_KEY = 'mallor-test-secret-key'
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'mallor_test'),  # noqa: F405
        'USER': os.getenv('DB_USER', 'postgres'),  # noqa: F405
        'PASSWORD': os.getenv('DB_PASSWORD', 'postgres'),  # noqa: F405
        'HOST': os.getenv('DB_HOST', 'localhost'),  # noqa: F405
        'PORT': os.getenv('DB_PORT', '5432'),  # noqa: F405
        'TEST': {
            'NAME': os.getenv('TEST_DB_NAME', 'test_mallor'),  # noqa: F405
        },
    },
}

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'mallor-tests',
    },
}

MEDIA_ROOT = Path(BASE_DIR) / '.test-media'  # noqa: F405
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

FACTUS_BASE_URL = 'https://factus.test.invalid'
FACTUS_TIMEOUT = 3
DEEPSEEK_API_KEY = ''
DEEPSEEK_BASE_URL = 'https://deepseek.test.invalid'
