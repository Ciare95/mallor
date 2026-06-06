import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ClipboardCheck,
  CreditCard,
  Factory,
  FileText,
  FlaskConical,
  Home,
  KeyRound,
  LogOut,
  PackageSearch,
  PieChart,
  ReceiptText,
  Server,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Settings,
  UserRound,
  Users,
  WifiOff,
} from 'lucide-react';
import { useAppStore } from '../store/useStore';
import { useAuth } from '../hooks/useAuth';
import mallorLogo from '../assets/mallor-logo.png';
import mallorLogoDark from '../assets/mallor-logo-dark.png';
import {
  listarEmpresas,
  seleccionarEmpresa,
} from '../services/empresas.service';
import {
  canAccessRoute,
  isAdminInterno,
} from '../utils/roleAccess';
import { obtenerEstadoOffline } from '../services/offline.service';
import { obtenerLicencia } from '../services/licencias.service';

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
  const offlineStatusQuery = useQuery({
    queryKey: ['offline', 'status', empresaActivaId],
    queryFn: obtenerEstadoOffline,
    enabled: Boolean(empresaActivaId),
    refetchInterval: 15000,
    retry: false,
  });
  const offlineStatus = offlineStatusQuery.data;
  const isLocalMode = offlineStatus?.mode === 'local';
  const isOffline = isLocalMode && !offlineStatus?.online;

  const licenciaQuery = useQuery({
    queryKey: ['licencia-status', empresaActivaId],
    queryFn: obtenerLicencia,
    enabled: isLocalMode,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const licencia = licenciaQuery.data?.license ?? null;

  useEffect(() => {
    const empresasDisponibles = empresasQuery.data?.results ?? [];

    if (!empresasDisponibles.length) {
      return;
    }

    const seleccionada = empresasDisponibles.find(
      (empresa) => String(empresa.id) === String(empresaActivaId),
    );
    const activaSistema = empresasDisponibles.find(
      (empresa) => empresa.id === empresasQuery.data?.empresa_activa,
    );
    setEmpresaActiva(seleccionada || activaSistema || empresasDisponibles[0]);
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
    {
      path: '/contadores',
      label: 'Contadores',
      icon: ClipboardCheck,
      end: false,
      hidden: !canAccessRoute('contadores', { role: rolEmpresa, user }),
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
      hidden: !canAccessRoute('empresas-admin', { role: rolEmpresa, user }),
    },
    {
      path: '/admin/licencias',
      label: 'Licencias',
      icon: KeyRound,
      end: false,
      hidden: !canAccessRoute('admin-licencias', { role: rolEmpresa, user }),
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
      <div className="app-grid-overlay pointer-events-none absolute inset-0 opacity-70" />
      <div className="app-top-glow pointer-events-none absolute inset-x-0 top-0 h-[340px]" />
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
                <span className="theme-logo-stack">
                  <img
                    src={mallorLogo}
                    alt="Mallor"
                    className="theme-logo theme-logo-light h-auto w-full object-contain"
                  />
                  <img
                    src={mallorLogoDark}
                    alt=""
                    aria-hidden="true"
                    className="theme-logo theme-logo-dark h-auto w-full object-contain"
                  />
                </span>
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

          {isLocalMode && licencia && (
            <div className="border-t border-app px-3 py-3">
              {sidebarOpen ? (
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                    licencia.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : licencia.status === 'GRACE'
                      ? 'bg-amber-500/10 text-amber-700'
                      : 'bg-danger/10 text-danger'
                  }`}
                >
                  {licencia.status === 'ACTIVE' || licencia.status === 'GRACE' ? (
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ShieldOff className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="font-semibold">
                    Licencia{' '}
                    {licencia.status === 'ACTIVE'
                      ? 'activa'
                      : licencia.status === 'GRACE'
                      ? 'en gracia'
                      : 'inactiva'}
                  </span>
                </div>
              ) : (
                <div className="flex justify-center">
                  {licencia.status === 'ACTIVE' ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-600" title="Licencia activa" />
                  ) : (
                    <ShieldOff className="h-4 w-4 text-danger" title={`Licencia ${licencia.status}`} />
                  )}
                </div>
              )}
            </div>
          )}

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
            {isOffline && (
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-950">
                <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 text-[12px] font-semibold">
                  <span className="flex items-center gap-2">
                    <WifiOff className="h-4 w-4" />
                    Sin conexión - vendiendo localmente
                  </span>
                  <span className="hidden items-center gap-2 md:flex">
                    <Server className="h-4 w-4" />
                    {offlineStatus?.terminal?.name || 'Terminal sin asignar'}
                    {offlineStatus?.caja ? ' / caja abierta' : ' / caja cerrada'}
                  </span>
                </div>
              </div>
            )}
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
                <div className="flex items-center gap-2 rounded-full border border-app bg-panel px-3 py-1.5 shadow-[0_10px_24px_rgba(24,23,22,0.04)]">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-muted">
                    Empresa
                  </span>
                  {puedeCambiarEmpresa ? (
                    <select
                      value={empresaActiva?.id || ''}
                      onChange={(event) =>
                        seleccionarEmpresaMutation.mutate(event.target.value)
                      }
                      className="company-switcher-select bg-transparent text-[12px] font-semibold text-main outline-none"
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
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-app bg-panel text-soft transition hover:bg-panel-strong"
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
                          : 'border-app bg-panel text-soft'
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
