'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

type Symbol = { ticker: string; description: string; category: string };

interface Props {
  value?: string;
  onSelect: (ticker: string, description: string, category: string) => void;
  placeholder?: string;
  category?: string;
  className?: string;
  autoFocus?: boolean;
}

const CATEGORY_BADGE: Record<string, string> = {
  Forex: 'badge-dim',
  Nasdaq: 'badge-accent',
  Indexes: 'badge-warn',
  Metals: 'badge-long',
};

export default function TickerSearch({ value, onSelect, placeholder = 'Search ticker…', category, className, autoFocus }: Props) {
  const [query, setQuery] = useState(value ?? '');
  const [results, setResults] = useState<Symbol[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); setOpen(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ q, limit: '15' });
    if (category) params.set('category', category);
    const res = await fetch(`/api/tickers/search?${params}`);
    const data = await res.json();
    setResults(data);
    setOpen(data.length > 0);
    setHighlight(0);
    setLoading(false);
  }, [category]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 120);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (s: Symbol) => {
    setQuery(s.ticker);
    setOpen(false);
    onSelect(s.ticker, s.description, s.category);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter' && results[highlight]) { e.preventDefault(); select(results[highlight]); }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="relative" style={{ minWidth: 0 }}>
      <div className="relative">
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value.toUpperCase()); }}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          onKeyDown={handleKey}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`inp ${className ?? 'w-full'}`}
          style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase', paddingRight: '2rem' }}
          autoComplete="off"
          spellCheck={false}
        />
        {loading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text4)] text-xs">…</div>
        )}
      </div>

      {open && results.length > 0 && (
        <div ref={dropRef}
          className="absolute z-50 w-full mt-1 rounded-lg border border-[var(--border)] shadow-lg overflow-hidden"
          style={{ background: 'var(--panel)', maxHeight: 280, overflowY: 'auto', minWidth: 240 }}>
          {results.map((s, i) => (
            <div key={s.ticker}
              onMouseDown={() => select(s)}
              onMouseEnter={() => setHighlight(i)}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
              style={{
                background: i === highlight ? 'var(--accent-dim)' : 'transparent',
                borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
              <span className="font-mono font-bold text-sm shrink-0" style={{ minWidth: 72, color: 'var(--text)' }}>
                {s.ticker}
              </span>
              <span className="text-xs text-[var(--text3)] truncate flex-1">{s.description}</span>
              <span className={`badge shrink-0 ${CATEGORY_BADGE[s.category] ?? 'badge-dim'}`}
                style={{ fontSize: 9 }}>
                {s.category}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
