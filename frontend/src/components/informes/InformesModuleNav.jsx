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
    <section className="surface p-3">
      <div className="grid gap-3 lg:grid-cols-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `rounded-[24px] border px-4 py-4 transition ${
                  isActive
                    ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
                    : 'border-app bg-white/72 hover:border-[var(--accent-line)] hover:bg-white'
                }`
              }
            >
              {({ isActive }) => (
                <div className="flex items-start gap-4">
                  <div
                    className={`rounded-2xl border p-3 ${
                      isActive
                        ? 'border-[var(--accent-line)] bg-white/90 text-[var(--accent)]'
                        : 'border-app bg-[var(--panel-soft)] text-soft'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-[1.3rem] leading-none text-main">
                      {item.label}
                    </div>
                    <div className="mt-2 text-[13px] leading-6 text-soft">
                      {item.description}
                    </div>
                  </div>
                </div>
              )}
            </NavLink>
          );
        })}
      </div>
    </section>
  );
}
