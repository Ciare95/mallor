import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, RefreshCcw, Save, ShieldCheck } from 'lucide-react';
import {
  actualizarConfiguracionFacturacion,
  listarRangosFacturacion,
  obtenerConfiguracionFacturacion,
  sincronizarRangosFacturacion,
  validarConexionFacturacion,
} from '../../services/facturacion.service';
import useToast from '../../hooks/useToast';
import { extractApiError } from '../../utils/ventas';
import { formatDateTime, formatDate } from '../../utils/formatters';
import { ToastContainer } from '../ui/Toast';
import { SectionShell } from '../ventas/shared';

const ENVIRONMENT_LABELS = {
  SANDBOX: 'Sandbox',
  PRODUCCION: 'Produccion',
};

export default function FacturacionPage() {
  const queryClient = useQueryClient();
  const { toasts, toast, closeToast } = useToast();
  const [form, setForm] = useState(null);

  const configuracionQuery = useQuery({
    queryKey: ['facturacion', 'configuracion'],
    queryFn: obtenerConfiguracionFacturacion,
  });

  const rangosQuery = useQuery({
    queryKey: ['facturacion', 'rangos'],
    queryFn: listarRangosFacturacion,
  });

  const config = configuracionQuery.data;
  const rangos = rangosQuery.data || [];

  useEffect(() => {
    if (config) {
      setForm({
        is_enabled: Boolean(config.is_enabled),
        environment: config.environment || 'SANDBOX',
        auto_emitir_al_terminar: Boolean(config.auto_emitir_al_terminar),
        auto_enviar_email: Boolean(config.auto_enviar_email),
        active_bill_range_id: config.active_bill_range?.id || '',
        active_credit_note_range_id: config.active_credit_note_range?.id || '',
      });
    }
  }, [config]);

  const invalidateFacturacion = () => {
    queryClient.invalidateQueries({ queryKey: ['facturacion'] });
  };

  const guardarMutation = useMutation({
    mutationFn: actualizarConfiguracionFacturacion,
    onSuccess: () => {
      invalidateFacturacion();
      toast.success('Configuracion de facturacion actualizada');
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible guardar la configuracion'),
      );
    },
  });

  const validarMutation = useMutation({
    mutationFn: validarConexionFacturacion,
    onSuccess: () => {
      invalidateFacturacion();
      toast.success('Conexion con Factus validada');
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible validar la conexion'),
      );
    },
  });

  const sincronizarMutation = useMutation({
    mutationFn: sincronizarRangosFacturacion,
    onSuccess: (payload) => {
      invalidateFacturacion();
      toast.success(`Rangos sincronizados: ${payload.count || 0}`);
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible sincronizar los rangos'),
      );
    },
  });

  const rangosFactura = rangos.filter((item) => !item.is_credit_note_range);
  const rangosNota = rangos.filter((item) => item.is_credit_note_range);

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...(current || {}),
      [field]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form) {
      return;
    }

    guardarMutation.mutate({
      ...form,
      active_bill_range_id: form.active_bill_range_id || null,
      active_credit_note_range_id: form.active_credit_note_range_id || null,
    });
  };

  return (
    <div className="space-y-6">
      <SectionShell
        eyebrow="Backoffice fiscal"
        title="Facturacion electronica"
        description="Administra ambiente, emision en linea, envio por correo y rangos activos sincronizados desde Factus."
        actions={
          <>
            <button
              type="button"
              onClick={() => validarMutation.mutate()}
              disabled={validarMutation.isPending}
              className="app-button-secondary min-h-10"
            >
              <ShieldCheck className="h-4 w-4" />
              Validar conexion
            </button>
            <button
              type="button"
              onClick={() => sincronizarMutation.mutate()}
              disabled={sincronizarMutation.isPending}
              className="app-button-secondary min-h-10"
            >
              <RefreshCcw className="h-4 w-4" />
              Sincronizar rangos
            </button>
          </>
        }
      >
        {configuracionQuery.isLoading && (
          <div className="rounded-xl border border-app bg-white/76 p-5 text-sm text-soft">
            Cargando configuracion de facturacion...
          </div>
        )}

        {configuracionQuery.isError && (
          <div className="rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] p-5 text-sm text-[var(--danger-text)]">
            No fue posible cargar la configuracion.
          </div>
        )}

        {!configuracionQuery.isLoading && !configuracionQuery.isError && form && (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="surface-subtle p-5">
                <div className="mb-4 eyebrow">Operacion</div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <ToggleRow
                    label="Habilitar facturacion"
                    checked={form.is_enabled}
                    onChange={(value) => handleChange('is_enabled', value)}
                  />
                  <ToggleRow
                    label="Emitir al terminar"
                    checked={form.auto_emitir_al_terminar}
                    onChange={(value) =>
                      handleChange('auto_emitir_al_terminar', value)
                    }
                  />
                  <ToggleRow
                    label="Enviar correo automatico"
                    checked={form.auto_enviar_email}
                    onChange={(value) =>
                      handleChange('auto_enviar_email', value)
                    }
                  />
                  <label className="app-field">
                    <span className="app-field-label">Ambiente</span>
                    <select
                      value={form.environment}
                      onChange={(event) =>
                        handleChange('environment', event.target.value)
                      }
                      className="app-select min-h-11"
                    >
                      {Object.entries(ENVIRONMENT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="surface-subtle p-5">
                <div className="mb-4 eyebrow">Estado</div>
                <div className="space-y-4">
                  <StatusLine
                    label="Ultima conexion"
                    value={config?.last_connection_status || 'Sin validar'}
                  />
                  <StatusLine
                    label="Verificado"
                    value={
                      config?.last_connection_checked_at
                        ? formatDateTime(config.last_connection_checked_at)
                        : 'Sin fecha'
                    }
                  />
                  <StatusLine
                    label="Empresa"
                    value={
                      config?.company_snapshot?.data?.company?.company
                        || config?.company_snapshot?.company
                        || 'Sin snapshot'
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <label className="app-field surface-subtle p-5">
                <span className="app-field-label">Rango activo de factura</span>
                <select
                  value={form.active_bill_range_id}
                  onChange={(event) =>
                    handleChange('active_bill_range_id', event.target.value)
                  }
                  className="app-select mt-3 min-h-11"
                >
                  <option value="">Selecciona un rango</option>
                  {rangosFactura.map((rango) => (
                    <option key={rango.id} value={rango.id}>
                      {rango.prefix} · {rango.current_number}/{rango.to_number}
                    </option>
                  ))}
                </select>
              </label>

              <label className="app-field surface-subtle p-5">
                <span className="app-field-label">Rango activo de nota credito</span>
                <select
                  value={form.active_credit_note_range_id}
                  onChange={(event) =>
                    handleChange('active_credit_note_range_id', event.target.value)
                  }
                  className="app-select mt-3 min-h-11"
                >
                  <option value="">Selecciona un rango</option>
                  {rangosNota.map((rango) => (
                    <option key={rango.id} value={rango.id}>
                      {rango.prefix} · {rango.current_number}/{rango.to_number}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={guardarMutation.isPending}
                className="app-button-primary min-h-11"
              >
                <Save className="h-4 w-4" />
                Guardar configuracion
              </button>
            </div>
          </form>
        )}
      </SectionShell>

      <SectionShell
        eyebrow="Rangos sincronizados"
        title="Numeracion disponible"
        description="Vista de los rangos locales sincronizados. La fuente de verdad sigue siendo Factus."
      >
        <div className="grid gap-3">
          {rangos.map((rango) => (
            <article
              key={rango.id}
              className="grid gap-3 rounded-xl border border-app bg-white/76 p-4 lg:grid-cols-[1fr_0.8fr_0.8fr_0.8fr]"
            >
              <div>
                <div className="text-[13px] font-semibold text-main">
                  {rango.prefix || 'Sin prefijo'} · {rango.document_code}
                </div>
                <div className="mt-1 text-[11px] text-soft">
                  Resolucion {rango.resolution_number || 'Sin resolucion'}
                </div>
              </div>
              <StatusLine
                label="Actual"
                value={`${rango.current_number} / ${rango.to_number}`}
              />
              <StatusLine
                label="Vigencia"
                value={
                  rango.end_date ? formatDate(rango.end_date) : 'Sin fecha final'
                }
              />
              <div className="flex items-center gap-2 text-[12px] font-semibold text-main">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                {rango.is_active ? 'Activo' : 'Inactivo'}
                {rango.is_credit_note_range ? ' · Nota credito' : ' · Factura'}
              </div>
            </article>
          ))}
          {!rangos.length && (
            <div className="rounded-xl border border-app bg-white/76 p-5 text-sm text-soft">
              Aun no hay rangos locales. Ejecuta sincronizacion desde Factus.
            </div>
          )}
        </div>
      </SectionShell>

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-app bg-white/76 px-4 py-3 text-left"
    >
      <span className="text-[13px] font-semibold text-main">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
          checked
            ? 'border border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]'
            : 'border border-app bg-white text-soft'
        }`}
      >
        {checked ? 'Activo' : 'Apagado'}
      </span>
    </button>
  );
}

function StatusLine({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
        {label}
      </div>
      <div className="mt-2 text-[13px] font-semibold text-main">{value}</div>
    </div>
  );
}
