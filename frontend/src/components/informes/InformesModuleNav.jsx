import { BarChart3, ReceiptText, ScrollText } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  {
    path: '/informes',
    label: 'Estadisticas',
    description: 'Dashboard visual y comparativos del negocio.',
    icon: BarChart3,
    end: true,
  },
  {
    path: '/informes/cierres',
    label: 'Cierres de caja',
    description: 'Generacion, historial, ajuste e impresion.',
    icon: ReceiptText,
    end: false,
  },
  {
    path: '/informes/reportes',
    label: 'Reportes',
    description: 'Generacion, vista previa y descargas PDF o Excel.',
    icon: ScrollText,
    end: false,
  },
];

export default function InformesModuleNav() {
  return (
    <section className="surface p-2.5">
      <div className="grid gap-3 lg:grid-cols-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `module-nav-card ${isActive ? 'module-nav-card-active' : ''}`
              }
            >
              {() => (
                <div className="flex items-center gap-3">
                  <div className="module-nav-icon">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="module-nav-label">{item.label}</div>
                </div>
              )}
            </NavLink>
          );
        })}
      </div>
    </section>
  );
}
