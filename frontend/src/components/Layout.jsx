import { Outlet, Link, NavLink } from 'react-router-dom';
import { Home, Users, FileText, Settings } from 'lucide-react';

export default function Layout() {
  const navItems = [
    { path: '/', label: 'Inicio', icon: <Home size={20} />, end: true },
    { path: '/usuarios', label: 'Usuarios', icon: <Users size={20} />, end: false },
    { path: '/about', label: 'Acerca', icon: <FileText size={20} />, end: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">M</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">Mallor</h1>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 transition ${isActive ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'}`
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <div className="flex items-center space-x-4">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  Iniciar sesión
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-800">
                  <Settings size={20} />
                </button>
              </div>
            </nav>
          </div>

          {/* Navegación móvil */}
          <div className="flex md:hidden items-center justify-between mt-4">
            <div className="flex space-x-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 transition ${isActive ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`
                  }
                >
                  {item.icon}
                </NavLink>
              ))}
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
              Iniciar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t mt-8">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">M</span>
                </div>
                <span className="text-lg font-semibold text-gray-800">Mallor</span>
              </div>
              <p className="text-gray-600 text-sm mt-2">Sistema de gestión integral para Pymes</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-600">© 2025 Mallor - Todos los derechos reservados</p>
              <p className="text-gray-500 text-sm mt-1">Versión 1.0.0</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}