import { Sparkles } from 'lucide-react';

export default function SugerenciasRapidas({ suggestions = [], onSelect, disabled }) {
  if (!suggestions.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <button
          key={`${suggestion.tool}-${suggestion.label}`}
          type="button"
          onClick={() => onSelect?.(suggestion.consulta)}
          disabled={disabled}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-app bg-white/72 px-3.5 py-2 text-[12px] font-semibold text-soft transition hover:border-[var(--accent-line)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}
