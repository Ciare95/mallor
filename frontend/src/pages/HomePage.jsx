import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, PackageSearch, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="surface overflow-hidden px-6 py-7 sm:px-7 xl:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-5">
            <div className="app-pill border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]">
              Centro de control comercial
            </div>
            <div className="space-y-3">
              <h2 className="max-w-4xl font-display text-[2.7rem] leading-[0.96] text-main sm:text-[3.3rem]">
                Ventas, inventario y cartera en una interfaz mas limpia y util.
              </h2>
              <p className="max-w-2xl text-[13px] leading-6 text-soft">
                La nueva capa visual reduce ruido, comprime controles y da mas
                espacio a los datos operativos. El foco sigue siendo caja,
                seguimiento comercial y lectura rapida del estado del negocio.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                to="/ventas"
                className="app-button-primary min-h-10"
              >
                Abrir punto de venta
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/inventario"
                className="app-button-secondary min-h-10"
              >
                Revisar inventario
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <MetricCard
              label="Ventas"
              value="POS"
              note="Cobro, detalle y abonos"
            />
            <MetricCard
              label="Inventario"
              value="Stock"
              note="Busqueda y ajustes"
            />
            <MetricCard
              label="Usuarios"
              value="Permisos"
              note="Roles y operacion"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.9fr_0.95fr]">
        <ModuleCard
          icon={CreditCard}
          title="Ventas"
          description="POS, listado, cuentas por cobrar y reportes operativos."
          href="/ventas"
        />
        <ModuleCard
          icon={PackageSearch}
          title="Inventario"
          description="Productos, categorias, facturas y movimientos de stock."
          href="/inventario"
        />
        <ModuleCard
          icon={Users}
          title="Usuarios"
          description="Gestion de usuarios, permisos y cambios de credenciales."
          href="/usuarios"
        />
      </section>
    </div>
  );
}

function MetricCard({ label, value, note }) {
  return (
    <div className="metric-card">
      <div className="eyebrow">{label}</div>
      <div className="mt-2 font-display text-[1.8rem] leading-none text-main">
        {value}
      </div>
      <div className="mt-2 text-[12px] text-soft">{note}</div>
    </div>
  );
}

function ModuleCard({ icon: Icon, title, description, href }) {
  return (
    <Link
      to={href}
      className="surface group px-5 py-5 transition hover:-translate-y-0.5 hover:border-[var(--accent-line)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-lg border border-app bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
          <Icon className="h-4 w-4" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted transition group-hover:text-main" />
      </div>
      <h3 className="mt-5 font-display text-[1.7rem] leading-none text-main">
        {title}
      </h3>
      <p className="mt-2 text-[13px] leading-6 text-soft">{description}</p>
    </Link>
  );
}
