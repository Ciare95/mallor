import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  PencilLine,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  actualizarEmpresaAdmin,
  crearEmpresaAdmin,
  guardarCredencialesFactusEmpresa,
  listarRangosFactusEmpresa,
  listarEmpresasAdmin,
  obtenerCredencialesFactusEmpresa,
  sincronizarRangosFactusEmpresa,
  validarConexionFactusEmpresa,
} from '../services/empresas.service';
import MunicipioLookupField from '../components/forms/MunicipioLookupField';
import { SectionShell, StatusBadge } from '../components/ventas/shared';
import { extractApiError } from '../utils/ventas';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/ui/Toast';
import {
  calculateNitVerificationDigit,
  sanitizeNumeric,
} from '../utils/nit';

const EMPTY_EMPRESA = {
  nit: '',
  digito_verificacion: '',
  razon_social: '',
  nombre_comercial: '',
  email: '',
  telefono: '',
  direccion: '',
  municipio_codigo: '',
  ambiente_facturacion: 'SANDBOX',
  activo: true,
};

const EMPTY_OWNER = {
  username: '',
  email: '',
  password: '',
  confirm_password: '',
  first_name: '',
  last_name: '',
  phone: '',
};

const FACTURACION_REQUIRED_FIELDS = [
  ['nit', 'NIT'],
  ['razon_social', 'Razon social'],
  ['direccion', 'Direccion'],
  ['municipio_codigo', 'Municipio DIAN'],
];

const FACTUS_BASE_URLS = {
  SANDBOX: 'https://api-sandbox.factus.com.co',
  PRODUCCION: 'https://api.factus.com.co',
};

const EMPTY_FACTUS_CREDENTIALS = {
  id: null,
  environment: 'SANDBOX',
  base_url: FACTUS_BASE_URLS.SANDBOX,
  client_id: '',
  client_secret: '',
  username: '',
  password: '',
  timeout: 30,
  max_retries: 2,
  verify_ssl: true,
  activo: true,
};

const FACTUS_STATUS_LABELS = {
  SIN_CREDENCIALES: 'Sin credenciales',
  CREDENCIALES_SIN_VALIDAR: 'Sin validar',
  SIN_RANGOS_DIAN: 'Sin rangos DIAN',
  LISTA_SANDBOX: 'Sandbox OK',
  LISTA_PRODUCCION: 'Produccion OK',
  ERROR: 'Error Factus',
};

const getEmpresaFiscalMissingFields = (empresa) =>
  FACTURACION_REQUIRED_FIELDS
    .filter(([field]) => !String(empresa?.[field] || '').trim())
    .map(([, label]) => label);

