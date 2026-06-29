'use client';
import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import RichEditor from '@/components/ui/RichEditor';
import type { Trade, TradeExecution, PositionHistory, PerformanceAttribution } from '@/lib/types';

const TABS = ['Overview', 'Execution Plan', 'Position', 'Journal', 'Attribution', 'History'];

interface FullTrade extends Trade {
  executions: TradeExecution[];
  history: PositionHistory[];
  attribution: PerformanceAttribution | null;
  journal: Array<{ id: string; field: string; content: string; authorId: string; authorRole: string; createdAt: string }>;
}

const JOURNAL_FIELDS = [
  { field: 'originalThesis', label: 'Original Thesis', placeholder: 'The original investment thesis at time of proposal…' },
  { field: 'entryReason', label: 'Entry Reason', placeholder: 'Why we entered at this price and timing…' },
  { field: 'marketContext', label: 'Market Context', placeholder: 'Market conditions at time of entry…' },
  { field: 'analystComment', label: 'Analyst Commentary', placeholder: 'Research analyst perspective and notes…' },
  { field: 'pmComment', label: 'PM Commentary', placeholder: 'Portfolio manager notes and execution rationale…' },
  { field: 'cioComment', label: 'CIO Commentary', placeholder: 'Chief Investment Officer notes…' },
  { field: 'exitReason', label: 'Exit Reason', placeholder: 'Why we exited at this price and timing…' },
  { field: 'lessonsLearned', label: 'Lessons Learned', placeholder: 'Key takeaways from this trade…' },
];

const ATTR_FIELDS = [
  { key: 'researchQuality', label: 'Research Quality' },
  { key: 'entryTiming', label: 'Entry Timing' },
  { key: 'exitTiming', label: 'Exit Timing' },
  { key: 'catalystOutcome', label: 'Catalyst Outcome' },
  { key: 'riskMgmt', label: 'Risk Management' },
  { key: 'positionSizing', label: 'Position Sizing' },
  { key: 'executionQuality', label: 'Execution Quality' },
];

