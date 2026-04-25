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
    <div className="min-h-screen bg-app">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))]" />
      <div className="relative flex min-h-screen">
        <aside
          className={`hidden border-r border-white/10 bg-panel/90 backdrop-blur xl:flex xl:flex-col ${
            sidebarOpen ? 'xl:w-72' : 'xl:w-24'
          }`}
        >
          <div className="border-b border-white/10 px-5 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/18 text-emerald-300">
                <Activity className="h-5 w-5" />
              </div>
              {sidebarOpen && (
                <div>
                  <div className="font-display text-xl text-white">Mallor</div>
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Centro operativo
                  </div>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 px-4 py-5">
            <div className="mb-3 px-2 text-[10px] uppercase tracking-[0.28em] text-slate-500">
              {sidebarOpen ? 'Modulos' : 'Nav'}
            </div>
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `group flex min-h-12 items-center gap-3 rounded-2xl px-3 py-3 transition ${
                        isActive
                          ? 'bg-white text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.28)]'
                          : 'text-slate-400 hover:bg-white/6 hover:text-white'
                      }`
                    }
                    title={item.label}
                  >
                    <Icon className="h-5 w-5" />
                    {sidebarOpen && (
                      <span className="text-sm font-semibold">{item.label}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-white/10 px-4 py-5">
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              {sidebarOpen ? 'Compactar panel' : 'Expandir'}
            </button>
          </div>
        </aside>

        <div className="relative flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-app/92 backdrop-blur">
            <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-10">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 xl:flex"
                  aria-label="Alternar panel"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
                    Mallor workspace
                  </div>
                  <h1 className="font-display text-2xl text-white">
                    {pageTitle}
                  </h1>
                </div>
              </div>

              <div className="hidden items-center gap-3 md:flex">
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                  Backend conectado
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                  React + DRF
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto border-t border-white/10 px-4 py-3 xl:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'border-emerald-400/50 bg-emerald-400/14 text-emerald-100'
                          : 'border-white/10 bg-white/5 text-slate-400'
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

          <main className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col px-4 py-6 sm:px-6 xl:px-10 xl:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
