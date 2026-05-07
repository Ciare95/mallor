import { Bot, Copy, ThumbsDown, ThumbsUp, UserRound } from 'lucide-react';

const feedbackOptions = [
  { value: 'UTIL', icon: ThumbsUp, label: 'Util' },
  { value: 'NO_UTIL', icon: ThumbsDown, label: 'No util' },
];

export default function ChatMessage({ message, onFeedback }) {
  const isAssistant = message.role === 'assistant';
  const Icon = isAssistant ? Bot : UserRound;
  const content = message.content || message.respuesta || message.consulta || '';

  const copyMessage = async () => {
    if (!navigator?.clipboard || !content) {
      return;
    }
    await navigator.clipboard.writeText(content);
  };

  return (
    <article
      className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
    >
      {isAssistant && (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]">
          <Icon className="h-4 w-4" />
        </div>
      )}

      <div
        className={`max-w-[min(760px,100%)] rounded-xl border px-4 py-3 ${
          isAssistant
            ? 'border-app bg-white/80 text-main'
            : 'border-[var(--text-main)] bg-[var(--text-main)] text-white'
        }`}
      >
        <div className="whitespace-pre-wrap text-[13px] leading-6">
          {content}
        </div>

        <div
          className={`mt-3 flex flex-wrap items-center gap-2 text-[11px] ${
            isAssistant ? 'text-muted' : 'text-white/72'
          }`}
        >
          {message.herramienta_usada && (
            <span className="rounded-full border border-app bg-white/60 px-2 py-1 font-mono-ui">
              {message.herramienta_usada}
            </span>
          )}
          {message.tiempo_respuesta !== undefined && (
            <span>{Number(message.tiempo_respuesta).toFixed(2)} s</span>
          )}

          {isAssistant && (
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={copyMessage}
                className="flex h-8 w-8 items-center justify-center rounded-md text-soft transition hover:bg-[rgba(24,23,22,0.05)] hover:text-main"
                title="Copiar respuesta"
                aria-label="Copiar respuesta"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {feedbackOptions.map((option) => {
                const FeedbackIcon = option.icon;
                const active = message.feedback === option.value;
                const canSendFeedback = Number.isInteger(message.id);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onFeedback?.(message, option.value)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
                      active
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'text-soft hover:bg-[rgba(24,23,22,0.05)] hover:text-main'
                    }`}
                    title={option.label}
                    aria-label={option.label}
                    disabled={!canSendFeedback}
                  >
                    <FeedbackIcon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {!isAssistant && (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-app bg-white/80 text-soft">
          <Icon className="h-4 w-4" />
        </div>
      )}
    </article>
  );
}
