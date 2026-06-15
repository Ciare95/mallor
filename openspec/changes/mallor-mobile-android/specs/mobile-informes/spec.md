## ADDED Requirements

### Requirement: Dashboard de estadísticas para gerentes
La app SHALL mostrar un dashboard con métricas clave del período seleccionado, disponible únicamente para roles PROPIETARIO y ADMIN. Los datos se obtienen de `/api/informes/estadisticas/dashboard/`.

#### Scenario: Acceso permitido
- **WHEN** un usuario con rol PROPIETARIO o ADMIN navega a Informes
- **THEN** se muestra el dashboard con las métricas del día actual por defecto

#### Scenario: Acceso denegado para EMPLEADO
- **WHEN** un usuario con rol EMPLEADO intenta acceder a la ruta de informes
- **THEN** la app redirige al tab de ventas. La tab de Informes no es visible en la barra de navegación.

### Requirement: Métricas del dashboard
El dashboard SHALL mostrar como mínimo: total de ventas del período, número de transacciones, ticket promedio, y top 5 productos más vendidos. Sin cards decorativas ni texto explicativo entre secciones.

#### Scenario: Carga de métricas
- **WHEN** el dashboard se abre o el período cambia
- **THEN** se muestran las métricas actualizadas. Durante la carga se muestra un skeleton de la misma estructura, no un spinner centrado.

#### Scenario: Error de carga
- **WHEN** la API retorna error
- **THEN** se muestra un mensaje de error con botón "Reintentar" en el lugar del contenido, sin pantalla de error separada

### Requirement: Filtro por período
El dashboard SHALL permitir filtrar por: Hoy, Esta semana, Este mes, y rango personalizado (fecha inicio / fecha fin).

#### Scenario: Cambio de período
- **WHEN** el usuario selecciona un período diferente
- **THEN** todas las métricas se actualizan automáticamente con los datos del nuevo período

#### Scenario: Rango personalizado
- **WHEN** el usuario selecciona "Personalizado"
- **THEN** aparecen dos date pickers nativos para fecha inicio y fecha fin; al confirmar, el dashboard se actualiza
