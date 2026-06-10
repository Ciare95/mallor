import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { forgotPassword } from '../services/auth.service';
import mallorLogo from '../assets/mallor-logo.png';
import mallorLogoDark from '../assets/mallor-logo-dark.png';

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('Ingresa tu nombre de usuario.');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(username.trim());
      setSent(true);
    } catch {
      setError('No fue posible enviar el correo. Intenta de nuevo.');
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
                  <Mail className="h-4 w-4" />
                </div>
                <h2 className="mt-4 section-title">Recuperar contraseña</h2>
                <p className="mt-1 text-[13px] text-muted">
                  Ingresa tu usuario y enviaremos las instrucciones al correo registrado en tu cuenta.
                </p>
              </div>

              {sent ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-3 text-[13px] font-semibold text-green-700">
                    Si el usuario existe y tiene correo registrado, recibirás las instrucciones en breve. Revisa también tu carpeta de spam.
                  </div>
                  <Link
                    to="/login"
                    className="flex items-center gap-2 text-[13px] font-semibold text-soft transition hover:text-main"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver al inicio de sesión
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="app-field">
                    <span className="app-field-label">Usuario</span>
                    <input
                      className="app-input"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
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
                    <Send className="h-4 w-4" />
                    {loading ? 'Enviando...' : 'Enviar instrucciones'}
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
