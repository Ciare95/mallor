import { Building2, Keyboard, MoonStar, Warehouse } from 'lucide-react';
import {
  EmpresaInfoSection,
  EmpresaModuleToasts,
  MetricCard,
  MiEmpresaModuleShell,
  MiEmpresaUnavailable,
  useMiEmpresaModule,
} from './mi-empresa/shared';

export default function MiEmpresaPage() {
  const {
    empresaActiva,
    empresaForm,
    configForm,
    logoPreview,
    rol,
    puedeEditar,
    puedeEditarNit,
    toasts,
    closeToast,
    guardarEmpresaMutation,
    handleEmpresaSubmit,
    setEmpresaField,
  } = useMiEmpresaModule();

  if (!empresaActiva) {
    return <MiEmpresaUnavailable />;
  }

  return (
    <>
      <MiEmpresaModuleShell
        eyebrow="Mi empresa"
        title="Informacion y edicion"
        description="Gestiona la identidad legal y comercial de la empresa activa en un modulo separado de la operacion."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-pill border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]">
              {rol || 'Sin rol'}
            </span>
            <span className="app-pill">
              {puedeEditar ? 'Edicion disponible' : 'Solo lectura'}
            </span>
          </div>
        }
      >
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Building2}
            title="Razon social"
            value={empresaActiva.razon_social || 'Sin definir'}
            helper="Base fiscal de la empresa."
          />
          <MetricCard
            icon={MoonStar}
            title="Tema activo"
            value={configForm.tema === 'DARK' ? 'Oscuro' : 'Claro'}
            helper="Se configura en el modulo operativo."
          />
          <MetricCard
            icon={Warehouse}
            title="Stock negativo"
            value={
              configForm.permitir_stock_negativo_ventas
                ? 'Permitido'
                : 'Bloqueado'
            }
            helper="Regla operativa actual."
          />
          <MetricCard
            icon={Keyboard}
            title="Atajos POS"
            value={configForm.atajos_ventas_activos ? 'Activos' : 'Pausados'}
            helper="Contexto rapido del modulo de configuracion."
          />
        </section>

        <EmpresaInfoSection
          empresaActiva={empresaActiva}
          empresaForm={empresaForm}
          logoPreview={logoPreview}
          puedeEditar={puedeEditar}
          puedeEditarNit={puedeEditarNit}
          isSaving={guardarEmpresaMutation.isPending}
          onSubmit={handleEmpresaSubmit}
          setEmpresaField={setEmpresaField}
        />
      </MiEmpresaModuleShell>
      <EmpresaModuleToasts toasts={toasts} closeToast={closeToast} />
    </>
  );
}
