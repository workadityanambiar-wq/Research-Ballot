'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Analytics = {
  overview: { totalIdeas: number; approvedIdeas: number; rejectedIdeas: number; pendingIdeas: number; approvalRate: number };
  questions: { total: number; open: number; resolved: number };
  challenges: {
    total: number; open: number; resolved: number; avgResolutionDays: number;
    byCategory: { category: string; count: number }[];
  };
  votes: { total: number; distribution: { decision: string; count: number }[] };
  research: { totalRevisions: number };
  meetings: { total: number; recent: { id: string; title: string; meetingDate: string; status: string; agendaCount: number; attendeeCount: number }[] };
  allocationQueue: { count: number };
  ideasByDir: { dir: string; count: number }[];
};

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .4s ease' }} />
    </div>
  );
}

const MEETING_BADGE: Record<string, string> = {
  COMPLETED: 'badge-long', SCHEDULED: 'badge-accent', IN_PROGRESS: 'badge-warn', CANCELLED: 'badge-dim',
};
const DECISION_COLOR: Record<string, string> = {
  APPROVE: 'var(--long)', REJECT: 'var(--short)',
  APPROVE_WITH_CONDITIONS: 'var(--warn)', ABSTAIN: 'var(--text4)',
};

export default function CommitteeAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/committee/analytics');
    setAnalytics(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ padding: 32, color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>LOADING ANALYTICS…</div>
  );
  if (!analytics) return null;

  const { overview, questions, challenges, votes, research, meetings, allocationQueue, ideasByDir } = analytics;
  const totalDecisions = overview.approvedIdeas + overview.rejectedIdeas;
  const maxChallengeCategory = Math.max(...challenges.byCategory.map(c => c.count), 1);

  return (
    <div className="scroll-y" style={{ flex: 1, padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Committee Analytics</h1>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>Decision-making patterns and committee performance</p>
        </div>
        <Link href="/dashboard/committee" className="btn btn-ghost btn-sm">← Committee</Link>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total Ideas', value: overview.totalIdeas, color: 'var(--accent)' },
          { label: 'Approval Rate', value: `${overview.approvalRate}%`, color: 'var(--long)' },
          { label: 'In Review', value: overview.pendingIdeas, color: 'var(--warn)' },
          { label: 'Allocation Queue', value: allocationQueue.count, color: 'var(--purple)' },
        ].map(card => (
          <div key={card.label} className="panel" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text4)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--mono)', color: card.color, lineHeight: 1 }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
        {/* Decision breakdown */}
        <div className="panel" style={{ padding: 16 }}>
          <div className="sec-title" style={{ marginBottom: 14 }}>Decision Outcomes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Approved', value: overview.approvedIdeas, max: overview.totalIdeas, color: 'var(--long)' },
              { label: 'Rejected', value: overview.rejectedIdeas, max: overview.totalIdeas, color: 'var(--short)' },
              { label: 'Pending', value: overview.pendingIdeas, max: overview.totalIdeas, color: 'var(--warn)' },
            ].map(row => (
              <div key={row.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: row.color }}>{row.value}</span>
                </div>
                <Bar value={row.value} max={row.max} color={row.color} />
              </div>
            ))}
            {ideasByDir.map(d => (
              <div key={d.dir}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{d.dir}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{d.count}</span>
                </div>
                <Bar value={d.count} max={overview.totalIdeas} color={d.dir === 'LONG' ? 'var(--long)' : 'var(--short)'} />
              </div>
            ))}
          </div>
        </div>

        {/* Q&A and Challenges */}
        <div className="panel" style={{ padding: 16 }}>
          <div className="sec-title" style={{ marginBottom: 14 }}>Q&A and Challenges</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Questions Open', value: questions.open, total: questions.total, color: 'var(--warn)' },
              { label: 'Questions Resolved', value: questions.resolved, total: questions.total, color: 'var(--long)' },
              { label: 'Challenges Open', value: challenges.open, total: challenges.total, color: 'var(--short)' },
              { label: 'Challenges Resolved', value: challenges.resolved, total: challenges.total, color: 'var(--long)' },
            ].map(row => (
              <div key={row.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: row.color }}>{row.value}</span>
                </div>
                <Bar value={row.value} max={Math.max(row.total, 1)} color={row.color} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text4)' }}>
            Avg challenge resolution: <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{challenges.avgResolutionDays}d</span>
          </div>
        </div>

        {/* Vote distribution */}
        <div className="panel" style={{ padding: 16 }}>
          <div className="sec-title" style={{ marginBottom: 14 }}>Vote Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {votes.distribution.map(v => (
              <div key={v.decision}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{v.decision.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: DECISION_COLOR[v.decision] ?? 'var(--text4)' }}>{v.count}</span>
                </div>
                <Bar value={v.count} max={votes.total || 1} color={DECISION_COLOR[v.decision] ?? 'var(--text4)'} />
              </div>
            ))}
            {votes.distribution.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text4)' }}>No votes recorded yet</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>
              Total votes: {votes.total} · Revisions: {research.totalRevisions}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 14 }}>
        {/* Challenge categories */}
        <div className="panel" style={{ padding: 16 }}>
          <div className="sec-title" style={{ marginBottom: 14 }}>Challenges by Category</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {challenges.byCategory.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text4)' }}>No challenges yet</div>
            ) : (
              challenges.byCategory.sort((a, b) => b.count - a.count).map(cat => (
                <div key={cat.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{cat.category}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--warn)' }}>{cat.count}</span>
                  </div>
                  <Bar value={cat.count} max={maxChallengeCategory} color="var(--warn)" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent meetings */}
        <div className="panel" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="sec-title">Recent Meetings</div>
            <Link href="/dashboard/committee/meetings" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>View all →</Link>
          </div>
          {meetings.recent.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text4)' }}>No meetings yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {meetings.recent.map(m => (
                <Link key={m.id} href={`/dashboard/committee/meetings/${m.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 6, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--panel2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--mono)', lineHeight: 1 }}>{new Date(m.meetingDate).getDate()}</div>
                      <div style={{ fontSize: 10, color: 'var(--text4)' }}>
                        {new Date(m.meetingDate).toLocaleDateString('en', { month: 'short' })}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text4)' }}>{m.agendaCount} items · {m.attendeeCount} attendees</div>
                    </div>
                    <span className={`badge ${MEETING_BADGE[m.status] ?? 'badge-dim'}`}>{m.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary stats bar */}
      <div className="panel" style={{ padding: '14px 20px', display: 'flex', gap: 40, flexWrap: 'wrap' }}>
        {[
          { label: 'Approval Rate', value: `${overview.approvalRate}%` },
          { label: 'Decisions Made', value: totalDecisions },
          { label: 'Avg Resolution', value: `${challenges.avgResolutionDays}d` },
          { label: 'Total Votes', value: votes.total },
          { label: 'Revisions', value: research.totalRevisions },
          { label: 'Meetings', value: meetings.total },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--text)', lineHeight: 1.2 }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 3, letterSpacing: '.03em' }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
