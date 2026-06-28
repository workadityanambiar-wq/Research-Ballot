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

const BAR_MAX = 200;

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export default function CommitteeAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/committee/analytics');
    setAnalytics(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-8 text-[var(--text3)]">Loading analytics…</div>;
  if (!analytics) return null;

  const { overview, questions, challenges, votes, research, meetings, allocationQueue, ideasByDir } = analytics;
  const totalDecisions = overview.approvedIdeas + overview.rejectedIdeas;
  const maxChallengeCategory = Math.max(...challenges.byCategory.map(c => c.count), 1);

  const DECISION_COLOR: Record<string, string> = {
    APPROVE: 'var(--long)', REJECT: 'var(--short)',
    APPROVE_WITH_CONDITIONS: 'var(--warn)', ABSTAIN: 'var(--text4)',
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Committee Analytics</h1>
          <p className="text-[var(--text3)] text-sm mt-0.5">Decision-making patterns and committee performance</p>
        </div>
        <Link href="/dashboard/committee" className="btn btn-ghost btn-sm">← Committee</Link>
      </div>

      {/* Overview row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Ideas', value: overview.totalIdeas, color: 'var(--accent)' },
          { label: 'Approval Rate', value: `${overview.approvalRate}%`, color: 'var(--long)' },
          { label: 'In Review', value: overview.pendingIdeas, color: 'var(--warn)' },
          { label: 'Allocation Queue', value: allocationQueue.count, color: 'var(--purple)' },
        ].map(card => (
          <div key={card.label} className="panel p-4">
            <div className="text-xs text-[var(--text4)] uppercase tracking-wide mb-1">{card.label}</div>
            <div className="text-3xl font-bold" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Decision breakdown */}
        <div className="panel p-5">
          <div className="sec-title mb-4">Decision Outcomes</div>
          <div className="space-y-3">
            {[
              { label: 'Approved', value: overview.approvedIdeas, color: 'var(--long)' },
              { label: 'Rejected', value: overview.rejectedIdeas, color: 'var(--short)' },
              { label: 'Pending', value: overview.pendingIdeas, color: 'var(--warn)' },
            ].map(row => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{row.label}</span>
                  <span className="text-sm font-mono" style={{ color: row.color }}>{row.value}</span>
                </div>
                <Bar value={row.value} max={overview.totalIdeas} color={row.color} />
              </div>
            ))}
            {ideasByDir.map(d => (
              <div key={d.dir}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--text3)]">{d.dir}</span>
                  <span className="text-sm font-mono text-[var(--text3)]">{d.count}</span>
                </div>
                <Bar value={d.count} max={overview.totalIdeas} color={d.dir === 'LONG' ? 'var(--long)' : 'var(--short)'} />
              </div>
            ))}
          </div>
        </div>

        {/* Questions & Challenges */}
        <div className="panel p-5">
          <div className="sec-title mb-4">Q&A and Challenges</div>
          <div className="space-y-3 mb-5">
            {[
              { label: 'Questions Open', value: questions.open, total: questions.total, color: 'var(--warn)' },
              { label: 'Questions Resolved', value: questions.resolved, total: questions.total, color: 'var(--long)' },
              { label: 'Challenges Open', value: challenges.open, total: challenges.total, color: '#ef4444' },
              { label: 'Challenges Resolved', value: challenges.resolved, total: challenges.total, color: 'var(--long)' },
            ].map(row => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{row.label}</span>
                  <span className="font-mono text-sm" style={{ color: row.color }}>{row.value}</span>
                </div>
                <Bar value={row.value} max={Math.max(row.total, 1)} color={row.color} />
              </div>
            ))}
          </div>
          <div className="text-xs text-[var(--text4)]">
            Avg challenge resolution: <span className="font-mono text-[var(--text)]">{challenges.avgResolutionDays}d</span>
          </div>
        </div>

        {/* Vote distribution */}
        <div className="panel p-5">
          <div className="sec-title mb-4">Vote Distribution</div>
          <div className="space-y-3">
            {votes.distribution.map(v => (
              <div key={v.decision}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{v.decision.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-sm" style={{ color: DECISION_COLOR[v.decision] ?? 'var(--text4)' }}>
                    {v.count}
                  </span>
                </div>
                <Bar value={v.count} max={votes.total || 1} color={DECISION_COLOR[v.decision] ?? 'var(--text4)'} />
              </div>
            ))}
            {votes.distribution.length === 0 && (
              <div className="text-[var(--text4)] text-sm">No votes recorded yet</div>
            )}
            <div className="text-xs text-[var(--text4)] mt-2">Total votes: {votes.total} · Revisions: {research.totalRevisions}</div>
          </div>
        </div>

        {/* Challenge categories */}
        <div className="panel p-5">
          <div className="sec-title mb-4">Challenges by Category</div>
          <div className="space-y-2">
            {challenges.byCategory.length === 0 ? (
              <div className="text-[var(--text4)] text-sm">No challenges yet</div>
            ) : (
              challenges.byCategory.sort((a, b) => b.count - a.count).map(cat => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{cat.category}</span>
                    <span className="font-mono text-sm text-[var(--warn)]">{cat.count}</span>
                  </div>
                  <Bar value={cat.count} max={maxChallengeCategory} color="var(--warn)" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent meetings */}
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="sec-title">Recent Meetings</div>
            <Link href="/dashboard/committee/meetings" className="text-xs text-[var(--accent)]">View all</Link>
          </div>
          {meetings.recent.length === 0 ? (
            <div className="text-[var(--text4)] text-sm">No meetings yet</div>
          ) : (
            <div className="space-y-2">
              {meetings.recent.map(m => (
                <Link key={m.id} href={`/dashboard/committee/meetings/${m.id}`}
                  className="flex items-center gap-3 p-2 rounded hover:bg-[var(--panel2)] transition-colors block">
                  <div className="w-10 text-center">
                    <div className="font-bold text-lg font-mono">{new Date(m.meetingDate).getDate()}</div>
                    <div className="text-[10px] text-[var(--text4)]">
                      {new Date(m.meetingDate).toLocaleDateString('en', { month: 'short' })}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{m.title}</div>
                    <div className="text-xs text-[var(--text4)]">{m.agendaCount} items · {m.attendeeCount} attendees</div>
                  </div>
                  <span className={`badge ${
                    m.status === 'COMPLETED' ? 'badge-long' : m.status === 'SCHEDULED' ? 'badge-accent' : 'badge-dim'
                  }`}>{m.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary stats bar */}
      <div className="panel p-4 flex flex-wrap gap-6">
        {[
          { label: 'Approval Rate', value: `${overview.approvalRate}%` },
          { label: 'Decisions Made', value: totalDecisions },
          { label: 'Avg Resolution', value: `${challenges.avgResolutionDays}d` },
          { label: 'Total Votes', value: votes.total },
          { label: 'Revisions', value: research.totalRevisions },
          { label: 'Meetings', value: meetings.total },
        ].map(stat => (
          <div key={stat.label} className="text-center">
            <div className="text-xl font-bold font-mono">{stat.value}</div>
            <div className="text-xs text-[var(--text4)]">{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: BAR_MAX }} className="hidden" />
    </div>
  );
}
