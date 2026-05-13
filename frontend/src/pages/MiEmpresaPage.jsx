import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Keyboard,
  MoonStar,
  RotateCcw,
  Save,
  Settings2,
  Warehouse,
} from 'lucide-react';
import {
  actualizarConfiguracionEmpresa,
  actualizarEmpresa,
} from '../services/empresas.service';
import {
  DEFAULT_ATAJOS_VENTAS,
  DEFAULT_CONFIGURACION_OPERATIVA,
  useAppStore,
} from '../store/useStore';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/ui/Toast';
import { SectionShell } from '../components/ventas/shared';
import { buildShortcutFromEvent } from '../utils/shortcuts';
import { extractApiError } from '../utils/ventas';
import {
  calculateNitVerificationDigit,
  sanitizeNumeric,
} from '../utils/nit';

const EMPTY_FORM = {
  nit: '',
  digito_verificacion: '',
  razon_social: '',
  nombre_comercial: '',
  email: '',
  telefono: '',
  direccion: '',
  municipio_codigo: '',
  ambiente_facturacion: 'SANDBOX',
};

const normalizeConfig = (config = {}) => ({
  ...DEFAULT_CONFIGURACION_OPERATIVA,
  ...config,
  atajos_ventas: {
    ...DEFAULT_ATAJOS_VENTAS,
    ...(config?.atajos_ventas || {}),
  },
});

