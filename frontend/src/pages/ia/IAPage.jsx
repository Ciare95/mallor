import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Loader2, SendHorizontal, ShieldCheck } from 'lucide-react';
import ChatMessage from '../../components/ia/ChatMessage';
import HistorialIA from '../../components/ia/HistorialIA';
import SugerenciasRapidas from '../../components/ia/SugerenciasRapidas';
import {
  enviarConsultaIA,
  enviarFeedbackIA,
  limpiarHistorialIA,
  listarHistorialIA,
  obtenerSugerenciasIA,
} from '../../services/ia.service';
import { useAppStore } from '../../store/useStore';

const newSessionId = () => crypto.randomUUID();

const toMessages = (historyItems = [], pendingMessages = []) => {
  const historyMessages = [...historyItems].reverse().flatMap((item) => [
    {
      id: `u-${item.id}`,
      role: 'user',
      content: item.consulta,
    },
    {
      id: item.id,
      role: 'assistant',
      content: item.respuesta,
      herramienta_usada: item.herramienta_usada,
      tiempo_respuesta: item.tiempo_respuesta,
      feedback: item.feedback,
    },
  ]);
  return [...historyMessages, ...pendingMessages];
};

const buildSessions = (items = []) => {
  const bySession = new Map();
  items.forEach((item) => {
    const current = bySession.get(item.sesion_id) || {
      sesion_id: item.sesion_id,
      title: item.consulta,
      count: 0,
      latest: item.created_at,
    };
    current.count += 1;
    if (new Date(item.created_at) > new Date(current.latest)) {
      current.latest = item.created_at;
      current.title = item.consulta;
    }
    bySession.set(item.sesion_id, current);
  });
  return [...bySession.values()]
    .sort((a, b) => new Date(b.latest) - new Date(a.latest))
    .map((session) => ({
      ...session,
      dateLabel: new Date(session.latest).toLocaleDateString('es-CO', {
        month: 'short',
        day: '2-digit',
      }),
    }));
};

