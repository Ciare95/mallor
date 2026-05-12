import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CreditCard,
  Factory,
  FileText,
  FlaskConical,
  Home,
  LogOut,
  PackageSearch,
  PieChart,
  ReceiptText,
  Sparkles,
  Settings,
  UserRound,
  Users,
} from 'lucide-react';
import { useAppStore } from '../store/useStore';
import { useAuth } from '../hooks/useAuth';
import mallorLogo from '../assets/mallor-logo.png';
import {
  listarEmpresas,
  seleccionarEmpresa,
} from '../services/empresas.service';
import {
  canAccessRoute,
  isAdminInterno,
} from '../utils/roleAccess';

export default function Layout() {
  const location = useLocation();
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const empresaActivaId = useAppStore((state) => state.empresaActivaId);
  const empresaActiva = useAppStore((state) => state.empresaActiva);
  const setEmpresaActiva = useAppStore((state) => state.setEmpresaActiva);
  const user = useAppStore((state) => state.user);
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const rolEmpresa = empresaActiva?.rol_usuario;
  const esUsuarioInterno = isAdminInterno(user);

  const empresasQuery = useQuery({
    queryKey: ['empresas'],
    queryFn: listarEmpresas,
  });

  const empresas = empresasQuery.data?.results ?? [];
  const puedeCambiarEmpresa = empresas.length > 1;

  useEffect(() => {
    const empresasDisponibles = empresasQuery.data?.results ?? [];

    if (!empresasDisponibles.length) {
      return;
    }

    const seleccionada = empresasDisponibles.find(
      (empresa) => String(empresa.id) === String(empresaActivaId),
    );
    const activaBackend = empresasDisponibles.find(
      (empresa) => empresa.id === empresasQuery.data?.empresa_activa,
    );
    setEmpresaActiva(seleccionada || activaBackend || empresasDisponibles[0]);
  }, [empresasQuery.data, empresaActivaId, setEmpresaActiva]);

  const seleccionarEmpresaMutation = useMutation({
    mutationFn: seleccionarEmpresa,
    onSuccess: (empresa) => {
      setEmpresaActiva(empresa);
      queryClient.invalidateQueries();
    },
  });

  const navItems = [
    {
      path: '/',
      label: 'Inicio',
      icon: Home,
      end: true,
      hidden: !canAccessRoute('home', { role: rolEmpresa, user }),
    },
    { path: '/ventas', label: 'Ventas', icon: CreditCard, end: false },
    { path: '/clientes', label: 'Clientes', icon: UserRound, end: false },
    {
      path: '/mi-empresa',
      label: 'Mi empresa',
      icon: Building2,
      end: false,
    },
    {
      path: '/facturacion',
      label: 'Facturacion',
      icon: ReceiptText,
      end: false,
      hidden: !canAccessRoute('facturacion', { role: rolEmpresa, user }),
    },
    { path: '/proveedores', label: 'Proveedores', icon: Factory, end: false },
    {
      path: '/fabricante',
      label: 'Fabricante',
      icon: FlaskConical,
      end: false,
      hidden: !canAccessRoute('fabricante', { role: rolEmpresa, user }),
    },
    { path: '/inventario', label: 'Inventario', icon: PackageSearch, end: false },
    {
      path: '/informes',
      label: 'Informes',
      icon: PieChart,
      end: false,
      hidden: !canAccessRoute('informes', { role: rolEmpresa, user }),
    },
    {
      path: '/ia',
      label: 'IA',
      icon: Sparkles,
      end: false,
      hidden: !canAccessRoute('ia', { role: rolEmpresa, user }),
    },
    {
      path: '/usuarios',
      label: 'Usuarios',
      icon: Users,
      end: false,
      hidden: !canAccessRoute('usuarios', { role: rolEmpresa, user }),
    },
    {
      path: '/empresas-admin',
      label: 'Empresas SaaS',
      icon: Settings,
      end: false,
      hidden: !esUsuarioInterno,
    },
    { path: '/about', label: 'Acerca', icon: FileText, end: false },
  ].filter((item) => !item.hidden);

  const pageTitle =
    navItems.find((item) =>
      item.end
        ? location.pathname === item.path
        : location.pathname.startsWith(item.path),
    )?.label || 'Mallor';

  return (
    <div className="min-h-screen bg-app text-main">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(24,23,22,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(24,23,22,0.03)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="relative flex min-h-screen">
        <aside
          className={`sticky top-0 hidden h-screen self-start border-r border-app bg-panel/90 backdrop-blur xl:flex xl:flex-col ${
            sidebarOpen ? 'xl:w-64' : 'xl:w-20'
          }`}
        >
          <div className={`border-b border-app ${sidebarOpen ? 'px-5 py-5' : 'px-2 py-4'}`}>
            <div className="flex items-center justify-center">
              <div className={`flex items-center justify-center ${
                sidebarOpen
                  ? 'w-full max-w-[104px]'
                  : 'w-9'
              }`}>
                <img
                  src={mallorLogo}
                  alt="Mallor"
                  className="h-auto w-full object-contain"
                />
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="mb-3 px-2 text-[10px] uppercase tracking-[0.28em] text-muted">
              {sidebarOpen ? 'Modulos' : 'Menu'}
            </div>
            <div className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `group flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                        isActive
                          ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-main'
                          : 'border-transparent text-soft hover:border-app hover:bg-white/60 hover:text-main'
                      }`
                    }
                    title={item.label}
                  >
                    <Icon className="h-4 w-4" />
                    {sidebarOpen && (
                      <span className="text-[13px] font-semibold">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-app px-3 py-4">
            <button
              type="button"
              onClick={toggleSidebar}
              className="app-button-secondary flex min-h-10 w-full"
            >
              {sidebarOpen ? 'Compactar' : 'Expandir'}
            </button>
          </div>
        </aside>

        <div className="relative flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-app bg-app/90 backdrop-blur">
            <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 xl:px-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="hidden h-10 w-10 items-center justify-center rounded-lg border border-app bg-white/60 text-soft transition hover:bg-white xl:flex"
                  aria-label="Alternar panel"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <div>
                  <div className="eyebrow">Mallor workspace</div>
                  <h1 className="font-display text-[1.85rem] leading-none text-main">
                    {pageTitle}
                  </h1>
                </div>
              </div>

              <div className="hidden items-center gap-3 md:flex">
                <div className="flex items-center gap-2 rounded-full border border-app bg-white/70 px-3 py-1.5">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-muted">
                    Empresa
                  </span>
                  {puedeCambiarEmpresa ? (
                    <select
                      value={empresaActiva?.id || ''}
                      onChange={(event) =>
                        seleccionarEmpresaMutation.mutate(event.target.value)
                      }
                      className="bg-transparent text-[12px] font-semibold text-main outline-none"
                      disabled={empresasQuery.isLoading}
                    >
                      {empresas.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nombre_comercial || empresa.razon_social}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[12px] font-semibold text-main">
                      {empresaActiva?.nombre_comercial
                        || empresaActiva?.razon_social
                        || 'Sin empresa'}
                    </span>
                  )}
                </div>
                <div className="app-pill border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]">
                  {rolEmpresa || 'Sin rol'}
                </div>
                <div className="app-pill">
                  {user?.username || 'Sin acceso'}
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-app bg-white/70 text-soft transition hover:bg-white"
                  title="Salir"
                  aria-label="Cerrar sesion"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto border-t border-app px-4 py-2.5 xl:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-[12px] font-semibold transition ${
                        isActive
                          ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-app bg-white/60 text-soft'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-5 sm:px-6 xl:px-8 xl:py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