export default function TradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useApp();
  const { isMobile, cols } = useBreakpoint();
  const [trade, setTrade] = useState<FullTrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');
  const [executing, setExecuting] = useState(false);
  const [closing, setClosing] = useState(false);

  // Execution form
  const [execForm, setExecForm] = useState({ type: 'ENTRY', price: '', quantity: '', notes: '' });
  // Close form
  const [closeForm, setCloseForm] = useState({ exitPrice: '', reason: '' });
  // Partial exit form
  const [partialForm, setPartialForm] = useState({ exitPrice: '', quantity: '', reason: '' });

  const load = useCallback(async () => {
    const r = await fetch(`/api/trades/${id}`);
    if (r.ok) setTrade(await r.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const patchTrade = async (data: Record<string, unknown>) => {
    await fetch(`/api/trades/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await load();
  };

  const saveField = async (field: string, value: string) => {
    await fetch(`/api/trades/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  };

  const saveJournal = async (field: string, value: string) => {
    await fetch(`/api/trades/${id}/journal`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  };

  const saveAttribution = async (field: string, value: number) => {
    await fetch(`/api/trades/${id}/attribution`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    await load();
  };

  const execute = async () => {
    if (!execForm.price || !execForm.quantity) return;
    setExecuting(true);
    await fetch(`/api/trades/${id}/execute`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: execForm.type, price: parseFloat(execForm.price), quantity: parseFloat(execForm.quantity), notes: execForm.notes }),
    });
    await load();
    setExecForm({ type: 'ENTRY', price: '', quantity: '', notes: '' });
    setExecuting(false);
  };

  const closeTrade = async () => {
    if (!closeForm.exitPrice) return;
    setClosing(true);
    const r = await fetch(`/api/trades/${id}/close`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exitPrice: parseFloat(closeForm.exitPrice), reason: closeForm.reason }),
    });
    if (r.ok) { await load(); setCloseForm({ exitPrice: '', reason: '' }); }
    setClosing(false);
  };

  const partialExit = async () => {
    if (!partialForm.exitPrice || !partialForm.quantity) return;
    await fetch(`/api/trades/${id}/partial-exit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exitPrice: parseFloat(partialForm.exitPrice), quantity: parseFloat(partialForm.quantity), reason: partialForm.reason }),
    });
    await load();
    setPartialForm({ exitPrice: '', quantity: '', reason: '' });
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>
      LOADING…
    </div>
  );
  if (!trade) return <div style={{ padding: 20, color: 'var(--short)' }}>Trade not found.</div>;

  const idea = trade.idea;
  const pos = trade.position;
  const canEdit = user && ['CIO', 'PM'].includes(user.role);
  const isActive = ['ACTIVE', 'PARTIAL_EXIT'].includes(trade.status);
  const isClosed = trade.status === 'CLOSED';
  const pnlColor = (pos?.unrealizedPnl ?? 0) >= 0 ? 'var(--long)' : 'var(--short)';
  const STATUS_BADGE: Record<string, string> = {
    PROPOSAL: 'badge-warn', APPROVED: 'badge-accent', ACTIVE: 'badge-long',
    PARTIAL_EXIT: 'badge-purple', CLOSED: 'badge-dim', CANCELLED: 'badge-dim',
  };

  const journalMap = Object.fromEntries((trade.journal ?? []).map(j => [j.field, j.content]));
  const attrMap = (trade.attribution ?? {}) as Record<string, unknown>;

  return (
    <div className="dash-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--panel)', flexShrink: 0, flexWrap: 'wrap' }}>
        <Link href="/dashboard/trades" style={{ color: 'var(--text4)', fontSize: 16 }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{idea?.ticker ?? '—'}</span>
            {idea?.dir && <span className={`badge badge-${idea.dir === 'LONG' ? 'long' : 'short'}`}>{idea.dir}</span>}
            <span className={`badge ${STATUS_BADGE[trade.status] ?? 'badge-dim'}`}>{trade.status.replace('_', ' ')}</span>
            {idea?.id && <Link href={`/dashboard/research/${idea.id}`} style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>Research →</Link>}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>
            Proposed by {trade.proposedBy} · {new Date(trade.proposedAt).toLocaleDateString()}
            {trade.approvedBy && ` · Approved by ${trade.approvedBy}`}
          </div>
        </div>
        {pos && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--mono)', color: pnlColor }}>
              {(pos.unrealizedPnl ?? 0) >= 0 ? '+' : ''}{pos.returnPct?.toFixed(2) ?? '0.00'}%
            </div>
            <div style={{ fontSize: 10, color: 'var(--text4)' }}>
              ${(pos.unrealizedPnl ?? 0).toFixed(0)} UPnL · {pos.daysHeld}d
            </div>
          </div>
        )}
        {canEdit && trade.status === 'PROPOSAL' && (
          <button className="btn btn-primary btn-sm" onClick={() => patchTrade({ status: 'APPROVED' })}>APPROVE</button>
        )}
        {canEdit && trade.status === 'PROPOSAL' && (
          <button className="btn btn-danger btn-sm" onClick={() => patchTrade({ status: 'CANCELLED' })}>CANCEL</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', background: 'var(--panel)', flexShrink: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: 'transparent', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            color: tab === t ? 'var(--accent)' : 'var(--text3)',
          }}>{t}</button>
        ))}
      </div>

      <div className="scroll-y" style={{ flex: 1, padding: 20 }}>
        {/* ── OVERVIEW ── */}
        {tab === 'Overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(4, 2, 2)}, 1fr)`, gap: 10 }}>
              {[
                { label: 'Entry Price', val: `$${trade.entryPrice ?? '—'}` },
                { label: 'Stop Loss', val: trade.stopLoss ? `$${trade.stopLoss}` : '—' },
                { label: 'Target 1', val: trade.target1 ? `$${trade.target1}` : '—' },
                { label: 'Risk/Reward', val: trade.riskReward ? `${trade.riskReward}x` : '—' },
                { label: 'Position Size', val: trade.positionSize ? `${trade.positionSize}%` : '—' },
                { label: 'Max Capital', val: trade.maxCapital ? `$${trade.maxCapital.toLocaleString()}` : '—' },
                { label: 'Conviction', val: trade.convictionLevel ? `${trade.convictionLevel}/10` : '—' },
                { label: 'Strategy', val: trade.strategy ?? '—' },
              ].map(({ label, val }) => (
                <div key={label} className="panel2" style={{ padding: '10px 12px' }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{val}</div>
                </div>
              ))}
            </div>
            {pos && (
              <div className="panel" style={{ padding: 16 }}>
                <div className="sec-title" style={{ marginBottom: 12 }}>Live Position</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(6, 3, 2)}, 1fr)`, gap: 10 }}>
                  {[
                    { label: 'Qty', val: pos.quantity.toFixed(0) },
                    { label: 'Avg Cost', val: `$${pos.avgCost.toFixed(2)}` },
                    { label: 'Current Price', val: pos.currentPrice ? `$${pos.currentPrice.toFixed(2)}` : '—' },
                    { label: 'Mkt Value', val: pos.marketValue ? `$${pos.marketValue.toLocaleString()}` : '—' },
                    { label: 'Unrealized P&L', val: `${(pos.unrealizedPnl ?? 0) >= 0 ? '+' : ''}$${(pos.unrealizedPnl ?? 0).toFixed(0)}`, color: pnlColor },
                    { label: 'Return', val: `${(pos.returnPct ?? 0) >= 0 ? '+' : ''}${(pos.returnPct ?? 0).toFixed(2)}%`, color: pnlColor },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="panel2" style={{ padding: '10px 12px' }}>
                      <div className="form-label" style={{ marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--mono)', color: color ?? 'var(--text)' }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="panel" style={{ padding: 16 }}>
              <div className="sec-title" style={{ marginBottom: 8 }}>Trade Rationale</div>
              <RichEditor
                value={trade.tradeRationale ?? ''}
                onSave={v => saveField('tradeRationale', v)}
                placeholder="Describe the trade rationale, thesis link, and key drivers…"
                minHeight={160}
                readOnly={!canEdit}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
              {[
                { field: 'pmNotes', label: 'PM Notes', placeholder: 'Portfolio manager notes and execution rationale…', readOnly: !canEdit },
                { field: 'cioNotes', label: 'CIO Notes', placeholder: 'Chief Investment Officer notes…', readOnly: !(user && user.role === 'CIO') },
              ].map(({ field, label, placeholder, readOnly }) => (
                <div key={field} className="panel" style={{ padding: 16 }}>
                  <div className="sec-title" style={{ marginBottom: 8 }}>{label}</div>
                  <RichEditor
                    value={(trade as unknown as Record<string, string>)[field] ?? ''}
                    onSave={v => saveField(field, v)}
                    placeholder={placeholder}
                    minHeight={120}
                    readOnly={readOnly}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EXECUTION PLAN ── */}
        {tab === 'Execution Plan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
            <div className="panel" style={{ padding: 16 }}>
              <div className="sec-title" style={{ marginBottom: 12 }}>Price Levels</div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(3, 2, 1)}, 1fr)`, gap: 10 }}>
                {[
                  { label: 'Entry Price', field: 'entryPrice', val: trade.entryPrice },
                  { label: 'Stop Loss', field: 'stopLoss', val: trade.stopLoss },
                  { label: 'Target 1', field: 'target1', val: trade.target1 },
                  { label: 'Target 2', field: 'target2', val: trade.target2 },
                  { label: 'Target 3', field: 'target3', val: trade.target3 },
                  { label: 'Risk/Reward', field: 'riskReward', val: trade.riskReward },
                ].map(({ label, field, val }) => (
                  <div key={field}>
                    <div className="form-label" style={{ marginBottom: 4 }}>{label}</div>
                    <input className="inp" type="number" defaultValue={val ?? ''} placeholder="0"
                      onBlur={e => { if (canEdit && e.target.value) patchTrade({ [field]: parseFloat(e.target.value) }); }}
                      readOnly={!canEdit} />
                  </div>
                ))}
              </div>
            </div>
            <div className="panel" style={{ padding: 16 }}>
              <div className="sec-title" style={{ marginBottom: 12 }}>Position Sizing</div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(3, 2, 1)}, 1fr)`, gap: 10 }}>
                {[
                  { label: 'Position Size (%)', field: 'positionSize', val: trade.positionSize },
                  { label: 'Max Capital ($)', field: 'maxCapital', val: trade.maxCapital },
                  { label: 'Max Exposure (%)', field: 'maxExposurePct', val: trade.maxExposurePct },
                ].map(({ label, field, val }) => (
                  <div key={field}>
                    <div className="form-label" style={{ marginBottom: 4 }}>{label}</div>
                    <input className="inp" type="number" defaultValue={val ?? ''} placeholder="0"
                      onBlur={e => { if (canEdit && e.target.value) patchTrade({ [field]: parseFloat(e.target.value) }); }}
                      readOnly={!canEdit} />
                  </div>
                ))}
              </div>
            </div>
            <div className="panel" style={{ padding: 16 }}>
              <div className="sec-title" style={{ marginBottom: 12 }}>Trade Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(3, 2, 1)}, 1fr)`, gap: 10 }}>
                {[
                  { label: 'Side', field: 'side', type: 'text', val: trade.side },
                  { label: 'Exchange', field: 'exchange', type: 'text', val: trade.exchange },
                  { label: 'Currency', field: 'currency', type: 'text', val: trade.currency },
                  { label: 'Strategy', field: 'strategy', type: 'text', val: trade.strategy },
                  { label: 'Time Horizon', field: 'timeHorizon', type: 'text', val: trade.timeHorizon },
                  { label: 'Holding Period', field: 'holdingPeriod', type: 'text', val: trade.holdingPeriod },
                ].map(({ label, field, type, val }) => (
                  <div key={field}>
                    <div className="form-label" style={{ marginBottom: 4 }}>{label}</div>
                    <input className="inp" type={type} defaultValue={val ?? ''} placeholder={label}
                      onBlur={e => { if (canEdit) patchTrade({ [field]: e.target.value }); }}
                      readOnly={!canEdit} />
                  </div>
                ))}
              </div>
            </div>
            <div className="panel" style={{ padding: 16 }}>
              <div className="sec-title" style={{ marginBottom: 8 }}>Execution Notes</div>
              <RichEditor
                value={trade.executionNotes ?? ''}
                onSave={v => saveField('executionNotes', v)}
                placeholder="Execution instructions, timing notes, order types…"
                minHeight={120}
                readOnly={!canEdit}
              />
            </div>

            {/* Execute / Close buttons */}
            {canEdit && (trade.status === 'APPROVED' || isActive) && (
              <div className="panel" style={{ padding: 16 }}>
                <div className="sec-title" style={{ marginBottom: 12 }}>Record Execution</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(3, 2, 1)}, 1fr)`, gap: 10, marginBottom: 10 }}>
                  <div>
                    <div className="form-label" style={{ marginBottom: 4 }}>Type</div>
                    <select className="inp" value={execForm.type} onChange={e => setExecForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="ENTRY">Entry</option>
                      <option value="ADD">Add to Position</option>
                      <option value="PARTIAL_EXIT">Partial Exit</option>
                    </select>
                  </div>
                  <div>
                    <div className="form-label" style={{ marginBottom: 4 }}>Price</div>
                    <input className="inp" type="number" placeholder="0.00" value={execForm.price} onChange={e => setExecForm(f => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div>
                    <div className="form-label" style={{ marginBottom: 4 }}>Quantity</div>
                    <input className="inp" type="number" placeholder="0" value={execForm.quantity} onChange={e => setExecForm(f => ({ ...f, quantity: e.target.value }))} />
                  </div>
                </div>
                <input className="inp" placeholder="Notes (optional)" value={execForm.notes} onChange={e => setExecForm(f => ({ ...f, notes: e.target.value }))} style={{ marginBottom: 10 }} />
                <button className="btn btn-primary btn-sm" onClick={execute} disabled={executing || !execForm.price || !execForm.quantity}>
                  {executing ? 'RECORDING…' : 'RECORD EXECUTION'}
                </button>
              </div>
            )}

            {canEdit && isActive && (
              <div className="panel" style={{ padding: 16 }}>
                <div className="sec-title" style={{ marginBottom: 12 }}>Close Position</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <div className="form-label" style={{ marginBottom: 4 }}>Exit Price</div>
                    <input className="inp" type="number" placeholder="0.00" value={closeForm.exitPrice} onChange={e => setCloseForm(f => ({ ...f, exitPrice: e.target.value }))} />
                  </div>
                  <div>
                    <div className="form-label" style={{ marginBottom: 4 }}>Reason</div>
                    <input className="inp" placeholder="e.g. Target hit, stop triggered…" value={closeForm.reason} onChange={e => setCloseForm(f => ({ ...f, reason: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={closeTrade} disabled={closing || !closeForm.exitPrice}>
                  {closing ? 'CLOSING…' : 'CLOSE POSITION'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── POSITION ── */}
        {tab === 'Position' && pos && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
            <div className="panel" style={{ padding: 16 }}>
              <div className="sec-title" style={{ marginBottom: 12 }}>Update Price</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input className="inp" type="number" placeholder="Current market price"
                  onBlur={async e => {
                    if (e.target.value && pos) {
                      await fetch(`/api/positions/${pos.id}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currentPrice: parseFloat(e.target.value) }),
                      });
                      await load();
                    }
                  }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(3, 2, 2)}, 1fr)`, gap: 10 }}>
              {[
                { label: 'Entry Date', val: new Date(pos.entryDate).toLocaleDateString() },
                { label: 'Entry Price', val: `$${pos.avgCost.toFixed(2)}` },
                { label: 'Current Price', val: pos.currentPrice ? `$${pos.currentPrice.toFixed(2)}` : '—' },
                { label: 'Quantity', val: pos.quantity.toFixed(0) },
                { label: 'Market Value', val: pos.marketValue ? `$${pos.marketValue.toLocaleString()}` : '—' },
                { label: 'Days Held', val: `${pos.daysHeld}d` },
                { label: 'Unrealized P&L', val: `${(pos.unrealizedPnl ?? 0) >= 0 ? '+' : ''}$${(pos.unrealizedPnl ?? 0).toFixed(0)}`, color: pnlColor },
                { label: 'Return', val: `${(pos.returnPct ?? 0) >= 0 ? '+' : ''}${(pos.returnPct ?? 0).toFixed(2)}%`, color: pnlColor },
                { label: 'Realized P&L', val: `$${pos.realizedPnl.toFixed(0)}` },
                { label: 'Max Gain', val: pos.maxGain ? `+${pos.maxGain.toFixed(2)}%` : '—', color: 'var(--long)' },
                { label: 'Max Drawdown', val: pos.maxDrawdown ? `${pos.maxDrawdown.toFixed(2)}%` : '—', color: 'var(--short)' },
                { label: 'Dist. to Stop', val: pos.currentPrice && pos.stopLoss ? `${Math.abs(((pos.currentPrice - pos.stopLoss) / pos.currentPrice) * 100).toFixed(1)}%` : '—' },
              ].map(({ label, val, color }) => (
                <div key={label} className="panel2" style={{ padding: '10px 12px' }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--mono)', color: color ?? 'var(--text)' }}>{val}</div>
                </div>
              ))}
            </div>
            {/* Partial exit */}
            {canEdit && isActive && (
              <div className="panel" style={{ padding: 16 }}>
                <div className="sec-title" style={{ marginBottom: 12 }}>Partial Exit</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(3, 2, 1)}, 1fr)`, gap: 10, marginBottom: 10 }}>
                  <div>
                    <div className="form-label" style={{ marginBottom: 4 }}>Exit Price</div>
                    <input className="inp" type="number" placeholder="0.00" value={partialForm.exitPrice} onChange={e => setPartialForm(f => ({ ...f, exitPrice: e.target.value }))} />
                  </div>
                  <div>
                    <div className="form-label" style={{ marginBottom: 4 }}>Quantity</div>
                    <input className="inp" type="number" placeholder={`max ${pos.quantity}`} value={partialForm.quantity} onChange={e => setPartialForm(f => ({ ...f, quantity: e.target.value }))} />
                  </div>
                  <div>
                    <div className="form-label" style={{ marginBottom: 4 }}>Reason</div>
                    <input className="inp" placeholder="Optional" value={partialForm.reason} onChange={e => setPartialForm(f => ({ ...f, reason: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={partialExit} disabled={!partialForm.exitPrice || !partialForm.quantity}>
                  RECORD PARTIAL EXIT
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'Position' && !pos && (
          <div className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', maxWidth: 400 }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>◎</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>No active position</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Record an execution in the Execution Plan tab to open a position.</div>
          </div>
        )}

        {/* ── JOURNAL ── */}
        {tab === 'Journal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>
            {JOURNAL_FIELDS.map(({ field, label, placeholder }) => (
              <div key={field} className="panel" style={{ padding: 16 }}>
                <div className="sec-title" style={{ marginBottom: 8 }}>{label}</div>
                <RichEditor
                  value={journalMap[field] ?? ''}
                  onSave={v => saveJournal(field, v)}
                  placeholder={placeholder}
                  minHeight={120}
                  readOnly={!canEdit}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── ATTRIBUTION ── */}
        {tab === 'Attribution' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
            <div className="panel" style={{ padding: 16 }}>
              <div className="sec-title" style={{ marginBottom: 12 }}>Performance Attribution Scores (1–10)</div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(2, 2, 1)}, 1fr)`, gap: 12 }}>
                {ATTR_FIELDS.map(({ key, label }) => {
                  const val = (attrMap[key] as number | null) ?? null;
                  return (
                    <div key={key}>
                      <div className="form-label" style={{ marginBottom: 6 }}>{label}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <button key={n} onClick={() => canEdit && saveAttribution(key, n)} style={{
                            width: 28, height: 28, borderRadius: 4, border: 'none', cursor: canEdit ? 'pointer' : 'default',
                            background: val === n ? 'var(--accent)' : (val && n <= val ? 'var(--accent-dim)' : 'var(--bg)'),
                            color: val === n ? '#fff' : 'var(--text3)',
                            fontSize: 11, fontWeight: 600, transition: 'all .1s',
                          }}>{n}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {[
              { field: 'analystComment', label: 'Analyst Commentary', readOnly: !canEdit },
              { field: 'pmComment', label: 'PM Commentary', readOnly: !canEdit },
              { field: 'cioComment', label: 'CIO Commentary', readOnly: !(user && user.role === 'CIO') },
            ].map(({ field, label, readOnly }) => (
              <div key={field} className="panel" style={{ padding: 16 }}>
                <div className="sec-title" style={{ marginBottom: 8 }}>{label}</div>
                <RichEditor
                  value={journalMap[field] ?? ''}
                  onSave={v => saveJournal(field, v)}
                  placeholder={`${label}…`}
                  minHeight={100}
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── HISTORY ── */}
        {tab === 'History' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 700 }}>
            {(trade.history ?? []).length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 12, padding: 20 }}>No history events yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[...trade.history].reverse().map((h, i) => {
                  const EVENT_COLOR: Record<string, string> = {
                    OPENED: 'var(--long)', CLOSED: 'var(--short)', PARTIAL_PROFIT: 'var(--accent)',
                    INCREASED: 'var(--long)', STOP_ADJUSTED: 'var(--warn)', APPROVED: 'var(--accent)', PROPOSED: 'var(--text3)',
                  };
                  return (
                    <div key={h.id} style={{ display: 'flex', gap: 12, paddingBottom: 16, position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: EVENT_COLOR[h.eventType] ?? 'var(--border2)', border: '2px solid var(--bg)', marginTop: 2 }} />
                        {i < (trade.history ?? []).length - 1 && (
                          <div style={{ width: 1, flex: 1, background: 'var(--border)', minHeight: 20, marginTop: 4 }} />
                        )}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: EVENT_COLOR[h.eventType] ?? 'var(--text3)', fontFamily: 'var(--mono)' }}>{h.eventType}</span>
                          <span style={{ fontSize: 10, color: 'var(--text4)' }}>{new Date(h.createdAt).toLocaleString()}</span>
                          <span style={{ fontSize: 10, color: 'var(--text4)' }}>by {h.createdBy}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{h.description}</div>
                        {(h.price || h.value) && (
                          <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                            {h.price && `@ $${h.price}`} {h.quantity && `× ${h.quantity}`} {h.value && `= $${h.value?.toLocaleString()}`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
