import { useEffect, useId, useMemo, useState } from 'react';
import { ChevronDown, MapPinned } from 'lucide-react';
import {
  findMunicipioByCode,
  findMunicipioByName,
  searchMunicipios,
} from '../../data/dianMunicipios';

export default function MunicipioLookupField({
  label = 'Municipio',
  code,
  onCodeChange,
  onMunicipioSelect,
  disabled = false,
  required = false,
  helper = 'Busca por nombre o por codigo DIAN.',
  codeLabel = 'Codigo municipio',
  className = '',
  error,
  onBlur,
}) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const match = findMunicipioByCode(code);
    if (match) {
      setQuery(match.name);
      return;
    }
    if (!code) {
      setQuery('');
    }
  }, [code]);

  const options = useMemo(
    () => searchMunicipios(query || code || '', 10),
    [code, query],
  );

  const currentMunicipio = findMunicipioByCode(code);

  const selectMunicipio = (municipio) => {
    setQuery(municipio.name);
    onCodeChange(municipio.code);
    onMunicipioSelect?.(municipio);
    setIsOpen(false);
  };

  const handleChange = (value) => {
    setQuery(value);
    setIsOpen(true);

    if (!value.trim()) {
      onCodeChange('');
      onMunicipioSelect?.(null);
      return;
    }

    const exactByName = findMunicipioByName(value);
    if (exactByName) {
      onCodeChange(exactByName.code);
      onMunicipioSelect?.(exactByName);
      return;
    }

    const exactByCode = findMunicipioByCode(value);
    if (exactByCode) {
      selectMunicipio(exactByCode);
      return;
    }

    onCodeChange('');
    onMunicipioSelect?.(null);
  };

  return (
    <div className={`grid gap-4 lg:grid-cols-[1fr_0.32fr] ${className}`.trim()}>
      <label className="app-field relative">
        <span className="app-field-label">{label}</span>
        <div className="relative">
          <input
            type="text"
            value={query}
            required={required}
            disabled={disabled}
            placeholder="Ejemplo: Bogota"
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setIsOpen(false), 120);
              onBlur?.();
            }}
            onChange={(event) => handleChange(event.target.value)}
            className={`app-input min-h-11 pr-10 ${error ? 'border-[var(--danger)]' : ''}`}
            aria-expanded={isOpen}
            aria-controls={listId}
            aria-autocomplete="list"
          />
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soft" />
        </div>
        {helper && <span className="text-[12px] text-soft">{helper}</span>}
        {error && <span className="text-[12px] text-[var(--danger)]">{error}</span>}
        {isOpen && !disabled && options.length > 0 && (
          <div
            id={listId}
            className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 overflow-hidden rounded-xl border border-app bg-white shadow-[0_14px_30px_rgba(15,23,42,0.14)]"
          >
            <div className="max-h-72 overflow-auto py-1">
              {options.map((municipio) => (
                <button
                  key={municipio.code}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectMunicipio(municipio)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[var(--panel-soft)]"
                >
                  <span className="flex items-center gap-2 text-[13px] text-main">
                    <MapPinned className="h-4 w-4 text-soft" />
                    {municipio.name}
                  </span>
                  <span className="font-mono-ui text-[12px] text-soft">
                    {municipio.code}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </label>

      <label className="app-field">
        <span className="app-field-label">{codeLabel}</span>
        <input
          type="text"
          value={currentMunicipio?.code || code || ''}
          readOnly
          disabled={disabled}
          className="app-input min-h-11"
        />
      </label>
    </div>
  );
}