export default function MiEmpresaPage() {
  const queryClient = useQueryClient();
  const empresaActiva = useAppStore((state) => state.empresaActiva);
  const setEmpresaActiva = useAppStore((state) => state.setEmpresaActiva);
  const setTemaActual = useAppStore((state) => state.setTemaActual);
  const updateEmpresaConfiguracion = useAppStore(
    (state) => state.updateEmpresaConfiguracion,
  );
  const user = useAppStore((state) => state.user);
  const { toasts, toast, closeToast } = useToast();
  const [empresaForm, setEmpresaForm] = useState(EMPTY_FORM);
  const [configForm, setConfigForm] = useState(DEFAULT_CONFIGURACION_OPERATIVA);

  const rol = empresaActiva?.rol_usuario;
  const puedeEditar = ['PROPIETARIO', 'ADMIN'].includes(rol);
  const puedeEditarNit = rol === 'PROPIETARIO' || user?.is_superuser;

  useEffect(() => {
    if (!empresaActiva) {
      return;
    }

    setEmpresaForm({
      ...EMPTY_FORM,
      ...empresaActiva,
      digito_verificacion: calculateNitVerificationDigit(empresaActiva.nit),
    });
    setConfigForm(normalizeConfig(empresaActiva.configuracion_operativa));
  }, [empresaActiva]);

  const guardarEmpresaMutation = useMutation({
    mutationFn: (payload) => actualizarEmpresa(empresaActiva.id, payload),
    onSuccess: (empresa) => {
      const mergedEmpresa = {
        ...empresaActiva,
        ...empresa,
      };
      setEmpresaActiva(mergedEmpresa);
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast.success('Datos de empresa actualizados');
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible guardar la empresa'));
    },
  });

  const guardarConfiguracionMutation = useMutation({
    mutationFn: (payload) =>
      actualizarConfiguracionEmpresa(empresaActiva.id, payload),
    onSuccess: (configuracion) => {
      updateEmpresaConfiguracion(configuracion);
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      setConfigForm(normalizeConfig(configuracion));
      toast.success('Configuracion operativa actualizada');
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible guardar la configuracion'),
      );
    },
  });

  const setEmpresaField = (field, value) => {
    setEmpresaForm((current) => {
      const normalizedValue = field === 'nit' ? sanitizeNumeric(value) : value;
      const next = { ...current, [field]: normalizedValue };
      if (field === 'nit') {
        next.digito_verificacion = calculateNitVerificationDigit(normalizedValue);
      }
      return next;
    });
  };

  const setConfigField = (field, value) => {
    setConfigForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const setTemaField = (checked) => {
    const nextTheme = checked ? 'DARK' : 'LIGHT';
    setConfigField('tema', nextTheme);
    setTemaActual(nextTheme);
  };

  const setShortcut = (field, value) => {
    setConfigForm((current) => ({
      ...current,
      atajos_ventas: {
        ...current.atajos_ventas,
        [field]: value,
      },
    }));
  };

  const handleEmpresaSubmit = (event) => {
    event.preventDefault();
    if (!empresaActiva || !puedeEditar) {
      return;
    }

    const payload = { ...empresaForm };
    if (!puedeEditarNit) {
      delete payload.nit;
    }
    delete payload.id;
    delete payload.rol_usuario;
    delete payload.activo;
    delete payload.configuracion_operativa;

    guardarEmpresaMutation.mutate(payload);
  };

  const handleConfigSubmit = (event) => {
    event.preventDefault();
    if (!empresaActiva || !puedeEditar) {
      return;
    }

    guardarConfiguracionMutation.mutate({
      tema: configForm.tema,
      permitir_stock_negativo_ventas:
        configForm.permitir_stock_negativo_ventas,
      atajos_ventas_activos: configForm.atajos_ventas_activos,
      atajos_ventas: configForm.atajos_ventas,
    });
  };

  if (!empresaActiva) {
    return (
      <SectionShell
        eyebrow="Configuracion"
        title="Centro operativo"
        description="No hay una empresa activa seleccionada."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionShell
        eyebrow="Configuracion"
        title="Centro operativo"
        description="Datos fiscales, apariencia global y reglas del POS para la empresa activa."
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
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="config-hero px-5 py-6 sm:px-6">
            <div className="relative z-[1]">
              <div className="eyebrow">Empresa activa</div>
              <div className="mt-3 max-w-xl font-display text-[2.2rem] leading-[0.95] text-main sm:text-[2.6rem]">
                {empresaActiva.nombre_comercial
                  || empresaActiva.razon_social
                  || 'Sin nombre comercial'}
              </div>
              <p className="mt-3 max-w-2xl text-[13px] leading-6 text-soft">
                Este modulo consolida datos fiscales y la forma en que se opera
                el punto de venta sin depender del mouse.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="app-pill border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]">
                  {configForm.tema === 'DARK'
                    ? 'Estetica nocturna activa'
                    : 'Estetica clara activa'}
                </span>
                <span className="app-pill">
                  {configForm.atajos_ventas_activos
                    ? 'POS listo para teclado'
                    : 'Atajos en pausa'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <MetricCard
              icon={MoonStar}
              title="Tema"
              value={configForm.tema === 'DARK' ? 'Oscuro' : 'Claro'}
              helper="Se aplica a toda la app."
            />
            <MetricCard
              icon={Warehouse}
              title="Stock negativo"
              value={
                configForm.permitir_stock_negativo_ventas
                  ? 'Permitido en ventas'
                  : 'Bloqueado'
              }
              helper="Solo afecta ventas."
            />
            <MetricCard
              icon={Keyboard}
              title="Atajos POS"
              value={configForm.atajos_ventas_activos ? 'Activos' : 'Pausados'}
              helper="Teclado primero en caja."
            />
          </div>
        </div>
      </SectionShell>

      <SectionShell
        eyebrow="Empresa"
        title="Datos fiscales y comerciales"
        description="Base de facturacion, contacto y validaciones de la empresa."
      >
        <form className="space-y-6" onSubmit={handleEmpresaSubmit}>
          <div className="surface-elevated p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-app pb-4">
              <div>
                <div className="eyebrow">Perfil legal</div>
                <div className="mt-2 font-display text-[1.9rem] leading-none text-main">
                  Identidad comercial
                </div>
                <p className="mt-2 max-w-2xl text-[13px] leading-6 text-soft">
                  Aqui se define la informacion base que la empresa expone en
                  facturacion, contacto y operacion.
                </p>
              </div>
              <div className="rounded-full border border-app bg-panel-soft px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                {puedeEditar ? 'Edicion habilitada' : 'Solo lectura'}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Field
                label="NIT"
                value={empresaForm.nit}
                disabled={!puedeEditar || !puedeEditarNit}
                onChange={(value) => setEmpresaField('nit', value)}
              />
              <Field
                label="Digito verificacion"
                value={empresaForm.digito_verificacion}
                disabled
                readOnly
                helper="Se calcula automaticamente desde el NIT."
              />
              <SelectField
                label="Ambiente facturacion"
                value={empresaForm.ambiente_facturacion}
                disabled={!puedeEditar}
                onChange={(value) =>
                  setEmpresaField('ambiente_facturacion', value)
                }
                options={[
                  ['Sandbox', 'SANDBOX'],
                  ['Produccion', 'PRODUCCION'],
                ]}
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Field
                label="Razon social"
                value={empresaForm.razon_social}
                disabled={!puedeEditar}
                required
                onChange={(value) => setEmpresaField('razon_social', value)}
              />
              <Field
                label="Nombre comercial"
                value={empresaForm.nombre_comercial}
                disabled={!puedeEditar}
                onChange={(value) =>
                  setEmpresaField('nombre_comercial', value)
                }
              />
              <Field
                label="Email"
                type="email"
                value={empresaForm.email}
                disabled={!puedeEditar}
                onChange={(value) => setEmpresaField('email', value)}
              />
              <Field
                label="Telefono"
                value={empresaForm.telefono}
                disabled={!puedeEditar}
                onChange={(value) => setEmpresaField('telefono', value)}
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.35fr]">
              <Field
                label="Direccion"
                value={empresaForm.direccion}
                disabled={!puedeEditar}
                onChange={(value) => setEmpresaField('direccion', value)}
              />
              <Field
                label="Codigo municipio"
                value={empresaForm.municipio_codigo}
                disabled={!puedeEditar}
                onChange={(value) => setEmpresaField('municipio_codigo', value)}
              />
            </div>
          </div>

          <FooterActions
            canEdit={puedeEditar}
            isSaving={guardarEmpresaMutation.isPending}
            icon={Building2}
            message={
              puedeEditar
                ? 'Los cambios aplican solo a la empresa activa.'
                : 'Tu rol permite consulta, no edicion.'
            }
            submitLabel="Guardar empresa"
          />
        </form>
      </SectionShell>

      <SectionShell
        eyebrow="Operacion"
        title="Apariencia, stock y atajos"
        description="Reglas que afectan todo el flujo del POS para la empresa activa."
      >
        <form className="space-y-6" onSubmit={handleConfigSubmit}>
          <div className="grid gap-4 xl:grid-cols-3">
            <TogglePanel
              icon={MoonStar}
              title="Modo oscuro"
              description="Cambia la apariencia completa de la app."
              checked={configForm.tema === 'DARK'}
              disabled={!puedeEditar}
              onChange={setTemaField}
            />
            <TogglePanel
              icon={Warehouse}
              title="Stock negativo en ventas"
              description="Permite vender por debajo de cero sin abrir inventario manual."
              checked={configForm.permitir_stock_negativo_ventas}
              disabled={!puedeEditar}
              onChange={(checked) =>
                setConfigField('permitir_stock_negativo_ventas', checked)
              }
            />
            <TogglePanel
              icon={Keyboard}
              title="Atajos del POS"
              description="Habilita comandos de teclado fuera de campos editables."
              checked={configForm.atajos_ventas_activos}
              disabled={!puedeEditar}
              onChange={(checked) =>
                setConfigField('atajos_ventas_activos', checked)
              }
            />
          </div>

          <div className="surface-elevated p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="eyebrow">Atajos editables</div>
                <h3 className="mt-2 font-display text-2xl text-main">
                  Caja orientada al teclado
                </h3>
                <p className="mt-2 body-copy">
                  Pulsa la combinacion dentro de cada campo. El POS ignora estos
                  atajos dentro de inputs, selects y areas de texto.
                </p>
              </div>
              <button
                type="button"
                disabled={!puedeEditar}
                onClick={() =>
                  setConfigField('atajos_ventas', {
                    ...DEFAULT_ATAJOS_VENTAS,
                  })
                }
                className="app-button-secondary min-h-10"
              >
                <RotateCcw className="h-4 w-4" />
                Restaurar defaults
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <ShortcutField
                label="Registrar venta"
                helper="Accion principal del POS."
                value={configForm.atajos_ventas.registrar_venta}
                disabled={!puedeEditar}
                onChange={(value) => setShortcut('registrar_venta', value)}
              />
              <ShortcutField
                label="Configurar cobro"
                helper="Abre el modal de pago."
                value={configForm.atajos_ventas.configurar_cobro}
                disabled={!puedeEditar}
                onChange={(value) => setShortcut('configurar_cobro', value)}
              />
              <ShortcutField
                label="Nueva precuenta"
                helper="Crea y activa una nueva pestaña."
                value={configForm.atajos_ventas.nueva_precuenta}
                disabled={!puedeEditar}
                onChange={(value) => setShortcut('nueva_precuenta', value)}
              />
              <ShortcutField
                label="Quitar ultimo producto"
                helper="Elimina la ultima linea agregada."
                value={configForm.atajos_ventas.quitar_ultimo_producto}
                disabled={!puedeEditar}
                onChange={(value) =>
                  setShortcut('quitar_ultimo_producto', value)
                }
              />
            </div>
          </div>

          <FooterActions
            canEdit={puedeEditar}
            isSaving={guardarConfiguracionMutation.isPending}
            icon={Settings2}
            message={
              puedeEditar
                ? 'Esta configuracion se comparte entre los usuarios de la empresa.'
                : 'Solo puedes consultar la operacion activa.'
            }
            submitLabel="Guardar configuracion"
          />
        </form>
      </SectionShell>
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}

function MetricCard({ icon: Icon, title, value, helper }) {
  return (
    <div className="config-metric-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
            {title}
          </div>
          <div className="mt-1 text-[14px] font-semibold text-main">
            {value}
          </div>
        </div>
      </div>
      <div className="mt-3 text-[12px] text-soft">{helper}</div>
    </div>
  );
}

function TogglePanel({
  icon: Icon,
  title,
  description,
  checked,
  disabled,
  onChange,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`toggle-panel p-5 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? 'toggle-panel-active' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]">
            <Icon className="h-4 w-4" />
          </div>
          <div className="mt-4 text-[15px] font-semibold text-main">
            {title}
          </div>
          <p className="mt-2 text-[12px] leading-6 text-soft">{description}</p>
        </div>
        <span
          className={`inline-flex h-7 w-14 items-center rounded-full p-1 transition ${
            checked ? 'toggle-track toggle-track-active' : 'toggle-track'
          }`}
        >
          <span
            className={`toggle-thumb h-5 w-5 rounded-full bg-white transition ${
              checked ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </span>
      </div>
    </button>
  );
}

function ShortcutField({ label, helper, value, disabled, onChange }) {
  return (
    <label className="shortcut-card block space-y-2 p-4">
      <span className="app-field-label">{label}</span>
      <input
        type="text"
        value={value}
        readOnly
        disabled={disabled}
        onKeyDown={(event) => {
          event.preventDefault();
          const nextValue = buildShortcutFromEvent(event);
          if (nextValue) {
            onChange(nextValue);
          }
        }}
        className="app-input min-h-11 font-mono-ui"
      />
      <span className="text-[12px] text-soft">{helper}</span>
    </label>
  );
}

function FooterActions({
  canEdit,
  isSaving,
  icon: Icon,
  message,
  submitLabel,
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-app pt-4">
      <div className="flex items-center gap-2 text-[13px] text-soft">
        <Icon className="h-4 w-4" />
        {message}
      </div>
      {canEdit && (
        <button
          type="submit"
          disabled={isSaving}
          className="app-button-primary min-h-11"
        >
          <Save className="h-4 w-4" />
          {submitLabel}
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange = () => {},
  disabled,
  type = 'text',
  required = false,
  readOnly = false,
  helper,
}) {
  return (
    <label className="app-field">
      <span className="app-field-label">{label}</span>
      <input
        type={type}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        readOnly={readOnly}
        className="app-input min-h-11"
      />
      {helper && <span className="text-[12px] text-soft">{helper}</span>}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange = () => {},
  disabled,
  options = [],
}) {
  return (
    <label className="app-field">
      <span className="app-field-label">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="app-select min-h-11"
      >
        {options.map(([optionLabel, optionValue]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
