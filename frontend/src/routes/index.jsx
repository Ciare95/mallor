import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import HomePage from '../pages/HomePage';
import AboutPage from '../pages/AboutPage';
import UsuariosPage from '../pages/usuarios/UsuariosPage';
import ProductosPage from '../pages/inventario/ProductosPage';
import VentasPage from '../pages/ventas/VentasPage';
import ClientesPage from '../pages/clientes/ClientesPage';
import ProveedoresPage from '../pages/proveedores/ProveedoresPage';
import FabricantePage from '../pages/fabricante/FabricantePage';
import DashboardInformesPage from '../pages/informes/DashboardPage';
import CierresCajaPage from '../pages/informes/CierresCajaPage';
import ReportesPage from '../pages/informes/ReportesPage';

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
      {
        path: 'clientes',
        element: <ClientesPage />,
      },
      {
        path: 'proveedores',
        element: <ProveedoresPage />,
      },
      {
        path: 'fabricante',
        element: <FabricantePage />,
      },
      {
        path: 'informes',
        element: <DashboardInformesPage />,
      },
      {
        path: 'informes/cierres',
        element: <CierresCajaPage />,
      },
      {
        path: 'informes/reportes',
        element: <ReportesPage />,
      },
    ],
  },
]);
