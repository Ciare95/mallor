import { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';

const HomePage = lazy(() => import('../pages/HomePage'));
const AboutPage = lazy(() => import('../pages/AboutPage'));
const UsuariosPage = lazy(() => import('../pages/usuarios/UsuariosPage'));
const MiEmpresaPage = lazy(() => import('../pages/MiEmpresaPage'));
const EmpresasAdminPage = lazy(() => import('../pages/EmpresasAdminPage'));
const ProductosPage = lazy(() => import('../pages/inventario/ProductosPage'));
const VentasPage = lazy(() => import('../pages/ventas/VentasPage'));
const ClientesPage = lazy(() => import('../pages/clientes/ClientesPage'));
const FacturacionPage = lazy(() => import('../pages/facturacion/FacturacionPage'));
const ProveedoresPage = lazy(() => import('../pages/proveedores/ProveedoresPage'));
const FabricantePage = lazy(() => import('../pages/fabricante/FabricantePage'));
const DashboardInformesPage = lazy(() => import('../pages/informes/DashboardPage'));
const CierresCajaPage = lazy(() => import('../pages/informes/CierresCajaPage'));
const ReportesPage = lazy(() => import('../pages/informes/ReportesPage'));

function withSuspense(Component) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[45vh] w-full max-w-[1600px] items-center justify-center px-4 py-10 sm:px-6 xl:px-8">
          <div className="rounded-2xl border border-app bg-panel/85 px-6 py-4 text-sm font-semibold text-soft">
            Cargando modulo...
          </div>
        </div>
      }
    >
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: withSuspense(HomePage),
      },
      {
        path: 'about',
        element: withSuspense(AboutPage),
      },
      {
        path: 'usuarios',
        element: withSuspense(UsuariosPage),
      },
      {
        path: 'mi-empresa',
        element: withSuspense(MiEmpresaPage),
      },
      {
        path: 'empresas-admin',
        element: withSuspense(EmpresasAdminPage),
      },
      {
        path: 'inventario',
        element: withSuspense(ProductosPage),
      },
      {
        path: 'ventas',
        element: withSuspense(VentasPage),
      },
      {
        path: 'clientes',
        element: withSuspense(ClientesPage),
      },
      {
        path: 'facturacion',
        element: withSuspense(FacturacionPage),
      },
      {
        path: 'proveedores',
        element: withSuspense(ProveedoresPage),
      },
      {
        path: 'fabricante',
        element: withSuspense(FabricantePage),
      },
      {
        path: 'informes',
        element: withSuspense(DashboardInformesPage),
      },
      {
        path: 'informes/cierres',
        element: withSuspense(CierresCajaPage),
      },
      {
        path: 'informes/reportes',
        element: withSuspense(ReportesPage),
      },
    ],
  },
]);
