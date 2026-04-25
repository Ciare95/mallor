import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, PackageSearch, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="surface overflow-hidden rounded-[28px] px-6 py-8 sm:px-8 xl:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-emerald-200">
              Centro de control comercial
            </div>
            <div className="space-y-3">
              <h2 className="max-w-3xl font-display text-4xl leading-tight text-white sm:text-5xl">
                Operacion comercial, inventario y cartera en una misma consola.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Mallor organiza el trabajo del mostrador, la trazabilidad del
                stock y el seguimiento de cobro sin depender de pantallas
                sueltas. La prioridad ahora es ventas.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/ventas"
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Abrir punto de venta
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/inventario"
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Revisar inventario
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <MetricCard
              label="Ventas"
              value="POS activo"
              note="Cobro, detalle y abonos"
            />
            <MetricCard
              label="Inventario"
              value="Stock vivo"
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

      <section className="grid gap-5 xl:grid-cols-3">
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
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 font-display text-2xl text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-400">{note}</div>
    </div>
  );
}

function ModuleCard({ icon: Icon, title, description, href }) {
  return (
    <Link
      to={href}
      className="surface group rounded-[24px] px-6 py-6 transition hover:-translate-y-0.5 hover:border-emerald-400/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-emerald-200">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:text-emerald-200" />
      </div>
      <h3 className="mt-6 font-display text-2xl text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </Link>
  );
}
