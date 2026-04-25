import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import HomePage from '../pages/HomePage';
import AboutPage from '../pages/AboutPage';
import UsuariosPage from '../pages/usuarios/UsuariosPage';
import ProductosPage from '../pages/inventario/ProductosPage';
import VentasPage from '../pages/ventas/VentasPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'about',
        element: <AboutPage />,
      },
      {
        path: 'usuarios',
        element: <UsuariosPage />,
      },
      {
        path: 'inventario',
        element: <ProductosPage />,
      },
      {
        path: 'ventas',
        element: <VentasPage />,
      },
    ],
  },
]);
