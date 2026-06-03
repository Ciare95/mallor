import { Suspense, lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import RoleRoute from '../components/RoleRoute';

const LoginPage = lazy(() => import('../pages/LoginPage'));
const HomePage = lazy(() => import('../pages/HomePage'));
const AboutPage = lazy(() => import('../pages/AboutPage'));
const UsuariosPage = lazy(() => import('../pages/usuarios/UsuariosPage'));
const MiEmpresaPage = lazy(() => import('../pages/MiEmpresaPage'));
const MiEmpresaConfiguracionPage = lazy(() => import('../pages/MiEmpresaConfiguracionPage'));
const EmpresasAdminPage = lazy(() => import('../pages/EmpresasAdminPage'));
const ProductosPage = lazy(() => import('../pages/inventario/ProductosPage'));
const VentasPage = lazy(() => import('../pages/ventas/VentasPage'));
const ClientesPage = lazy(() => import('../pages/clientes/ClientesPage'));
const ContadoresPage = lazy(() => import('../pages/contadores/ContadoresPage'));
const FacturacionPage = lazy(() => import('../pages/facturacion/FacturacionPage'));
const ProveedoresPage = lazy(() => import('../pages/proveedores/ProveedoresPage'));
const FabricantePage = lazy(() => import('../pages/fabricante/FabricantePage'));
const DashboardInformesPage = lazy(() => import('../pages/informes/DashboardPage'));
const CierresCajaPage = lazy(() => import('../pages/informes/CierresCajaPage'));
const ReportesPage = lazy(() => import('../pages/informes/ReportesPage'));
const IAPage = lazy(() => import('../pages/ia/IAPage'));

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
    path: '/login',
    element: withSuspense(LoginPage),
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          {
            index: true,
            element: (
              <RoleRoute route="home">
                {withSuspense(HomePage)}
              </RoleRoute>
            ),
          },
          { path: 'about', element: withSuspense(AboutPage) },
          {
            path: 'usuarios',
            element: (
              <RoleRoute route="usuarios">
                {withSuspense(UsuariosPage)}
              </RoleRoute>
            ),
          },
          { path: 'mi-empresa', element: withSuspense(MiEmpresaPage) },
          {
            path: 'mi-empresa/configuracion',
            element: withSuspense(MiEmpresaConfiguracionPage),
          },
          {
            path: 'empresas-admin',
            element: (
              <RoleRoute route="empresas-admin">
                {withSuspense(EmpresasAdminPage)}
              </RoleRoute>
            ),
          },
          { path: 'inventario', element: withSuspense(ProductosPage) },
          { path: 'ventas', element: withSuspense(VentasPage) },
          { path: 'clientes', element: withSuspense(ClientesPage) },
          {
            path: 'facturacion',
            element: (
              <RoleRoute route="facturacion">
                {withSuspense(FacturacionPage)}
              </RoleRoute>
            ),
          },
          {
            path: 'contadores',
            element: (
              <RoleRoute route="contadores">
                {withSuspense(ContadoresPage)}
              </RoleRoute>
            ),
          },
          { path: 'proveedores', element: withSuspense(ProveedoresPage) },
          {
            path: 'fabricante',
            element: (
              <RoleRoute route="fabricante">
                {withSuspense(FabricantePage)}
              </RoleRoute>
            ),
          },
          {
            path: 'informes',
            element: (
              <RoleRoute route="informes">
                {withSuspense(DashboardInformesPage)}
              </RoleRoute>
            ),
          },
          {
            path: 'informes/cierres',
            element: (
              <RoleRoute route="informes">
                {withSuspense(CierresCajaPage)}
              </RoleRoute>
            ),
          },
          {
            path: 'informes/reportes',
            element: (
              <RoleRoute route="informes">
                {withSuspense(ReportesPage)}
              </RoleRoute>
            ),
          },
          {
            path: 'ia',
            element: (
              <RoleRoute route="ia">
                {withSuspense(IAPage)}
              </RoleRoute>
            ),
          },
        ],
      },
    ],
  },
]);
