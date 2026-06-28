'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useBreakpoint } from '@/hooks/useBreakpoint';

type IdeaRow = {
  id: string; ticker: string; dir: string; finalScore: number | null;
  approvalStatus: string; pmScore: number | null; quantScore?: number;
  conv?: number; expRet?: number; weekId?: string;
};
type ReadinessMap = Record<string, { pct: number; ready: boolean; openChallenges: number; openQuestions: number }>;
type MeetingRow = { id: string; title: string; meetingDate: string; status: string; agendaItems: { id: string }[] };
type Analytics = {
  overview: { totalIdeas: number; approvedIdeas: number; rejectedIdeas: number; pendingIdeas: number; approvalRate: number };
  questions: { total: number; open: number };
  challenges: { total: number; open: number };
  meetings: { recent: MeetingRow[] };
  allocationQueue: { count: number };
};

const STAGES = ['Submitted', 'Under Review', 'Q&A', 'Challenge', 'Vote', 'Allocation', 'Execution', 'Archived'];

function Sparkline({ vals, color }: { vals: number[]; color: string }) {
  const min = Math.min(...vals), max = Math.max(...vals), r = max - min || 1;
  const w = 56, h = 18;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - min) / r) * h}`).join(' ');
  return <svg width={w} height={h} style={{ display: 'block' }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function KPICard({ icon, label, value, color, sub, trend, href, sparkData }: {
  icon: string; label: string; value: string | number; color: string;
  sub?: string; trend?: number; href?: string; sparkData?: number[];
}) {
  const content = (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '12px 14px', boxShadow: 'var(--shadow)', cursor: href ? 'pointer' : 'default',
      transition: 'all .15s', display: 'flex', flexDirection: 'column', gap: 6,
    }}
      onMouseEnter={e => href && ((e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)')}
      onMouseLeave={e => href && ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${color}18`, fontSize: 13,
          }}>{icon}</div>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text4)', letterSpacing: '.05em', textTransform: 'uppercase' }}>{label}</span>
        </div>
        {sparkData && <Sparkline vals={sparkData} color={color} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1, fontFamily: 'var(--mono)' }}>{value}</div>
          {sub && <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 3 }}>{sub}</div>}
        </div>
        {trend != null && (
          <div style={{ fontSize: 10, fontWeight: 600, color: trend >= 0 ? 'var(--long)' : 'var(--short)', background: trend >= 0 ? 'var(--long-dim)' : 'var(--short-dim)', padding: '2px 6px', borderRadius: 4 }}>
            {trend >= 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{content}</Link> : content;
}

function IdeaCard({ idea, readiness, loadingR, idx }: { idea: IdeaRow; readiness?: { pct: number; ready: boolean; openChallenges: number; openQuestions: number }; loadingR: boolean; idx: number }) {
  const r = readiness;
  const lc = idea.dir === 'LONG' ? 'var(--long)' : 'var(--short)';
  const readinessPct = r?.pct ?? 0;
  const readyColor = r?.ready ? 'var(--long)' : readinessPct >= 60 ? 'var(--warn)' : '#ef4444';

  return (
    <Link href={`/dashboard/committee/${idea.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10,
        padding: '14px', boxShadow: 'var(--shadow)', transition: 'all .18s',
        animation: `slideUp .25s ease-out ${Math.min(idx * 0.04, 0.3)}s both`,
        borderLeft: `3px solid ${r?.ready ? 'var(--long)' : r ? readyColor : 'var(--border2)'}`,
      }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = 'translateY(-2px)';
          el.style.boxShadow = '0 8px 24px rgba(0,0,0,.1)';
          el.style.borderColor = 'rgba(37,99,235,.3)';
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.transform = '';
          el.style.boxShadow = 'var(--shadow)';
          el.style.borderColor = 'var(--border)';
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{idea.ticker}</span>
              <span className={`badge ${idea.dir === 'LONG' ? 'badge-long' : 'badge-short'}`}>{idea.dir}</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)', letterSpacing: '.04em' }}>
              {idea.weekId ?? 'W26-2025'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {r?.ready ? (
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--long)', background: 'var(--long-dim)', padding: '3px 8px', borderRadius: 4, letterSpacing: '.06em' }}>READY</span>
            ) : (
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--warn)', background: 'var(--warn-dim)', padding: '3px 8px', borderRadius: 4, letterSpacing: '.06em' }}>IN REVIEW</span>
            )}
          </div>
        </div>

        {/* Score metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 10 }}>
          {[
            { label: 'Score', val: idea.finalScore?.toFixed(1) ?? '—', color: 'var(--accent)' },
            { label: 'PM', val: idea.pmScore?.toFixed(1) ?? '—', color: 'var(--text2)' },
            { label: 'Quant', val: idea.quantScore ? `${idea.quantScore}` : '—', color: idea.quantScore && idea.quantScore >= 70 ? 'var(--long)' : 'var(--text4)' },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--bg)', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: 'var(--text4)', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: m.color }}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* Readiness bar */}
        {loadingR ? (
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '60%', background: 'var(--border2)', borderRadius: 4, animation: 'pulse 1.5s ease infinite' }} />
          </div>
        ) : r ? (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 600, letterSpacing: '.04em' }}>READINESS</span>
              <span style={{ fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 700, color: readyColor }}>{r.pct}%</span>
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${r.pct}%`, background: readyColor, borderRadius: 4, transition: 'width .6s ease' }} />
            </div>
          </div>
        ) : null}

        {/* Q&A + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {r && r.openQuestions > 0 && (
            <span style={{ fontSize: 9, color: 'var(--warn)', background: 'var(--warn-dim)', padding: '2px 6px', borderRadius: 4, fontWeight: 600, border: '1px solid rgba(217,119,6,.2)' }}>
              {r.openQuestions}Q open
            </span>
          )}
          {r && r.openChallenges > 0 && (
            <span style={{ fontSize: 9, color: 'var(--short)', background: 'var(--short-dim)', padding: '2px 6px', borderRadius: 4, fontWeight: 600, border: '1px solid rgba(220,38,38,.2)' }}>
              ⚡ {r.openChallenges} challenge
            </span>
          )}
          <div style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--accent)', fontWeight: 700 }}>Review →</div>
        </div>
      </div>
    </Link>
  );
}

export default function CommitteePage() {
  const { isMobile, cols } = useBreakpoint();
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
    if (ideaList.length > 0) {
      setReadinessLoading(true);
      const scores = await Promise.all(ideaList.map(idea => fetch(`/api/committee/${idea.id}/readiness`).then(r => r.json())));
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
  const inReviewIdeas = ideas.filter(i => !readiness[i.id]?.ready);

  const nextMeeting = upcomingMeetings[0];
  const timeUntil = nextMeeting ? Math.max(0, new Date(nextMeeting.meetingDate).getTime() - Date.now()) : null;
  const hoursUntil = timeUntil != null ? Math.floor(timeUntil / 3600000) : null;
  const minsUntil = timeUntil != null ? Math.floor((timeUntil % 3600000) / 60000) : null;

  const sparkData = [3, 5, 4, 7, 6, 8, 7, 9, 8, 10];

  return (
    <div className="scroll-y dash-content" style={{ height: '100%', padding: isMobile ? '12px' : '18px 20px', background: 'var(--bg)' }}>

      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(37,99,235,0.07) 0%, rgba(124,58,237,0.05) 100%)',
        border: '1px solid rgba(37,99,235,0.14)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 16, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: isMobile ? 14 : 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>Investment Committee</span>
              <span className="badge badge-accent pulse">CYCLE ACTIVE</span>
            </div>
            {!isMobile && <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>
              {nextMeeting ? (
                <>
                  <span>Next meeting: </span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{nextMeeting.title}</span>
                  {hoursUntil != null && (
                    <span style={{ marginLeft: 8, color: hoursUntil < 24 ? 'var(--warn)' : 'var(--accent)', fontWeight: 600, fontFamily: 'var(--mono)' }}>
                      {hoursUntil}h {minsUntil}m away
                    </span>
                  )}
                </>
              ) : (
                <span>No upcoming meetings — <Link href="/dashboard/committee/meetings" style={{ color: 'var(--accent)' }}>schedule one</Link></span>
              )}
            </div>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
            <Link href="/dashboard/committee/meetings" className="btn btn-ghost btn-sm">Meetings</Link>
            {!isMobile && <Link href="/dashboard/committee/archive" className="btn btn-ghost btn-sm">Archive</Link>}
            <Link href="/dashboard/committee/analytics" className="btn btn-primary btn-sm">Analytics</Link>
          </div>
        </div>

        {/* Workflow pipeline */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? 4 : 0 }}>
          {STAGES.map((stage, i) => {
            const isDone = i < 1;
            const isCurrent = i === 1;
            return (
              <div key={stage} style={{ display: 'flex', alignItems: 'center', flex: i < STAGES.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700,
                    background: isCurrent ? 'var(--accent)' : isDone ? 'var(--long)' : 'var(--border)',
                    color: isCurrent || isDone ? '#fff' : 'var(--text4)',
                    boxShadow: isCurrent ? '0 0 0 3px rgba(37,99,235,.18)' : 'none',
                    opacity: i > 1 ? 0.45 : 1,
                  }}>{isDone ? '✓' : i + 1}</div>
                  <div style={{ fontSize: 8, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? 'var(--accent)' : 'var(--text4)', whiteSpace: 'nowrap', letterSpacing: '.04em' }}>
                    {stage}
                  </div>
                </div>
                {i < STAGES.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: isDone ? 'rgba(22,163,74,.3)' : 'var(--border)', margin: '0 3px', marginBottom: 14 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(4, 2, 2)}, 1fr)`, gap: 8, marginBottom: isMobile ? 8 : 16 }}>
        <KPICard icon="◎" label="Under Review" value={loading ? '—' : ideas.length} color="var(--accent)" sub="ideas in pipeline" sparkData={sparkData} />
        <KPICard icon="✓" label="Ready to Vote" value={loading ? '—' : readyIdeas.length} color="var(--long)" sub="cleared all gates" sparkData={[2,3,3,4,3,5,4,6,5,readyIdeas.length]} href="/dashboard/committee" />
        <KPICard icon="?" label="Open Questions" value={loading ? '—' : (analytics?.questions.open ?? '—')} color="var(--warn)" sub="awaiting response" sparkData={[8,6,9,7,5,8,6,7,5,analytics?.questions.open ?? 0]} href="/dashboard/action-center" />
        <KPICard icon="⚡" label="Open Challenges" value={loading ? '—' : (analytics?.challenges.open ?? '—')} color="#ef4444" sub="need resolution" sparkData={[3,4,2,5,3,4,2,3,2,analytics?.challenges.open ?? 0]} href="/dashboard/action-center" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(4, 2, 2)}, 1fr)`, gap: 8, marginBottom: isMobile ? 14 : 20 }}>
        <KPICard icon="◈" label="Alloc Queue" value={loading ? '—' : (analytics?.allocationQueue.count ?? '—')} color="var(--purple)" sub="awaiting deployment" href="/dashboard/allocation-queue" />
        <KPICard icon="◆" label="Approved" value={loading ? '—' : (analytics?.overview.approvedIdeas ?? '—')} color="var(--long)" sub="this cycle" sparkData={[0,1,1,2,2,3,3,4,4,analytics?.overview.approvedIdeas ?? 0]} />
        <KPICard icon="✕" label="Rejected" value={loading ? '—' : (analytics?.overview.rejectedIdeas ?? '—')} color="var(--short)" sub="this cycle" />
        <KPICard icon="◉" label="Approval Rate" value={loading ? '—' : `${analytics?.overview.approvalRate ?? 0}%`} color={analytics && analytics.overview.approvalRate >= 50 ? 'var(--long)' : 'var(--warn)'} sub={`of ${analytics?.overview.totalIdeas ?? 0} total`} />
      </div>

      {/* ── Main Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: 16, alignItems: 'start' }}>

        {/* Left: Ideas */}
        <div>
          {/* Ready for vote */}
          {readyIdeas.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--long)' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--long)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Ready for Vote</span>
                <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--long)', background: 'var(--long-dim)', padding: '1px 7px', borderRadius: 10 }}>{readyIdeas.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {readyIdeas.map((idea, i) => (
                  <IdeaCard key={idea.id} idea={idea} readiness={readiness[idea.id]} loadingR={readinessLoading} idx={i} />
                ))}
              </div>
            </div>
          )}

          {/* Under review */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warn)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Under Review</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text4)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 10 }}>{inReviewIdeas.length}</span>
            </div>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, height: 160 }}>
                    {[80, 60, 100, 40].map((w, j) => (
                      <div key={j} style={{ height: 10, width: `${w}%`, background: 'var(--border)', borderRadius: 4, marginBottom: 10, animation: 'pulse 1.5s ease infinite' }} />
                    ))}
                  </div>
                ))}
              </div>
            ) : inReviewIdeas.length === 0 ? (
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>◎</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>
                  {ideas.length === 0 ? 'No ideas in review' : 'All ideas ready for vote'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text4)' }}>Ideas submitted for review will appear here</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                {inReviewIdeas.map((idea, i) => (
                  <IdeaCard key={idea.id} idea={idea} readiness={readiness[idea.id]} loadingR={readinessLoading} idx={i} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Upcoming meetings */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Upcoming Meetings</span>
              <Link href="/dashboard/committee/meetings" style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>View all</Link>
            </div>
            <div style={{ padding: '8px 10px' }}>
              {upcomingMeetings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text4)', fontSize: 11 }}>No upcoming meetings</div>
              ) : (
                upcomingMeetings.map(m => {
                  const d = new Date(m.meetingDate);
                  const daysUntil = Math.ceil((d.getTime() - Date.now()) / 86400000);
                  return (
                    <Link key={m.id} href={`/dashboard/committee/meetings/${m.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderRadius: 7, marginBottom: 4, transition: 'background .12s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent-dim)', border: '1px solid rgba(37,99,235,.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)', lineHeight: 1, fontFamily: 'var(--mono)' }}>{d.getDate()}</div>
                        <div style={{ fontSize: 7, color: 'var(--accent)', letterSpacing: '.05em', textTransform: 'uppercase' }}>{d.toLocaleDateString('en', { month: 'short' })}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                        <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 1 }}>
                          {daysUntil <= 0 ? <span style={{ color: 'var(--warn)' }}>Today</span> : daysUntil === 1 ? <span style={{ color: 'var(--warn)' }}>Tomorrow</span> : `In ${daysUntil}d`}
                          {' · '}{m.agendaItems.length} items
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
              <Link href="/dashboard/committee/meetings" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px', borderRadius: 7,
                border: '1px dashed var(--border2)', color: 'var(--text4)', fontSize: 10, fontWeight: 600, textDecoration: 'none',
                marginTop: 4, transition: 'all .12s',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--accent)'; el.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border2)'; el.style.color = 'var(--text4)'; }}
              >
                + Schedule Meeting
              </Link>
            </div>
          </div>

          {/* Approval analytics */}
          {analytics && (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Decision Analytics</span>
              </div>
              <div style={{ padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, fontFamily: 'var(--mono)', color: analytics.overview.approvalRate >= 50 ? 'var(--long)' : 'var(--warn)' }}>
                    {analytics.overview.approvalRate}%
                  </span>
                  <div style={{ paddingBottom: 2 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)' }}>Approval Rate</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)' }}>{analytics.overview.approvedIdeas} / {analytics.overview.totalIdeas} ideas</div>
                  </div>
                </div>
                {[
                  { label: 'Approved', value: analytics.overview.approvedIdeas, color: 'var(--long)' },
                  { label: 'Rejected', value: analytics.overview.rejectedIdeas, color: 'var(--short)' },
                  { label: 'Pending', value: analytics.overview.pendingIdeas, color: 'var(--warn)' },
                ].map(row => (
                  <div key={row.label} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: 'var(--text4)' }}>{row.label}</span>
                      <span style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, color: row.color }}>{row.value}</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${analytics.overview.totalIdeas > 0 ? (row.value / analytics.overview.totalIdeas) * 100 : 0}%`, background: row.color, borderRadius: 3, transition: 'width .6s ease' }} />
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/committee/analytics" style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, display: 'block', marginTop: 8 }}>
                  Full analytics →
                </Link>
              </div>
            </div>
          )}

          {/* Quick links */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { label: 'Action Center', icon: '✦', href: '/dashboard/action-center', color: 'var(--accent)' },
              { label: 'Alloc Queue', icon: '◈', href: '/dashboard/allocation-queue', color: 'var(--purple)' },
              { label: 'Research', icon: '⬡', href: '/dashboard/research', color: 'var(--long)' },
              { label: 'Archive', icon: '≡', href: '/dashboard/committee/archive', color: 'var(--text3)' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, transition: 'all .12s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = l.color; el.style.background = `${l.color}0a`; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'var(--border)'; el.style.background = 'var(--panel)'; }}
              >
                <span style={{ fontSize: 14, color: l.color }}>{l.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)' }}>{l.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
