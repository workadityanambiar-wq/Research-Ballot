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

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
  QUESTION:    { icon: '?',  label: 'Question',    color: 'var(--warn)',   bg: 'var(--warn-dim)',   border: 'rgba(217,119,6,.2)' },
  CHALLENGE:   { icon: '⚡', label: 'Challenge',   color: 'var(--short)',  bg: 'var(--short-dim)',  border: 'rgba(220,38,38,.2)' },
  VOTE_NEEDED: { icon: '✓',  label: 'Vote Needed', color: 'var(--accent)', bg: 'var(--accent-dim)', border: 'rgba(37,99,235,.2)' },
  MEETING:     { icon: '▦',  label: 'Meeting',     color: 'var(--purple)', bg: 'var(--purple-dim)', border: 'rgba(124,58,237,.2)' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CRITICAL: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,.1)' },
  HIGH:     { label: 'High',     color: 'var(--short)', bg: 'var(--short-dim)' },
  MEDIUM:   { label: 'Medium',   color: 'var(--warn)',  bg: 'var(--warn-dim)' },
  LOW:      { label: 'Low',      color: 'var(--text4)', bg: 'var(--bg)' },
};

function ActionCard({ action, idx }: { action: ActionItem; idx: number }) {
  const tc = TYPE_CONFIG[action.type] ?? TYPE_CONFIG.QUESTION;
  const pc = PRIORITY_CONFIG[action.priority] ?? PRIORITY_CONFIG.MEDIUM;
  const age = Math.floor((Date.now() - new Date(action.createdAt).getTime()) / 60000);
  const ageStr = age < 60 ? `${age}m ago` : age < 1440 ? `${Math.floor(age / 60)}h ago` : `${Math.floor(age / 1440)}d ago`;
  const isUrgent = action.priority === 'CRITICAL' || action.priority === 'HIGH';

  return (
    <Link href={action.href} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: 'var(--panel)', border: `1px solid ${isUrgent && action.priority === 'CRITICAL' ? 'rgba(239,68,68,.25)' : 'var(--border)'}`,
        borderRadius: 9, padding: '12px 14px', boxShadow: 'var(--shadow)',
        display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
        transition: 'all .15s',
        animation: `slideUp .2s ease-out ${Math.min(idx * 0.03, 0.25)}s both`,
      }}
        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-1px)'; el.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'; el.style.borderColor = tc.color; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = 'var(--shadow)'; el.style.borderColor = isUrgent && action.priority === 'CRITICAL' ? 'rgba(239,68,68,.25)' : 'var(--border)'; }}
      >
        {/* Icon */}
        <div style={{ width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tc.bg, border: `1px solid ${tc.border}`, flexShrink: 0, fontSize: 14, color: tc.color, fontWeight: 700 }}>
          {tc.icon}
        </div>
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{action.title}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: pc.color, background: pc.bg, padding: '2px 6px', borderRadius: 4, flexShrink: 0, letterSpacing: '.04em' }}>
              {pc.label.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{action.detail}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: tc.color, background: tc.bg, border: `1px solid ${tc.border}`, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>{tc.label}</span>
            <span style={{ fontSize: 9, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>{ageStr}</span>
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--accent)', flexShrink: 0, paddingTop: 2, fontWeight: 700 }}>→</div>
      </div>
    </Link>
  );
}

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

  const grouped: Record<string, ActionItem[]> = {};
  if (typeFilter === 'ALL') {
    for (const action of actions) {
      (grouped[action.type] ??= []).push(action);
    }
  }

  const totalUrgent = actions.filter(a => a.priority === 'CRITICAL' || a.priority === 'HIGH').length;

  return (
    <div className="scroll-y" style={{ height: '100%', padding: '18px 20px', background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 10 }}>
            Action Center
            {totalUrgent > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--short)', background: 'var(--short-dim)', border: '1px solid rgba(220,38,38,.25)', padding: '2px 8px', borderRadius: 10 }}>
                {totalUrgent} urgent
              </span>
            )}
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text3)' }}>Pending tasks across the investment committee workflow</p>
        </div>
        <button onClick={load} className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>↺ Refresh</button>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Questions', value: summary.openQuestions, color: 'var(--warn)', icon: '?', href: '/dashboard/committee' },
            { label: 'Challenges', value: summary.openChallenges, color: 'var(--short)', icon: '⚡', href: '/dashboard/committee' },
            { label: 'Votes', value: summary.pendingVotes, color: 'var(--accent)', icon: '✓', href: '/dashboard/committee' },
            { label: 'Alerts', value: summary.unreadAlerts, color: 'var(--purple)', icon: '◉', href: '/dashboard/cio' },
            { label: 'Meetings', value: summary.upcomingMeetings, color: 'var(--text2)', icon: '▦', href: '/dashboard/committee/meetings' },
            { label: 'Queue', value: summary.queueItems, color: 'var(--long)', icon: '◈', href: '/dashboard/allocation-queue' },
          ].map(card => (
            <Link key={card.label} href={card.href} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{
                background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px',
                boxShadow: 'var(--shadow)', textAlign: 'center', transition: 'all .12s', cursor: 'pointer',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = card.color; el.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.transform = ''; }}
              >
                <div style={{ fontSize: 12, color: card.color, marginBottom: 4 }}>{card.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color: card.value > 0 ? card.color : 'var(--text4)', lineHeight: 1, marginBottom: 3 }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>{card.label}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>

        {/* Action list */}
        <div>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[['ALL', 'All', null], ['QUESTION', 'Questions', 'var(--warn)'], ['CHALLENGE', 'Challenges', 'var(--short)'], ['VOTE_NEEDED', 'Votes', 'var(--accent)'], ['MEETING', 'Meetings', 'var(--purple)']].map(([v, l, c]) => (
              <button key={v} onClick={() => setTypeFilter(v as string)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer', transition: 'all .12s',
                  background: typeFilter === v ? (c ?? 'var(--accent)') : 'var(--panel)',
                  color: typeFilter === v ? '#fff' : (c ?? 'var(--text3)'),
                  border: `1px solid ${typeFilter === v ? 'transparent' : 'var(--border)'}`,
                }}>
                {l}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 9, padding: '12px 14px', height: 80, animation: 'pulse 1.5s ease infinite' }} />
              ))}
            </div>
          ) : typeFilter === 'ALL' ? (
            // Grouped view
            Object.entries(grouped).length === 0 ? (
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '48px 24px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 32, marginBottom: 12, color: 'var(--long)' }}>✓</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>All clear — no pending actions!</div>
                <div style={{ fontSize: 11, color: 'var(--text4)' }}>The committee workflow is up to date. Check back after submissions.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(TYPE_CONFIG).map(([type, tc]) => {
                  const items = grouped[type];
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={type}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: tc.color, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: tc.color, letterSpacing: '.07em', textTransform: 'uppercase' }}>{tc.label}s</span>
                        <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: tc.color, background: tc.bg, padding: '1px 7px', borderRadius: 10 }}>{items.length}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {items.map((action, i) => <ActionCard key={action.id} action={action} idx={i} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // Filtered view
            filtered.length === 0 ? (
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '40px 24px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 28, marginBottom: 10, color: 'var(--long)' }}>✓</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>No pending {typeFilter.replace('_', ' ').toLowerCase()} actions</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filtered.map((action, i) => <ActionCard key={action.id} action={action} idx={i} />)}
              </div>
            )
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Today's agenda */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(37,99,235,.05) 0%, transparent 100%)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Today's Agenda</div>
              <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            </div>
            <div style={{ padding: '10px 12px' }}>
              {summary && summary.upcomingMeetings > 0 ? (
                <Link href="/dashboard/committee/meetings" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '8px', borderRadius: 7, transition: 'background .12s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--purple-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--purple)', flexShrink: 0 }}>▦</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{summary.upcomingMeetings} meeting{summary.upcomingMeetings !== 1 ? 's' : ''} today</div>
                    <div style={{ fontSize: 10, color: 'var(--purple)' }}>View schedule →</div>
                  </div>
                </Link>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text4)', fontSize: 11 }}>No meetings today</div>
              )}

              {/* Action summary tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                {summary && [
                  { label: 'Questions', value: summary.openQuestions, color: 'var(--warn)', href: '/dashboard/committee' },
                  { label: 'Challenges', value: summary.openChallenges, color: 'var(--short)', href: '/dashboard/committee' },
                  { label: 'Votes', value: summary.pendingVotes, color: 'var(--accent)', href: '/dashboard/committee' },
                  { label: 'Alerts', value: summary.unreadAlerts, color: 'var(--purple)', href: '/dashboard/cio' },
                ].map(item => (
                  <Link key={item.label} href={item.href} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ background: 'var(--bg)', borderRadius: 7, padding: '8px 10px', border: '1px solid var(--border)', transition: 'all .12s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = item.color}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
                    >
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--mono)', color: item.value > 0 ? item.color : 'var(--text4)', lineHeight: 1 }}>{item.value}</div>
                      <div style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', marginTop: 2 }}>{item.label}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Quick Navigate</span>
            </div>
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { label: 'Committee Hub', icon: '⬡', href: '/dashboard/committee', color: 'var(--accent)' },
                { label: 'Meetings', icon: '▦', href: '/dashboard/committee/meetings', color: 'var(--purple)' },
                { label: 'Allocation Queue', icon: '◈', href: '/dashboard/allocation-queue', color: 'var(--long)' },
                { label: 'Research Pipeline', icon: '◷', href: '/dashboard/research', color: 'var(--text3)' },
                { label: 'Decision Archive', icon: '≡', href: '/dashboard/committee/archive', color: 'var(--text3)' },
              ].map(link => (
                <Link key={link.label} href={link.href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, transition: 'background .12s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <span style={{ fontSize: 12, color: link.color, width: 16, textAlign: 'center' }}>{link.icon}</span>
                  <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Priority legend */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Priority Guide</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(PRIORITY_CONFIG).map(([k, pc]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: pc.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>{pc.label}</span>
                  <span style={{ fontSize: 9, color: 'var(--text4)', marginLeft: 'auto', fontFamily: 'var(--mono)' }}>
                    {k === 'CRITICAL' ? 'Immediate' : k === 'HIGH' ? 'Same day' : k === 'MEDIUM' ? '48h' : 'When free'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
