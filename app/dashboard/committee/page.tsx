'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type IdeaRow = {
  id: string; ticker: string; dir: string; finalScore: number | null;
  approvalStatus: string; pmScore: number | null;
};
type ReadinessMap = Record<string, { pct: number; ready: boolean; openChallenges: number; openQuestions: number }>;
type MeetingRow = {
  id: string; title: string; meetingDate: string; status: string;
  agendaItems: { id: string }[];
};
type Analytics = {
  overview: { totalIdeas: number; approvedIdeas: number; rejectedIdeas: number; pendingIdeas: number; approvalRate: number };
  questions: { total: number; open: number };
  challenges: { total: number; open: number };
  meetings: { recent: MeetingRow[] };
  allocationQueue: { count: number };
};

export default function CommitteePage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [readiness, setReadiness] = useState<ReadinessMap>({});
  const [loading, setLoading] = useState(true);
  const [readinessLoading, setReadinessLoading] = useState(false);

  const load = useCallback(async () => {
    const [aRes, iRes] = await Promise.all([
      fetch('/api/committee/analytics'),
      fetch('/api/ideas?status=REVIEW'),
    ]);
    const [a, i] = await Promise.all([aRes.json(), iRes.json()]);
    setAnalytics(a);
    const ideaList: IdeaRow[] = Array.isArray(i) ? i : [];
    setIdeas(ideaList);
    setLoading(false);

    // Load readiness scores for all in-review ideas
    if (ideaList.length > 0) {
      setReadinessLoading(true);
      const scores = await Promise.all(
        ideaList.map(idea => fetch(`/api/committee/${idea.id}/readiness`).then(r => r.json()))
      );
      const map: ReadinessMap = {};
      ideaList.forEach((idea, idx) => { map[idea.id] = scores[idx]; });
      setReadiness(map);
      setReadinessLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const upcomingMeetings = (analytics?.meetings.recent ?? [])
    .filter(m => m.status === 'SCHEDULED' && new Date(m.meetingDate) >= new Date())
    .slice(0, 3);

  const readyIdeas = ideas.filter(i => readiness[i.id]?.ready);
  const notReadyIdeas = ideas.filter(i => readiness[i.id] && !readiness[i.id].ready);
  const pendingReadiness = ideas.filter(i => !readiness[i.id]);

  return (
    <div className="p-5 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Investment Committee</h1>
          <p className="text-[var(--text4)] text-xs mt-0.5">Structured decision workflow for investment ideas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/committee/meetings" className="btn btn-ghost btn-sm">Meetings</Link>
          <Link href="/dashboard/committee/archive" className="btn btn-ghost btn-sm">Archive</Link>
          <Link href="/dashboard/committee/analytics" className="btn btn-primary btn-sm">Analytics</Link>
        </div>
      </div>

      {/* Stats row */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'In Review', value: analytics.overview.pendingIdeas, color: 'var(--accent)', href: null },
            { label: 'Ready to Vote', value: readyIdeas.length, color: 'var(--long)', href: null },
            { label: 'Open Questions', value: analytics.questions.open, color: 'var(--warn)', href: '/dashboard/action-center' },
            { label: 'Open Challenges', value: analytics.challenges.open, color: '#ef4444', href: '/dashboard/action-center' },
            { label: 'Alloc Queue', value: analytics.allocationQueue.count, color: 'var(--purple)', href: '/dashboard/allocation-queue' },
          ].map(card => (
            <div key={card.label} className={`panel p-3 ${card.href ? 'cursor-pointer hover:border-[var(--accent)]' : ''}`}
              onClick={() => card.href && (window.location.href = card.href)}>
              <div className="text-[var(--text4)] text-[10px] font-semibold uppercase tracking-wide">{card.label}</div>
              <div className="text-2xl font-bold mt-0.5" style={{ color: card.color }}>{loading ? '—' : card.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Ideas in review — main column */}
        <div className="lg:col-span-2 space-y-3">
          {/* Ready */}
          {readyIdeas.length > 0 && (
            <div className="panel">
              <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[var(--border)]">
                <span className="w-2 h-2 rounded-full bg-[var(--long)]" />
                <span className="text-xs font-semibold text-[var(--long)]">READY FOR VOTE</span>
                <span className="badge badge-long ml-auto">{readyIdeas.length}</span>
              </div>
              <IdeaTable ideas={readyIdeas} readiness={readiness} />
            </div>
          )}

          {/* Not ready / pending */}
          <div className="panel">
            <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[var(--border)]">
              <span className="w-2 h-2 rounded-full bg-[var(--warn)]" />
              <span className="text-xs font-semibold text-[var(--text3)]">UNDER REVIEW</span>
              <span className="badge badge-dim ml-auto">{notReadyIdeas.length + pendingReadiness.length}</span>
            </div>
            {loading ? (
              <div className="p-8 text-center text-[var(--text4)] text-sm">Loading…</div>
            ) : notReadyIdeas.length === 0 && pendingReadiness.length === 0 ? (
              <div className="p-8 text-center text-[var(--text4)] text-sm">
                {ideas.length === 0 ? 'No ideas currently in review' : 'All ideas are ready for vote'}
              </div>
            ) : (
              <IdeaTable ideas={[...pendingReadiness, ...notReadyIdeas]} readiness={readiness} loadingReadiness={readinessLoading} />
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Upcoming meetings */}
          <div className="panel">
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wide">Upcoming Meetings</span>
              <Link href="/dashboard/committee/meetings" className="text-[10px] text-[var(--accent)]">View all</Link>
            </div>
            <div className="p-3 space-y-2">
              {upcomingMeetings.length === 0 ? (
                <div className="text-center text-[var(--text4)] text-xs py-4">No upcoming meetings</div>
              ) : (
                upcomingMeetings.map(m => {
                  const d = new Date(m.meetingDate);
                  const daysUntil = Math.ceil((d.getTime() - Date.now()) / 86400000);
                  return (
                    <Link key={m.id} href={`/dashboard/committee/meetings/${m.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--panel2)] transition-colors block">
                      <div className="text-center w-10 shrink-0">
                        <div className="text-lg font-bold font-mono leading-none">{d.getDate()}</div>
                        <div className="text-[9px] text-[var(--text4)]">{d.toLocaleDateString('en', { month: 'short' })}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{m.title}</div>
                        <div className="text-[10px] text-[var(--text4)]">
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                          {' · '}{m.agendaItems.length} items
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
              <Link href="/dashboard/committee/meetings"
                className="flex items-center justify-center gap-1 py-2 rounded-lg border border-dashed border-[var(--border)] text-[var(--text4)] text-xs hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">
                + Schedule Meeting
              </Link>
            </div>
          </div>

          {/* Analytics snapshot */}
          {analytics && (
            <div className="panel">
              <div className="px-4 pt-3 pb-2 border-b border-[var(--border)]">
                <span className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wide">Approval Rate</span>
              </div>
              <div className="p-4">
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-3xl font-bold" style={{ color: analytics.overview.approvalRate >= 50 ? 'var(--long)' : 'var(--warn)' }}>
                    {analytics.overview.approvalRate}%
                  </span>
                  <span className="text-xs text-[var(--text4)] mb-1">{analytics.overview.approvedIdeas} of {analytics.overview.totalIdeas} approved</span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Approved', value: analytics.overview.approvedIdeas, color: 'var(--long)' },
                    { label: 'Rejected', value: analytics.overview.rejectedIdeas, color: 'var(--short)' },
                    { label: 'Pending', value: analytics.overview.pendingIdeas, color: 'var(--warn)' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center gap-2">
                      <div className="text-[10px] text-[var(--text4)] w-14">{row.label}</div>
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--border)]">
                        <div className="h-full rounded-full" style={{
                          width: `${analytics.overview.totalIdeas > 0 ? (row.value / analytics.overview.totalIdeas) * 100 : 0}%`,
                          backgroundColor: row.color,
                        }} />
                      </div>
                      <div className="text-[10px] font-mono w-6 text-right" style={{ color: row.color }}>{row.value}</div>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard/committee/analytics" className="text-[10px] text-[var(--accent)] mt-3 block">
                  Full analytics →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IdeaTable({ ideas, readiness, loadingReadiness }: {
  ideas: IdeaRow[];
  readiness: ReadinessMap;
  loadingReadiness?: boolean;
}) {
  if (ideas.length === 0) return null;
  return (
    <div>
      {ideas.map(idea => {
        const r = readiness[idea.id];
        return (
          <Link key={idea.id} href={`/dashboard/committee/${idea.id}`}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--panel2)] transition-colors block">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-mono font-bold text-sm">{idea.ticker}</span>
              <span className={`badge ${idea.dir === 'LONG' ? 'badge-long' : 'badge-short'}`} style={{ fontSize: 9 }}>{idea.dir}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-[var(--text4)] font-mono">
                {idea.finalScore?.toFixed(1) ?? '—'}
              </span>
              {loadingReadiness || !r ? (
                <span className="text-[10px] text-[var(--text4)]">…</span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 rounded-full bg-[var(--border)]">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${r.pct}%`, backgroundColor: r.ready ? 'var(--long)' : r.pct >= 60 ? 'var(--warn)' : '#ef4444' }} />
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: r.ready ? 'var(--long)' : r.pct >= 60 ? 'var(--warn)' : 'var(--text4)' }}>
                    {r.pct}%
                  </span>
                  {r.openChallenges > 0 && (
                    <span className="text-[9px] text-[#ef4444]">⚡{r.openChallenges}</span>
                  )}
                </div>
              )}
              <span className="text-[10px] text-[var(--accent)]">→</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
