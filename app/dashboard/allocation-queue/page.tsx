'use client';
import { Fragment, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useBreakpoint } from '@/hooks/useBreakpoint';

type QueueEntry = {
  id: string; ideaId: string; rank: number | null; capitalRequested: number | null;
  recommendedAlloc: number | null; portfolioExposurePct: number | null;
  riskRating: string; notes: string | null; status: string;
  updatedBy: string | null; createdAt: string; updatedAt: string;
  idea: {
    id: string; ticker: string; dir: string; finalScore: number | null;
    approvalStatus: string; pmScore: number | null; quantScore?: number;
    researchDoc: { overview: string | null } | null;
  } | null;
};

type ThesisDoc = {
  overview: string; thesis: string; financials: string; valuation: string;
  qualityScore: number; completionScore: number; loading: boolean;
};

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; priority: number }> = {
  LOW:    { label: 'Low',    color: 'var(--long)',   bg: 'var(--long-dim)',   border: 'rgba(22,163,74,.25)',    priority: 3 },
  MEDIUM: { label: 'Medium', color: 'var(--warn)',   bg: 'var(--warn-dim)',   border: 'rgba(217,119,6,.25)',   priority: 2 },
  HIGH:   { label: 'High',   color: 'var(--short)',  bg: 'var(--short-dim)',  border: 'rgba(220,38,38,.25)',   priority: 1 },
};

const STATUS_OPTS = ['PENDING', 'IN_PROGRESS', 'ALLOCATED', 'ON_HOLD', 'CANCELLED'];

const THESIS_TABS = ['overview', 'thesis', 'financials', 'valuation'] as const;
type ThesisTab = typeof THESIS_TABS[number];