export default function EmpresasAdminPage() {
  const queryClient = useQueryClient();
  const { toasts, toast, closeToast } = useToast();
  const [empresaForm, setEmpresaForm] = useState(EMPTY_EMPRESA);
  const [ownerForm, setOwnerForm] = useState(EMPTY_OWNER);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [credentialEnvironment, setCredentialEnvironment] = useState('SANDBOX');
  const [credentialForm, setCredentialForm] = useState(EMPTY_FACTUS_CREDENTIALS);
  const [showRanges, setShowRanges] = useState(false);

  const empresasQuery = useQuery({
    queryKey: ['empresas', 'admin'],
    queryFn: listarEmpresasAdmin,
  });
  const empresas = empresasQuery.data?.results || [];
  const isEditing = editingId !== null;
  const selectedEmpresa = empresas.find((empresa) => empresa.id === editingId);

  const credentialsQuery = useQuery({
    queryKey: ['empresas', editingId, 'factus-credentials', credentialEnvironment],
    queryFn: () =>
      obtenerCredencialesFactusEmpresa(editingId, credentialEnvironment),
    enabled: Boolean(editingId),
  });

  const rangesQuery = useQuery({
    queryKey: ['empresas', editingId, 'factus-rangos'],
    queryFn: () => listarRangosFactusEmpresa(editingId),
    enabled: Boolean(editingId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['empresas'] });
  };

  const resetForms = () => {
    setEmpresaForm(EMPTY_EMPRESA);
    setOwnerForm(EMPTY_OWNER);
    setEditingId(null);
    setCredentialEnvironment('SANDBOX');
    setCredentialForm(EMPTY_FACTUS_CREDENTIALS);
    setShowRanges(false);
  };

  const openCreateModal = () => {
    setEmpresaForm(EMPTY_EMPRESA);
    setOwnerForm(EMPTY_OWNER);
    setEditingId(null);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (crearMutation.isPending) {
      return;
    }
    setShowCreateModal(false);
    setEmpresaForm(EMPTY_EMPRESA);
    setOwnerForm(EMPTY_OWNER);
  };

  useEffect(() => {
    const payload = credentialsQuery.data;
    if (!payload) {
      return;
    }

    if (!payload.configured) {
      setCredentialForm({
        ...EMPTY_FACTUS_CREDENTIALS,
        environment: credentialEnvironment,
        base_url: FACTUS_BASE_URLS[credentialEnvironment],
      });
      return;
    }

    setCredentialForm({
      id: payload.id || null,
      environment: payload.environment || credentialEnvironment,
      base_url: payload.base_url || FACTUS_BASE_URLS[credentialEnvironment],
      client_id: payload.client_id || '',
      client_secret: '',
      username: payload.username || '',
      password: '',
      timeout: payload.timeout || 30,
      max_retries: payload.max_retries ?? 2,
      verify_ssl: payload.verify_ssl !== false,
      activo: payload.activo !== false,
      client_id_masked: payload.client_id_masked || '',
      has_client_secret: Boolean(payload.has_client_secret),
      has_password: Boolean(payload.has_password),
    });
  }, [credentialsQuery.data, credentialEnvironment]);

  const crearMutation = useMutation({
    mutationFn: crearEmpresaAdmin,
    onSuccess: () => {
      invalidate();
      resetForms();
      setShowCreateModal(false);
      toast.success('Empresa creada con propietario');
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible crear la empresa'));
    },
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, payload }) => actualizarEmpresaAdmin(id, payload),
    onSuccess: () => {
      invalidate();
      resetForms();
      toast.success('Empresa actualizada');
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible actualizar empresa'));
    },
  });

  const guardarCredencialesMutation = useMutation({
    mutationFn: () =>
      guardarCredencialesFactusEmpresa(editingId, {
        ...credentialForm,
        environment: credentialEnvironment,
        base_url: FACTUS_BASE_URLS[credentialEnvironment],
      }),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({
        queryKey: ['empresas', editingId, 'factus-credentials'],
      });
      toast.success('Credenciales Factus guardadas');
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible guardar credenciales Factus'),
      );
    },
  });

  const validarFactusMutation = useMutation({
    mutationFn: () =>
      validarConexionFactusEmpresa(editingId, credentialEnvironment),
    onSuccess: () => {
      invalidate();
      toast.success('Conexion Factus validada para esta empresa');
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'No fue posible validar Factus'));
    },
  });

  const sincronizarFactusMutation = useMutation({
    mutationFn: () =>
      sincronizarRangosFactusEmpresa(editingId, credentialEnvironment),
    onSuccess: (payload) => {
      invalidate();
      queryClient.invalidateQueries({
        queryKey: ['empresas', editingId, 'factus-rangos'],
      });
      setShowRanges(true);
      toast.success(`Rangos DIAN sincronizados: ${payload.count || 0}`);
    },
    onError: (error) => {
      toast.error(
        extractApiError(error, 'No fue posible sincronizar rangos DIAN'),
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

  const setOwnerField = (field, value) => {
    setOwnerForm((current) => ({ ...current, [field]: value }));
  };

  const setCredentialField = (field, value) => {
    setCredentialForm((current) => ({ ...current, [field]: value }));
  };

  const setFactusEnvironment = (value) => {
    setCredentialEnvironment(value);
    setCredentialForm((current) => ({
      ...current,
      environment: value,
      base_url: FACTUS_BASE_URLS[value],
      client_secret: '',
      password: '',
    }));
  };

  const handleCreate = (event) => {
    event.preventDefault();
    crearMutation.mutate({
      ...empresaForm,
      propietario: ownerForm,
    });
  };

  const handleEdit = (event) => {
    event.preventDefault();
    editarMutation.mutate({
      id: editingId,
      payload: empresaForm,
    });
  };

  const beginEdit = (empresa) => {
    setEditingId(empresa.id);
    setCredentialEnvironment(empresa.ambiente_facturacion || 'SANDBOX');
    setShowRanges(false);
    setEmpresaForm({
      nit: empresa.nit || '',
      digito_verificacion: empresa.digito_verificacion || '',
      razon_social: empresa.razon_social || '',
      nombre_comercial: empresa.nombre_comercial || '',
      email: empresa.email || '',
      telefono: empresa.telefono || '',
      direccion: empresa.direccion || '',
      municipio_codigo: empresa.municipio_codigo || '',
      ambiente_facturacion: empresa.ambiente_facturacion || 'SANDBOX',
      activo: Boolean(empresa.activo),
    });
    setOwnerForm(EMPTY_OWNER);
  };

  const toggleActivo = (empresa) => {
    editarMutation.mutate({
      id: empresa.id,
      payload: { activo: !empresa.activo },
    });
  };

  return (
    <div className="space-y-6">
      <SectionShell
        eyebrow="Mallor interno"
        title={isEditing ? 'Editar empresa' : 'Empresas SaaS'}
        description={
          isEditing
            ? 'Ajusta datos fiscales y operativos del tenant seleccionado.'
            : 'Administra tenants, propietarios, estado fiscal y credenciales Factus.'
        }
      >
        {!isEditing && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-app bg-white/75 p-4">
            <div>
              <div className="eyebrow">Alta de tenant</div>
              <div className="mt-1 text-[14px] font-semibold text-main">
                Crea una empresa y enlazala a su propietario inicial.
              </div>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="app-button-primary min-h-11"
            >
              <Plus className="h-4 w-4" />
              Nueva empresa
            </button>
          </div>
        )}

        {isEditing && (
          <form className="grid gap-4 xl:grid-cols-1" onSubmit={handleEdit}>
            <div className="surface-subtle p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="eyebrow">Empresa en edicion</div>
                <button
                  type="button"
                  onClick={resetForms}
                  className="app-button-secondary min-h-10 px-3"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
              </div>
              <EmpresaFields
                empresaForm={empresaForm}
                setEmpresaField={setEmpresaField}
              />
            </div>

            <div className="surface-subtle p-5">
              <div className="mb-4 eyebrow">Edicion activa</div>
              <div className="grid gap-4">
                <Info
                  label="Empresa"
                  value={empresaForm.nombre_comercial || empresaForm.razon_social || '-'}
                />
                <Field
                  label="Estado"
                  value={empresaForm.activo ? 'Activa' : 'Inactiva'}
                  readOnly
                />
                <Info
                  label="Codigo municipio"
                  value={empresaForm.municipio_codigo || '--'}
                />
                <div className="text-[12px] leading-6 text-soft">
                  Usa este panel para corregir datos fiscales como direccion,
                  NIT y codigo de municipio antes de emitir facturas.
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={editarMutation.isPending}
                className="app-button-primary min-h-11"
              >
                <Save className="h-4 w-4" />
                Guardar cambios
              </button>
            </div>
          </form>
        )}

        {isEditing && (
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="surface-subtle p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="eyebrow">Factus</div>
                  <h3 className="mt-1 text-[16px] font-semibold text-main">
                    Credenciales por facturador
                  </h3>
                </div>
                <StatusBadge
                  status={
                    FACTUS_STATUS_LABELS[
                      selectedEmpresa?.factus_admin_summary?.status
                    ] || 'Sin estado'
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="app-field">
                  <span className="app-field-label">Ambiente Factus</span>
                  <select
                    value={credentialEnvironment}
                    onChange={(event) => setFactusEnvironment(event.target.value)}
                    className="app-select min-h-11"
                  >
                    <option value="SANDBOX">Sandbox</option>
                    <option value="PRODUCCION">Produccion</option>
                  </select>
                </label>
                <Field
                  label="Base URL"
                  value={credentialForm.base_url}
                  readOnly
                  helper="Se define automaticamente por ambiente."
                />
                <Field
                  label="Client ID"
                  value={credentialForm.client_id}
                  onChange={(value) => setCredentialField('client_id', value)}
                  helper={
                    credentialForm.client_id_masked
                      ? `Guardado: ${credentialForm.client_id_masked}`
                      : ''
                  }
                />
                <Field
                  label="Usuario Factus"
                  value={credentialForm.username}
                  onChange={(value) => setCredentialField('username', value)}
                />
                <Field
                  label="Client secret"
                  type="password"
                  value={credentialForm.client_secret}
                  onChange={(value) => setCredentialField('client_secret', value)}
                  helper={
                    credentialForm.has_client_secret
                      ? 'Ya existe. Dejalo vacio para conservarlo.'
                      : 'Requerido al crear credenciales.'
                  }
                />
                <Field
                  label="Password Factus"
                  type="password"
                  value={credentialForm.password}
                  onChange={(value) => setCredentialField('password', value)}
                  helper={
                    credentialForm.has_password
                      ? 'Ya existe. Dejalo vacio para conservarlo.'
                      : 'Requerido al crear credenciales.'
                  }
                />
                <Field
                  label="Timeout"
                  type="number"
                  value={credentialForm.timeout}
                  onChange={(value) => setCredentialField('timeout', Number(value))}
                />
                <Field
                  label="Reintentos"
                  type="number"
                  value={credentialForm.max_retries}
                  onChange={(value) =>
                    setCredentialField('max_retries', Number(value))
                  }
                />
                <label className="flex min-h-11 items-center gap-3 rounded-lg border border-app px-3 text-[13px] text-main">
                  <input
                    type="checkbox"
                    checked={credentialForm.verify_ssl}
                    onChange={(event) =>
                      setCredentialField('verify_ssl', event.target.checked)
                    }
                  />
                  Verificar SSL
                </label>
                <label className="flex min-h-11 items-center gap-3 rounded-lg border border-app px-3 text-[13px] text-main">
                  <input
                    type="checkbox"
                    checked={credentialForm.activo}
                    onChange={(event) =>
                      setCredentialField('activo', event.target.checked)
                    }
                  />
                  Credencial activa
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="app-button-primary min-h-10"
                  disabled={!editingId || guardarCredencialesMutation.isPending}
                  onClick={() => guardarCredencialesMutation.mutate()}
                >
                  <KeyRound className="h-4 w-4" />
                  Guardar credenciales
                </button>
                <button
                  type="button"
                  className="app-button-secondary min-h-10"
                  disabled={!editingId || validarFactusMutation.isPending}
                  onClick={() => validarFactusMutation.mutate()}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Validar conexion
                </button>
                <button
                  type="button"
                  className="app-button-secondary min-h-10"
                  disabled={!editingId || sincronizarFactusMutation.isPending}
                  onClick={() => sincronizarFactusMutation.mutate()}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Sincronizar rangos DIAN
                </button>
                <button
                  type="button"
                  className="app-button-secondary min-h-10"
                  onClick={() => setShowRanges((current) => !current)}
                >
                  {showRanges ? <X className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {showRanges ? 'Ocultar rangos' : 'Ver rangos'}
                </button>
              </div>
            </div>

            <FactusGuide />

            {showRanges && (
              <div className="surface-subtle p-5 xl:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="eyebrow">Consecutivos</div>
                    <h3 className="mt-1 text-[16px] font-semibold text-main">
                      Rangos autorizados via Factus
                    </h3>
                  </div>
                  {rangesQuery.isFetching && (
                    <Loader2 className="h-4 w-4 animate-spin text-soft" />
                  )}
                </div>
                <FactusRangesTable ranges={rangesQuery.data || []} />
              </div>
            )}
          </div>
        )}
      </SectionShell>

      <SectionShell
        eyebrow="Tenants"
        title="Empresas registradas"
        description="El estado inactivo bloquea operacion y facturacion para ese tenant."
      >
        {empresasQuery.isLoading && (
          <div className="flex min-h-[180px] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-soft" />
          </div>
        )}

        <div className="grid gap-3">
          {empresas.map((empresa) => {
            const missingFiscalFields = getEmpresaFiscalMissingFields(empresa);
            const hasFiscalGaps = missingFiscalFields.length > 0;
            const factusSummary = empresa.factus_admin_summary || {};

            return (
              <article
                key={empresa.id}
                className="grid gap-4 rounded-xl border border-app bg-white/75 p-4 xl:grid-cols-[1fr_0.7fr_0.8fr_auto]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-soft" />
                    <div className="text-[14px] font-semibold text-main">
                      {empresa.nombre_comercial || empresa.razon_social}
                    </div>
                  </div>
                  <div className="mt-1 text-[12px] text-soft">
                    NIT {empresa.nit}
                    {empresa.digito_verificacion
                      ? `-${empresa.digito_verificacion}`
                      : ''}
                  </div>
                </div>
                <Info label="Usuarios" value={empresa.usuarios_count} />
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={empresa.activo ? 'ACTIVA' : 'INACTIVA'} />
                  <StatusBadge
                    status={empresa.factus_configured ? 'FACTUS' : 'SIN FACTUS'}
                  />
                  <StatusBadge
                    status={
                      FACTUS_STATUS_LABELS[factusSummary.status]
                      || 'SIN ESTADO FACTUS'
                    }
                  />
                  {factusSummary.sandbox_configured && (
                    <StatusBadge status="Sandbox OK" />
                  )}
                  {factusSummary.production_configured && (
                    <StatusBadge status="Produccion OK" />
                  )}
                  <StatusBadge
                    status={hasFiscalGaps ? 'FISCAL INCOMPLETA' : 'FISCAL OK'}
                  />
                  {hasFiscalGaps && (
                    <div className="w-full text-[12px] leading-5 text-soft">
                      Falta: {missingFiscalFields.join(', ')}
                    </div>
                  )}
                  {factusSummary.status === 'SIN_RANGOS_DIAN' && (
                    <div className="w-full text-[12px] leading-5 text-soft">
                      Pendiente habilitar/asociar consecutivos ante DIAN.
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => beginEdit(empresa)}
                    className="app-button-secondary min-h-10"
                  >
                    <PencilLine className="h-4 w-4" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActivo(empresa)}
                    disabled={editarMutation.isPending}
                    className="app-button-secondary min-h-10"
                  >
                    <Save className="h-4 w-4" />
                    {empresa.activo ? 'Inactivar' : 'Activar'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </SectionShell>

      {showCreateModal && (
        <CreateEmpresaModal
          empresaForm={empresaForm}
          ownerForm={ownerForm}
          onClose={closeCreateModal}
          onSubmit={handleCreate}
          setEmpresaField={setEmpresaField}
          setOwnerField={setOwnerField}
          isPending={crearMutation.isPending}
        />
      )}

      <ToastContainer toasts={toasts} onClose={closeToast} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange = () => {},
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
        required={required}
        value={value || ''}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        className={`app-input min-h-11 ${readOnly ? 'bg-[var(--panel-soft)] text-soft' : ''}`}
      />
      {helper && <span className="text-[12px] text-soft">{helper}</span>}
    </label>
  );
}

function EmpresaFields({ empresaForm, setEmpresaField }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field
        label="NIT"
        value={empresaForm.nit}
        required
        onChange={(value) => setEmpresaField('nit', value)}
      />
      <Field
        label="DV"
        value={empresaForm.digito_verificacion}
        readOnly
        helper="Se calcula automaticamente desde el NIT."
      />
      <Field
        label="Razon social"
        value={empresaForm.razon_social}
        required
        onChange={(value) => setEmpresaField('razon_social', value)}
      />
      <Field
        label="Nombre comercial"
        value={empresaForm.nombre_comercial}
        onChange={(value) => setEmpresaField('nombre_comercial', value)}
      />
      <Field
        label="Email"
        type="email"
        value={empresaForm.email}
        onChange={(value) => setEmpresaField('email', value)}
      />
      <Field
        label="Telefono"
        value={empresaForm.telefono}
        onChange={(value) => setEmpresaField('telefono', value)}
      />
      <label className="app-field">
        <span className="app-field-label">Ambiente</span>
        <select
          value={empresaForm.ambiente_facturacion}
          onChange={(event) =>
            setEmpresaField('ambiente_facturacion', event.target.value)
          }
          className="app-select min-h-11"
        >
          <option value="SANDBOX">Sandbox</option>
          <option value="PRODUCCION">Produccion</option>
        </select>
      </label>
      <label className="app-field md:col-span-2">
        <span className="app-field-label">Direccion</span>
        <input
          value={empresaForm.direccion}
          onChange={(event) =>
            setEmpresaField('direccion', event.target.value)
          }
          className="app-input min-h-11"
        />
      </label>
      <MunicipioLookupField
        className="md:col-span-2"
        label="Municipio DIAN"
        code={empresaForm.municipio_codigo}
        onCodeChange={(value) => setEmpresaField('municipio_codigo', value)}
        helper="Selecciona el municipio y el codigo se asigna automaticamente."
      />
    </div>
  );
}

function OwnerFields({ ownerForm, setOwnerField }) {
  return (
    <div className="grid gap-4">
      <Field
        label="Usuario"
        value={ownerForm.username}
        required
        onChange={(value) => setOwnerField('username', value)}
      />
      <Field
        label="Email"
        type="email"
        value={ownerForm.email}
        required
        onChange={(value) => setOwnerField('email', value)}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Nombre"
          value={ownerForm.first_name}
          onChange={(value) => setOwnerField('first_name', value)}
        />
        <Field
          label="Apellido"
          value={ownerForm.last_name}
          onChange={(value) => setOwnerField('last_name', value)}
        />
      </div>
      <Field
        label="Password"
        type="password"
        value={ownerForm.password}
        required
        onChange={(value) => setOwnerField('password', value)}
      />
      <Field
        label="Confirmar password"
        type="password"
        value={ownerForm.confirm_password}
        required
        onChange={(value) => setOwnerField('confirm_password', value)}
      />
    </div>
  );
}

function CreateEmpresaModal({
  empresaForm,
  ownerForm,
  onClose,
  onSubmit,
  setEmpresaField,
  setOwnerField,
  isPending,
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-app bg-[var(--panel)] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-app bg-[var(--panel)] px-5 py-4">
          <div>
            <div className="eyebrow">Alta de tenant</div>
            <h3 className="mt-1 text-[18px] font-semibold text-main">
              Nueva empresa
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-button-secondary min-h-10 px-3"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="grid gap-4 p-5 xl:grid-cols-[1.2fr_0.8fr]" onSubmit={onSubmit}>
          <div className="surface-subtle p-5">
            <div className="mb-4 eyebrow">Empresa</div>
            <EmpresaFields
              empresaForm={empresaForm}
              setEmpresaField={setEmpresaField}
            />
          </div>
          <div className="surface-subtle p-5">
            <div className="mb-4 eyebrow">Propietario inicial</div>
            <OwnerFields ownerForm={ownerForm} setOwnerField={setOwnerField} />
          </div>
          <div className="flex flex-wrap justify-end gap-2 xl:col-span-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="app-button-secondary min-h-11"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="app-button-primary min-h-11"
            >
              <Plus className="h-4 w-4" />
              Crear empresa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted">
        {label}
      </div>
      <div className="mt-2 text-[14px] font-semibold text-main">{value}</div>
    </div>
  );
}

function FactusGuide() {
  return (
    <div className="surface-subtle p-5">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-soft" />
        <div className="eyebrow">Guia operativa</div>
      </div>
      <div className="space-y-3 text-[13px] leading-6 text-soft">
        <p>1. El facturador habilita sus rangos de numeracion ante la DIAN.</p>
        <p>2. Luego asocia prefijos o rangos al proveedor tecnologico.</p>
        <p>3. Mallor sincroniza los rangos desde Factus y valida si puede emitir.</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          className="app-button-secondary min-h-10"
          href="https://siigonube.portaldeclientes.siigo.com/habilitar-rangos-de-numeracion-de-facturacion-electronica/"
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="h-4 w-4" />
          Habilitar rangos
        </a>
        <a
          className="app-button-secondary min-h-10"
          href="https://siigonube.portaldeclientes.siigo.com/asociar-prefijos-o-rangos-de-numeracion-de-facturacion-electronica/"
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink className="h-4 w-4" />
          Asociar prefijos
        </a>
      </div>
    </div>
  );
}

function FactusRangesTable({ ranges }) {
  if (!ranges.length) {
    return (
      <div className="rounded-lg border border-app bg-white/60 p-4 text-[13px] text-soft">
        Factus no devolvio rangos para esta empresa. El facturador debe
        habilitar y asociar consecutivos antes de emitir.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-[12px]">
        <thead className="text-[10px] uppercase tracking-[0.18em] text-muted">
          <tr>
            <th className="px-3 py-2">Prefijo</th>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2">Desde</th>
            <th className="px-3 py-2">Hasta</th>
            <th className="px-3 py-2">Actual</th>
            <th className="px-3 py-2">Resolucion</th>
            <th className="px-3 py-2">Vigencia</th>
            <th className="px-3 py-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {ranges.map((range) => (
            <tr key={range.id} className="border-t border-app text-main">
              <td className="px-3 py-3 font-semibold">{range.prefix || '-'}</td>
              <td className="px-3 py-3">
                {range.is_credit_note_range ? 'Nota credito' : 'Factura'}
              </td>
              <td className="px-3 py-3">{range.from_number}</td>
              <td className="px-3 py-3">{range.to_number}</td>
              <td className="px-3 py-3">{range.current_number}</td>
              <td className="px-3 py-3">{range.resolution_number || '-'}</td>
              <td className="px-3 py-3">
                {(range.start_date || '--') + ' / ' + (range.end_date || '--')}
              </td>
              <td className="px-3 py-3">
                <StatusBadge status={range.is_active ? 'Activo' : 'Inactivo'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
