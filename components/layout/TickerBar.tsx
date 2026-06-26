'use client';
import { useState, useEffect } from 'react';
import { TICKERS } from '@/lib/data';
import type { TickerItem } from '@/lib/types';

export default function TickerBar() {
  const [time, setTime] = useState(new Date());
  const [tickers, setTickers] = useState<TickerItem[]>(TICKERS);
  const [live, setLive] = useState(false);

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/tickers');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) { setTickers(data); setLive(true); }
      } catch {}
    };
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="ticker-bar">
      <span style={{ color: 'var(--text4)', marginRight: 4, fontWeight: 700, flexShrink: 0, fontSize: 9, letterSpacing: '.06em' }}>
        {live ? <span style={{ color: 'var(--long)' }}>● LIVE</span> : 'MARKET'}
      </span>
      {tickers.map((t, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ color: 'var(--text2)', fontWeight: 600 }}>{t.sym}</span>
          <span style={{ color: 'var(--text)' }}>{t.val}</span>
          <span style={{ color: t.up ? 'var(--long)' : 'var(--short)', fontWeight: 600 }}>{t.chg}</span>
          {i < tickers.length - 1 && <span style={{ color: 'var(--border2)', marginLeft: 8 }}>│</span>}
        </span>
      ))}
      <span className="mono" style={{ marginLeft: 'auto', color: 'var(--text4)', flexShrink: 0 }}>{time.toLocaleTimeString('en-US', { hour12: false })} EST</span>
    </div>
  );
}