const THESIS_GUIDANCE: Record<ThesisTab, string> = {
  overview:   'High-level summary of the opportunity, expected outcome, and why this is in the portfolio now.',
  thesis:     'Core investment thesis: competitive dynamics, market mispricing, structural tailwinds, key drivers.',
  financials: 'Financial analysis: revenue growth, margins, FCF, ROIC, balance sheet, key metrics vs. peers.',
  valuation:  'Valuation framework: DCF assumptions, comparable multiples, price target and margin of safety.',
};

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, [string, string]> = {
    PENDING:     ['var(--warn)',   'var(--warn-dim)'],
    IN_PROGRESS: ['var(--accent)', 'var(--accent-dim)'],
    ALLOCATED:   ['var(--long)',   'var(--long-dim)'],
    ON_HOLD:     ['var(--text4)', 'var(--bg)'],
    CANCELLED:   ['var(--short)',  'var(--short-dim)'],
  };
  const [color, bg] = cfg[status] ?? ['var(--text4)', 'var(--bg)'];
  return (
    <span style={{ fontSize: 9, fontWeight: 700, color, background: bg, padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--mono)', letterSpacing: '.05em' }}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function AllocationQueuePage() {
  const { isMobile, cols } = useBreakpoint();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvedIdeas, setApprovedIdeas] = useState<{ id: string; ticker: string; dir: string; finalScore: number | null }[]>([]);
  const [addingIdea, setAddingIdea] = useState('');
  const [addingNotes, setAddingNotes] = useState('');
  const [addingCapital, setAddingCapital] = useState('');
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Thesis state
  const [expandedThesisId, setExpandedThesisId] = useState<string | null>(null);
  const [thesisDocs, setThesisDocs] = useState<Record<string, ThesisDoc>>({});
  const [thesisTab, setThesisTab] = useState<ThesisTab>('overview');
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    const [qRes, iRes] = await Promise.all([
      fetch('/api/allocation-queue'),
      fetch('/api/ideas?status=APPROVED'),
    ]);
    const [q, i] = await Promise.all([qRes.json(), iRes.json()]);
    setEntries(Array.isArray(q) ? q : []);
    setApprovedIdeas(Array.isArray(i) ? i : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addToQueue = async () => {
    if (!addingIdea) return;
    setAdding(true);
    await fetch(`/api/allocation-queue/${addingIdea}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', notes: addingNotes, capitalRequested: addingCapital ? Number(addingCapital) : undefined }),
    });
    setAddingIdea(''); setAddingNotes(''); setAddingCapital(''); setAdding(false);
    setShowAddForm(false);
    load();
  };

  const removeFromQueue = async (ideaId: string) => {
    await fetch(`/api/allocation-queue/${ideaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove' }),
    });
    load();
  };

  const updateStatus = async (ideaId: string, status: string) => {
    await fetch(`/api/allocation-queue/${ideaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const EMPTY_DOC: ThesisDoc = { overview: '', thesis: '', financials: '', valuation: '', qualityScore: 0, completionScore: 0, loading: false };

  const fetchThesis = async (ideaId: string) => {
    setThesisDocs(p => ({ ...p, [ideaId]: { ...(p[ideaId] ?? EMPTY_DOC), loading: true } }));
    try {
      const res = await fetch(`/api/research/${ideaId}`);
      if (!res.ok) {
        setThesisDocs(p => ({ ...p, [ideaId]: { ...(p[ideaId] ?? EMPTY_DOC), loading: false } }));
        return;
      }
      const data = await res.json() as Partial<ThesisDoc>;
      setThesisDocs(p => ({
        ...p,
        [ideaId]: {
          overview: data.overview ?? '',
          thesis: data.thesis ?? '',
          financials: data.financials ?? '',
          valuation: data.valuation ?? '',
          qualityScore: data.qualityScore ?? 0,
          completionScore: data.completionScore ?? 0,
          loading: false,
        },
      }));
    } catch {
      setThesisDocs(p => ({ ...p, [ideaId]: { ...(p[ideaId] ?? EMPTY_DOC), loading: false } }));
    }
  };

  const saveThesisField = (ideaId: string, field: ThesisTab, value: string) => {
    setThesisDocs(p => ({ ...p, [ideaId]: { ...p[ideaId], [field]: value } }));
    if (saveTimers.current[ideaId]) clearTimeout(saveTimers.current[ideaId]);
    saveTimers.current[ideaId] = setTimeout(() => {
      fetch(`/api/research/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      }).catch(() => {});
    }, 1000);
  };

  const toggleThesis = (ideaId: string) => {
    if (expandedThesisId === ideaId) {
      setExpandedThesisId(null);
    } else {
      setExpandedThesisId(ideaId);
      setThesisTab('overview');
      if (!thesisDocs[ideaId]) fetchThesis(ideaId);
    }
  };

  const queuedIdeaIds = new Set(entries.map(e => e.ideaId));
  const availableIdeas = approvedIdeas.filter(i => !queuedIdeaIds.has(i.id));
  const sorted = [...entries].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  const totalCapital = entries.reduce((s, e) => s + (e.capitalRequested ?? 0), 0);
  const pendingCount = entries.filter(e => e.status === 'PENDING' || e.status === 'IN_PROGRESS').length;
  const highRiskCount = entries.filter(e => e.riskRating === 'HIGH').length;
  const avgScore = entries.length > 0
    ? entries.reduce((s, e) => s + (e.idea?.finalScore ?? 0), 0) / entries.length
    : 0;

  return (
    <div className="scroll-y dash-content" style={{ height: '100%', padding: isMobile ? 12 : '18px 20px', background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Link href="/dashboard/committee" style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 600, letterSpacing: '.04em', textDecoration: 'none' }}>← COMMITTEE</Link>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em', marginBottom: 3 }}>Allocation Queue</h1>
          <p style={{ fontSize: 11, color: 'var(--text3)' }}>Approved ideas awaiting capital deployment and execution</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginTop: 4 }}>
          {availableIdeas.length > 0 && (
            <button onClick={() => setShowAddForm(v => !v)} className={showAddForm ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'}>
              {showAddForm ? '× Cancel' : '+ Add to Queue'}
            </button>
          )}
        </div>
      </div>

      {/* KPI bar */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(4, 2, 2)}, 1fr)`, gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Capital Waiting', value: `$${(totalCapital / 1000).toFixed(0)}K`, color: 'var(--accent)', icon: '◈', sub: `${entries.length} trade${entries.length !== 1 ? 's' : ''}` },
          { label: 'Pending Execution', value: pendingCount, color: 'var(--warn)', icon: '◷', sub: 'awaiting deployment' },
          { label: 'High Risk Trades', value: highRiskCount, color: 'var(--short)', icon: '⛨', sub: highRiskCount > 0 ? 'review required' : 'all clear' },
          { label: 'Avg Score', value: avgScore > 0 ? avgScore.toFixed(1) : '—', color: 'var(--purple)', icon: '◆', sub: 'composite rating' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: kpi.color }}>{kpi.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text4)', letterSpacing: '.05em', textTransform: 'uppercase' }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--mono)', color: kpi.color, lineHeight: 1, marginBottom: 3 }}>{kpi.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text4)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && availableIdeas.length > 0 && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Add Approved Idea to Queue</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={addingIdea} onChange={e => setAddingIdea(e.target.value)} className="inp" style={{ flex: 2, minWidth: 200, fontSize: 11 }}>
              <option value="">Select approved idea…</option>
              {availableIdeas.map(i => (
                <option key={i.id} value={i.id}>{i.ticker} ({i.dir}) · Score: {i.finalScore?.toFixed(1) ?? '—'}</option>
              ))}
            </select>
            <input value={addingCapital} onChange={e => setAddingCapital(e.target.value)}
              placeholder="Capital requested ($)" className="inp" style={{ width: 160, fontSize: 11 }} type="number" />
            <input value={addingNotes} onChange={e => setAddingNotes(e.target.value)}
              placeholder="Notes (optional)" className="inp" style={{ flex: 1, minWidth: 140, fontSize: 11 }} />
            <button onClick={addToQueue} disabled={adding || !addingIdea} className="btn btn-primary btn-sm">
              {adding ? 'Adding…' : 'Add to Queue'}
            </button>
          </div>
        </div>
      )}

      {/* Queue table */}
      {loading ? (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16 }}>
              {[24, 80, 60, 80, 50, 70].map((w, j) => (
                <div key={j} style={{ height: 10, width: w, background: 'var(--border)', borderRadius: 4, animation: 'pulse 1.5s ease infinite' }} />
              ))}
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '48px 24px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: .4 }}>◈</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>No ideas in allocation queue</div>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 16 }}>
            {availableIdeas.length > 0 ? 'Select approved ideas above to add them to the queue.' : 'Approve ideas in the committee workflow to enable allocation.'}
          </div>
          {availableIdeas.length > 0 && (
            <button onClick={() => setShowAddForm(true)} className="btn btn-primary btn-sm">+ Add to Queue</button>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--panel2)' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
              {entries.length} idea{entries.length !== 1 ? 's' : ''} in queue
            </span>
            <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>
              Total capital: ${totalCapital.toLocaleString()}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Rank</th>
                  <th>Idea</th>
                  <th>Score</th>
                  <th>Capital</th>
                  <th>Exposure</th>
                  <th>Risk</th>
                  <th style={{ minWidth: 180 }}>Investment Thesis</th>
                  <th>Status</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry, i) => {
                  const rc = entry.riskRating ? RISK_CONFIG[entry.riskRating] : RISK_CONFIG.MEDIUM;
                  const idea = entry.idea;
                  const isHighRisk = entry.riskRating === 'HIGH';
                  const doc = thesisDocs[entry.ideaId];
                  const isExpanded = expandedThesisId === entry.ideaId;

                  return (
                    <Fragment key={entry.id}>
                      <tr style={{ background: isHighRisk ? 'rgba(220,38,38,.018)' : undefined }}>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: i === 0 ? 'var(--accent)' : i === 1 ? 'rgba(37,99,235,.12)' : 'var(--bg)',
                            color: i === 0 ? '#fff' : 'var(--text3)',
                            fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)', margin: 'auto',
                            border: i > 0 ? '1px solid var(--border)' : 'none',
                          }}>{entry.rank ?? i + 1}</div>
                        </td>
                        <td>
                          {idea ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <Link href={`/dashboard/committee/${entry.ideaId}`} style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 13, color: 'var(--text)', textDecoration: 'none' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--accent)'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text)'}
                                >{idea.ticker}</Link>
                                <span className={`badge ${idea.dir === 'LONG' ? 'badge-long' : 'badge-short'}`}>{idea.dir}</span>
                              </div>
                              {entry.notes && (
                                <div style={{ fontSize: 9, color: 'var(--text4)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.notes}</div>
                              )}
                            </div>
                          ) : <span style={{ color: 'var(--text4)' }}>—</span>}
                        </td>
                        <td>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                            {idea?.finalScore?.toFixed(1) ?? '—'}
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--text4)', marginTop: 1 }}>PM {idea?.pmScore?.toFixed(1) ?? '—'}</div>
                        </td>
                        <td>
                          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12 }}>
                            {entry.capitalRequested ? `$${entry.capitalRequested.toLocaleString()}` : '—'}
                          </div>
                          {entry.recommendedAlloc && (
                            <div style={{ fontSize: 9, color: 'var(--long)' }}>Rec: ${entry.recommendedAlloc.toLocaleString()}</div>
                          )}
                        </td>
                        <td>
                          {entry.portfolioExposurePct ? (
                            <div>
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{entry.portfolioExposurePct.toFixed(1)}%</div>
                              <div style={{ height: 3, width: 60, background: 'var(--border)', borderRadius: 3, marginTop: 3 }}>
                                <div style={{ height: '100%', width: `${Math.min(100, entry.portfolioExposurePct * 5)}%`, background: entry.portfolioExposurePct > 10 ? 'var(--short)' : entry.portfolioExposurePct > 5 ? 'var(--warn)' : 'var(--long)', borderRadius: 3 }} />
                              </div>
                            </div>
                          ) : <span style={{ color: 'var(--text4)' }}>—</span>}
                        </td>
                        <td>
                          <span style={{ fontSize: 9, fontWeight: 700, color: rc.color, background: rc.bg, border: `1px solid ${rc.border}`, padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--mono)' }}>
                            {rc.label.toUpperCase()}
                          </span>
                        </td>

                        {/* Investment Thesis cell */}
                        <td>
                          <button
                            onClick={() => toggleThesis(entry.ideaId)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                              background: isExpanded ? 'var(--accent-dim)' : 'var(--bg)',
                              border: `1px solid ${isExpanded ? 'rgba(37,99,235,.35)' : 'var(--border)'}`,
                              width: '100%', textAlign: 'left', transition: 'all .12s',
                            }}
                          >
                            <span style={{ fontSize: 9, color: isExpanded ? 'var(--accent)' : 'var(--text4)', flexShrink: 0 }}>✎</span>
                            {doc?.overview ? (
                              <span style={{ fontSize: 9, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                                {doc.overview.slice(0, 55)}{doc.overview.length > 55 ? '…' : ''}
                              </span>
                            ) : (
                              <span style={{ fontSize: 9, color: 'var(--text4)', fontStyle: 'italic' }}>Write thesis</span>
                            )}
                          </button>
                        </td>

                        <td>
                          <select value={entry.status} onChange={e => updateStatus(entry.ideaId, e.target.value)}
                            className="inp" style={{ fontSize: 10, padding: '3px 6px', width: '100%' }}>
                            {STATUS_OPTS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <Link href={`/dashboard/trades?ideaId=${entry.ideaId}`} className="btn btn-ghost btn-sm" style={{ fontSize: 9, padding: '3px 8px' }}>
                              Trade
                            </Link>
                            <button onClick={() => removeFromQueue(entry.ideaId)} className="btn btn-danger btn-sm" style={{ fontSize: 9, padding: '3px 8px' }}>
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Investment Thesis row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} style={{ padding: 0, background: 'var(--panel2)', borderBottom: '2px solid var(--border)' }}>
                            <div style={{ padding: 16 }}>
                              {/* Tab bar */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                                {THESIS_TABS.map(tab => (
                                  <button
                                    key={tab}
                                    onClick={() => setThesisTab(tab)}
                                    style={{
                                      padding: '4px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '.05em', textTransform: 'capitalize',
                                      background: thesisTab === tab ? 'var(--accent)' : 'var(--bg)',
                                      color: thesisTab === tab ? '#fff' : 'var(--text4)',
                                      border: `1px solid ${thesisTab === tab ? 'var(--accent)' : 'var(--border)'}`,
                                      borderRadius: 4, cursor: 'pointer', transition: 'all .12s',
                                    }}
                                  >
                                    {tab}
                                  </button>
                                ))}
                                {doc && !doc.loading && (
                                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <span style={{ fontSize: 8, color: 'var(--text4)', fontWeight: 600, letterSpacing: '.04em' }}>QUALITY</span>
                                      <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: doc.qualityScore >= 70 ? 'var(--long)' : doc.qualityScore >= 40 ? 'var(--warn)' : 'var(--short)' }}>{doc.qualityScore}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <span style={{ fontSize: 8, color: 'var(--text4)', fontWeight: 600, letterSpacing: '.04em' }}>COMPLETE</span>
                                      <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>{doc.completionScore}%</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {doc?.loading ? (
                                <div style={{ fontSize: 10, color: 'var(--text4)', fontStyle: 'italic', padding: '12px 0' }}>Loading research document…</div>
                              ) : (
                                <>
                                  <div style={{ fontSize: 9, color: 'var(--text4)', marginBottom: 6, lineHeight: 1.5 }}>
                                    {THESIS_GUIDANCE[thesisTab]}
                                  </div>
                                  <textarea
                                    className="inp"
                                    style={{ minHeight: 120, fontFamily: 'var(--sans)', fontSize: 11, lineHeight: 1.7, resize: 'vertical' }}
                                    placeholder={`Write ${thesisTab} here…`}
                                    value={doc?.[thesisTab] ?? ''}
                                    onChange={e => saveThesisField(entry.ideaId, thesisTab, e.target.value)}
                                  />
                                  <div style={{ fontSize: 8, color: 'var(--text4)', marginTop: 4 }}>
                                    Auto-saves 1 s after typing · {(doc?.[thesisTab] ?? '').trim().split(/\s+/).filter(Boolean).length} words
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
