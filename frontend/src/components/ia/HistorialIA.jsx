import { MessageSquarePlus, Trash2 } from 'lucide-react';

export default function HistorialIA({
  sessions = [],
  activeSessionId,
  onSelectSession,
  onNewSession,
  onClearSession,
  isClearing,
}) {
  return (
    <aside className="surface flex min-h-[360px] flex-col p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Sesiones</div>
          <h2 className="mt-1 text-[15px] font-semibold text-main">
            Historial IA
          </h2>
        </div>
        <button
          type="button"
          onClick={onNewSession}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-app bg-white/70 text-soft transition hover:bg-white hover:text-main"
          title="Nueva sesion"
          aria-label="Nueva sesion"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
        {sessions.length ? (
          sessions.map((session) => {
            const active = session.sesion_id === activeSessionId;
            return (
              <button
                key={session.sesion_id}
                type="button"
                onClick={() => onSelectSession?.(session.sesion_id)}
                className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                  active
                    ? 'border-[var(--accent-line)] bg-[var(--accent-soft)]'
                    : 'border-app bg-white/62 hover:bg-white'
                }`}
              >
                <div className="line-clamp-2 text-[12px] font-semibold text-main">
                  {session.title || 'Sesion IA'}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-muted">
                  <span>{session.count} mensajes</span>
                  <span>{session.dateLabel}</span>
                </div>
              </button>
            );
          })
        ) : (
          <div className="empty-state min-h-[220px]">
            <div className="text-sm font-semibold text-main">
              Sin historial todavia
            </div>
            <div className="mt-2 max-w-[220px] text-[12px] leading-5 text-soft">
              Las conversaciones se guardan solo para la empresa activa y tu usuario.
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onClearSession}
        disabled={!activeSessionId || isClearing}
        className="app-button-secondary mt-4 w-full"
      >
        <Trash2 className="h-4 w-4" />
        Limpiar sesion
      </button>
    </aside>
  );
}
