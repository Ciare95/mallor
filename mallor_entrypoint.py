import os
import sys
import threading


def _get_data_dir() -> str:
    appdata = os.environ.get("APPDATA") or os.path.join(
        os.path.expanduser("~"), "AppData", "Roaming"
    )
    data_dir = os.path.join(appdata, "MallorLocal")
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(os.path.join(data_dir, "media"), exist_ok=True)
    return data_dir


def _configure_env(data_dir: str) -> None:
    db_path = os.path.join(data_dir, "db.sqlite3").replace("\\", "/")
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    os.environ["MALLOR_MODE"] = "local"
    os.environ["MALLOR_LOCAL_SERVER"] = "true"
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    os.environ["MEDIA_ROOT"] = os.path.join(data_dir, "media")
    os.environ["DEBUG"] = "false"
    os.environ.setdefault("MALLOR_CLOUD_BASE_URL", "https://mallor.com")
    os.environ["DB_SSL_REQUIRE"] = "false"
    os.environ["SECURE_SSL_REDIRECT"] = "false"
    os.environ["SESSION_COOKIE_SECURE"] = "false"
    os.environ["CSRF_COOKIE_SECURE"] = "false"
    os.environ.setdefault(
        "SECRET_KEY",
        "mallor-local-key-xk92mP!vQ3nL8wYrTjZ5aDfE",
    )


def _setup_django() -> None:
    import django
    django.setup()


def _run_migrations() -> None:
    from django.core.management import call_command
    print("[mallor] Ejecutando migraciones...", flush=True)
    call_command("migrate", "--run-syncdb", verbosity=0)
    print("[mallor] Migraciones completadas.", flush=True)


def _seed_superuser() -> None:
    from django.contrib.auth import get_user_model
    User = get_user_model()
    if not User.objects.filter(is_superuser=True).exists():
        print("[mallor] Creando superusuario semilla admin/mallor1234...", flush=True)
        User.objects.create_superuser(username="admin", password="mallor1234", email="")
        print("[mallor] Superusuario creado.", flush=True)


def _start_worker() -> None:
    from django.core.management import call_command
    threading.Thread(
        target=call_command,
        args=("run_local_worker",),
        daemon=True,
    ).start()


def main() -> None:
    data_dir = _get_data_dir()
    print(f"[mallor] Directorio de datos: {data_dir}", flush=True)
    _configure_env(data_dir)
    _setup_django()
    _run_migrations()
    _seed_superuser()
    _start_worker()

    from waitress import serve
    from config.wsgi import application  # noqa: F401 — triggers get_wsgi_application()

    print("[mallor] Servidor iniciado en http://localhost:8765", flush=True)
    serve(application, host="127.0.0.1", port=8765, threads=4)


if __name__ == "__main__":
    main()
