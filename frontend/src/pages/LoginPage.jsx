import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, LockKeyhole, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [form, setForm] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.username.trim() || !form.password) {
      setError('Ingrese usuario y contrasena.');
      return;
    }

    setLoading(true);
    try {
      await login({
        username: form.username.trim(),
        password: form.password,
        rememberMe: form.rememberMe,
      });
      navigate(searchParams.get('next') || '/', { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail
        || requestError.response?.data?.non_field_errors?.[0]
        || 'No fue posible iniciar sesion.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app text-main">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(24,23,22,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(24,23,22,0.03)_1px,transparent_1px)] [background-size:32px_32px]" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-10">
        <section className="grid w-full gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-app bg-[var(--accent-soft)] text-[var(--accent)]">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-[2rem] leading-none">
                  Mallor
                </div>
                <div className="eyebrow">consola operativa</div>
              </div>
            </div>
            <h1 className="font-display text-[3.2rem] leading-[0.95] text-main sm:text-[4.6rem]">
              Acceso seguro para equipos multitenant.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-soft">
              La sesion identifica al usuario. La empresa activa, los permisos
              y el alcance de datos se validan en cada solicitud.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="surface p-6 sm:p-7">
            <div className="mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-app bg-white/70 text-soft">
                <LockKeyhole className="h-4 w-4" />
              </div>
              <h2 className="mt-4 section-title">Iniciar sesion</h2>
            </div>

            <div className="space-y-4">
              <label className="app-field">
                <span className="app-field-label">Usuario</span>
                <input
                  className="app-input"
                  autoComplete="username"
                  value={form.username}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="app-field">
                <span className="app-field-label">Contrasena</span>
                <input
                  className="app-input"
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-lg border border-app bg-white/60 px-3.5 py-3">
                <span>
                  <span className="block text-[13px] font-semibold">
                    Recordarme
                  </span>
                  <span className="block text-[11px] text-muted">
                    Mantiene el refresh activo por mas tiempo.
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--accent)]"
                  checked={form.rememberMe}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rememberMe: event.target.checked,
                    }))
                  }
                />
              </label>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[12px] font-semibold text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="app-button-primary min-h-11 w-full"
              >
                <LogIn className="h-4 w-4" />
                {loading ? 'Validando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