export default function IAPage() {
  const queryClient = useQueryClient();
  const empresaActivaId = useAppStore((state) => state.empresaActivaId);
  const empresaActiva = useAppStore((state) => state.empresaActiva);
  const iaSesionActivaId = useAppStore((state) => state.iaSesionActivaId);
  const setIaSesionActivaId = useAppStore((state) => state.setIaSesionActivaId);
  const resetIaSession = useAppStore((state) => state.resetIaSession);
  const [draft, setDraft] = useState('');
  const [pendingMessages, setPendingMessages] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    resetIaSession();
  }, [empresaActivaId, resetIaSession]);

  useEffect(() => {
    if (!iaSesionActivaId) {
      setIaSesionActivaId(newSessionId());
    }
  }, [iaSesionActivaId, setIaSesionActivaId]);

  const suggestionsQuery = useQuery({
    queryKey: ['ia', 'sugerencias', empresaActivaId],
    queryFn: obtenerSugerenciasIA,
    enabled: Boolean(empresaActivaId),
  });

  const allHistoryQuery = useQuery({
    queryKey: ['ia', 'historial', empresaActivaId, 'all'],
    queryFn: () => listarHistorialIA(),
    enabled: Boolean(empresaActivaId),
  });

  const activeHistoryQuery = useQuery({
    queryKey: ['ia', 'historial', empresaActivaId, iaSesionActivaId],
    queryFn: () => listarHistorialIA({ sesionId: iaSesionActivaId }),
    enabled: Boolean(empresaActivaId && iaSesionActivaId),
  });

  const chatMutation = useMutation({
    mutationFn: enviarConsultaIA,
    onSuccess: (data) => {
      setIaSesionActivaId(data.sesion_id);
      setPendingMessages([]);
      queryClient.invalidateQueries({ queryKey: ['ia', 'historial', empresaActivaId] });
    },
    onError: (error) => {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        'No fue posible completar la consulta IA.';
      setPendingMessages((current) => [
        ...current.filter((item) => !item.pending),
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: message,
        },
      ]);
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: enviarFeedbackIA,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia', 'historial', empresaActivaId] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: limpiarHistorialIA,
    onSuccess: () => {
      setPendingMessages([]);
      queryClient.invalidateQueries({ queryKey: ['ia', 'historial', empresaActivaId] });
    },
  });

  const historyItems = activeHistoryQuery.data?.results || [];
  const messages = useMemo(
    () => toMessages(historyItems, pendingMessages),
    [historyItems, pendingMessages],
  );
  const sessions = useMemo(
    () => buildSessions(allHistoryQuery.data?.results || []),
    [allHistoryQuery.data?.results],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, chatMutation.isPending]);

  const send = (text = draft) => {
    const consulta = text.trim();
    if (!consulta || chatMutation.isPending || !iaSesionActivaId) {
      return;
    }
    setDraft('');
    setPendingMessages([
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: consulta,
        pending: true,
      },
      {
        id: `typing-${Date.now()}`,
        role: 'assistant',
        content: 'Analizando dentro de la empresa activa...',
        pending: true,
      },
    ]);
    chatMutation.mutate({
      consulta,
      sesionId: iaSesionActivaId,
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const handleNewSession = () => {
    setPendingMessages([]);
    setIaSesionActivaId(newSessionId());
  };

  const suggestions = suggestionsQuery.data?.results || [];
  const role = empresaActiva?.rol_usuario || 'Sin rol';

  return (
    <div className="grid min-h-[calc(100vh-170px)] gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <HistorialIA
        sessions={sessions}
        activeSessionId={iaSesionActivaId}
        onSelectSession={(sessionId) => {
          setPendingMessages([]);
          setIaSesionActivaId(sessionId);
        }}
        onNewSession={handleNewSession}
        onClearSession={() => clearMutation.mutate({ sesionId: iaSesionActivaId })}
        isClearing={clearMutation.isPending}
      />

      <section className="surface flex min-h-[620px] flex-col overflow-hidden">
        <div className="border-b border-app px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="eyebrow">Asistente IA</div>
                <h1 className="font-display text-[1.9rem] leading-none text-main">
                  Consulta segura del negocio
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="app-pill border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <ShieldCheck className="h-3.5 w-3.5" />
                {role}
              </span>
              <span className="app-pill">
                {empresaActiva?.nombre_comercial ||
                  empresaActiva?.razon_social ||
                  'Empresa activa'}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <SugerenciasRapidas
              suggestions={suggestions}
              onSelect={send}
              disabled={chatMutation.isPending || !iaSesionActivaId}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[rgba(255,255,255,0.36)] px-5 py-5">
          {messages.length ? (
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onFeedback={(target, feedback) =>
                    feedbackMutation.mutate({
                      mensajeId: target.id,
                      feedback,
                    })
                  }
                />
              ))}
              {chatMutation.isPending && (
                <div className="flex items-center gap-2 text-[12px] font-semibold text-soft">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validando permisos y herramientas...
                </div>
              )}
              <div ref={endRef} />
            </div>
          ) : (
            <div className="empty-state h-full min-h-[360px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Bot className="h-5 w-5" />
              </div>
              <div className="mt-4 text-lg font-semibold text-main">
                Haz una consulta operativa
              </div>
              <div className="mt-2 max-w-[520px] text-[13px] leading-6 text-soft">
                El asistente solo usa herramientas de lectura aprobadas para la empresa activa.
                No ejecuta SQL generado por IA ni expone credenciales.
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
          className="border-t border-app bg-panel-strong px-5 py-4"
        >
          <div className="flex items-end gap-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={2000}
              className="app-textarea max-h-40 min-h-[48px] resize-none"
              placeholder="Pregunta por ventas, inventario, cartera o indicadores permitidos..."
              disabled={chatMutation.isPending || !empresaActivaId}
            />
            <button
              type="submit"
              className="app-button-primary h-12 px-4"
              disabled={!draft.trim() || chatMutation.isPending || !empresaActivaId}
            >
              {chatMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
              Enviar
            </button>
          </div>
          <div className="mt-2 flex justify-between gap-3 text-[11px] text-muted">
            <span>Enter envia. Shift+Enter agrega linea.</span>
            <span>{draft.length}/2000</span>
          </div>
        </form>
      </section>
    </div>
  );
}
