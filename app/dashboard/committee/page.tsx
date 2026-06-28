'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type IdeaRow = {
  id: string; ticker: string; dir: string; finalScore: number | null;
  approvalStatus: string; pmScore: number | null;
};
type MeetingRow = {
  id: string; title: string; meetingDate: string; status: string;
  agendaItems: { id: string }[]; attendance: { userId: string }[];
};
type Analytics = {
  overview: { totalIdeas: number; approvedIdeas: number; rejectedIdeas: number; pendingIdeas: number; approvalRate: number };
  questions: { total: number; open: number };
  challenges: { total: number; open: number };
  votes: { total: number };
  meetings: { total: number; recent: MeetingRow[] };
  allocationQueue: { count: number };
};

export default function CommitteePage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [aRes, iRes] = await Promise.all([
      fetch('/api/committee/analytics'),
      fetch('/api/ideas?status=REVIEW'),
    ]);
    const [a, i] = await Promise.all([aRes.json(), iRes.json()]);
    setAnalytics(a);
    setIdeas(Array.isArray(i) ? i : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-8 text-[var(--text3)]">Loading committee workspace…</div>;

  const recentMeetings = analytics?.meetings.recent.slice(0, 5) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Investment Committee</h1>
          <p className="text-[var(--text3)] text-sm mt-0.5">Structured decision workspace for all ideas under review</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/committee/meetings" className="btn btn-ghost btn-sm">Meetings</Link>
          <Link href="/dashboard/committee/archive" className="btn btn-ghost btn-sm">Archive</Link>
          <Link href="/dashboard/committee/analytics" className="btn btn-primary btn-sm">Analytics</Link>
        </div>
      </div>

      {/* Overview cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Ideas', value: analytics.overview.totalIdeas, sub: `${analytics.overview.approvalRate}% approval rate`, color: 'var(--accent)' },
            { label: 'In Review', value: analytics.overview.pendingIdeas, sub: `${analytics.questions.open} open questions`, color: 'var(--warn)' },
            { label: 'Open Challenges', value: analytics.challenges.open, sub: `${analytics.challenges.total} total`, color: '#ef4444' },
            { label: 'Queue', value: analytics.allocationQueue.count, sub: 'awaiting allocation', color: 'var(--purple)' },
          ].map(card => (
            <div key={card.label} className="panel p-4">
              <div className="text-[var(--text3)] text-xs font-medium uppercase tracking-wide">{card.label}</div>
              <div className="text-3xl font-bold mt-1" style={{ color: card.color }}>{card.value}</div>
              <div className="text-[var(--text4)] text-xs mt-0.5">{card.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ideas in review */}
        <div className="lg:col-span-2 panel">
          <div className="sec-title p-4 pb-0">Ideas Under Review</div>
          {ideas.length === 0 ? (
            <div className="p-8 text-center text-[var(--text4)]">No ideas currently in review</div>
          ) : (
            <div className="scroll-y" style={{ maxHeight: 420 }}>
              <table className="tbl w-full">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Dir</th>
                    <th>Score</th>
                    <th>PM</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {ideas.map(idea => (
                    <tr key={idea.id}>
                      <td><span className="font-mono font-bold">{idea.ticker}</span></td>
                      <td>
                        <span className={`badge ${idea.dir === 'LONG' ? 'badge-long' : 'badge-short'}`}>
                          {idea.dir}
                        </span>
                      </td>
                      <td className="font-mono">{idea.finalScore?.toFixed(1) ?? '—'}</td>
                      <td className="font-mono text-[var(--text3)]">{idea.pmScore?.toFixed(1) ?? '—'}</td>
                      <td>
                        <Link href={`/dashboard/committee/${idea.id}`} className="btn btn-ghost btn-sm">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming meetings */}
        <div className="panel">
          <div className="flex items-center justify-between p-4 pb-0">
            <div className="sec-title">Recent Meetings</div>
            <Link href="/dashboard/committee/meetings" className="text-xs text-[var(--accent)]">View all</Link>
          </div>
          <div className="p-4 space-y-3">
            {recentMeetings.length === 0 ? (
              <div className="text-center text-[var(--text4)] py-6">No meetings scheduled</div>
            ) : (
              recentMeetings.map(m => {
                const d = new Date(m.meetingDate);
                const isPast = d < new Date();
                return (
                  <Link key={m.id} href={`/dashboard/committee/meetings/${m.id}`}
                    className="block p-3 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm truncate">{m.title}</div>
                      <span className={`badge shrink-0 ${
                        m.status === 'COMPLETED' ? 'badge-dim' :
                        m.status === 'SCHEDULED' ? 'badge-accent' : 'badge-warn'
                      }`}>{m.status}</span>
                    </div>
                    <div className="text-xs text-[var(--text3)] mt-1">
                      {d.toLocaleDateString()} · {(m as unknown as { agendaItems: unknown[] }).agendaItems?.length ?? 0} items
                      {isPast ? ' · Completed' : ''}
                    </div>
                  </Link>
                );
              })
            )}
            <Link href="/dashboard/committee/meetings" className="btn btn-ghost btn-sm w-full mt-2">
              + Schedule Meeting
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
