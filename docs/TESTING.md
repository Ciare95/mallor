# Testing y Calidad en Mallor

Mallor usa una sola base de datos con aislamiento por `empresa_id`. Toda prueba sensible debe validar empresa activa, rol efectivo en `EmpresaUsuario` y ausencia de datos cross-tenant.

## Backend

Instalacion:

```bash
python -m pip install -r requirements.txt
```

Checks base:

```bash
python manage.py check --settings=config.settings_test
python manage.py makemigrations --check --dry-run --settings=config.settings_test
```

Suite:

```bash
python -m pytest
python -m pytest -m multitenant
python -m pytest -m ia
python -m pytest -m factus
python -m pytest --cov --cov-report=term-missing
python -m coverage report --include="empresa/services.py,empresa/middleware.py,empresa/views.py" --fail-under=66
python -m coverage report --include="IA/context.py,IA/services.py,IA/tools.py,IA/views.py" --fail-under=74
python -m coverage report --include="informes/services.py,informes/views.py" --fail-under=42
python -m coverage report --include="inventario/services.py,usuario/services.py,usuario/views.py" --fail-under=44
python -m coverage report --include="ventas/facturacion_services.py,ventas/security.py" --fail-under=69
```

Markers disponibles:

- `unit`: modelos, serializers y funciones aisladas.
- `integration`: services, views y endpoints DRF.
- `multitenant`: aislamiento por empresa, middleware y permisos efectivos.
- `ia`: modulo IA seguro, tools, historial, feedback y fallback local.
- `factus`: facturacion electronica con `FactusAdapter` mockeado.
- `smoke`: flujos criticos mínimos.

## Convenciones Backend

- Mantener tests existentes con `django.test.TestCase`; pytest es el runner, no obliga a reescribir todo.
- Usar factories de `tests/factories.py` para evitar datos globales compartidos.
- Todo test sensible debe crear al menos `empresa_a` y `empresa_b`.
- Todo endpoint probado debe enviar `X-Empresa-Id` cuando la empresa activa sea relevante.
- Services que no reciben request deben ejecutarse dentro de `empresa_context(empresa)`.
- Factus, DeepSeek y servicios externos siempre se mockean en tests y CI.

## Frontend

Instalacion:

```bash
cd frontend
npm ci
```

Checks:

```bash
npm run lint
npm run test -- --run
npm run test:coverage
npm run build
```

Convenciones:

- Probar `frontend/src`, no `dist`, `.vite`, `coverage` ni dependencias.
- Evitar snapshots grandes.
- No probar estilos Tailwind salvo que el estilo sea un estado funcional.
- Probar headers en `api.js`, estado global en Zustand, navegacion por rol y modulo IA.
- Al cambiar empresa activa, debe limpiarse sesion IA y estado sensible.
- `vitest` aplica un gate de cobertura solo sobre la superficie critica del shell SPA, services de tenant/IA y store global.

## CI

El workflow `.github/workflows/tests.yml` ejecuta:

- PostgreSQL service.
- `manage.py check`.
- `makemigrations --check --dry-run`.
- pytest completo y markers criticos.
- gates de cobertura backend por grupos criticos: empresa, IA, informes, inventario/usuario y Factus.
- lint, Vitest, coverage y build del frontend.

Playwright no se ejecuta contra sitios externos. Si se activa E2E, debe apuntar a Mallor local con backend/frontend levantados por el workflow.

## Limpieza Tecnica

No deben versionarse outputs generados:

- `informes/pdfs/*`
- `informes/excel/*`
- `productos/*` generado por uploads locales
- `frontend/dist`, `.vite`, `coverage`

`example_code/` fue eliminado del repositorio porque solo aportaba referencia historica y aumentaba ruido de mantenimiento, lint y cobertura.
