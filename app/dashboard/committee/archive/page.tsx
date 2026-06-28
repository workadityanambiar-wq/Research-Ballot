'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type ArchivedIdea = {
  id: string; ticker: string; dir: string; finalScore: number | null;
  approvalStatus: string; createdAt: string; updatedAt: string;
  challengeCount: number; openChallenges: number; questionCount: number; voteCount: number;
  researchDoc: { id: string; overview: string | null; authorId: string } | null;
  allocationQueue: { id: string; rank: number | null; status: string } | null;
};
type ArchiveResponse = { total: number; page: number; pageSize: number; ideas: ArchivedIdea[] };

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  APPROVED:                { label: 'Approved',    color: 'var(--long)',   bg: 'var(--long-dim)',   border: 'rgba(22,163,74,.25)',   icon: '✓' },
  APPROVED_WITH_CONDITIONS:{ label: 'Conditional', color: 'var(--warn)',   bg: 'var(--warn-dim)',   border: 'rgba(217,119,6,.25)',   icon: '◉' },
  REJECTED:                { label: 'Rejected',    color: 'var(--short)',  bg: 'var(--short-dim)',  border: 'rgba(220,38,38,.25)',   icon: '✕' },
};

const DECISION_TIMELINE = ['Submitted', 'Q&A', 'Challenge', 'Vote', 'Decision', 'Execution', 'Closed'];

