'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { Watchlist } from '@/lib/types';
import TickerSearch from '@/components/ui/TickerSearch';

const PRESET_COLORS = ['#2563EB', '#7C3AED', '#16A34A', '#D97706', '#DC2626', '#0891B2', '#BE185D'];

export default function WatchlistsPage() {
  const { user } = useApp();
  const { isMobile } = useBreakpoint();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Watchlist | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newWl, setNewWl] = useState({ name: '', description: '', isPublic: false, color: PRESET_COLORS[0] });
  const [newTicker, setNewTicker] = useState('');
  const [newTickerNote, setNewTickerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch('/api/watchlists').then(r => r.json()).then(data => { setWatchlists(data); setLoading(false); }).catch(() => setLoading(false));
  }, [user]);

  const createWl = async () => {
    if (!newWl.name) return;
    setSubmitting(true);
    const r = await fetch('/api/watchlists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWl),
    });
    if (r.ok) {
      const wl = await r.json();
      setWatchlists(prev => [wl, ...prev]);
      setSelected(wl);
      setNewWl({ name: '', description: '', isPublic: false, color: PRESET_COLORS[0] });
      setShowCreate(false);
    }
    setSubmitting(false);
  };

  const deleteWl = async (id: string) => {
    await fetch(`/api/watchlists/${id}`, { method: 'DELETE' });
    setWatchlists(prev => prev.filter(w => w.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const addTicker = async () => {
    if (!selected || !newTicker) return;
    setSubmitting(true);
    const r = await fetch(`/api/watchlists/${selected.id}/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: newTicker.toUpperCase(), notes: newTickerNote }),
    });
    if (r.ok) {
      const item = await r.json();
      const updatedWl = { ...selected, items: [...selected.items, item] };
      setSelected(updatedWl);
      setWatchlists(prev => prev.map(w => w.id === selected.id ? updatedWl : w));
      setNewTicker(''); setNewTickerNote('');
    }
    setSubmitting(false);
  };

  const removeTicker = async (ticker: string) => {
    if (!selected) return;
    await fetch(`/api/watchlists/${selected.id}/items?ticker=${ticker}`, { method: 'DELETE' });
    const updatedWl = { ...selected, items: selected.items.filter(i => i.ticker !== ticker) };
    setSelected(updatedWl);
    setWatchlists(prev => prev.map(w => w.id === selected.id ? updatedWl : w));
  };

  return (
    <div className="dash-content" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%' }}>
      {/* Sidebar: watchlist list */}
      <div style={{ width: isMobile ? '100%' : 260, flexShrink: 0, borderRight: isMobile ? 'none' : '1px solid var(--border)', borderBottom: isMobile ? '1px solid var(--border)' : 'none', display: 'flex', flexDirection: 'column', background: 'var(--panel)', maxHeight: isMobile ? 260 : undefined }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Watchlists</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>+</button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
            <input className="inp" placeholder="Watchlist name" value={newWl.name}
              onChange={e => setNewWl(p => ({ ...p, name: e.target.value }))}
              style={{ marginBottom: 6 }} />
            <input className="inp" placeholder="Description (optional)" value={newWl.description}
              onChange={e => setNewWl(p => ({ ...p, description: e.target.value }))}
              style={{ marginBottom: 6 }} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {PRESET_COLORS.map(c => (
                <div key={c} onClick={() => setNewWl(p => ({ ...p, color: c }))}
                  style={{ width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer', border: newWl.color === c ? '2px solid var(--text)' : '2px solid transparent' }} />
              ))}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
              <input type="checkbox" checked={newWl.isPublic} onChange={e => setNewWl(p => ({ ...p, isPublic: e.target.checked }))} />
              Share with team
            </label>
            <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={createWl} disabled={submitting || !newWl.name}>
              CREATE
            </button>
          </div>
        )}

        {/* List */}
        <div className="scroll-y" style={{ flex: 1, padding: 6 }}>
          {loading ? (
            <div style={{ fontSize: 11, color: 'var(--text4)', fontFamily: 'var(--mono)', padding: 12, textAlign: 'center' }}>LOADING…</div>
          ) : watchlists.map(wl => (
            <div key={wl.id} onClick={() => setSelected(wl)}
              style={{
                padding: '10px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 2,
                background: selected?.id === wl.id ? 'var(--accent-dim)' : 'transparent',
                border: selected?.id === wl.id ? '1px solid rgba(37,99,235,.2)' : '1px solid transparent',
                transition: 'all .12s',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: wl.color ?? 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: selected?.id === wl.id ? 'var(--accent)' : 'var(--text)', flex: 1 }}>{wl.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>{wl.items.length}</span>
              </div>
              {wl.description && (
                <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2, marginLeft: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {wl.description}
                </div>
              )}
              {wl.isPublic && (
                <div style={{ fontSize: 9, color: 'var(--text4)', marginLeft: 16, marginTop: 2 }}>Shared with team</div>
              )}
            </div>
          ))}
          {!loading && watchlists.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text4)', textAlign: 'center', padding: 20 }}>No watchlists yet</div>
          )}
        </div>
      </div>

      {/* Main: selected watchlist */}
      {!selected ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text3)' }}>
          <div style={{ fontSize: 32 }}>◷</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Select a watchlist</div>
          <div style={{ fontSize: 12 }}>or create a new one to get started</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: selected.color ?? 'var(--accent)' }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{selected.name}</span>
                {selected.isPublic && <span className="badge badge-accent">SHARED</span>}
              </div>
              {selected.description && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{selected.description}</div>}
            </div>
            {selected.ownerId === user?.legacyId && (
              <button className="btn btn-danger btn-sm" onClick={() => deleteWl(selected.id)}>DELETE</button>
            )}
          </div>

          {/* Add ticker */}
          {selected.ownerId === user?.legacyId && (
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: isMobile ? '100%' : 200 }}>
                <TickerSearch
                  value={newTicker}
                  onSelect={(ticker) => setNewTicker(ticker)}
                  placeholder="Search ticker…"
                />
              </div>
              <input className="inp" placeholder="Notes (optional)" value={newTickerNote}
                onChange={e => setNewTickerNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addTicker(); }}
                style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" onClick={addTicker} disabled={submitting || !newTicker}>ADD</button>
            </div>
          )}

          {/* Ticker list */}
          <div className="scroll-y" style={{ flex: 1 }}>
            {selected.items.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text4)', fontSize: 12 }}>
                No tickers in this watchlist
              </div>
            ) : (
              <div className="tbl-wrap"><table className="tbl">
                <thead>
                  <tr>
                    <th>TICKER</th>
                    <th>NOTES</th>
                    <th>ADDED BY</th>
                    <th>DATE</th>
                    {selected.ownerId === user?.legacyId && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {selected.items.map(item => (
                    <tr key={item.id}>
                      <td><span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{item.ticker}</span></td>
                      <td style={{ maxWidth: 300, whiteSpace: 'normal' }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{item.notes ?? '—'}</span>
                      </td>
                      <td><span style={{ fontSize: 11, color: 'var(--text4)' }}>{item.addedBy}</span></td>
                      <td><span style={{ fontSize: 10, color: 'var(--text4)' }}>{new Date(item.addedAt).toLocaleDateString()}</span></td>
                      {selected.ownerId === user?.legacyId && (
                        <td>
                          <button onClick={() => removeTicker(item.ticker)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--short)', fontSize: 11 }}>✕</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
