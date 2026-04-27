import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  Building2,
  CreditCard,
  Factory,
  FileText,
  Home,
  PackageSearch,
  Settings,
  Users,
} from 'lucide-react';
import { useAppStore } from '../store/useStore';

export default function Layout() {
  const location = useLocation();
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  const navItems = [
    { path: '/', label: 'Inicio', icon: Home, end: true },
    { path: '/ventas', label: 'Ventas', icon: CreditCard, end: false },
    { path: '/clientes', label: 'Clientes', icon: Building2, end: false },
    { path: '/proveedores', label: 'Proveedores', icon: Factory, end: false },
    { path: '/inventario', label: 'Inventario', icon: PackageSearch, end: false },
    { path: '/usuarios', label: 'Usuarios', icon: Users, end: false },
    { path: '/about', label: 'Acerca', icon: FileText, end: false },
  ];

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
          className={`hidden border-r border-app bg-panel/90 backdrop-blur xl:flex xl:flex-col ${
            sidebarOpen ? 'xl:w-64' : 'xl:w-20'
          }`}
        >
          <div className="border-b border-app px-4 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-app bg-[var(--accent-soft)] text-[var(--accent)]">
                <Activity className="h-4 w-4" />
              </div>
              {sidebarOpen && (
                <div>
                  <div className="font-display text-[1.55rem] text-main">
                    Mallor
                  </div>
                  <div className="eyebrow">consola operativa</div>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 px-3 py-4">
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
                <div className="app-pill border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]">
                  Backend conectado
                </div>
                <div className="app-pill">React + DRF</div>
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
