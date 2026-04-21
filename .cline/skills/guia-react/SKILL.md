---
name: guia-react
description: Guía de estilo React basada en Airbnb para el proyecto Mallor.
license: Complete terms in LICENSE.txt
---

# Guía React - Airbnb Style Guide

Este skill proporciona las mejores prácticas y guía de estilo para React basado en el Airbnb React/JSX Style Guide.

## Propósito
Asegurar que todo el código React del proyecto Mallor siga las convenciones de estilo de Airbnb para mantener consistencia y calidad.

## Cuándo usar este skill
- Al crear nuevos componentes React
- Al revisar código React existente
- Al refactorizar componentes
- Al implementar nuevas funcionalidades en el frontend

## Reglas Principales de React/JSX - Airbnb

### 1. Estructura Básica

#### Extensiones de archivo
- Usa `.jsx` para archivos con JSX
- Usa `.js` para JavaScript puro
```jsx
// ✓ Correcto
// Button.jsx
export default function Button() {
  return <button>Click me</button>;
}
```

#### Naming Conventions
- **Componentes**: PascalCase
- **Instancias**: camelCase
- **Props**: camelCase
```jsx
// ✓ Correcto
import ProductCard from './ProductCard';

function ProductList() {
  const productCard = <ProductCard />;
  return productCard;
}
```

### 2. Componentes

#### Preferir Function Components con Hooks
```jsx
// ✓ Correcto
function ProductCard({ name, price }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="product-card">
      <h3>{name}</h3>
      <p>${price}</p>
    </div>
  );
}

// ✗ Evitar Class Components a menos que sea necesario
class ProductCard extends React.Component {
  render() {
    return <div>{this.props.name}</div>;
  }
}
```

#### Orden de métodos/funciones en componentes
```jsx
function MyComponent({ items }) {
  // 1. Hooks
  const [count, setCount] = useState(0);
  const [data, setData] = useState([]);

  useEffect(() => {
    // Effect logic
  }, []);

  // 2. Event handlers
  const handleClick = () => {
    setCount(count + 1);
  };

  // 3. Helper functions
  const processData = (item) => {
    return item.value * 2;
  };

  // 4. Early returns
  if (!items) return null;

  // 5. Render
  return (
    <div onClick={handleClick}>
      {items.map(item => (
        <span key={item.id}>{processData(item)}</span>
      ))}
    </div>
  );
}
```

### 3. Props

#### Naming
```jsx
// ✓ Correcto
<MyComponent
  userName="John"
  phoneNumber="123-456"
  isActive={true}
  onClick={handleClick}
/>

// ✗ Evitar nombres ambiguos
<MyComponent
  user="John"
  phone="123-456"
  active={true}
  click={handleClick}
/>
```

#### Destructuring
```jsx
// ✓ Correcto - Destructuring en parámetros
function ProductCard({ name, price, isAvailable }) {
  return <div>{name} - ${price}</div>;
}

// ✗ Evitar usar props directamente
function ProductCard(props) {
  return <div>{props.name} - ${props.price}</div>;
}
```

#### PropTypes o TypeScript
```jsx
// Con PropTypes
import PropTypes from 'prop-types';

ProductCard.propTypes = {
  name: PropTypes.string.isRequired,
  price: PropTypes.number.isRequired,
  isAvailable: PropTypes.bool,
  onAddToCart: PropTypes.func,
};

ProductCard.defaultProps = {
  isAvailable: true,
  onAddToCart: () => {},
};
```

### 4. JSX

#### Paréntesis para JSX multilínea
```jsx
// ✓ Correcto
return (
  <div className="container">
    <h1>Title</h1>
    <p>Content</p>
  </div>
);

// ✗ Evitar sin paréntesis
return <div className="container">
  <h1>Title</h1>
  <p>Content</p>
</div>;
```

#### Auto-closing tags
```jsx
// ✓ Correcto
<img src="photo.jpg" alt="Photo" />
<input type="text" />

// ✗ Evitar
<img src="photo.jpg" alt="Photo"></img>
```

#### Props en múltiples líneas
```jsx
// ✓ Correcto - Un prop por línea cuando son muchos
<MyComponent
  variant="primary"
  size="large"
  onClick={handleClick}
  disabled={isDisabled}
/>

// ✓ Correcto - Una línea cuando son pocos
<MyComponent variant="primary" size="large" />
```

