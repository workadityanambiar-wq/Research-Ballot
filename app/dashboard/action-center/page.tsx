'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type ActionItem = {
  id: string; type: string; priority: string;
  title: string; detail: string; href: string; createdAt: string;
};
type Summary = {
  openQuestions: number; openChallenges: number; pendingVotes: number;
  unreadAlerts: number; upcomingMeetings: number; queueItems: number; docsNeedingWork: number;
};

const TYPE_ICON: Record<string, string> = {
  QUESTION: '?', CHALLENGE: '!', VOTE_NEEDED: '✓', MEETING: '📅',
};
const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: 'var(--warn)', MEDIUM: 'var(--accent)', LOW: 'var(--text4)',
};

export default function ActionCenterPage() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');

  const load = useCallback(async () => {
    const res = await fetch('/api/action-center');
    const data = await res.json();
    setActions(data.actions ?? []);
    setSummary(data.summary ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = typeFilter === 'ALL' ? actions : actions.filter(a => a.type === typeFilter);

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Action Center</h1>
        <p className="text-[var(--text3)] text-sm mt-0.5">Your pending tasks across the investment committee workflow</p>
      </div>

      {summary && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Questions', value: summary.openQuestions, color: 'var(--warn)', href: '/dashboard/committee' },
            { label: 'Challenges', value: summary.openChallenges, color: '#ef4444', href: '/dashboard/committee' },
            { label: 'Votes', value: summary.pendingVotes, color: 'var(--accent)', href: '/dashboard/committee' },
            { label: 'Alerts', value: summary.unreadAlerts, color: 'var(--purple)', href: '/dashboard/cio' },
            { label: 'Meetings', value: summary.upcomingMeetings, color: 'var(--text)', href: '/dashboard/committee/meetings' },
            { label: 'Queue', value: summary.queueItems, color: 'var(--long)', href: '/dashboard/allocation-queue' },
          ].map(card => (
            <Link key={card.label} href={card.href}
              className="panel p-3 text-center hover:border-[var(--accent)] transition-colors block">
              <div className="text-2xl font-bold" style={{ color: card.value > 0 ? card.color : 'var(--text4)' }}>
                {card.value}
              </div>
              <div className="text-xs text-[var(--text4)]">{card.label}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {['ALL', 'QUESTION', 'CHALLENGE', 'VOTE_NEEDED', 'MEETING'].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-ghost'}`}>
            {t === 'ALL' ? 'All' : t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[var(--text3)]">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="panel p-12 text-center">
          <div className="text-4xl mb-3">✓</div>
          <div className="text-[var(--text3)]">
            {typeFilter === 'ALL' ? 'All clear — no pending actions!' : `No pending ${typeFilter.toLowerCase()} actions`}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(action => (
            <Link key={action.id} href={action.href}
              className="panel p-4 flex items-start gap-4 hover:border-[var(--accent)] transition-colors block">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: `${PRIORITY_COLOR[action.priority]}20`, color: PRIORITY_COLOR[action.priority] }}>
                {TYPE_ICON[action.type] ?? '·'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium">{action.title}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${PRIORITY_COLOR[action.priority]}20`, color: PRIORITY_COLOR[action.priority] }}>
                    {action.priority}
                  </span>
                  <span className="text-xs text-[var(--text4)] ml-auto">
                    {action.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-sm text-[var(--text2)] truncate">{action.detail}</div>
              </div>
              <span className="text-xs text-[var(--text4)] shrink-0 mt-1">
                {new Date(action.createdAt).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
