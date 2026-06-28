'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import type { Trade } from '@/lib/types';

const STATUS_BADGE: Record<string, string> = {
  PROPOSAL: 'badge-warn', APPROVED: 'badge-accent', ACTIVE: 'badge-long',
  PARTIAL_EXIT: 'badge-purple', CLOSED: 'badge-dim', CANCELLED: 'badge-dim',
};

const TABS = ['ALL', 'PROPOSAL', 'APPROVED', 'ACTIVE', 'CLOSED'];

export default function TradesPage() {
  const { user } = useApp();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ALL');
  const [approvedIdeas, setApprovedIdeas] = useState<Array<{ id: string; ticker: string; dir: string }>>([]);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIdeaId, setSelectedIdeaId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/trades');
    if (r.ok) setTrades(await r.json());
    setLoading(false);
  }, []);

  const loadIdeas = useCallback(async () => {
    const r = await fetch('/api/ideas');
    if (r.ok) {
      const ideas = await r.json();
      const approved = ideas.filter((i: { approvalStatus: string }) => i.approvalStatus === 'APPROVED');
      setApprovedIdeas(approved);
    }
  }, []);

  useEffect(() => { if (user) { load(); loadIdeas(); } }, [user, load, loadIdeas]);

  const createTrade = async () => {
    if (!selectedIdeaId) return;
    setCreating(true);
    const r = await fetch('/api/trades', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ideaId: selectedIdeaId }),
    });
    if (r.ok) {
      const t = await r.json();
      setShowCreate(false);
      setSelectedIdeaId('');
      await load();
      window.location.href = `/dashboard/trades/${t.id}`;
    }
    setCreating(false);
  };

  const filtered = tab === 'ALL' ? trades : trades.filter(t => t.status === tab || (tab === 'ACTIVE' && t.status === 'PARTIAL_EXIT'));
  const canCreate = user && ['CIO', 'PM'].includes(user.role);

  if (!user) return null;

  const counts: Record<string, number> = {};
  for (const t of trades) counts[t.status] = (counts[t.status] ?? 0) + 1;

  return (
    <div className="scroll-y" style={{ flex: 1, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Trade Proposals</h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Full trade lifecycle from approval to exit</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ NEW TRADE</button>
        )}
      </div>

      {showCreate && (
        <div className="panel" style={{ padding: 16, marginBottom: 20, maxWidth: 500 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Create Trade Proposal</div>
          <div className="form-label" style={{ marginBottom: 4 }}>Select Approved Idea</div>
          <select className="inp" value={selectedIdeaId} onChange={e => setSelectedIdeaId(e.target.value)} style={{ marginBottom: 12 }}>
            <option value="">— select idea —</option>
            {approvedIdeas.map(i => (
              <option key={i.id} value={i.id}>{i.ticker} ({i.dir}) · {i.id}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={createTrade} disabled={!selectedIdeaId || creating}>
              {creating ? 'CREATING…' : 'CREATE'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>CANCEL</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: tab === t ? 'var(--accent)' : 'transparent',
            color: tab === t ? '#fff' : 'var(--text3)',
          }}>
            {t} {t !== 'ALL' ? `(${(counts[t] ?? 0) + (t === 'ACTIVE' ? (counts['PARTIAL_EXIT'] ?? 0) : 0)})` : `(${trades.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>LOADING…</div>
      ) : filtered.length === 0 ? (
        <div className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>◎</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>No trades in this category</div>
          {canCreate && tab === 'ALL' && (
            <div style={{ fontSize: 12, marginTop: 6 }}>Create a trade proposal from an approved investment idea</div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(trade => {
            const idea = trade.idea;
            const pos = trade.position;
            const pnlColor = pos?.unrealizedPnl ? (pos.unrealizedPnl >= 0 ? 'var(--long)' : 'var(--short)') : 'var(--text3)';
            return (
              <Link key={trade.id} href={`/dashboard/trades/${trade.id}`} style={{ textDecoration: 'none' }}>
                <div className="panel" style={{ padding: 14, display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 16, alignItems: 'center', cursor: 'pointer' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
                        {idea?.ticker ?? '—'}
                      </span>
                      {idea?.dir && (
                        <span className={`badge badge-${idea.dir === 'LONG' ? 'long' : 'short'}`}>{idea.dir}</span>
                      )}
                    </div>
                    <span className={`badge ${STATUS_BADGE[trade.status] ?? 'badge-dim'}`}>{trade.status.replace('_', ' ')}</span>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, lineHeight: 1.4 }}>
                      {idea?.thesis ? idea.thesis.slice(0, 100) + (idea.thesis.length > 100 ? '…' : '') : 'No thesis'}
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>
                      {trade.entryPrice && <span>Entry ${trade.entryPrice}</span>}
                      {trade.stopLoss && <span>Stop ${trade.stopLoss}</span>}
                      {trade.target1 && <span>T1 ${trade.target1}</span>}
                      {trade.strategy && <span className="badge badge-dim">{trade.strategy}</span>}
                      <span>by {trade.proposedBy}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {pos && pos.unrealizedPnl !== null ? (
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mono)', color: pnlColor }}>
                          {pos.unrealizedPnl >= 0 ? '+' : ''}{pos.returnPct?.toFixed(2) ?? 0}%
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text4)' }}>{pos.daysHeld}d held</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, color: 'var(--text4)' }}>
                        {new Date(trade.proposedAt).toLocaleDateString()}
                      </div>
                    )}
                    <div style={{ fontSize: 9, color: 'var(--accent)', marginTop: 4 }}>Open →</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
