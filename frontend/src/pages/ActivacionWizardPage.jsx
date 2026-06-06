import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Key, Loader2, WifiOff, Zap } from 'lucide-react';
import { activarLicencia } from '../services/licencias.service';

const STEP = {
  BIENVENIDA: 1,
  CLAVE: 2,
  CONECTANDO: 3,
  EXITO: 4,
  LOCAL_CONFIRMADO: 5,
};

export default function ActivacionWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEP.BIENVENIDA);
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleActivar() {
    if (!licenseKey.trim()) {
      setError('Ingresa tu clave de activación.');
      return;
    }
    setError('');
    setStep(STEP.CONECTANDO);
    try {
      const data = await activarLicencia(licenseKey.trim());
      setResult(data);
      setStep(STEP.EXITO);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'No se pudo activar la clave. Verifica tu conexión a internet e inténtalo de nuevo.';
      setError(msg);
      setStep(STEP.CLAVE);
    }
  }

  function handleLocalSinSync() {
    setStep(STEP.LOCAL_CONFIRMADO);
  }

  function handleContinuar() {
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-app text-main flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="eyebrow mb-1">Mallor</div>
          <h1 className="text-2xl font-bold text-main">Configuración inicial</h1>
          <p className="mt-1 text-sm text-soft">
            Paso {Math.min(step, 4)} de 4
          </p>
        </div>

        <div className="surface rounded-2xl p-6 shadow-sm">
          {/* ── Paso 1: Bienvenida ── */}
          {step === STEP.BIENVENIDA && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <Zap className="h-7 w-7 text-accent" />
                </div>
                <h2 className="text-lg font-semibold text-main">
                  Bienvenido a Mallor Local
                </h2>
                <p className="text-sm text-soft leading-relaxed">
                  Tu aplicación está instalada. Para activar la sincronización con
                  Mallor Cloud (plan Híbrido) necesitas una clave de activación.
                </p>
              </div>

              <p className="text-sm font-medium text-main text-center">
                ¿Tienes una clave de activación?
              </p>

              <div className="flex flex-col gap-3">
                <button
                  className="app-button-primary"
                  onClick={() => setStep(STEP.CLAVE)}
                >
                  Sí, tengo mi clave
                </button>
                <button
                  className="app-button-secondary"
                  onClick={handleLocalSinSync}
                >
                  No, usar solo en modo local
                </button>
              </div>
            </div>
          )}

          {/* ── Paso 2: Ingresar clave ── */}
          {step === STEP.CLAVE && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <Key className="h-7 w-7 text-accent" />
                </div>
                <h2 className="text-lg font-semibold text-main">
                  Clave de activación
                </h2>
                <p className="text-sm text-soft">
                  Ingresa la clave que te entregó el equipo de Mallor.
                </p>
              </div>

              <div className="app-field">
                <label className="app-field-label">Clave de activación</label>
                <input
                  className={`app-input font-mono tracking-widest uppercase ${
                    error ? 'border-danger' : ''
                  }`}
                  type="text"
                  placeholder="MALLOR-HYB-XXXXXXXX-XXXX"
                  value={licenseKey}
                  onChange={(e) => {
                    setLicenseKey(e.target.value.toUpperCase());
                    setError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleActivar()}
                  autoFocus
                />
                {error && (
                  <p className="mt-1 text-xs text-danger">{error}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  className="app-button-secondary flex-1"
                  onClick={() => { setStep(STEP.BIENVENIDA); setError(''); }}
                >
                  Atrás
                </button>
                <button
                  className="app-button-primary flex-1"
                  onClick={handleActivar}
                  disabled={!licenseKey.trim()}
                >
                  Activar
                </button>
              </div>
            </div>
          )}

          {/* ── Paso 3: Conectando ── */}
          {step === STEP.CONECTANDO && (
            <div className="flex flex-col items-center gap-5 py-6 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-accent" />
              <div>
                <h2 className="text-base font-semibold text-main">
                  Verificando clave...
                </h2>
                <p className="mt-1 text-sm text-soft">
                  Conectando con el servidor de Mallor Cloud.
                </p>
              </div>
            </div>
          )}

          {/* ── Paso 4: Éxito híbrido ── */}
          {step === STEP.EXITO && result && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="text-lg font-semibold text-main">
                  Mallor Híbrido activado
                </h2>
              </div>

              <div className="rounded-xl border border-app bg-panel/60 px-4 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-soft">Empresa</span>
                  <span className="font-medium text-main">{result.empresa_nombre || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-soft">Plan</span>
                  <span className="font-medium text-main">{result.plan || 'HYBRID'}</span>
                </div>
                {result.support_until && (
                  <div className="flex justify-between">
                    <span className="text-soft">Soporte hasta</span>
                    <span className="font-medium text-main">{result.support_until}</span>
                  </div>
                )}
              </div>

              <p className="text-center text-xs text-soft">
                Los datos se sincronizarán automáticamente cuando haya conexión a internet.
              </p>

              <button className="app-button-primary w-full" onClick={handleContinuar}>
                Continuar a Mallor
              </button>
            </div>
          )}

          {/* ── Paso 5: Local sin sync ── */}
          {step === STEP.LOCAL_CONFIRMADO && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10">
                  <WifiOff className="h-7 w-7 text-warning" />
                </div>
                <h2 className="text-lg font-semibold text-main">
                  Modo local activado
                </h2>
                <p className="text-sm text-soft leading-relaxed">
                  Mallor funcionará completamente sin internet. Tus datos se guardan
                  solo en este equipo.
                </p>
              </div>

              <div className="rounded-xl border border-app bg-panel/60 px-4 py-3 text-sm text-soft">
                Si en el futuro adquieres el plan Híbrido, podrás activar la
                sincronización desde{' '}
                <span className="font-medium text-main">
                  Mi empresa → Configuración
                </span>
                .
              </div>

              <button className="app-button-primary w-full" onClick={handleContinuar}>
                Continuar a Mallor
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Mallor · Ayuda: soporte@mallor.com
        </p>
      </div>
    </div>
  );
}
