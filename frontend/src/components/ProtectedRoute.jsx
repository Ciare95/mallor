import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { obtenerEstadoOffline } from '../services/offline.service';

export default function ProtectedRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { authReady, isAuthenticated, restoreSession } = useAuth();
  const [checking, setChecking] = useState(!authReady);

  useEffect(() => {
    let active = true;

    async function init() {
      if (!authReady && !isAuthenticated) {
        try {
          await restoreSession();
        } catch {
          // not authenticated — handled below
        }
      }

      if (!active) return;
      setChecking(false);
    }

    init();
    return () => {
      active = false;
    };
  }, [authReady, isAuthenticated, restoreSession]);

  // After auth is ready, check if local setup is complete (only once, not on /activar itself)
  useEffect(() => {
    if (!isAuthenticated || checking) return;
    if (location.pathname === '/activar') return;

    obtenerEstadoOffline()
      .then((data) => {
        if (data?.local_server && data?.setup_completed === false) {
          navigate('/activar', { replace: true });
        }
      })
      .catch(() => null);
  }, [isAuthenticated, checking, location.pathname, navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-app text-main">
        <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-6">
          <div className="surface px-6 py-5 text-center">
            <div className="eyebrow">Mallor</div>
            <div className="mt-2 text-sm font-semibold text-soft">
              Restaurando sesion segura...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return <Outlet />;
}
