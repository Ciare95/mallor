import { useEffect, useState } from 'react';
import { CheckCircle, Copy, Key, PlusCircle, ShieldOff, XCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useToast from '../../hooks/useToast';
import Toast from '../../components/ui/Toast';
import {
  listarLicenciasAdmin,
  crearLicenciaAdmin,
  revocarLicenciaAdmin,
} from '../../services/licencias.service';
import { listarEmpresasAdmin } from '../../services/empresas.service';

const STATUS_LABEL = {
  ACTIVE: 'Activa',
  GRACE: 'Gracia',
  EXPIRED: 'Expirada',
  REVOKED: 'Revocada',
};

const STATUS_CLASS = {
  ACTIVE: 'app-pill--success',
  GRACE: 'app-pill--warning',
  EXPIRED: 'app-pill--danger',
  REVOKED: 'app-pill--danger',
};

const PLAN_OPTIONS = [
  { value: 'HYBRID', label: 'Híbrido (Local + Cloud)' },
  { value: 'LOCAL_LIFETIME', label: 'Local vitalicio' },
];

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Key className="h-10 w-10 text-muted" />
      <p className="text-sm font-semibold text-soft">Sin licencias registradas</p>
      <p className="text-xs text-muted">Crea la primera licencia para un cliente.</p>
    </div>
  );
}

function NuevaLicenciaModal({ empresas, onClose, onCreada }) {
  const [form, setForm] = useState({
    empresa_id: '',
    plan: 'HYBRID',
    support_until: '',
    purchased_at: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.empresa_id) { setError('Selecciona una empresa.'); return; }
    setLoading(true);
    setError('');
    try {
      const created = await crearLicenciaAdmin({
        empresa_id: Number(form.empresa_id),
        plan: form.plan,
        support_until: form.support_until || null,
        purchased_at: form.purchased_at || null,
        status: 'ACTIVE',
      });
      onCreada(created);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        Object.values(err?.response?.data || {})[0] ||
        'Error al crear la licencia.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="surface w-full max-w-md rounded-2xl p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-main">Nueva licencia</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="app-field">
            <label className="app-field-label">Empresa</label>
            <select
              className={`app-input ${!form.empresa_id ? 'text-soft' : ''}`}
              value={form.empresa_id}
              onChange={(e) => setForm((f) => ({ ...f, empresa_id: e.target.value }))}
            >
              <option value="">Seleccionar empresa...</option>
              {(empresas?.results || empresas || []).map((e) => (
                <option key={e.id} value={e.id}>{e.razon_social}</option>
              ))}
            </select>
          </div>

          <div className="app-field">
            <label className="app-field-label">Plan</label>
            <select
              className="app-input"
              value={form.plan}
              onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="app-field">
              <label className="app-field-label">Fecha de compra</label>
              <input
                type="date"
                className="app-input"
                value={form.purchased_at}
                onChange={(e) => setForm((f) => ({ ...f, purchased_at: e.target.value }))}
              />
            </div>
            <div className="app-field">
              <label className="app-field-label">Soporte hasta</label>
              <input
                type="date"
                className="app-input"
                value={form.support_until}
                onChange={(e) => setForm((f) => ({ ...f, support_until: e.target.value }))}
              />
            </div>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" className="app-button-secondary flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="app-button-primary flex-1" disabled={loading}>
              {loading ? 'Creando...' : 'Crear licencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CopiarKeyBtn({ licenseKey }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="Copiar clave"
      className="flex items-center gap-1.5 rounded-lg border border-app bg-panel/60 px-2.5 py-1 text-xs font-mono text-soft transition hover:text-main"
    >
      {copied ? (
        <CheckCircle className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      <span className="tracking-wider">{licenseKey}</span>
    </button>
  );
}

export default function AdminLicenciasPage() {
  const queryClient = useQueryClient();
  const { toasts, toast, closeToast } = useToast();
  const [showModal, setShowModal] = useState(false);

  const { data: licencias, isLoading } = useQuery({
    queryKey: ['admin-licencias'],
    queryFn: listarLicenciasAdmin,
  });

  const { data: empresas } = useQuery({
    queryKey: ['empresas-admin-all'],
    queryFn: listarEmpresasAdmin,
  });

  const revocarMutation = useMutation({
    mutationFn: (id) => revocarLicenciaAdmin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-licencias'] });
      toast.success('Licencia revocada.');
    },
    onError: () => toast.error('No se pudo revocar la licencia.'),
  });

  function handleCreada(license) {
    queryClient.invalidateQueries({ queryKey: ['admin-licencias'] });
    setShowModal(false);
    toast.success(`Licencia creada: ${license.license_key}`);
  }

  function handleRevocar(license) {
    if (!window.confirm(`¿Revocar la licencia de ${license.empresa_nombre}? Esta acción deshabilitará el sync en el equipo del cliente.`)) return;
    revocarMutation.mutate(license.id);
  }

  const rows = Array.isArray(licencias) ? licencias : (licencias?.results ?? []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Toast toasts={toasts} onClose={closeToast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-main">Licencias de clientes</h1>
          <p className="mt-0.5 text-sm text-soft">
            Genera y gestiona las claves de activación de planes Mallor.
          </p>
        </div>
        <button
          className="app-button-primary flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <PlusCircle className="h-4 w-4" />
          Nueva licencia
        </button>
      </div>

      {/* Tabla */}
      <div className="surface overflow-hidden rounded-2xl">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-soft">Cargando...</div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app text-left text-xs text-muted">
                  <th className="px-4 py-3 font-semibold">Empresa</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Soporte hasta</th>
                  <th className="px-4 py-3 font-semibold">Clave</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {rows.map((lic) => (
                  <tr key={lic.id} className="hover:bg-panel/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-main">
                      {lic.empresa_nombre || '—'}
                    </td>
                    <td className="px-4 py-3 text-soft">{lic.plan}</td>
                    <td className="px-4 py-3">
                      <span className={`app-pill ${STATUS_CLASS[lic.status] ?? ''}`}>
                        {STATUS_LABEL[lic.status] ?? lic.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-soft">
                      {lic.support_until ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <CopiarKeyBtn licenseKey={lic.license_key} />
                    </td>
                    <td className="px-4 py-3">
                      {lic.status !== 'REVOKED' && (
                        <button
                          onClick={() => handleRevocar(lic)}
                          title="Revocar licencia"
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-danger/80 hover:bg-danger/10 hover:text-danger transition"
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                          Revocar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <NuevaLicenciaModal
          empresas={empresas}
          onClose={() => setShowModal(false)}
          onCreada={handleCreada}
        />
      )}
    </div>
  );
}
