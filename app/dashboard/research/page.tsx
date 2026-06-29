'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { ResearchDoc } from '@/lib/types';

type DocWithIdea = ResearchDoc & {
  idea: { ticker: string; dir: string; approvalStatus: string; weekId: string; authorId: string } | null;
  ideaType?: 'investment' | 'trading';
};

function detectType(thesis: string | null): 'investment' | 'trading' {
  if (!thesis) return 'trading';
  try {
    const p = JSON.parse(thesis);
    if (p && typeof p === 'object' && ('executiveSummary' in p || 'financial' in p)) return 'investment';
  } catch {}
  return 'trading';
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:            { label: 'Draft',      color: 'var(--text4)',  bg: 'var(--panel2)' },
  IN_PROGRESS:      { label: 'Active',     color: 'var(--accent)', bg: 'var(--accent-dim)' },
  COMPLETE:         { label: 'Complete',   color: 'var(--long)',   bg: 'var(--long-dim)' },
  RISK_REVIEW:      { label: 'Risk Review',color: 'var(--warn)',   bg: 'var(--warn-dim)' },
  COMMITTEE_REVIEW: { label: 'Committee',  color: 'var(--purple)', bg: 'rgba(139,92,246,.1)' },
  ARCHIVED:         { label: 'Archived',   color: 'var(--text4)',  bg: 'var(--panel2)' },
};

const APPROVAL_CFG: Record<string, { label: string; color: string }> = {
  PENDING:  { label: 'Pending',   color: 'var(--text4)' },
  APPROVED: { label: 'Approved',  color: 'var(--long)' },
  REVIEW:   { label: 'In Review', color: 'var(--warn)' },
  REJECTED: { label: 'Rejected',  color: 'var(--short)' },
};

type TypeFilter   = 'all' | 'investment' | 'trading';
type StatusFilter = 'ALL' | 'DRAFT' | 'IN_PROGRESS' | 'COMPLETE' | 'RISK_REVIEW' | 'COMMITTEE_REVIEW' | 'ARCHIVED';
type SortKey      = 'updated' | 'quality' | 'completion';
type ViewMode     = 'grid' | 'table';

function Ring({ pct, size = 38 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const color = pct >= 80 ? 'var(--long)' : pct >= 50 ? 'var(--accent)' : pct > 0 ? 'var(--warn)' : 'var(--border)';
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray .3s ease' }} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={9} fill={color}
        fontFamily="var(--mono)" fontWeight={700}>{pct}</text>
    </svg>
  );
}

function QualityBar({ score }: { score: number }) {
  const color = score >= 70 ? 'var(--long)' : score >= 40 ? 'var(--warn)' : 'var(--short)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${Math.min(100, score)}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, color, width: 20 }}>{score}</span>
    </div>
  );
}

