import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Link2,
  RefreshCcw,
  Save,
  ShieldCheck,
  TextSearch,
} from 'lucide-react';
import {
  actualizarConfiguracionFacturacion,
  obtenerDiagnosticoDetalleNotaCredito,
  obtenerDiagnosticoNotasCreditoPendientes,
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
import { obtenerVenta } from '../../services/ventas.service';
import {
  useVentasStore,
  VENTA_DETALLE_TABS,
} from '../../store/useVentasStore';

const ENVIRONMENT_LABELS = {
  SANDBOX: 'Sandbox',
  PRODUCCION: 'Produccion',
};

function resolveCompanySnapshotName(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return '';
  }

  const nestedCompany = snapshot.data?.company;
  if (typeof nestedCompany === 'string') {
    return nestedCompany.trim();
  }

  if (nestedCompany && typeof nestedCompany === 'object') {
    return (
      nestedCompany.company
      || nestedCompany.razon_social
      || nestedCompany.name
      || ''
    );
  }

  return (
    snapshot.company
    || snapshot.razon_social
    || snapshot.name
    || ''
  );
}

export default function FacturacionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, toast, closeToast } = useToast();
  const openVentaDetail = useVentasStore((state) => state.openVentaDetail);
  const [form, setForm] = useState(null);
  const [detalleNotaAbierta, setDetalleNotaAbierta] = useState(null);
  const [detalleNota, setDetalleNota] = useState({});

  const configuracionQuery = useQuery({
    queryKey: ['facturacion', 'configuracion'],
    queryFn: obtenerConfiguracionFacturacion,
  });

  const rangosQuery = useQuery({
    queryKey: ['facturacion', 'rangos'],
    queryFn: listarRangosFacturacion,
  });

  const diagnosticoNotasQuery = useQuery({
    queryKey: ['facturacion', 'diagnostico-notas-credito-pendientes'],
    queryFn: obtenerDiagnosticoNotasCreditoPendientes,
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
  const notasPendientes = diagnosticoNotasQuery.data?.items || [];
  const companySnapshotName = resolveCompanySnapshotName(config?.company_snapshot);

  const detalleNotaMutation = useMutation({
    mutationFn: obtenerDiagnosticoDetalleNotaCredito,
    onSuccess: (payload, noteNumber) => {
      setDetalleNota((current) => ({
        ...current,
        [noteNumber]: payload,
      }));
      setDetalleNotaAbierta(noteNumber);
    },
    onError: (error) => {
      toast.error(
        extractApiError(
          error,
          'No fue posible consultar el detalle de la nota credito.',
        ),
      );
    },
  });

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...(current || {}),
      [field]: value,
    }));
  };

  const handleOpenVentaLocal = async (ventaId) => {
    if (!ventaId) {
      toast.info('No hay venta local asociada');
      return;
    }

    try {
      const venta = await obtenerVenta(ventaId);
      openVentaDetail(venta, VENTA_DETALLE_TABS.RESUMEN);
      navigate('/ventas');
    } catch (error) {
      toast.error(extractApiError(error, 'No fue posible abrir la venta local'));
    }
  };

  const handleCopyValue = async (label, value) => {
    if (!value) {
      toast.info(`No hay ${label.toLowerCase()} para copiar`);
      return;
    }

    try {
      await navigator.clipboard.writeText(String(value));
      toast.success(`${label} copiado`);
    } catch {
      toast.error(`No fue posible copiar ${label.toLowerCase()}`);
    }
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
                    value={companySnapshotName || 'Sin snapshot'}
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

      <SectionShell
        eyebrow="Diagnostico Factus"
        title="Notas credito pendientes"
        description="Consulta en tiempo real las notas credito pendientes en Factus y muestra si alguna coincide con una factura local de Mallor."
        actions={
          <button
            type="button"
            onClick={() => diagnosticoNotasQuery.refetch()}
            disabled={diagnosticoNotasQuery.isFetching}
            className="app-button-secondary min-h-10"
          >
            <RefreshCcw className="h-4 w-4" />
            Actualizar diagnostico
          </button>
        }
      >
        {diagnosticoNotasQuery.isLoading && (
          <div className="rounded-xl border border-app bg-white/76 p-5 text-sm text-soft">
            Consultando notas credito pendientes en Factus...
          </div>
        )}

        {diagnosticoNotasQuery.isError && (
          <div className="rounded-xl border border-[rgba(159,47,45,0.18)] bg-[var(--danger-soft)] p-5 text-sm text-[var(--danger-text)]">
            {extractApiError(
              diagnosticoNotasQuery.error,
              'No fue posible consultar las notas credito pendientes.',
            )}
          </div>
        )}

        {!diagnosticoNotasQuery.isLoading && !diagnosticoNotasQuery.isError && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatusLine
                label="Ambiente"
                value={
                  ENVIRONMENT_LABELS[
                    diagnosticoNotasQuery.data?.environment || 'SANDBOX'
                  ] || diagnosticoNotasQuery.data?.environment || 'Sin ambiente'
                }
              />
              <StatusLine
                label="Pendientes"
                value={String(diagnosticoNotasQuery.data?.count || 0)}
              />
              <StatusLine
                label="Actualizado"
                value={
                  diagnosticoNotasQuery.data?.fetched_at
                    ? formatDateTime(diagnosticoNotasQuery.data.fetched_at)
                    : 'Sin fecha'
                }
              />
            </div>

            {!notasPendientes.length && (
              <div className="rounded-xl border border-app bg-white/76 p-5 text-sm text-soft">
                Factus no reporta notas credito pendientes para esta empresa.
              </div>
            )}

            {!!notasPendientes.length && (
              <div className="grid gap-3">
                {notasPendientes.map((item) => (
                  <article
                    key={`${item.reference_code || 'sin-ref'}-${item.number || 'sin-numero'}`}
                    className="grid gap-4 rounded-xl border border-app bg-white/76 p-4 lg:grid-cols-[1.2fr_0.9fr_1fr_1.15fr]"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-[13px] font-semibold text-main">
                        {item.local_document ? (
                          <Link2 className="h-4 w-4 text-[var(--accent)]" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
                        )}
                        {item.number || 'Sin numero'}
                      </div>
                      <div className="mt-2 text-[11px] text-soft">
                        Ref. {item.reference_code || 'Sin referencia'}
                      </div>
                      <div className="mt-2 text-[11px] text-soft">
                        Factura {item.bill_number || 'Sin factura asociada'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
                        Cliente
                      </div>
                      <div className="mt-2 text-[13px] font-semibold text-main">
                        {item.customer_name || 'Sin nombre'}
                      </div>
                      <div className="mt-1 text-[11px] text-soft">
                        {item.customer_identification || 'Sin identificacion'}
                      </div>
                    </div>

                    <div>
                      <StatusLine
                        label="Creada en Factus"
                        value={item.created_at || 'Sin fecha'}
                      />
                      <div className="mt-4">
                        <StatusLine
                          label="Total"
                          value={item.total ? `$ ${item.total}` : 'Sin total'}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-app bg-[var(--panel-soft)] p-4">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
                        Vinculo local
                      </div>
                      {item.local_document ? (
                        <div className="mt-2 space-y-2 text-[12px] text-main">
                          <div className="font-semibold">
                            Venta {item.local_document.numero_venta || item.local_document.venta_id}
                          </div>
                          <div className="text-soft">
                            Factura {item.local_document.bill_number || 'Sin numero'}
                          </div>
                          <div className="text-soft">
                            Ultimo error {item.local_document.last_error_code || 'Sin codigo'}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-[12px] text-soft">
                          Esta nota pendiente no coincide con una factura local de Mallor.
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:col-span-4">
                      <button
                        type="button"
                        onClick={() => handleCopyValue('Referencia', item.reference_code)}
                        className="app-button-secondary min-h-10"
                      >
                        <Copy className="h-4 w-4" />
                        Copiar referencia
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyValue('Numero', item.number)}
                        className="app-button-secondary min-h-10"
                      >
                        <Copy className="h-4 w-4" />
                        Copiar numero
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyValue('Factura', item.bill_number)}
                        className="app-button-secondary min-h-10"
                      >
                        <Copy className="h-4 w-4" />
                        Copiar factura
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (detalleNotaAbierta === item.number) {
                            setDetalleNotaAbierta(null);
                            return;
                          }
                          if (detalleNota[item.number]) {
                            setDetalleNotaAbierta(item.number);
                            return;
                          }
                          detalleNotaMutation.mutate(item.number);
                        }}
                        disabled={detalleNotaMutation.isPending && detalleNotaMutation.variables === item.number}
                        className="app-button-secondary min-h-10"
                      >
                        <TextSearch className="h-4 w-4" />
                        {detalleNotaAbierta === item.number
                          ? 'Ocultar detalle'
                          : 'Ver detalle'}
                      </button>
                      {item.local_document?.venta_id && (
                        <button
                          type="button"
                          onClick={() => handleOpenVentaLocal(item.local_document.venta_id)}
                          className="app-button-secondary min-h-10"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                          Abrir venta local
                        </button>
                      )}
                    </div>

                    {item.observation && (
                      <div className="lg:col-span-4">
                        <div className="rounded-xl border border-app bg-[var(--panel-soft)] px-4 py-3 text-[12px] text-soft">
                          {item.observation}
                        </div>
                      </div>
                    )}

                    {detalleNotaAbierta === item.number && detalleNota[item.number] && (
                      <div className="lg:col-span-4 rounded-xl border border-app bg-[var(--panel-soft)] p-4">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <DiagnosticField
                            label="CUDE"
                            value={detalleNota[item.number].cude || 'Sin CUDE'}
                            monospace
                          />
                          <DiagnosticField
                            label="Validada"
                            value={
                              detalleNota[item.number].is_validated
                                ? 'Si'
                                : 'No'
                            }
                          />
                          <DiagnosticField
                            label="Validada en"
                            value={
                              detalleNota[item.number].validated_at || 'Sin fecha'
                            }
                          />
                          <DiagnosticField
                            label="Factura ref."
                            value={
                              detalleNota[item.number].bill_reference_code
                              || 'Sin referencia'
                            }
                            monospace
                          />
                        </div>
                        <div className="mt-4 grid gap-3 xl:grid-cols-2">
                          <DiagnosticField
                            label="URL publica"
                            value={
                              detalleNota[item.number].public_url || 'No disponible'
                            }
                            monospace
                          />
                          <DiagnosticField
                            label="QR"
                            value={detalleNota[item.number].qr_url || 'No disponible'}
                            monospace
                          />
                        </div>
                        {detalleNota[item.number].local_document?.last_error_message && (
                          <div className="mt-4 rounded-xl border border-app bg-white/76 px-4 py-3 text-[12px] text-soft">
                            {detalleNota[item.number].local_document.last_error_message}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
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

function DiagnosticField({ label, value, monospace = false }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
        {label}
      </div>
      <div
        className={`mt-2 text-[13px] font-semibold text-main ${
          monospace ? 'font-mono text-[12px] break-all leading-5' : 'break-words'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
