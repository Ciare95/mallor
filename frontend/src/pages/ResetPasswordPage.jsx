import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
import { resetPassword } from '../services/auth.service';
import mallorLogo from '../assets/mallor-logo.png';
import mallorLogoDark from '../assets/mallor-logo-dark.png';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = searchParams.get('uid') ?? '';
  const token = searchParams.get('token') ?? '';

  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!uid || !token) {
      setError('Enlace inválido. Solicita uno nuevo.');
      return;
    }
    if (form.newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (form.newPassword !== form.confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ uid, token, newPassword: form.newPassword });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch (err) {
      const detail =
        err.response?.data?.token?.[0] ||
        err.response?.data?.uid?.[0] ||
        err.response?.data?.new_password?.[0] ||
        err.response?.data?.detail ||
        'No fue posible actualizar la contraseña.';
      setError(detail);
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
                  <img src={mallorLogo} alt="Mallor" className="theme-logo theme-logo-light h-auto w-full object-contain" />
                  <img src={mallorLogoDark} alt="" aria-hidden="true" className="theme-logo theme-logo-dark h-auto w-full object-contain" />
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center lg:min-h-full">
            <div className="surface w-full max-w-[430px] p-6 sm:p-7">
              <div className="mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-app bg-white/70 text-soft">
                  <KeyRound className="h-4 w-4" />
                </div>
                <h2 className="mt-4 section-title">Nueva contraseña</h2>
                <p className="mt-1 text-[13px] text-muted">
                  Elige una contraseña segura de al menos 8 caracteres.
                </p>
              </div>

              {done ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 px-3.5 py-3 text-[13px] font-semibold text-green-700">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    Contraseña actualizada. Redirigiendo al inicio de sesión...
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="app-field">
                    <span className="app-field-label">Nueva contraseña</span>
                    <div className="relative">
                      <input
                        className="app-input pr-11"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={form.newPassword}
                        onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-soft transition hover:text-main focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>

                  <label className="app-field">
                    <span className="app-field-label">Confirmar contraseña</span>
                    <input
                      className="app-input"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={form.confirm}
                      onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
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
                    <KeyRound className="h-4 w-4" />
                    {loading ? 'Guardando...' : 'Guardar contraseña'}
                  </button>

                  <Link
                    to="/login"
                    className="flex items-center gap-2 text-[13px] font-semibold text-soft transition hover:text-main"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver al inicio de sesión
                  </Link>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
