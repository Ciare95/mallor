# Guía de Contribución — Mallor

¡Gracias por tu interés en contribuir a **Mallor**! Esta guía describe el flujo de trabajo, estándares de código y convenciones que seguimos en el proyecto.

## Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Flujo de Trabajo con Git](#flujo-de-trabajo-con-git)
- [Convenciones de Commits](#convenciones-de-commits)
- [Estándares de Código](#estándares-de-código)
  - [Backend (Python / Django)](#backend-python--django)
  - [Frontend (React / JavaScript)](#frontend-react--javascript)
- [Principios SOLID](#principios-solid)
- [Arquitectura de Capas](#arquitectura-de-capas)
- [Testing](#testing)
- [Pull Requests](#pull-requests)
- [Reporte de Bugs](#reporte-de-bugs)
- [Recursos](#recursos)

---

## Código de Conducta

- Sé respetuoso y profesional en todas las interacciones.
- Acepta críticas constructivas con apertura.
- Prioriza la calidad del producto sobre preferencias personales.
- Comunica en **español** dentro del repositorio (código en inglés cuando aplique).

---

## Flujo de Trabajo con Git

El proyecto sigue una estrategia de ramas basada en **Git Flow simplificado**.

### Ramas principales

| Rama       | Propósito                                         |
|------------|---------------------------------------------------|
| `main`     | Código en producción. Protegida, solo merges desde `develop`. |
| `develop`  | Rama de integración de features. Base para nuevas ramas. |

### Ramas de trabajo

| Prefijo       | Uso                              | Ejemplo                          |
|---------------|----------------------------------|----------------------------------|
| `feature/`    | Nuevas funcionalidades           | `feature/modulo-inventario`      |
| `fix/`        | Corrección de bugs               | `fix/calculo-total-venta`        |
| `refactor/`   | Refactorización sin cambios func.| `refactor/services-usuario`      |
| `docs/`       | Solo documentación               | `docs/actualizar-readme`         |
| `test/`       | Agregar o mejorar tests          | `test/ventas-services`           |
| `chore/`      | Tareas de mantenimiento          | `chore/actualizar-deps`          |

### Flujo estándar

```bash
# 1. Actualizar develop
git checkout develop
git pull origin develop

# 2. Crear rama de feature
git checkout -b feature/mi-nueva-funcionalidad

# 3. Trabajar y hacer commits atómicos
git add archivo.py
git commit -m "feat(inventario): agregar validación de stock"

# 4. Mantener la rama actualizada con develop
git fetch origin
git rebase origin/develop    # o: git merge origin/develop

# 5. Subir la rama
git push -u origin feature/mi-nueva-funcionalidad

# 6. Abrir Pull Request hacia develop
```

---

## Convenciones de Commits

Seguimos [**Conventional Commits**](https://www.conventionalcommits.org/).

### Formato

```
<tipo>(<ámbito opcional>): <descripción corta en minúscula>

[cuerpo opcional]

[footer opcional]
```

### Tipos permitidos

| Tipo       | Uso                                                  |
|------------|------------------------------------------------------|
| `feat`     | Nueva funcionalidad                                  |
| `fix`      | Corrección de bug                                    |
| `docs`     | Cambios en documentación                             |
| `style`    | Formato, espacios, punto y coma (no afecta lógica)   |
| `refactor` | Refactorización sin cambiar comportamiento           |
| `perf`     | Mejora de rendimiento                                |
| `test`     | Agregar o corregir tests                             |
| `chore`    | Tareas de build, dependencias, config                |
| `ci`       | Cambios en integración continua                      |
| `build`    | Cambios en sistema de build                          |

### Ámbitos sugeridos

`usuario`, `inventario`, `ventas`, `cliente`, `proveedor`, `fabricante`, `informes`, `ia`, `config`, `frontend`, `backend`, `docs`.

### Ejemplos

```
feat(ventas): implementar registro de abonos parciales
fix(inventario): corregir cálculo de precio con IVA y transporte
docs(readme): actualizar sección de instalación
refactor(usuario): extraer validación de permisos a utils
test(cliente): agregar tests para validar documento único
chore(deps): actualizar Django a 4.2.10
```

### Reglas

- Descripción ≤ **72 caracteres**, en imperativo, sin punto final.
- Usa el cuerpo para explicar **el porqué**, no el qué.
- Un commit = un cambio lógico atómico.

---

## Estándares de Código

### Backend (Python / Django)

Seguimos [**PEP 8**](https://peps.python.org/pep-0008/).

**Reglas clave:**

- Indentación: **4 espacios** (no tabs).
- Longitud máxima de línea: **79 caracteres** (docstrings/comentarios: 72).
- Nombres:
  - `snake_case` para funciones, variables, módulos.
  - `PascalCase` para clases.
  - `UPPER_SNAKE_CASE` para constantes.
- Imports: agrupados en tres bloques (stdlib, terceros, locales), separados por línea en blanco.
- Docstrings en funciones y clases públicas (formato Google o reStructuredText).
- Un espacio alrededor de operadores binarios.
- Dos líneas en blanco entre funciones/clases a nivel de módulo.

**Herramientas recomendadas:**

```bash
pip install black flake8 isort
black .              # formateador automático
flake8 .             # linter
isort .              # ordenar imports
```

**Ejemplo correcto:**

```python
from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from inventario.models import Producto
from usuario.utils import role_required


class VentaService:
    """Servicio con la lógica de negocio de ventas."""

    @staticmethod
    @transaction.atomic
    def crear_venta(data: dict, usuario) -> Venta:
        """Crea una venta validando stock y calculando totales.

        Args:
            data: Datos de la venta y sus detalles.
            usuario: Usuario que registra la venta.

        Returns:
            Instancia de Venta creada.

        Raises:
            ValidationError: Si no hay stock suficiente.
        """
        # ... implementación
```

### Frontend (React / JavaScript)

Seguimos la [**guía de estilo Airbnb para React**](https://github.com/airbnb/javascript/tree/master/react).

**Reglas clave:**

- Indentación: **2 espacios**.
- Usa **comillas simples** `'` para strings JS, **dobles** `"` para atributos JSX.
- Punto y coma obligatorio al final de cada sentencia.
- Nombres:
  - `PascalCase` para componentes y archivos de componentes.
  - `camelCase` para funciones, variables, hooks.
  - `UPPER_SNAKE_CASE` para constantes.
- Un componente por archivo.
- Prefiere **componentes funcionales** con hooks.
- Props desestructuradas en la firma del componente.
- `PropTypes` o TypeScript para validación (según convención del proyecto).

**Herramientas:**

```bash
npm run lint         # ESLint
npx prettier --write src/
```

**Ejemplo correcto:**

```jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productosService } from '../services/inventario.service';

function ProductosList({ categoriaId, onSelect }) {
  const [filtro, setFiltro] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['productos', categoriaId, filtro],
    queryFn: () => productosService.listar({ categoria: categoriaId, q: filtro }),
  });

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul className="divide-y divide-gray-200">
      {data.results.map((producto) => (
        <li key={producto.id} onClick={() => onSelect(producto)}>
          {producto.nombre}
        </li>
      ))}
    </ul>
  );
}

export default ProductosList;
```

---

## Principios SOLID

Aplicamos SOLID especialmente en la **capa de servicios**:

- **S** — *Single Responsibility*: cada clase/función tiene una única razón para cambiar.
- **O** — *Open/Closed*: abierto a extensión, cerrado a modificación.
- **L** — *Liskov Substitution*: subclases deben ser sustituibles por su base.
- **I** — *Interface Segregation*: interfaces específicas mejor que una genérica.
- **D** — *Dependency Inversion*: depende de abstracciones, no de implementaciones.

Referencia: [SOLID en Python](https://softwarecrafters.io/python/principios-solid-python).

---

## Arquitectura de Capas

El backend sigue una arquitectura de capas estricta. **Respetar el flujo de dependencias**:

```
Views  →  Serializers  →  Services  →  Models
```

### Responsabilidades

| Capa          | Responsabilidad                                        | NO debe hacer                          |
|---------------|--------------------------------------------------------|----------------------------------------|
| `views.py`    | Recibir request, validar auth/permisos, delegar        | Contener lógica de negocio             |
| `serializers.py` | Transformar JSON ↔ objetos, validación de formato   | Ejecutar reglas de negocio complejas   |
| `services.py` | Lógica de negocio, cálculos, transacciones            | Acceder a request/response             |
| `models.py`   | Definir datos, métodos del dominio, queries básicas    | Contener lógica de APIs/HTTP           |
| `utils.py`    | Funciones auxiliares reutilizables                     | Acceso a BD o lógica específica        |

### Regla de oro

> **Las views NUNCA acceden directamente a los models.** Siempre pasan por los services.

---

## Testing

Usamos **Django Test Framework** (o pytest).

### Estructura

```
app/
├── tests/
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_serializers.py
│   ├── test_services.py
│   └── test_views.py
```

### Ejecutar tests

```bash
python manage.py test                    # todos
python manage.py test inventario         # una app
python manage.py test inventario.tests.test_services  # un módulo
python manage.py test --verbosity=2      # detallado
```

### Buenas prácticas

- Un test = un escenario.
- Nombres descriptivos: `test_crear_venta_falla_sin_stock_suficiente`.
- Usa factories (`factory_boy`) para datos de prueba.
- Cobertura objetivo: **≥ 80%** en services y models.

---

## Pull Requests

### Antes de abrir el PR

- [ ] El código sigue los estándares de estilo (lint pasa).
- [ ] Tests nuevos cubren la funcionalidad añadida.
- [ ] Todos los tests pasan localmente.
- [ ] La rama está actualizada con `develop`.
- [ ] Commits siguen Conventional Commits.
- [ ] Documentación actualizada si aplica.

### Plantilla de PR

```markdown
## Descripción
Breve descripción del cambio y su motivación.

## Tipo de cambio
- [ ] Bug fix
- [ ] Nueva funcionalidad
- [ ] Breaking change
- [ ] Refactorización
- [ ] Documentación

## Tarea relacionada
Cierra #<número> — Tarea X.Y del plan Kanban.

## Checklist
- [ ] Tests añadidos/actualizados
- [ ] Lint pasa sin errores
- [ ] Documentación actualizada
- [ ] Revisado localmente
```

### Proceso de revisión

1. Al menos **1 aprobación** antes de merge.
2. Resolver todos los comentarios.
3. Merge mediante **Squash and Merge** a `develop`.
4. Eliminar la rama después del merge.

---

## Reporte de Bugs

Al reportar un bug, incluye:

- **Descripción clara** del problema.
- **Pasos para reproducir**.
- **Comportamiento esperado** vs **actual**.
- **Entorno**: SO, versión de Python/Node, navegador.
- **Capturas o logs** si aplica.

---

## Recursos

### Guías de estilo

- [PEP 8 — Python](https://peps.python.org/pep-0008/)
- [Airbnb JavaScript / React Style Guide](https://github.com/airbnb/javascript/tree/master/react)
- [SOLID en Python](https://softwarecrafters.io/python/principios-solid-python)
- [Conventional Commits](https://www.conventionalcommits.org/)

### Documentación del proyecto

- [README.md](./README.md)
- [INSTALL.md](./INSTALL.md)
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [DOCUMENTACION_REQUISITOS.md](./DOCUMENTACION_REQUISITOS.md)
- [tareas.md](./tareas.md)

### Documentación externa

- [Django](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Factus API](https://developers.factus.com.co/)

---

*Gracias por contribuir a Mallor — juntos construimos un mejor sistema de gestión para PYMEs.*