function DecisionCard({ idea, idx }: { idea: ArchivedIdea; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS_CONFIG[idea.approvalStatus] ?? STATUS_CONFIG.REJECTED;
  const isApproved = idea.approvalStatus === 'APPROVED' || idea.approvalStatus === 'APPROVED_WITH_CONDITIONS';
  const decisionStage = isApproved ? 5 : 4;

  return (
    <div style={{
      background: 'var(--panel)', border: `1px solid ${isApproved ? 'rgba(22,163,74,.15)' : 'var(--border)'}`,
      borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)',
      animation: `slideUp .22s ease-out ${Math.min(idx * 0.03, 0.25)}s both`,
      borderLeft: `3px solid ${sc.color}`,
    }}>
      {/* Main row */}
      <div style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpanded(v => !v)}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          {/* Left: ID + meta */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 0 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{idea.ticker}</span>
                <span className={`badge ${idea.dir === 'LONG' ? 'badge-long' : 'badge-short'}`}>{idea.dir}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--mono)' }}>
                  {sc.icon} {sc.label.toUpperCase()}
                </span>
                {idea.allocationQueue && (
                  <span className="badge badge-purple">Queue #{idea.allocationQueue.rank ?? '—'}</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text4)' }}>
                <span>Score: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text2)', fontWeight: 600 }}>{idea.finalScore?.toFixed(1) ?? '—'}</span></span>
                <span>·</span>
                <span>{idea.voteCount} vote{idea.voteCount !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>{idea.questionCount} question{idea.questionCount !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>{idea.challengeCount} challenge{idea.challengeCount !== 1 ? 's' : ''}</span>
                {idea.openChallenges > 0 && <span style={{ color: 'var(--warn)' }}>({idea.openChallenges} open)</span>}
              </div>
            </div>
          </div>

          {/* Right: date + actions */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)', marginBottom: 6 }}>
              {new Date(idea.updatedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
              <Link href={`/dashboard/committee/${idea.id}`}
                onClick={e => e.stopPropagation()}
                className="btn btn-ghost btn-sm" style={{ fontSize: 9, padding: '3px 8px' }}>
                View
              </Link>
              <button onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 9, color: 'var(--text4)' }}>
                {expanded ? '▲' : '▼'}
              </button>
            </div>
          </div>
        </div>

        {/* Mini timeline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 12 }}>
          {DECISION_TIMELINE.map((stage, i) => {
            const isDone = i <= decisionStage;
            const isCurrent = i === decisionStage;
            return (
              <div key={stage} style={{ display: 'flex', alignItems: 'center', flex: i < DECISION_TIMELINE.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, fontWeight: 700,
                    background: isCurrent ? sc.color : isDone ? sc.color : 'var(--border)',
                    color: isDone ? '#fff' : 'var(--text4)',
                    opacity: isCurrent ? 1 : isDone ? 0.7 : 0.35,
                  }}>{isDone ? '·' : ''}</div>
                  <div style={{ fontSize: 7, color: isCurrent ? sc.color : 'var(--text4)', fontWeight: isCurrent ? 700 : 400, whiteSpace: 'nowrap' }}>{stage}</div>
                </div>
                {i < DECISION_TIMELINE.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: isDone ? sc.color : 'var(--border)', opacity: isDone ? 0.4 : 1, margin: '0 2px', marginBottom: 12 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: 'var(--bg)', animation: 'fadeIn .15s ease-out' }}>
          {idea.researchDoc?.overview ? (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text4)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>Research Overview</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>{idea.researchDoc.overview}</div>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 8 }}>No research overview available.</div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/dashboard/committee/${idea.id}`} className="btn btn-ghost btn-sm">
              Full Committee Review
            </Link>
            {idea.allocationQueue && (
              <Link href="/dashboard/allocation-queue" className="btn btn-ghost btn-sm">
                Allocation Queue
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArchivePage() {
  const [data, setData] = useState<ArchiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dirFilter, setDirFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (dirFilter !== 'ALL') params.set('dir', dirFilter);
    if (search) params.set('q', search);
    const res = await fetch(`/api/committee/archive?${params}`);
    setData(await res.json());
    setLoading(false);
  }, [page, statusFilter, dirFilter, search]);

  useEffect(() => { setPage(1); }, [statusFilter, dirFilter, search]);
  useEffect(() => { load(); }, [load]);

  const ideas = data?.ideas ?? [];
  const approvedCount = ideas.filter(i => i.approvalStatus === 'APPROVED' || i.approvalStatus === 'APPROVED_WITH_CONDITIONS').length;
  const rejectedCount = ideas.filter(i => i.approvalStatus === 'REJECTED').length;
  const approvalRate = ideas.length > 0 ? Math.round((approvedCount / ideas.length) * 100) : 0;
  const totalVotes = ideas.reduce((s, i) => s + i.voteCount, 0);

  return (
    <div className="scroll-y" style={{ height: '100%', padding: '18px 20px', background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
        <div>
          <div style={{ marginBottom: 4 }}>
            <Link href="/dashboard/committee" style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 600, letterSpacing: '.04em', textDecoration: 'none' }}>← COMMITTEE</Link>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em', marginBottom: 3 }}>Decision Archive</h1>
          <p style={{ fontSize: 11, color: 'var(--text3)' }}>Complete history of investment committee decisions</p>
        </div>
      </div>

      {/* Stats row */}
      {!loading && data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Total Decisions', value: data.total, color: 'var(--text2)', icon: '≡' },
            { label: 'Approved', value: approvedCount, color: 'var(--long)', icon: '✓' },
            { label: 'Rejected', value: rejectedCount, color: 'var(--short)', icon: '✕' },
            { label: 'Approval Rate', value: `${approvalRate}%`, color: approvalRate >= 50 ? 'var(--long)' : 'var(--warn)', icon: '◉' },
            { label: 'Total Votes', value: totalVotes, color: 'var(--accent)', icon: '◆' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 14px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, color: s.color, opacity: .7 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval rate bar */}
      {!loading && approvalRate > 0 && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 9, padding: '12px 16px', marginBottom: 14, boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text4)', letterSpacing: '.05em', textTransform: 'uppercase' }}>Decision Split</span>
            <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>{data?.total} total decisions</span>
          </div>
          <div style={{ height: 6, borderRadius: 6, overflow: 'hidden', display: 'flex', gap: 2 }}>
            <div style={{ flex: approvedCount, background: 'var(--long)', borderRadius: '4px 0 0 4px', transition: 'flex .5s' }} />
            <div style={{ flex: rejectedCount, background: 'var(--short)', borderRadius: '0 4px 4px 0', transition: 'flex .5s' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 5 }}>
            <span style={{ fontSize: 9, color: 'var(--long)', fontWeight: 600 }}>● {approvedCount} approved ({approvalRate}%)</span>
            <span style={{ fontSize: 9, color: 'var(--short)', fontWeight: 600 }}>● {rejectedCount} rejected ({100 - approvalRate}%)</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ticker…"
          className="inp" style={{ width: 180, fontSize: 11 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {[['ALL', 'All'], ['APPROVED', 'Approved'], ['APPROVED_WITH_CONDITIONS', 'Conditional'], ['REJECTED', 'Rejected']].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={statusFilter === v ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}>
              {l}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['ALL', 'Both'], ['LONG', 'Long'], ['SHORT', 'Short']].map(([v, l]) => (
            <button key={v} onClick={() => setDirFilter(v)}
              className={dirFilter === v ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}>
              {l}
            </button>
          ))}
        </div>
        {data && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>{data.total} decisions</span>}
      </div>

      {/* Decision list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, height: 110, animation: 'pulse 1.5s ease infinite' }} />
          ))}
        </div>
      ) : !data || ideas.length === 0 ? (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '48px 24px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: .4 }}>≡</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>No archived decisions found</div>
          <div style={{ fontSize: 11, color: 'var(--text4)' }}>
            {search || statusFilter !== 'ALL' || dirFilter !== 'ALL'
              ? 'Try adjusting your search filters.'
              : 'Committee decisions will appear here after review.'}
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ideas.map((idea, i) => <DecisionCard key={idea.id} idea={idea} idx={i} />)}
          </div>

          {data.total > data.pageSize && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20, paddingBottom: 20 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn btn-ghost btn-sm">← Prev</button>
              <div style={{ display: 'flex', gap: 6 }}>
                {Array.from({ length: Math.min(5, Math.ceil(data.total / data.pageSize)) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: page === p ? 'var(--accent)' : 'var(--panel)', color: page === p ? '#fff' : 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all .12s' }}>
                      {p}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(data.total / data.pageSize)}
                className="btn btn-ghost btn-sm">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