export default function ResearchPipeline() {
  const { user } = useApp();
  const { isMobile, cols } = useBreakpoint();
  const [rawDocs, setRawDocs] = useState<DocWithIdea[]>([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter]     = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [myOnly, setMyOnly]             = useState(false);
  const [search, setSearch]             = useState('');
  const [sortBy, setSortBy]             = useState<SortKey>('updated');
  const [view, setView]                 = useState<ViewMode>('grid');

  useEffect(() => {
    if (!user) return;
    fetch('/api/research')
      .then(r => r.json())
      .then((data: DocWithIdea[]) => {
        setRawDocs(data.map(d => ({ ...d, ideaType: detectType(d.thesis ?? null) })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const docs = useMemo(() => {
    let list = rawDocs;
    if (typeFilter !== 'all')    list = list.filter(d => d.ideaType === typeFilter);
    if (statusFilter !== 'ALL')  list = list.filter(d => d.status === statusFilter);
    if (myOnly)                  list = list.filter(d => d.authorId === user?.legacyId);
    if (search.trim())           list = list.filter(d => d.idea?.ticker?.toLowerCase().includes(search.toLowerCase().trim()));
    return [...list].sort((a, b) => {
      if (sortBy === 'quality')    return (b.qualityScore ?? 0) - (a.qualityScore ?? 0);
      if (sortBy === 'completion') return (b.completionScore ?? 0) - (a.completionScore ?? 0);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [rawDocs, typeFilter, statusFilter, myOnly, search, sortBy, user]);

  const stats = useMemo(() => ({
    total:      rawDocs.length,
    investment: rawDocs.filter(d => d.ideaType === 'investment').length,
    trading:    rawDocs.filter(d => d.ideaType === 'trading').length,
    committee:  rawDocs.filter(d => d.status === 'COMMITTEE_REVIEW').length,
    avgQuality: rawDocs.length ? Math.round(rawDocs.reduce((s, d) => s + (d.qualityScore ?? 0), 0) / rawDocs.length) : 0,
  }), [rawDocs]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>
      LOADING PIPELINE…
    </div>
  );

  return (
    <div className="scroll-y dash-content" style={{ flex: 1, padding: isMobile ? 12 : 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div className="sec-hdr-resp">
        <div>
          <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em', margin: 0 }}>Research Pipeline</h1>
          {!isMobile && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, marginBottom: 0 }}>Century Financial · Investment Research OS</p>}
        </div>
        <Link href="/dashboard/submit">
          <button className="btn btn-primary btn-sm">+ SUBMIT IDEA</button>
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(5, 3, 2)}, 1fr)`, gap: 8 }}>
        {[
          { label: 'Total',       val: stats.total,      color: 'var(--text)',    icon: '◈' },
          { label: 'Investment',  val: stats.investment,  color: 'var(--accent)', icon: '◆' },
          { label: 'Trading',     val: stats.trading,     color: 'var(--purple)', icon: '◈' },
          { label: 'Committee',   val: stats.committee,   color: 'var(--warn)',   icon: '◷' },
          { label: 'Avg Quality', val: stats.avgQuality,  color: 'var(--long)',   icon: '◉' },
        ].map(s => (
          <div key={s.label} className="panel" style={{ padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: s.color }}>{s.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text4)', letterSpacing: '.05em', textTransform: 'uppercase' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--mono)', color: s.color, lineHeight: 1 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

        {/* Type tabs */}
        <div style={{ display: 'flex', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
          {([['all', 'All'], ['investment', 'Investment'], ['trading', 'Trading']] as [TypeFilter, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTypeFilter(k)} style={{
              padding: '5px 12px', border: 'none', borderRight: '1px solid var(--border)', fontSize: 10, fontWeight: 700,
              letterSpacing: '.04em', cursor: 'pointer', transition: 'all .12s',
              background: typeFilter === k ? 'var(--accent)' : 'transparent',
              color: typeFilter === k ? '#fff' : 'var(--text3)',
              fontFamily: 'var(--sans)',
            }}>{l}</button>
          ))}
        </div>

        {/* Status pills */}
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {(['ALL', 'DRAFT', 'IN_PROGRESS', 'COMPLETE', 'COMMITTEE_REVIEW', 'ARCHIVED'] as StatusFilter[]).map(s => {
            const cfg = s === 'ALL' ? { label: 'All', color: 'var(--text3)', bg: 'transparent' } : STATUS_CFG[s];
            const active = statusFilter === s;
            return (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: '3px 9px', borderRadius: 12, fontSize: 9, fontWeight: 600, cursor: 'pointer',
                letterSpacing: '.04em', transition: 'all .12s', fontFamily: 'var(--sans)',
                border: `1px solid ${active ? cfg.color : 'var(--border)'}`,
                background: active ? cfg.bg : 'transparent',
                color: active ? cfg.color : 'var(--text4)',
              }}>{cfg.label}</button>
            );
          })}
        </div>

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="inp" placeholder="Search ticker…"
          style={{ width: isMobile ? '100%' : 130, fontSize: 10, padding: '4px 8px' }} />

        {/* Right controls */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
            className="inp" style={{ fontSize: 10, padding: '3px 6px' }}>
            <option value="updated">Latest</option>
            <option value="quality">Quality</option>
            <option value="completion">Completion</option>
          </select>

          <button onClick={() => setMyOnly(!myOnly)}
            className={myOnly ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            style={{ fontSize: 9, padding: '3px 10px' }}>
            {myOnly ? '✓ Mine' : 'Mine'}
          </button>

          <div style={{ display: 'flex', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 5, overflow: 'hidden' }}>
            {(['grid', 'table'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '4px 8px', border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: 1,
                background: view === v ? 'var(--accent)' : 'transparent',
                color: view === v ? '#fff' : 'var(--text4)',
              }}>
                {v === 'grid' ? '⊞' : '≡'}
              </button>
            ))}
          </div>

          <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)', minWidth: 20 }}>{docs.length}</span>
        </div>
      </div>

      {/* Empty state */}
      {docs.length === 0 && (
        <div className="panel" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 28, opacity: .3, marginBottom: 8 }}>⬡</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>No research documents</div>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 16 }}>
            {search || typeFilter !== 'all' || statusFilter !== 'ALL' ? 'No results match your filters.' : 'Submit an idea to start a research workspace.'}
          </div>
          <Link href="/dashboard/submit">
            <button className="btn btn-primary btn-sm">+ Submit Idea</button>
          </Link>
        </div>
      )}

      {/* ── Grid view ── */}
      {view === 'grid' && docs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(3, 2, 1)}, 1fr)`, gap: 10 }}>
          {docs.map(doc => {
            const sc = STATUS_CFG[doc.status] ?? STATUS_CFG.DRAFT;
            const ac = doc.idea?.approvalStatus ? APPROVAL_CFG[doc.idea.approvalStatus] : null;
            const isInvest = doc.ideaType === 'investment';

            // Parse thesis preview
            let preview = '';
            if (doc.thesis) {
              if (isInvest) {
                try {
                  const p = JSON.parse(doc.thesis) as { executiveSummary?: string; thesis?: string };
                  preview = p.executiveSummary || p.thesis || '';
                } catch { preview = doc.thesis; }
              } else {
                preview = doc.thesis;
              }
            }
            preview = preview.slice(0, 160);

            return (
              <Link key={doc.id} href={`/dashboard/research/${doc.ideaId}`} style={{ textDecoration: 'none' }}>
                <div className="idea-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', minHeight: 180 }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>
                          {doc.idea?.ticker ?? '—'}
                        </span>
                        {doc.idea?.dir && (
                          <span className={`badge badge-${doc.idea.dir === 'LONG' ? 'long' : 'short'}`}>{doc.idea.dir}</span>
                        )}
                        <span style={{
                          fontSize: 8, fontWeight: 700, letterSpacing: '.07em',
                          color: isInvest ? 'var(--accent)' : 'var(--purple)',
                          background: isInvest ? 'var(--accent-dim)' : 'rgba(139,92,246,.1)',
                          padding: '1px 5px', borderRadius: 3,
                        }}>
                          {isInvest ? 'INVEST' : 'TRADE'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '.05em',
                          color: sc.color, background: sc.bg, padding: '1px 6px', borderRadius: 3,
                        }}>{sc.label.toUpperCase()}</span>
                        {ac && (
                          <span style={{ fontSize: 9, color: ac.color, fontFamily: 'var(--mono)' }}>{ac.label}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'center' }}>
                      <Ring pct={doc.completionScore} size={38} />
                      {doc.qualityScore > 0 && (
                        <div style={{ fontSize: 8, color: 'var(--text4)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                          QS {doc.qualityScore}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thesis preview */}
                  {preview && (
                    <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6, margin: 0, flex: 1,
                      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {preview}
                    </p>
                  )}

                  {/* Quality bar */}
                  {doc.qualityScore > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 8, color: 'var(--text4)', fontWeight: 600, letterSpacing: '.04em' }}>QUALITY SCORE</span>
                      </div>
                      <QualityBar score={doc.qualityScore} />
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                    <span style={{ fontSize: 10, color: 'var(--text4)' }}>{doc.authorId}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {doc.idea?.weekId && (
                        <span style={{ fontSize: 8, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>{doc.idea.weekId}</span>
                      )}
                      <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>
                        {new Date(doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Table view ── */}
      {view === 'table' && docs.length > 0 && (
        <div className="panel" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ minWidth: 680 }}>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Completion</th>
                  <th>Quality</th>
                  <th>Author</th>
                  <th>Approval</th>
                  <th>Updated</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => {
                  const sc = STATUS_CFG[doc.status] ?? STATUS_CFG.DRAFT;
                  const ac = doc.idea?.approvalStatus ? APPROVAL_CFG[doc.idea.approvalStatus] : null;
                  const isInvest = doc.ideaType === 'investment';
                  return (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Link href={`/dashboard/research/${doc.ideaId}`} style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 13, color: 'var(--text)', textDecoration: 'none' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}>
                            {doc.idea?.ticker ?? '—'}
                          </Link>
                          {doc.idea?.dir && (
                            <span className={`badge badge-${doc.idea.dir === 'LONG' ? 'long' : 'short'}`}>{doc.idea.dir}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '.05em',
                          color: isInvest ? 'var(--accent)' : 'var(--purple)',
                          background: isInvest ? 'var(--accent-dim)' : 'rgba(139,92,246,.1)',
                          padding: '2px 7px', borderRadius: 3,
                        }}>{isInvest ? 'INVEST' : 'TRADE'}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 9, fontWeight: 700, color: sc.color, background: sc.bg, padding: '2px 7px', borderRadius: 3 }}>
                          {sc.label.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 50, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${doc.completionScore}%`, borderRadius: 2,
                              background: doc.completionScore >= 80 ? 'var(--long)' : doc.completionScore >= 50 ? 'var(--accent)' : 'var(--warn)' }} />
                          </div>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{doc.completionScore}%</span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12,
                          color: (doc.qualityScore ?? 0) >= 70 ? 'var(--long)' : (doc.qualityScore ?? 0) >= 40 ? 'var(--warn)' : 'var(--text4)' }}>
                          {doc.qualityScore ?? 0}
                        </span>
                      </td>
                      <td><span style={{ fontSize: 11, color: 'var(--text3)' }}>{doc.authorId}</span></td>
                      <td>{ac && <span style={{ fontSize: 10, color: ac.color }}>{ac.label}</span>}</td>
                      <td>
                        <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>
                          {new Date(doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </td>
                      <td>
                        <Link href={`/dashboard/research/${doc.ideaId}`} style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>→</Link>
                      </td>
                    </tr>
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
