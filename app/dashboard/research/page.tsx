'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import type { ResearchDoc } from '@/lib/types';

type DocWithIdea = ResearchDoc & {
  idea: { ticker: string; dir: string; approvalStatus: string; weekId: string; authorId: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  RISK_REVIEW: 'Risk Review',
  COMMITTEE_REVIEW: 'Committee',
  ARCHIVED: 'Archived',
};

const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'badge-dim',
  IN_PROGRESS: 'badge-accent',
  COMPLETE: 'badge-low',
  RISK_REVIEW: 'badge-warn',
  COMMITTEE_REVIEW: 'badge-purple',
  ARCHIVED: 'badge-dim',
};

function CompletionRing({ pct, size = 36 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  const color = pct >= 80 ? 'var(--long)' : pct >= 50 ? 'var(--accent)' : 'var(--warn)';
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border2)" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={9} fill={color} fontFamily="var(--mono)" fontWeight={700}>
        {pct}
      </text>
    </svg>
  );
}

const TABS = ['ALL', 'DRAFT', 'IN_PROGRESS', 'COMPLETE', 'COMMITTEE_REVIEW', 'ARCHIVED'] as const;

export default function ResearchPipeline() {
  const { user } = useApp();
  const [docs, setDocs] = useState<DocWithIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [myOnly, setMyOnly] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch('/api/research')
      .then(r => r.json())
      .then(data => { setDocs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const filtered = docs.filter(d => {
    if (filter !== 'ALL' && d.status !== filter) return false;
    if (myOnly && d.authorId !== user?.legacyId) return false;
    return true;
  });

  const stats = {
    total: docs.length,
    inProgress: docs.filter(d => d.status === 'IN_PROGRESS').length,
    complete: docs.filter(d => d.status === 'COMPLETE').length,
    committee: docs.filter(d => d.status === 'COMMITTEE_REVIEW').length,
    avgCompletion: docs.length ? Math.round(docs.reduce((s, d) => s + d.completionScore, 0) / docs.length) : 0,
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>
      LOADING RESEARCH PIPELINE…
    </div>
  );

  return (
    <div className="scroll-y" style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em' }}>Research Pipeline</h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>Century Financial · Investment Research OS</p>
        </div>
        <Link href="/dashboard/submit">
          <button className="btn btn-primary btn-sm">+ SUBMIT IDEA</button>
        </Link>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {[
          { label: 'Total Research', val: stats.total, color: 'var(--text)' },
          { label: 'In Progress', val: stats.inProgress, color: 'var(--accent)' },
          { label: 'Complete', val: stats.complete, color: 'var(--long)' },
          { label: 'In Committee', val: stats.committee, color: 'var(--purple)' },
          { label: 'Avg Completion', val: `${stats.avgCompletion}%`, color: 'var(--warn)' },
        ].map(s => (
          <div key={s.label} className="panel" style={{ padding: '12px 14px' }}>
            <div className="stat-val" style={{ fontSize: 22, color: s.color }}>{s.val}</div>
            <div className="stat-sub">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              style={{
                padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10,
                fontWeight: 600, letterSpacing: '.04em', transition: 'all .12s',
                background: filter === t ? 'var(--accent)' : 'transparent',
                color: filter === t ? '#fff' : 'var(--text3)',
              }}>
              {t === 'ALL' ? 'ALL' : STATUS_LABELS[t] ?? t}
            </button>
          ))}
        </div>
        <button onClick={() => setMyOnly(!myOnly)}
          className={myOnly ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}>
          {myOnly ? '✓ MY RESEARCH' : 'MY RESEARCH'}
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)' }}>
          {filtered.length} document{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⬡</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>No research documents</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Submit an idea to create a research workspace</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {filtered.map(doc => (
            <Link key={doc.id} href={`/dashboard/research/${doc.ideaId}`} style={{ textDecoration: 'none' }}>
              <div className="idea-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                        {doc.idea?.ticker ?? '—'}
                      </span>
                      {doc.idea?.dir && (
                        <span className={`badge badge-${doc.idea.dir === 'LONG' ? 'long' : 'short'}`}>{doc.idea.dir}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>{doc.ideaId}</div>
                  </div>
                  <CompletionRing pct={doc.completionScore} />
                </div>

                {/* Status + quality */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className={`badge ${STATUS_CLASS[doc.status] ?? 'badge-dim'}`}>
                    {STATUS_LABELS[doc.status] ?? doc.status}
                  </span>
                  {doc.qualityScore > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                      QS {doc.qualityScore}
                    </span>
                  )}
                </div>

                {/* Thesis preview */}
                {doc.thesis && (
                  <p className="line-clamp-3" style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
                    {doc.thesis}
                  </p>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
                  <span style={{ fontSize: 10, color: 'var(--text4)' }}>{doc.authorId}</span>
                  <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>
                    {new Date(doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
