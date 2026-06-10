import { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, LogIn } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { useAuth } from '../hooks/useAuth';
import mallorLogo from '../assets/mallor-logo.png';
import mallorLogoDark from '../assets/mallor-logo-dark.png';
import { getDefaultAuthenticatedPath } from '../utils/roleAccess';

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
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const captchaReady = !siteKey || Boolean(turnstileToken);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.username.trim() || !form.password) {
      setError('Ingrese usuario y contrasena.');
      return;
    }

    setLoading(true);
    try {
      const session = await login({
        username: form.username.trim(),
        password: form.password,
        rememberMe: form.rememberMe,
        turnstileToken,
      });
      const empresaActiva = session.empresas?.find(
        (item) => String(item.id) === String(session.empresa_activa),
      );
      navigate(
        getDefaultAuthenticatedPath({
          role: empresaActiva?.rol_usuario,
          user: session.user,
          nextPath: searchParams.get('next'),
        }),
        { replace: true },
      );
    } catch (requestError) {
      turnstileRef.current?.reset();
      setTurnstileToken('');
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
      <main className="relative flex min-h-screen w-full items-center px-5 py-8 sm:px-8 lg:px-10">
        <section className="grid min-h-[calc(100vh-4rem)] w-full grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div className="flex min-h-[48vh] items-center justify-center lg:min-h-full">
            <div className="relative flex w-full items-center justify-center">
              <div className="pointer-events-none absolute inset-x-[10%] inset-y-[14%] rounded-[56px] bg-[radial-gradient(circle,rgba(47,106,82,0.09)_0%,rgba(47,106,82,0.03)_42%,transparent_74%)] blur-3xl" />
              <div className="relative flex w-full max-w-[520px] items-center justify-center px-6 lg:max-w-[560px]">
                <span className="theme-logo-stack w-full max-w-[460px] lg:max-w-[500px]">
                  <img
                    src={mallorLogo}
                    alt="Mallor"
                    className="theme-logo theme-logo-light h-auto w-full object-contain"
                  />
                  <img
                    src={mallorLogoDark}
                    alt=""
                    aria-hidden="true"
                    className="theme-logo theme-logo-dark h-auto w-full object-contain"
                  />
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center lg:min-h-full">
            <form onSubmit={handleSubmit} className="surface w-full max-w-[430px] p-6 sm:p-7">
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
                <div className="relative">
                  <input
                    className="app-input pr-11"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-soft transition hover:text-main focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
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

              {siteKey && (
                <Turnstile
                  ref={turnstileRef}
                  siteKey={siteKey}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken('')}
                  onError={() => setTurnstileToken('')}
                  options={{ theme: 'auto', size: 'flexible', language: 'es' }}
                />
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[12px] font-semibold text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !captchaReady}
                className="app-button-primary min-h-11 w-full"
              >
                <LogIn className="h-4 w-4" />
                {loading ? 'Validando...' : 'Entrar'}
              </button>

              <div className="text-center">
                <Link
                  to="/forgot-password"
                  className="text-[12px] font-semibold text-soft transition hover:text-main"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
