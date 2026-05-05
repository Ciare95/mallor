# Multitenant Factus en Mallor

## Resumen
Mallor usa un modelo multitenant de una sola base de datos con `empresa_id` en las entidades operativas principales. Cada `Empresa` representa un facturador independiente ante DIAN/Factus, con su propio NIT, usuarios, configuracion fiscal, rangos y documentos electronicos.

## Flujo Operativo
1. Crear o migrar una `Empresa`.
2. Asociar usuarios mediante `EmpresaUsuario`.
3. Seleccionar empresa activa desde `/api/empresas/seleccionar/` o enviando `X-Empresa-Id`.
4. Configurar Factus por empresa en `/api/empresas/{id}/facturacion/configuracion/`.
5. Guardar credenciales Factus por empresa/ambiente en `/api/empresas/{id}/facturacion/credenciales/`.
6. Sincronizar rangos desde el modulo de facturacion.
7. Emitir ventas de la empresa activa usando sus credenciales y rangos.

## Endpoints
- `GET /api/empresas/`: lista empresas disponibles para el usuario autenticado.
- `POST /api/empresas/seleccionar/`: selecciona empresa activa en sesion.
- `PATCH /api/empresas/{id}/`: actualiza datos basicos de empresa.
- `GET/PATCH /api/empresas/{id}/facturacion/configuracion/`: administra configuracion Factus funcional.
- `GET/POST/PATCH /api/empresas/{id}/facturacion/credenciales/`: administra credenciales Factus por ambiente.

## Reglas De Aislamiento
- Las ventas, clientes, proveedores, inventario, informes y documentos Factus se filtran por empresa activa.
- Los consecutivos internos de venta son unicos por empresa.
- Los rangos Factus son unicos por empresa y `factus_id`.
- La cache OAuth de Factus se separa por URL, `client_id` y usuario Factus.
- Si una empresa no tiene credenciales Factus propias, el adaptador usa `FACTUS_*` de `.env` como fallback de desarrollo.

## Migracion Inicial
La migracion `empresa.0002_backfill_empresa_principal` crea `Empresa Principal`, asocia usuarios existentes y rellena `empresa_id` en datos historicos. Esto mantiene compatibilidad con instalaciones existentes antes de activar multiples empresas.

## Pendientes Recomendados
- Cifrar credenciales Factus en base de datos o moverlas a un gestor de secretos.
- Extender aislamiento a modulos premium no incluidos en la primera fase.
- Agregar pruebas especificas de acceso cruzado entre empresas para todos los endpoints.
- Dividir el bundle frontend con lazy loading para reducir el warning de Vite por chunk grande.
