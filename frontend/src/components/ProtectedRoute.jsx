import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute() {
  const location = useLocation();
  const { authReady, isAuthenticated, restoreSession } = useAuth();
  const [checking, setChecking] = useState(!authReady);

  useEffect(() => {
    let active = true;
    if (authReady || isAuthenticated) {
      setChecking(false);
      return () => {
        active = false;
      };
    }

    restoreSession()
      .catch(() => null)
      .finally(() => {
        if (active) {
          setChecking(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authReady, isAuthenticated, restoreSession]);

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
