# Multitenant Factus en Mallor

## Resumen
Mallor opera como SaaS multitenant con una sola base de datos. Cada
`Empresa` es un tenant/facturador independiente y todas las entidades
operativas deben resolverse contra la empresa activa mediante `empresa_id`.

Cada empresa tiene sus propios usuarios, clientes, inventario, ventas,
reportes, credenciales Factus, rangos Factus y documentos electronicos. El
PDF oficial de factura electronica sigue viniendo de Factus; Mallor usa los
datos de `Empresa` para documentos locales, tickets, reportes propios y
validaciones operativas.

## Politica De Onboarding
En esta fase el alta es administrada por Mallor. No hay autoregistro publico.

1. El cliente solicita acceso.
2. Un superusuario o usuario `is_staff` de Mallor crea la empresa desde la
   pantalla interna `Empresas SaaS` o desde los endpoints administrativos.
3. El administrador interno crea o asocia el primer usuario.
4. Ese usuario queda asociado a la empresa como `PROPIETARIO`.
5. El propietario inicia sesion con la autenticacion actual del proyecto.
6. El propietario completa datos fiscales, configura Factus sandbox, sincroniza
   rangos y opera clientes, productos, ventas y facturacion.

El autoregistro, JWT publico, verificacion de correo, recuperacion de cuenta,
planes, pagos y reglas antiabuso quedan fuera del alcance de EPICA 9.5.

## Modelo De Datos
- `Empresa`: raiz fiscal y operativa del tenant. Contiene NIT, DV, razon
  social, nombre comercial, contacto, municipio, ambiente de facturacion y
  estado activo/inactivo.
- `EmpresaUsuario`: membresia entre usuario y empresa. Un usuario puede
  pertenecer a varias empresas con roles distintos.
- Entidades operativas: clientes, proveedores, inventario, ventas, cierres,
  informes, credenciales Factus, rangos y documentos electronicos mantienen
  `empresa_id`.

## Roles Por Empresa
- `PROPIETARIO`: controla datos de empresa, usuarios, Factus y datos fiscales.
- `ADMIN`: administra operacion, usuarios y Factus, excepto reglas reservadas
  al propietario como editar NIT.
- `EMPLEADO`: opera ventas, inventario y consultas permitidas. No administra
  datos fiscales, usuarios ni configuracion Factus.

Los permisos efectivos dependen del rol en `EmpresaUsuario` para la empresa
activa. El rol global de `Usuario` no debe usarse para romper aislamiento entre
tenants. Los superusuarios y usuarios `is_staff` son administradores internos de
Mallor para el alta SaaS.

## Seleccion De Empresa Activa
La empresa activa se resuelve en `EmpresaActivaMiddleware`:

1. Header `X-Empresa-Id`.
2. Sesion `empresa_activa_id`.
3. Primera empresa activa disponible para el usuario.

Si el usuario no pertenece a la empresa solicitada, o la empresa esta inactiva,
la API debe responder 403. El frontend guarda la seleccion en
`mallor_empresa_activa_id` y la envia como header.

## Endpoints Principales
- `GET /api/empresas/`: empresas activas disponibles para el usuario.
- `POST /api/empresas/seleccionar/`: selecciona empresa activa.
- `GET/PATCH /api/empresas/{id}/`: consulta/edita datos de la empresa.
- `GET/POST /api/empresas/admin/`: alta/listado interno de empresas SaaS.
- `GET/PATCH /api/empresas/admin/{id}/`: administracion interna de empresa.
- `GET/POST /api/empresas/{id}/usuarios/`: membresias de la empresa.
- `PATCH /api/empresas/{id}/usuarios/{membresia_id}/`: cambia rol o estado.
- `GET/PATCH /api/empresas/{id}/facturacion/configuracion/`: configuracion
  Factus por empresa.
- `GET/POST/PATCH /api/empresas/{id}/facturacion/credenciales/`: credenciales
  Factus por empresa/ambiente.
- `GET/POST/PATCH /api/facturacion/*`: operaciones de Factus siempre sobre la
  empresa activa.

## Reglas De Aislamiento
- Querysets operativos filtran por empresa activa.
- Clientes, productos y ventas de otra empresa deben responder 404 o 403.
- PDF/XML de documentos electronicos se obtienen solo si el documento pertenece
  a la empresa activa.
- Informes persistidos y reportes agregados filtran por empresa activa.
- Los consecutivos internos de venta son unicos por empresa.
- Los rangos Factus son unicos por `empresa + factus_id`.
- Las credenciales Factus son write-only para secretos y se exponen solo como
  flags/masked values.
- Una empresa inactiva no puede crear ventas ni operar facturacion.

## Configuracion Factus Por Empresa
1. Entrar como `PROPIETARIO` o `ADMIN`.
2. Abrir `Mi empresa` y validar datos fiscales/comerciales.
3. Abrir `Facturacion`.
4. Guardar credenciales sandbox en la empresa activa.
5. Validar conexion.
6. Sincronizar rangos.
7. Seleccionar rango activo de factura y, si aplica, nota credito.
8. Crear venta con `factura_electronica=true`.
9. Emitir factura y validar estado/documento.

No se deben registrar credenciales Factus en logs, respuestas de API ni UI.

## Checklist De Alta De Cliente SaaS
- [ ] Crear empresa con NIT unico.
- [ ] Crear/asociar primer usuario `PROPIETARIO`.
- [ ] Iniciar sesion como propietario.
- [ ] Confirmar que solo aparece su empresa o sus empresas autorizadas.
- [ ] Completar datos de `Mi empresa`.
- [ ] Configurar credenciales Factus sandbox.
- [ ] Validar conexion y sincronizar rangos.
- [ ] Crear cliente.
- [ ] Crear producto.
- [ ] Crear venta.
- [ ] Emitir factura electronica.
- [ ] Confirmar que otro tenant no ve cliente, producto, venta, PDF/XML ni
  configuracion Factus.

## Checklist Antes De EPICA 10
- [ ] `python manage.py makemigrations --check --dry-run`
- [ ] `python manage.py migrate`
- [ ] `python manage.py check`
- [ ] Tests de `empresa`, `usuario`, `cliente`, `inventario`, `ventas`,
  `informes`.
- [ ] `npm run build` si se toca frontend.
- [ ] Prueba manual de flujo completo con dos empresas.
- [ ] Validar que la IA futura siempre reciba contexto de empresa activa y rol
  efectivo de `EmpresaUsuario`.
