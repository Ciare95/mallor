import { Keyboard, MoonStar, Settings2, Warehouse } from 'lucide-react';
import {
  EmpresaConfigSection,
  EmpresaModuleToasts,
  MetricCard,
  MiEmpresaModuleShell,
  MiEmpresaUnavailable,
  useMiEmpresaModule,
} from './mi-empresa/shared';

export default function MiEmpresaConfiguracionPage() {
  const {
    empresaActiva,
    configForm,
    rol,
    puedeEditar,
    toasts,
    closeToast,
    guardarConfiguracionMutation,
    handleConfigSubmit,
    setConfigField,
    setTemaField,
    setShortcut,
    persistConfigPatch,
  } = useMiEmpresaModule();

  if (!empresaActiva) {
    return <MiEmpresaUnavailable />;
  }

  return (
    <>
      <MiEmpresaModuleShell
        eyebrow="Mi empresa"
        title="Configuracion operativa"
        description="Separo apariencia, reglas del POS y atajos para que no compitan con la edicion de informacion legal."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-pill border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]">
              {rol || 'Sin rol'}
            </span>
            <span className="app-pill">
              {configForm.tema === 'DARK' ? 'Modo oscuro' : 'Modo claro'}
            </span>
          </div>
        }
      >
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={MoonStar}
            title="Tema"
            value={configForm.tema === 'DARK' ? 'Oscuro' : 'Claro'}
            helper="Afecta toda la aplicacion."
          />
          <MetricCard
            icon={Warehouse}
            title="Stock negativo"
            value={
              configForm.permitir_stock_negativo_ventas
                ? 'Permitido'
                : 'Bloqueado'
            }
            helper="Control sobre ventas sin existencias."
          />
          <MetricCard
            icon={Keyboard}
            title="Atajos POS"
            value={configForm.atajos_ventas_activos ? 'Activos' : 'Pausados'}
            helper="Caja prioriza teclado."
          />
          <MetricCard
            icon={Settings2}
            title="Copias ticket"
            value={configForm.ticket_copies}
            helper="Default por empresa activa."
          />
        </section>

        <EmpresaConfigSection
          configForm={configForm}
          empresaActiva={empresaActiva}
          puedeEditar={puedeEditar}
          isSaving={guardarConfiguracionMutation.isPending}
          onSubmit={handleConfigSubmit}
          setConfigField={setConfigField}
          setTemaField={setTemaField}
          setShortcut={setShortcut}
          persistConfigPatch={persistConfigPatch}
        />
      </MiEmpresaModuleShell>
      <EmpresaModuleToasts toasts={toasts} closeToast={closeToast} />
    </>
  );
}
