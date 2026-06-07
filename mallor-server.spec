# -*- mode: python ; coding: utf-8 -*-
import os
import certifi

block_cipher = None

# Directorios de migraciones de cada app Django
migration_datas = [
    (f"{app}/migrations", f"{app}/migrations")
    for app in [
        "empresa", "usuario", "offline", "cliente", "fabricante",
        "IA", "informes", "inventario", "proveedor", "ventas",
    ]
    if os.path.isdir(f"{app}/migrations")
]

a = Analysis(
    ["mallor_entrypoint.py"],
    pathex=["."],
    binaries=[],
    datas=migration_datas + [
        # Build de React (ReactAppView sirve index.html desde FRONTEND_DIST_DIR)
        ("frontend/dist", "frontend/dist"),
        # Archivos estáticos compilados por collectstatic (whitenoise los sirve)
        ("staticfiles", "staticfiles"),
        # Módulos de configuración de Django
        ("config", "config"),
        # CA bundle de certifi para que requests pueda verificar TLS (ej. mallor.onrender.com)
        (certifi.where(), "certifi"),
    ],
    hiddenimports=[
        # Backends de base de datos
        "django.db.backends.sqlite3",
        "django.db.backends.sqlite3.base",
        "django.db.backends.sqlite3.client",
        "django.db.backends.sqlite3.creation",
        "django.db.backends.sqlite3.features",
        "django.db.backends.sqlite3.introspection",
        "django.db.backends.sqlite3.operations",
        "django.db.backends.sqlite3.schema",
        # Django contrib
        "django.contrib.admin.apps",
        "django.contrib.auth.backends",
        "django.contrib.contenttypes.apps",
        "django.contrib.sessions.apps",
        "django.contrib.messages.apps",
        "django.contrib.staticfiles.apps",
        "django.template.loaders.app_directories",
        "django.template.loaders.filesystem",
        # Apps de Mallor
        "empresa",
        "empresa.apps",
        "empresa.models",
        "usuario",
        "usuario.apps",
        "usuario.models",
        "offline",
        "offline.apps",
        "offline.models",
        "cliente",
        "cliente.apps",
        "cliente.models",
        "fabricante",
        "fabricante.apps",
        "fabricante.models",
        "IA",
        "IA.apps",
        "IA.models",
        "informes",
        "informes.apps",
        "informes.models",
        "inventario",
        "inventario.apps",
        "inventario.models",
        "proveedor",
        "proveedor.apps",
        "proveedor.models",
        "ventas",
        "ventas.apps",
        "ventas.models",
        # DRF y plugins
        "rest_framework",
        "rest_framework.apps",
        "rest_framework_simplejwt",
        "rest_framework_simplejwt.apps",
        "rest_framework_simplejwt.authentication",
        "rest_framework_simplejwt.backends",
        "rest_framework_simplejwt.exceptions",
        "rest_framework_simplejwt.serializers",
        "rest_framework_simplejwt.settings",
        "rest_framework_simplejwt.state",
        "rest_framework_simplejwt.tokens",
        "rest_framework_simplejwt.utils",
        "rest_framework_simplejwt.views",
        "rest_framework_simplejwt.token_blacklist",
        "rest_framework_simplejwt.token_blacklist.apps",
        "rest_framework_simplejwt.token_blacklist.admin",
        "rest_framework_simplejwt.token_blacklist.models",
        "corsheaders",
        "corsheaders.apps",
        # Whitenoise
        "whitenoise",
        "whitenoise.storage",
        "whitenoise.middleware",
        # Cryptography (JWT)
        "cryptography",
        "cryptography.hazmat.primitives.asymmetric.rsa",
        "cryptography.hazmat.backends.openssl",
        "cryptography.hazmat.backends.openssl.backend",
        # Otros
        "dj_database_url",
        "waitress",
        "openpyxl",
        "reportlab",
        "openai",
    ],
    excludes=[
        "psycopg",
        "psycopg2",
        "gunicorn",
        "pytest",
        "pytest_django",
        "factory_boy",
        "faker",
        "Faker",
        "_pytest",
    ],
    noarchive=False,
    cipher=block_cipher,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="mallor-server",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,  # stdout visible para Tauri
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    name="mallor-server",
)