### 5. Keys en Listas

```jsx
// ✓ Correcto - ID único
products.map(product => (
  <ProductCard key={product.id} {...product} />
))

// ✗ Evitar index como key
products.map((product, index) => (
  <ProductCard key={index} {...product} />
))
```

### 6. Refs

```jsx
// ✓ Correcto - useRef Hook
function TextInput() {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} />;
}
```

### 7. Conditional Rendering

```jsx
// ✓ Correcto - Ternario para if-else
return isLoading ? <Spinner /> : <Content />;

// ✓ Correcto - && para if simple
return isVisible && <Modal />;

// ✓ Correcto - Early return
function ProductCard({ product }) {
  if (!product) return null;

  return <div>{product.name}</div>;
}

// ✗ Evitar lógica compleja en JSX
return (
  <div>
    {isLoading ? (
      isError ? <Error /> : <Loading />
    ) : (
      data ? <Content data={data} /> : <Empty />
    )}
  </div>
);

// ✓ Mejor - Extraer lógica
function ProductCard({ isLoading, isError, data }) {
  if (isLoading) return <Loading />;
  if (isError) return <Error />;
  if (!data) return <Empty />;

  return <Content data={data} />;
}
```

### 8. Event Handlers

```jsx
// ✓ Correcto - Prefijo handle para handlers
function ProductForm() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit logic
  };

  const handleInputChange = (e) => {
    setValue(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleInputChange} />
    </form>
  );
}
```

### 9. Custom Hooks

```jsx
// ✓ Correcto - Prefijo use
function useProductData(productId) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchProduct(productId)
      .then(setProduct)
      .finally(() => setLoading(false));
  }, [productId]);

  return { product, loading };
}
```

### 10. Organización de Archivos

```
src/
├── components/
│   ├── common/          # Componentes reutilizables
│   │   ├── Button/
│   │   │   ├── Button.jsx
│   │   │   ├── Button.test.jsx
│   │   │   └── Button.module.css
│   │   └── Input/
│   ├── layout/          # Componentes de layout
│   │   ├── Header/
│   │   └── Footer/
│   └── features/        # Componentes por funcionalidad
│       ├── products/
│       └── sales/
├── hooks/               # Custom hooks
│   ├── useProductData.js
│   └── useAuth.js
├── services/            # API calls
│   ├── api.js
│   └── productService.js
├── utils/               # Utilidades
│   └── formatters.js
└── pages/               # Páginas/Vistas principales
    ├── Home.jsx
    └── Products.jsx
```

## Ejemplo Completo de Componente

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { fetchProducts } from '../services/productService';
import ProductCard from './ProductCard';
import LoadingSpinner from './LoadingSpinner';
import './ProductList.css';

/**
 * Componente que muestra una lista de productos
 * @param {Object} props - Props del componente
 * @param {string} props.category - Categoría de productos a mostrar
 * @param {Function} props.onProductSelect - Callback cuando se selecciona un producto
 */
function ProductList({ category, onProductSelect }) {
  // 1. State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 2. Effects
  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchProducts(category);
        if (isMounted) {
          setProducts(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [category]);

  // 3. Event handlers
  const handleProductClick = useCallback((product) => {
    onProductSelect(product);
  }, [onProductSelect]);

  // 4. Early returns
  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error">Error: {error}</div>;
  if (products.length === 0) return <div>No hay productos disponibles</div>;

  // 5. Render
  return (
    <div className="product-list">
      <h2 className="product-list__title">
        Productos de {category}
      </h2>
      <div className="product-list__grid">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={handleProductClick}
          />
        ))}
      </div>
    </div>
  );
}

ProductList.propTypes = {
  category: PropTypes.string.isRequired,
  onProductSelect: PropTypes.func,
};

ProductList.defaultProps = {
  onProductSelect: () => {},
};

export default ProductList;
```

## Referencias

- [Airbnb React/JSX Style Guide](https://github.com/airbnb/javascript/tree/master/react)
- [React Documentation](https://react.dev/)
- [React Hooks Best Practices](https://react.dev/reference/react)

## Notas para Mallor

- Aplicar estas reglas en todos los componentes React del frontend
- Revisar código existente durante refactorización
- Usar ESLint con configuración de Airbnb para automatizar validación
- Priorizar componentes funcionales con Hooks sobre Class Components
- Mantener componentes pequeños y enfocados en una sola responsabilidad
