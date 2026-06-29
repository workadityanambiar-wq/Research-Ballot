'use client';
import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// ── Types (unchanged) ────────────────────────────────────────────────────────

type Question = {
  id: string; question: string; status: string; priority: string;
  raisedBy: string; assignedTo: string | null; answer: string | null;
  answeredBy: string | null; createdAt: string;
};
type Challenge = {
  id: string; category: string; description: string; status: string;
  priority: string; raisedBy: string; evidence: string | null;
  resolution: string | null; resolvedBy: string | null; createdAt: string;
};
type Justification = {
  id: string; userId: string; decision: string; summary: string;
  keyStrengths: string | null; keyConcerns: string | null; conditions: string | null;
  additionalNotes: string | null; createdAt: string;
};
type Revision = {
  id: string; revisionNum: number; summary: string; changes: string | null;
  submittedBy: string; createdAt: string;
};
type Readiness = {
  score: number; maxScore: number; pct: number; ready: boolean;
  checklist: { key: string; label: string; done: boolean; weight: number }[];
  openChallenges: number; openQuestions: number;
};
type QuantScore = {
  finalQuantScore: number; quantLabel: string;
  trendScore: number; trendLabel: string;
  momentumScore: number; momentumLabel: string;
  trendQualityScore: number; trendQualityLabel: string;
  maAlignmentScore: number; volatilityScore: number; volatilityLabel: string;
  srScore: number; breakoutScore: number; volumeScore: number;
  rsi14: number; adx14: number;
};
type CommitteeData = {
  idea: {
    id: string; ticker: string; dir: string; approvalStatus: string;
    finalScore: number | null; quantScore: number; pmScore: number; skillScore: number;
    conv: number; rr: number; expRet: number; thesis: string;
    quantScoreData: QuantScore | null;
  };
  researchDoc: { id: string; overview: string | null } | null;
  questions: Question[];
  challenges: Challenge[];
  voteJustifications: Justification[];
  revisions: Revision[];
};
type LiveQuote = { bid: number; ask: number; spread: number; serverTime: string; marketStatus: string } | null;

// ── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.25)' },
  HIGH:     { color: 'var(--short)', bg: 'var(--short-dim)', border: 'rgba(220,38,38,.2)' },
  MEDIUM:   { color: 'var(--warn)',  bg: 'var(--warn-dim)',  border: 'rgba(217,119,6,.2)' },
  LOW:      { color: 'var(--text4)', bg: 'var(--bg)',        border: 'var(--border2)' },
};
const VOTE_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  APPROVE:                 { color: 'var(--long)',   bg: 'var(--long-dim)',   border: 'rgba(22,163,74,.25)',   label: 'APPROVE' },
  REJECT:                  { color: 'var(--short)',  bg: 'var(--short-dim)',  border: 'rgba(220,38,38,.25)',   label: 'REJECT' },
  APPROVE_WITH_CONDITIONS: { color: 'var(--warn)',   bg: 'var(--warn-dim)',   border: 'rgba(217,119,6,.25)',   label: 'CONDITIONAL' },
  ABSTAIN:                 { color: 'var(--text4)',  bg: 'var(--bg)',         border: 'var(--border2)',        label: 'ABSTAIN' },
};
const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  APPROVED:                 { color: 'var(--long)',   bg: 'var(--long-dim)',   border: 'rgba(22,163,74,.25)' },
  REJECTED:                 { color: 'var(--short)',  bg: 'var(--short-dim)',  border: 'rgba(220,38,38,.25)' },
  APPROVED_WITH_CONDITIONS: { color: 'var(--warn)',   bg: 'var(--warn-dim)',   border: 'rgba(217,119,6,.25)' },
  PENDING:                  { color: 'var(--accent)', bg: 'var(--accent-dim)', border: 'rgba(37,99,235,.2)' },
  REVIEW:                   { color: 'var(--purple)', bg: 'var(--purple-dim)', border: 'rgba(124,58,237,.2)' },
};
const TIMELINE_COLOR: Record<string, string> = {
  IDEA_SUBMITTED: 'var(--accent)', QUESTION_RAISED: 'var(--warn)', QUESTION_ANSWERED: 'var(--long)',
  CHALLENGE_RAISED: '#ef4444', CHALLENGE_RESOLVED: 'var(--long)', REVISION_SUBMITTED: 'var(--purple)', VOTE_SUBMITTED: 'var(--accent)',
};
const TIMELINE_ICON: Record<string, string> = {
  IDEA_SUBMITTED: '⬡', QUESTION_RAISED: '?', QUESTION_ANSWERED: '✓',
  CHALLENGE_RAISED: '⚡', CHALLENGE_RESOLVED: '✓', REVISION_SUBMITTED: '◎', VOTE_SUBMITTED: '✓',
};

const TABS = ['Overview', 'Questions', 'Challenges', 'Votes', 'Revisions', 'Timeline'] as const;
type Tab = typeof TABS[number];

const TAB_META: Record<string, { icon: string; accentColor?: string }> = {
  Overview:   { icon: '⬡' },
  Questions:  { icon: '?', accentColor: 'var(--warn)' },
  Challenges: { icon: '⚡', accentColor: '#ef4444' },
  Votes:      { icon: '✓', accentColor: 'var(--long)' },
  Revisions:  { icon: '◎', accentColor: 'var(--purple)' },
  Timeline:   { icon: '◷' },
};

function scoreColor(v: number): string {
  return v >= 80 ? 'var(--long)' : v >= 65 ? 'var(--accent)' : v >= 50 ? 'var(--warn)' : 'var(--short)';
}
function scoreLabel(v: number): string {
  return v >= 80 ? 'Excellent' : v >= 65 ? 'Strong' : v >= 50 ? 'Moderate' : 'Weak';
}
function qsColor(v: number): string {
  return v >= 80 ? 'var(--long)' : v >= 70 ? 'var(--accent)' : v >= 60 ? 'var(--warn)' : v > 0 ? 'var(--short)' : 'var(--text4)';
}
function rColor(pct: number): string {
  return pct >= 80 ? 'var(--long)' : pct >= 50 ? 'var(--warn)' : 'var(--short)';
}

// ── Visual atoms ─────────────────────────────────────────────────────────────

function RingGauge({ pct, color, size = 80, stroke = 7, children }: {
  pct: number; color: string; size?: number; stroke?: number; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

function ScoreGauge({ label, value, pct, color, sub }: { label: string; value: string; pct: number; color: string; sub: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <RingGauge pct={pct} color={color} size={72} stroke={6}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
        </div>
      </RingGauge>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text4)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 10, color, fontWeight: 600 }}>{sub}</div>
      </div>
    </div>
  );
}

function MiniBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ height: 4, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width .6s ease' }} />
    </div>
  );
}

function SectionCard({ title, children, right, accent }: { title: string; children: React.ReactNode; right?: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12,
      overflow: 'hidden', boxShadow: 'var(--shadow)',
    }}>
      <div style={{
        padding: '11px 16px', borderBottom: '1px solid var(--border)', background: 'var(--panel2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        ...(accent ? { borderTop: `3px solid ${accent}` } : {}),
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{title}</span>
        {right}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function CommitteeIdeaPage({ params }: { params: Promise<{ ideaId: string }> }) {
  const { ideaId } = use(params);
  const { isMobile, cols } = useBreakpoint();
  const [tab, setTab] = useState<Tab>('Overview');
  const [data, setData] = useState<CommitteeData | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveQuote, setLiveQuote] = useState<LiveQuote>(null);

  // Question form
  const [qText, setQText] = useState('');
  const [qPriority, setQPriority] = useState('MEDIUM');
  const [qSubmitting, setQSubmitting] = useState(false);
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [answeringId, setAnsweringId] = useState<string | null>(null);

  // Challenge form
  const [cCategory, setCCategory] = useState('THESIS');
  const [cDesc, setCDesc] = useState('');
  const [cEvidence, setCEvidence] = useState('');
  const [cPriority, setCPriority] = useState('MEDIUM');
  const [cSubmitting, setCSubmitting] = useState(false);
  const [resolveText, setResolveText] = useState<Record<string, string>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Vote form
  const [vDecision, setVDecision] = useState('APPROVE');
  const [vSummary, setVSummary] = useState('');
  const [vStrengths, setVStrengths] = useState('');
  const [vConcerns, setVConcerns] = useState('');
  const [vConditions, setVConditions] = useState('');
  const [vSubmitting, setVSubmitting] = useState(false);
  const [showVoteForm, setShowVoteForm] = useState(false);

  // Revision form
  const [revSummary, setRevSummary] = useState('');
  const [revChanges, setRevChanges] = useState('');
  const [revSubmitting, setRevSubmitting] = useState(false);
  const [showRevForm, setShowRevForm] = useState(false);

  const [timeline, setTimeline] = useState<{ id: string; type: string; label: string; detail: string; actor: string; at: string }[]>([]);

  // ── Data loading (unchanged) ──────────────────────────────────────────────

  const load = useCallback(async () => {
    const [dRes, rRes] = await Promise.all([
      fetch(`/api/committee/${ideaId}`),
      fetch(`/api/committee/${ideaId}/readiness`),
    ]);
    const [d, r] = await Promise.all([dRes.json(), rRes.json()]);
    setData(d); setReadiness(r); setLoading(false);
  }, [ideaId]);

  const loadTimeline = useCallback(async () => {
    const res = await fetch(`/api/decision-timeline/${ideaId}`);
    const d = await res.json();
    setTimeline(d.events ?? []);
  }, [ideaId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'Timeline') loadTimeline(); }, [tab, loadTimeline]);

  // Fetch live MT5 price
  useEffect(() => {
    if (!data?.idea.ticker) return;
    const fetchQuote = async () => {
      try {
        const res = await fetch(`/api/mt5/quote?symbol=${data.idea.ticker}`);
        if (res.ok) setLiveQuote(await res.json());
      } catch { /* MT5 offline, skip */ }
    };
    fetchQuote();
    const iv = setInterval(fetchQuote, 30000);
    return () => clearInterval(iv);
  }, [data?.idea.ticker]);

  // ── Actions (business logic unchanged) ────────────────────────────────────

  const submitQuestion = async () => {
    if (!qText.trim()) return;
    setQSubmitting(true);
    await fetch(`/api/committee/${ideaId}/questions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: qText, priority: qPriority }),
    });
    setQText(''); setQSubmitting(false); load();
  };

  const answerQuestion = async (id: string, answer: string) => {
    await fetch(`/api/committee/questions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer, status: 'ANSWERED' }),
    });
    setAnsweringId(null); load();
  };

  const submitChallenge = async () => {
    if (!cDesc.trim()) return;
    setCSubmitting(true);
    await fetch(`/api/committee/${ideaId}/challenges`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: cCategory, description: cDesc, evidence: cEvidence, priority: cPriority }),
    });
    setCDesc(''); setCEvidence(''); setCSubmitting(false); load();
  };

  const resolveChallenge = async (id: string, resolution: string) => {
    await fetch(`/api/committee/challenges/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution, status: 'ADDRESSED' }),
    });
    setResolvingId(null); load();
  };

  const submitVote = async () => {
    if (!vSummary.trim()) return;
    setVSubmitting(true);
    await fetch(`/api/committee/${ideaId}/vote-justification`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: vDecision, summary: vSummary, keyStrengths: vStrengths, keyConcerns: vConcerns, conditions: vConditions }),
    });
    setVSubmitting(false); setShowVoteForm(false); load();
  };

  const submitRevision = async () => {
    if (!revSummary.trim()) return;
    setRevSubmitting(true);
    await fetch(`/api/committee/${ideaId}/revisions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: revSummary, changes: revChanges }),
    });
    setRevSummary(''); setRevChanges(''); setRevSubmitting(false); setShowRevForm(false); load();
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 20, gap: 12 }}>
        {[130, 90, 60].map((h, i) => (
          <div key={i} style={{ height: h, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        ))}
        <div style={{ display: 'flex', gap: 12, flex: 1 }}>
          {[2, 1].map((f, i) => (
            <div key={i} style={{ flex: f, background: 'var(--panel)', borderRadius: 10, border: '1px solid var(--border)', animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      </div>
    );
  }
  if (!data) return <div style={{ padding: 40, color: 'var(--text3)' }}>Idea not found.</div>;

  const { idea, questions, challenges, voteJustifications, revisions } = data;
  const openQ = questions.filter(q => q.status === 'OPEN').length;
  const openC = challenges.filter(c => c.status === 'OPEN').length;
  const sc = STATUS_STYLE[idea.approvalStatus] ?? STATUS_STYLE.REVIEW;
  const lc = idea.dir === 'LONG' ? 'var(--long)' : 'var(--short)';
  const qScore = idea.quantScore ?? 0;
  const fscore = idea.finalScore ?? 0;
  const readPct = readiness?.pct ?? 0;
  const fsc = scoreColor(fscore);
  const qsc = qsColor(qScore);
  const rc = rColor(readPct);
  const midPrice = liveQuote ? ((liveQuote.bid + liveQuote.ask) / 2) : null;

  const tabBadge = (t: Tab) => {
    if (t === 'Questions') return openQ;
    if (t === 'Challenges') return openC;
    if (t === 'Votes') return voteJustifications.length;
    if (t === 'Revisions') return revisions.length;
    return 0;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="scroll-y dash-content" style={{ height: '100%', background: 'var(--bg)' }}>

      {/* ═══════════════════════════════════════════════════════════════════════
          PREMIUM HEADER
      ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
        padding: '0',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      }}>
        {/* Top accent line */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${lc}, var(--accent), var(--purple))` }} />

        <div style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>

            {/* Identity */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              {/* Logo avatar */}
              <div style={{
                width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                background: `linear-gradient(135deg, ${lc}22, ${lc}44)`,
                border: `1.5px solid ${lc}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 900, color: lc,
              }}>
                {idea.ticker.slice(0, 2)}
              </div>

              <div>
                {/* Ticker + badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: '-.02em', lineHeight: 1 }}>
                    {idea.ticker}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: lc,
                    background: `${lc}18`, border: `1.5px solid ${lc}44`,
                    padding: '3px 9px', borderRadius: 5, fontFamily: 'var(--mono)', letterSpacing: '.06em',
                  }}>{idea.dir}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: sc.color,
                    background: sc.bg, border: `1px solid ${sc.border}`,
                    padding: '3px 9px', borderRadius: 5, fontFamily: 'var(--mono)', letterSpacing: '.05em',
                  }}>{idea.approvalStatus.replace(/_/g, ' ')}</span>
                  {liveQuote && (
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: liveQuote.marketStatus === 'open' ? 'var(--long)' : 'var(--text4)',
                      background: liveQuote.marketStatus === 'open' ? 'var(--long-dim)' : 'var(--bg)',
                      border: `1px solid ${liveQuote.marketStatus === 'open' ? 'rgba(22,163,74,.2)' : 'var(--border)'}`,
                      padding: '3px 8px', borderRadius: 5, fontFamily: 'var(--mono)',
                    }}>
                      {liveQuote.marketStatus === 'open' ? '● LIVE' : '○ CLOSED'}
                    </span>
                  )}
                </div>

                {/* Key metrics row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Conviction', val: `${idea.conv}/10`, color: idea.conv >= 8 ? 'var(--long)' : idea.conv >= 6 ? 'var(--accent)' : 'var(--warn)' },
                    { label: 'R/R', val: `${idea.rr}×`, color: idea.rr >= 3 ? 'var(--long)' : idea.rr >= 2 ? 'var(--accent)' : 'var(--warn)' },
                    { label: 'Exp. Return', val: `${idea.dir === 'SHORT' ? '-' : '+'}${idea.expRet}%`, color: lc },
                    ...(idea.quantScoreData ? [{ label: 'Quant Signal', val: idea.quantScoreData.quantLabel, color: qsc }] : []),
                    ...(midPrice ? [{ label: 'Live Price', val: `$${midPrice.toFixed(2)}`, color: 'var(--text)' }] : []),
                  ].map((m, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {i > 0 && <span style={{ color: 'var(--border2)', fontSize: 12 }}>·</span>}
                      <span style={{ fontSize: 10, color: 'var(--text4)' }}>{m.label}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: m.color }}>{m.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Score gauges */}
            <div className={isMobile ? 'hide-mobile' : ''} style={{ display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0 }}>
              <ScoreGauge label="Committee Score" value={fscore > 0 ? fscore.toFixed(0) : '—'} pct={fscore} color={fsc} sub={fscore > 0 ? scoreLabel(fscore) : 'No score'} />
              <div style={{ width: 1, height: 60, background: 'var(--border)' }} />
              <ScoreGauge label="Quant Overlay" value={qScore > 0 ? qScore.toFixed(0) : '—'} pct={qScore} color={qsc} sub={idea.quantScoreData?.quantLabel ?? (qScore === 0 ? 'No data' : scoreLabel(qScore))} />
              <div style={{ width: 1, height: 60, background: 'var(--border)' }} />
              <ScoreGauge label="Research" value={`${readPct}%`} pct={readPct} color={rc} sub={readiness?.ready ? '✓ Vote Ready' : 'Incomplete'} />
            </div>
          </div>

          {/* Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <Link href="/dashboard/committee" style={{ textDecoration: 'none' }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: 'var(--text3)', transition: 'all .12s' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'var(--border2)'; el.style.color = 'var(--text)'; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text3)'; }}>
                ← Committee
              </button>
            </Link>
            <Link href={`/dashboard/research/${idea.id}`} style={{ textDecoration: 'none' }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(37,99,235,.25)', background: 'var(--accent-dim)', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: 'var(--accent)', transition: 'all .12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,.14)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent-dim)')}>
                ⬡ View Research Doc
              </button>
            </Link>
            <div style={{ height: 18, width: 1, background: 'var(--border)', margin: '0 4px' }} />
            <button onClick={() => { setTab('Questions'); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(217,119,6,.25)', background: 'var(--warn-dim)', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: 'var(--warn)', transition: 'all .12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(217,119,6,.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--warn-dim)')}>
              ? Ask Question
            </button>
            <button onClick={() => { setTab('Challenges'); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(220,38,38,.2)', background: 'var(--short-dim)', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: 'var(--short)', transition: 'all .12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--short-dim)')}>
              ⚡ Challenge
            </button>
            <button onClick={() => { setTab('Votes'); setShowVoteForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(22,163,74,.25)', background: 'var(--long-dim)', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: 'var(--long)', transition: 'all .12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(22,163,74,.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--long-dim)')}>
              ✓ Cast Vote
            </button>
            <button onClick={() => { setTab('Revisions'); setShowRevForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(124,58,237,.2)', background: 'var(--purple-dim)', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: 'var(--purple)', transition: 'all .12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--purple-dim)')}>
              ◎ Submit Revision
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          BODY
      ═══════════════════════════════════════════════════════════════════════ */}
      <div style={{ padding: '16px 20px' }}>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 2, background: 'var(--panel)',
          border: '1px solid var(--border)', borderRadius: 10,
          padding: 4, marginBottom: 16, boxShadow: 'var(--shadow)',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        }}>
          {TABS.map(t => {
            const active = tab === t;
            const badge = tabBadge(t);
            const meta = TAB_META[t];
            const badgeBg = t === 'Challenges' && openC > 0 ? '#ef4444' : (meta.accentColor ?? 'var(--warn)');
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '8px 6px', borderRadius: 7, border: 'none', cursor: 'pointer', transition: 'all .15s',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : 'var(--text3)',
                fontWeight: active ? 700 : 500, fontSize: 10, letterSpacing: '.02em',
              }}>
                <span style={{ fontSize: 11 }}>{meta.icon}</span>
                <span>{t}</span>
                {badge > 0 && (
                  <span style={{
                    minWidth: 16, height: 16, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 800, fontFamily: 'var(--mono)', padding: '0 4px',
                    background: active ? 'rgba(255,255,255,.3)' : badgeBg,
                    color: '#fff',
                  }}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'Overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: 16, alignItems: 'start' }}>

            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Investment Thesis */}
              <SectionCard title="Investment Thesis" accent={lc} right={<span className={`badge badge-${idea.dir === 'LONG' ? 'long' : 'short'}`}>{idea.dir}</span>}>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75, margin: 0 }}>{idea.thesis}</p>
              </SectionCard>

              {/* Key Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(4, 2, 2)}, 1fr)`, gap: 8 }}>
                {[
                  { label: 'PM Score', val: idea.pmScore?.toFixed(1) ?? '—', color: 'var(--accent)', sub: 'Portfolio Manager' },
                  { label: 'Skill Score', val: idea.skillScore?.toFixed(1) ?? '—', color: 'var(--purple)', sub: 'Analyst Skill' },
                  { label: 'R/R Ratio', val: `${idea.rr}×`, color: idea.rr >= 3 ? 'var(--long)' : idea.rr >= 2 ? 'var(--accent)' : 'var(--warn)', sub: idea.rr >= 3 ? 'Excellent' : 'Good' },
                  { label: 'Conviction', val: `${idea.conv}/10`, color: idea.conv >= 8 ? 'var(--long)' : idea.conv >= 6 ? 'var(--accent)' : 'var(--warn)', sub: idea.conv >= 8 ? 'Very High' : idea.conv >= 6 ? 'High' : 'Moderate' },
                ].map(m => (
                  <div key={m.label} style={{
                    background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10,
                    padding: '12px 14px', boxShadow: 'var(--shadow)',
                    borderTop: `3px solid ${m.color}22`,
                  }}>
                    <div style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>{m.label}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 900, color: m.color, lineHeight: 1, marginBottom: 4 }}>{m.val}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)' }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Research Readiness */}
              {readiness && (
                <div style={{
                  background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12,
                  overflow: 'hidden', boxShadow: 'var(--shadow)',
                }}>
                  <div style={{
                    padding: '11px 16px', borderBottom: '1px solid var(--border)', background: 'var(--panel2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Research Readiness</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, color: rc }}>{readiness.score}/{readiness.maxScore} pts</span>
                  </div>
                  <div style={{ padding: '16px' }}>
                    {/* Big readiness indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16, padding: '12px 14px', borderRadius: 10, background: readiness.ready ? 'rgba(22,163,74,.05)' : 'rgba(217,119,6,.04)', border: `1px solid ${readiness.ready ? 'rgba(22,163,74,.18)' : 'rgba(217,119,6,.15)'}` }}>
                      <RingGauge pct={readPct} color={rc} size={68} stroke={7}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 900, color: rc, lineHeight: 1 }}>{readPct}%</div>
                        </div>
                      </RingGauge>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                          {readiness.ready ? 'Ready for Vote' : 'Not Ready'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
                          {readiness.ready
                            ? 'All critical research sections are complete.'
                            : `${readiness.checklist.filter(i => !i.done).length} section${readiness.checklist.filter(i => !i.done).length !== 1 ? 's' : ''} incomplete · ${openC > 0 ? `${openC} open challenge${openC !== 1 ? 's' : ''}` : 'No open challenges'}`}
                        </div>
                        {/* Progress bar */}
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${readPct}%`, background: rc, borderRadius: 3, transition: 'width .8s ease' }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--mono)', color: rc, lineHeight: 1 }}>{readiness.score}</div>
                        <div style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 600, letterSpacing: '.05em' }}>/ {readiness.maxScore} PTS</div>
                      </div>
                    </div>

                    {/* Checklist */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {readiness.checklist.map(item => (
                        <div key={item.key} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 10px', borderRadius: 8,
                          background: item.done ? 'rgba(22,163,74,.04)' : 'var(--bg)',
                          border: `1px solid ${item.done ? 'rgba(22,163,74,.15)' : 'var(--border)'}`,
                          transition: 'all .12s',
                          cursor: 'default',
                        }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 800,
                            background: item.done ? 'var(--long)' : 'var(--border)',
                            color: item.done ? '#fff' : 'var(--text4)',
                            boxShadow: item.done ? '0 1px 4px rgba(22,163,74,.3)' : 'none',
                          }}>
                            {item.done ? '✓' : '○'}
                          </div>
                          <span style={{ fontSize: 11, color: item.done ? 'var(--text)' : 'var(--text3)', flex: 1, fontWeight: item.done ? 500 : 400 }}>{item.label}</span>
                          <span style={{
                            fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 700,
                            color: item.done ? 'var(--long)' : 'var(--text4)',
                            background: item.done ? 'var(--long-dim)' : 'var(--bg)',
                            border: `1px solid ${item.done ? 'rgba(22,163,74,.2)' : 'var(--border)'}`,
                            padding: '2px 6px', borderRadius: 4,
                          }}>{item.weight}pt</span>
                        </div>
                      ))}
                      {/* Open challenges item */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', borderRadius: 8,
                        background: openC === 0 ? 'rgba(22,163,74,.04)' : 'rgba(220,38,38,.04)',
                        border: `1px solid ${openC === 0 ? 'rgba(22,163,74,.15)' : 'rgba(220,38,38,.15)'}`,
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 800,
                          background: openC === 0 ? 'var(--long)' : 'var(--short)',
                          color: '#fff',
                        }}>
                          {openC === 0 ? '✓' : '!'}
                        </div>
                        <span style={{ fontSize: 11, color: openC === 0 ? 'var(--text)' : 'var(--short)', flex: 1, fontWeight: 500 }}>No Open Challenges</span>
                        <span style={{
                          fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 700,
                          color: openC === 0 ? 'var(--long)' : 'var(--short)',
                          background: openC === 0 ? 'var(--long-dim)' : 'var(--short-dim)',
                          border: `1px solid ${openC === 0 ? 'rgba(22,163,74,.2)' : 'rgba(220,38,38,.2)'}`,
                          padding: '2px 6px', borderRadius: 4,
                        }}>{openC === 0 ? 'OK' : `${openC} open`}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quant Score Breakdown */}
              {idea.quantScoreData && (
                <div style={{
                  background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12,
                  overflow: 'hidden', boxShadow: 'var(--shadow)',
                }}>
                  <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)', background: 'var(--panel2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Quant Overlay</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 800, color: qsc }}>
                      {idea.quantScoreData.quantLabel} · {idea.quantScoreData.finalQuantScore.toFixed(1)}/100
                    </span>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    {/* Sub-scores with bars */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 14 }}>
                      {([
                        ['Trend (25%)',         idea.quantScoreData.trendScore,        idea.quantScoreData.trendLabel],
                        ['Momentum (20%)',      idea.quantScoreData.momentumScore,     idea.quantScoreData.momentumLabel],
                        ['Trend Quality (15%)', idea.quantScoreData.trendQualityScore, idea.quantScoreData.trendQualityLabel],
                        ['MA Alignment (15%)',  idea.quantScoreData.maAlignmentScore,  ''],
                        ['Volatility (10%)',    idea.quantScoreData.volatilityScore,   idea.quantScoreData.volatilityLabel],
                        ['S/R Levels (10%)',    idea.quantScoreData.srScore,           ''],
                        ['Breakout (5%)',       idea.quantScoreData.breakoutScore,     ''],
                        ['Volume (5%)',         idea.quantScoreData.volumeScore,       ''],
                      ] as [string, number, string][]).map(([l, v, lbl]) => {
                        const vc = v >= 8 ? 'var(--long)' : v >= 7 ? 'var(--accent)' : v >= 6 ? 'var(--warn)' : 'var(--short)';
                        return (
                          <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 10, color: 'var(--text3)' }}>{l}{lbl ? ` · ${lbl}` : ''}</span>
                              <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 800, color: vc }}>{v.toFixed(1)}</span>
                            </div>
                            <MiniBar value={v} max={10} color={vc} />
                          </div>
                        );
                      })}
                    </div>

                    {/* Technical indicators */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        ['RSI 14', idea.quantScoreData.rsi14.toFixed(1), idea.quantScoreData.rsi14 > 70 ? 'var(--short)' : idea.quantScoreData.rsi14 < 30 ? 'var(--long)' : 'var(--accent)', idea.quantScoreData.rsi14 > 70 ? 'Overbought' : idea.quantScoreData.rsi14 < 30 ? 'Oversold' : 'Neutral'],
                        ['ADX 14', idea.quantScoreData.adx14.toFixed(1), idea.quantScoreData.adx14 > 25 ? 'var(--accent)' : 'var(--text4)', idea.quantScoreData.adx14 > 25 ? 'Trending' : 'Ranging'],
                      ].map(([k, v, c, lbl]) => (
                        <div key={k} style={{
                          padding: '10px 12px', background: 'var(--bg)', borderRadius: 8,
                          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <div>
                            <div style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                            <div style={{ fontSize: 10, color: c as string }}>{lbl}</div>
                          </div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 900, color: c as string }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Executive Summary */}
              {data.researchDoc?.overview && (
                <SectionCard title="Executive Summary" accent="var(--purple)">
                  <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.75, margin: 0 }}>{data.researchDoc.overview}</p>
                </SectionCard>
              )}

              {/* Live Market Snapshot */}
              {liveQuote && (
                <div style={{
                  background: 'var(--panel)', border: '1px solid rgba(37,99,235,.18)', borderRadius: 12,
                  overflow: 'hidden', boxShadow: 'var(--shadow)',
                }}>
                  <div style={{
                    padding: '11px 16px', borderBottom: '1px solid rgba(37,99,235,.12)', background: 'rgba(37,99,235,.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Live Market · MT5</span>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: liveQuote.marketStatus === 'open' ? 'var(--long)' : 'var(--text4)', display: 'inline-block', animation: liveQuote.marketStatus === 'open' ? 'pulse 2s ease-in-out infinite' : 'none' }} />
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>
                      Updated {new Date(liveQuote.serverTime).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(4, 2, 2)}, 1fr)`, gap: 10 }}>
                      {[
                        { label: 'Bid', val: liveQuote.bid.toFixed(2), color: 'var(--short)', prefix: '$' },
                        { label: 'Ask', val: liveQuote.ask.toFixed(2), color: 'var(--long)', prefix: '$' },
                        { label: 'Mid', val: midPrice!.toFixed(2), color: 'var(--text)', prefix: '$' },
                        { label: 'Spread', val: liveQuote.spread.toFixed(4), color: 'var(--text3)', prefix: '' },
                      ].map(m => (
                        <div key={m.label} style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 800, color: m.color }}>{m.prefix}{m.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT SIDEBAR */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 0 }}>

              {/* Committee Status KPIs */}
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', background: 'var(--panel2)' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Committee Status</span>
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    {[
                      { label: 'Open Q', value: openQ, color: openQ > 0 ? 'var(--warn)' : 'var(--long)', icon: '?', bg: openQ > 0 ? 'rgba(217,119,6,.06)' : 'rgba(22,163,74,.04)' },
                      { label: 'Challenges', value: openC, color: openC > 0 ? 'var(--short)' : 'var(--long)', icon: '⚡', bg: openC > 0 ? 'rgba(220,38,38,.05)' : 'rgba(22,163,74,.04)' },
                      { label: 'Votes Cast', value: voteJustifications.length, color: voteJustifications.length > 0 ? 'var(--accent)' : 'var(--text4)', icon: '✓', bg: voteJustifications.length > 0 ? 'var(--accent-dim)' : 'var(--bg)' },
                      { label: 'Revisions', value: revisions.length, color: revisions.length > 0 ? 'var(--purple)' : 'var(--text4)', icon: '◎', bg: revisions.length > 0 ? 'var(--purple-dim)' : 'var(--bg)' },
                    ].map(kpi => (
                      <div key={kpi.label} style={{ background: kpi.bg, borderRadius: 9, padding: '10px 8px', border: `1px solid ${kpi.color}22`, textAlign: 'center' }}>
                        <div style={{ fontSize: 13, marginBottom: 2, color: kpi.color }}>{kpi.icon}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 900, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                        <div style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', marginTop: 3 }}>{kpi.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Readiness mini */}
                  {readiness && (
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: readiness.ready ? 'rgba(22,163,74,.06)' : 'rgba(217,119,6,.05)', border: `1px solid ${readiness.ready ? 'rgba(22,163,74,.2)' : 'rgba(217,119,6,.15)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <RingGauge pct={readPct} color={rc} size={36} stroke={4}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 900, color: rc }}>{readPct}%</span>
                          </RingGauge>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 900, fontFamily: 'var(--mono)', color: rc, lineHeight: 1 }}>{readPct}%</div>
                            <div style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 700, letterSpacing: '.04em' }}>RESEARCH</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: readiness.ready ? 'var(--long)' : 'var(--warn)' }}>
                          {readiness.ready ? '✓ Vote Ready' : 'Incomplete'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Investment Metrics */}
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', background: 'var(--panel2)' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Investment Metrics</span>
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    { label: 'Expected Return', value: `${idea.dir === 'SHORT' ? '-' : '+'}${idea.expRet}%`, color: lc },
                    { label: 'Risk / Reward', value: `${idea.rr}×`, color: idea.rr >= 3 ? 'var(--long)' : idea.rr >= 2 ? 'var(--accent)' : 'var(--warn)' },
                    { label: 'Conviction', value: `${idea.conv} / 10`, color: 'var(--accent)' },
                    { label: 'PM Score', value: idea.pmScore?.toFixed(1) ?? '—', color: 'var(--text2)' },
                    { label: 'Skill Score', value: idea.skillScore?.toFixed(1) ?? '—', color: 'var(--text2)' },
                    { label: 'Quant Score', value: qScore > 0 ? qScore.toFixed(0) : '—', color: qsc },
                  ].map((m, i, arr) => (
                    <div key={m.label} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{m.label}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 800, color: m.color }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vote breakdown */}
              {voteJustifications.length > 0 && (
                <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                  <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', background: 'var(--panel2)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Voting ({voteJustifications.length})</span>
                  </div>
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(['APPROVE', 'REJECT', 'APPROVE_WITH_CONDITIONS', 'ABSTAIN'] as const).map(d => {
                      const count = voteJustifications.filter(v => v.decision === d).length;
                      if (count === 0) return null;
                      const vs = VOTE_STYLE[d];
                      return (
                        <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: vs.color, background: vs.bg, border: `1px solid ${vs.border}`, padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--mono)', width: 74, textAlign: 'center' }}>{vs.label}</span>
                          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(count / voteJustifications.length) * 100}%`, background: vs.color, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 800, color: vs.color, width: 16, textAlign: 'right' }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', background: 'var(--panel2)' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Quick Actions</span>
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { label: '? Raise Question', t: 'Questions' as Tab, color: 'var(--warn)', action: () => setTab('Questions') },
                    { label: '⚡ Raise Challenge', t: 'Challenges' as Tab, color: '#ef4444', action: () => setTab('Challenges') },
                    { label: '✓ Cast Vote', t: 'Votes' as Tab, color: 'var(--long)', action: () => { setTab('Votes'); setShowVoteForm(true); } },
                    { label: '◎ Submit Revision', t: 'Revisions' as Tab, color: 'var(--purple)', action: () => { setTab('Revisions'); setShowRevForm(true); } },
                  ].map(a => (
                    <button key={a.label} onClick={a.action}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: 'var(--text3)', transition: 'all .12s', textAlign: 'left' }}
                      onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = a.color; el.style.color = a.color; el.style.background = `${a.color}0d`; }}
                      onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text3)'; el.style.background = 'transparent'; }}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── QUESTIONS TAB ── */}
        {tab === 'Questions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Raise a Question</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={qPriority} onChange={e => setQPriority(e.target.value)} className="inp" style={{ width: 110, fontSize: 11 }}>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input value={qText} onChange={e => setQText(e.target.value)} placeholder="Your question to the analyst…"
                  className="inp" style={{ flex: 1, fontSize: 11 }}
                  onKeyDown={e => e.key === 'Enter' && submitQuestion()} />
                <button onClick={submitQuestion} disabled={qSubmitting || !qText.trim()} className="btn btn-primary btn-sm">Submit</button>
              </div>
            </div>
            {questions.length === 0 ? (
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '48px 24px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: .3 }}>?</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>No committee questions have been raised</div>
                <div style={{ fontSize: 11, color: 'var(--text4)' }}>Use the form above to raise questions about this investment thesis.</div>
              </div>
            ) : questions.map(q => {
              const ps = PRIORITY_STYLE[q.priority] ?? PRIORITY_STYLE.MEDIUM;
              const isOpen = q.status === 'OPEN';
              const isAnswering = answeringId === q.id;
              return (
                <div key={q.id} style={{ background: 'var(--panel)', border: `1px solid ${isOpen ? ps.border : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)', borderLeft: `3px solid ${isOpen ? ps.color : 'var(--long)'}` }}>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: ps.color, background: ps.bg, border: `1px solid ${ps.border}`, padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--mono)', letterSpacing: '.05em' }}>{q.priority}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: isOpen ? 'var(--accent)' : 'var(--long)', background: isOpen ? 'var(--accent-dim)' : 'var(--long-dim)', border: `1px solid ${isOpen ? 'rgba(37,99,235,.2)' : 'rgba(22,163,74,.2)'}`, padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--mono)' }}>{q.status}</span>
                          <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>{q.raisedBy}</span>
                          <span style={{ fontSize: 10, color: 'var(--text4)', marginLeft: 'auto' }}>{new Date(q.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, fontWeight: 500 }}>{q.question}</div>
                      </div>
                      {isOpen && !isAnswering && (
                        <button onClick={() => setAnsweringId(q.id)} className="btn btn-ghost btn-sm" style={{ flexShrink: 0, fontSize: 9 }}>Answer</button>
                      )}
                    </div>
                    {q.answer && (
                      <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 7, background: 'rgba(22,163,74,.05)', border: '1px solid rgba(22,163,74,.15)', borderLeft: '3px solid var(--long)' }}>
                        <div style={{ fontSize: 9, color: 'var(--text4)', marginBottom: 4, fontWeight: 600 }}>ANSWERED by {q.answeredBy}</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.55 }}>{q.answer}</div>
                      </div>
                    )}
                    {isAnswering && (
                      <div style={{ marginTop: 10, padding: '12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border2)', animation: 'fadeIn .15s ease-out' }}>
                        <textarea value={answerText[q.id] ?? ''} onChange={e => setAnswerText(p => ({ ...p, [q.id]: e.target.value }))}
                          placeholder="Type your answer…" className="inp" rows={3} style={{ marginBottom: 8, fontSize: 11 }} autoFocus />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => answerQuestion(q.id, answerText[q.id] ?? '')} disabled={!answerText[q.id]?.trim()} className="btn btn-primary btn-sm">Submit Answer</button>
                          <button onClick={() => setAnsweringId(null)} className="btn btn-ghost btn-sm">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CHALLENGES TAB ── */}
        {tab === 'Challenges' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Raise a Challenge</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select value={cCategory} onChange={e => setCCategory(e.target.value)} className="inp" style={{ flex: 1, fontSize: 11 }}>
                  {['THESIS', 'FINANCIALS', 'VALUATION', 'TECHNICALS', 'RISK', 'TIMING', 'MANAGEMENT', 'MACRO', 'OTHER'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={cPriority} onChange={e => setCPriority(e.target.value)} className="inp" style={{ width: 110, fontSize: 11 }}>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <textarea value={cDesc} onChange={e => setCDesc(e.target.value)} placeholder="Describe the challenge to this investment thesis…" className="inp" rows={2} style={{ marginBottom: 6, fontSize: 11 }} />
              <textarea value={cEvidence} onChange={e => setCEvidence(e.target.value)} placeholder="Supporting evidence (optional)…" className="inp" rows={2} style={{ marginBottom: 8, fontSize: 11 }} />
              <button onClick={submitChallenge} disabled={cSubmitting || !cDesc.trim()} className="btn btn-primary btn-sm">
                {cSubmitting ? 'Submitting…' : 'Submit Challenge'}
              </button>
            </div>
            {challenges.length === 0 ? (
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '48px 24px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: .3 }}>⚡</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>No challenges raised</div>
                <div style={{ fontSize: 11, color: 'var(--text4)' }}>Challenges allow committee members to formally contest the investment thesis.</div>
              </div>
            ) : challenges.map(c => {
              const ps = PRIORITY_STYLE[c.priority] ?? PRIORITY_STYLE.MEDIUM;
              const isOpen = c.status === 'OPEN';
              const isResolving = resolvingId === c.id;
              const catColors: Record<string, string> = { THESIS: 'var(--accent)', FINANCIALS: 'var(--long)', VALUATION: 'var(--warn)', TECHNICALS: 'var(--purple)', RISK: 'var(--short)', TIMING: 'var(--text3)', MANAGEMENT: 'var(--text3)', MACRO: 'var(--purple)', OTHER: 'var(--text4)' };
              return (
                <div key={c.id} style={{ background: 'var(--panel)', border: `1px solid ${isOpen ? 'rgba(220,38,38,.2)' : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)', borderLeft: `3px solid ${isOpen ? 'var(--short)' : 'var(--long)'}` }}>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: catColors[c.category] ?? 'var(--text4)', background: `${catColors[c.category] ?? 'var(--text4)'}18`, border: `1px solid ${catColors[c.category] ?? 'var(--border2)'}44`, padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--mono)' }}>{c.category}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: ps.color, background: ps.bg, border: `1px solid ${ps.border}`, padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--mono)' }}>{c.priority}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: isOpen ? 'var(--short)' : 'var(--long)', background: isOpen ? 'var(--short-dim)' : 'var(--long-dim)', border: `1px solid ${isOpen ? 'rgba(220,38,38,.2)' : 'rgba(22,163,74,.2)'}`, padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--mono)' }}>{c.status}</span>
                          <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>{c.raisedBy}</span>
                          <span style={{ fontSize: 10, color: 'var(--text4)', marginLeft: 'auto' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, fontWeight: 500, marginBottom: c.evidence ? 6 : 0 }}>{c.description}</div>
                        {c.evidence && <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5, fontStyle: 'italic', padding: '6px 10px', background: 'var(--bg)', borderRadius: 5, border: '1px solid var(--border)' }}>Evidence: {c.evidence}</div>}
                      </div>
                      {isOpen && !isResolving && (
                        <button onClick={() => setResolvingId(c.id)} className="btn btn-ghost btn-sm" style={{ flexShrink: 0, fontSize: 9 }}>Resolve</button>
                      )}
                    </div>
                    {c.resolution && (
                      <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 7, background: 'rgba(22,163,74,.05)', border: '1px solid rgba(22,163,74,.15)', borderLeft: '3px solid var(--long)' }}>
                        <div style={{ fontSize: 9, color: 'var(--text4)', marginBottom: 4, fontWeight: 600 }}>RESOLVED by {c.resolvedBy ?? 'committee'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.55 }}>{c.resolution}</div>
                      </div>
                    )}
                    {isResolving && (
                      <div style={{ marginTop: 10, padding: '12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border2)', animation: 'fadeIn .15s ease-out' }}>
                        <textarea value={resolveText[c.id] ?? ''} onChange={e => setResolveText(p => ({ ...p, [c.id]: e.target.value }))}
                          placeholder="How was this challenge resolved or addressed?" className="inp" rows={3} style={{ marginBottom: 8, fontSize: 11 }} autoFocus />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => resolveChallenge(c.id, resolveText[c.id] ?? '')} disabled={!resolveText[c.id]?.trim()} className="btn btn-success btn-sm">Mark Resolved</button>
                          <button onClick={() => setResolvingId(null)} className="btn btn-ghost btn-sm">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── VOTES TAB ── */}
        {tab === 'Votes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--panel2)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Submit Vote Justification</span>
                <button onClick={() => setShowVoteForm(v => !v)} className={showVoteForm ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'}>
                  {showVoteForm ? '× Cancel' : '+ Cast Vote'}
                </button>
              </div>
              {showVoteForm && (
                <div style={{ padding: '14px 16px', animation: 'fadeIn .15s ease-out' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {[['APPROVE', '✓ Approve'], ['REJECT', '✕ Reject'], ['APPROVE_WITH_CONDITIONS', '◉ Conditional'], ['ABSTAIN', '— Abstain']].map(([v, l]) => {
                      const vs = VOTE_STYLE[v] ?? VOTE_STYLE.ABSTAIN;
                      const active = vDecision === v;
                      return (
                        <button key={v} onClick={() => setVDecision(v)} style={{ flex: 1, padding: '8px 6px', borderRadius: 7, border: `1.5px solid ${active ? vs.color : 'var(--border)'}`, background: active ? vs.bg : 'var(--panel)', color: active ? vs.color : 'var(--text3)', cursor: 'pointer', fontSize: 10, fontWeight: active ? 700 : 500, transition: 'all .12s' }}>
                          {l}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div className="form-label">Overall Assessment *</div>
                    <textarea value={vSummary} onChange={e => setVSummary(e.target.value)} className="inp" rows={3} placeholder="Your overall assessment of this investment idea…" style={{ fontSize: 11 }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div><div className="form-label">Key Strengths</div><textarea value={vStrengths} onChange={e => setVStrengths(e.target.value)} className="inp" rows={2} style={{ fontSize: 11 }} /></div>
                    <div><div className="form-label">Key Concerns</div><textarea value={vConcerns} onChange={e => setVConcerns(e.target.value)} className="inp" rows={2} style={{ fontSize: 11 }} /></div>
                  </div>
                  {vDecision === 'APPROVE_WITH_CONDITIONS' && (
                    <div style={{ marginBottom: 8 }}>
                      <div className="form-label">Conditions</div>
                      <textarea value={vConditions} onChange={e => setVConditions(e.target.value)} className="inp" rows={2} placeholder="Specify conditions that must be met…" style={{ fontSize: 11 }} />
                    </div>
                  )}
                  <button onClick={submitVote} disabled={vSubmitting || !vSummary.trim()} className="btn btn-primary btn-sm">
                    {vSubmitting ? 'Submitting…' : 'Submit Justification'}
                  </button>
                </div>
              )}
            </div>
            {voteJustifications.length === 0 ? (
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '48px 24px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: .3 }}>✓</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>No votes submitted yet</div>
                <div style={{ fontSize: 11, color: 'var(--text4)' }}>Committee members submit vote justifications before the final decision.</div>
              </div>
            ) : voteJustifications.map(j => {
              const vs = VOTE_STYLE[j.decision] ?? VOTE_STYLE.ABSTAIN;
              return (
                <div key={j.id} style={{ background: 'var(--panel)', border: `1px solid ${vs.border}`, borderRadius: 10, padding: '14px 16px', boxShadow: 'var(--shadow)', borderLeft: `3px solid ${vs.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: vs.color, background: vs.bg, border: `1px solid ${vs.border}`, padding: '3px 10px', borderRadius: 5, fontFamily: 'var(--mono)', letterSpacing: '.06em' }}>{vs.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{j.userId}</span>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>{new Date(j.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, marginBottom: (j.keyStrengths || j.keyConcerns || j.conditions) ? 8 : 0 }}>{j.summary}</p>
                  {(j.keyStrengths || j.keyConcerns || j.conditions) && (
                    <div style={{ display: 'grid', gridTemplateColumns: j.keyStrengths && j.keyConcerns ? '1fr 1fr' : '1fr', gap: 6 }}>
                      {j.keyStrengths && <div style={{ padding: '8px 10px', background: 'rgba(22,163,74,.05)', borderRadius: 6, border: '1px solid rgba(22,163,74,.15)' }}><div style={{ fontSize: 9, fontWeight: 700, color: 'var(--long)', letterSpacing: '.05em', marginBottom: 3 }}>STRENGTHS</div><div style={{ fontSize: 11, color: 'var(--text2)' }}>{j.keyStrengths}</div></div>}
                      {j.keyConcerns && <div style={{ padding: '8px 10px', background: 'rgba(220,38,38,.04)', borderRadius: 6, border: '1px solid rgba(220,38,38,.12)' }}><div style={{ fontSize: 9, fontWeight: 700, color: 'var(--short)', letterSpacing: '.05em', marginBottom: 3 }}>CONCERNS</div><div style={{ fontSize: 11, color: 'var(--text2)' }}>{j.keyConcerns}</div></div>}
                      {j.conditions && <div style={{ padding: '8px 10px', background: 'rgba(217,119,6,.05)', borderRadius: 6, border: '1px solid rgba(217,119,6,.15)', gridColumn: '1 / -1' }}><div style={{ fontSize: 9, fontWeight: 700, color: 'var(--warn)', letterSpacing: '.05em', marginBottom: 3 }}>CONDITIONS</div><div style={{ fontSize: 11, color: 'var(--text2)' }}>{j.conditions}</div></div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── REVISIONS TAB ── */}
        {tab === 'Revisions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--panel2)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Version History · {revisions.length} revision{revisions.length !== 1 ? 's' : ''}</span>
                <button onClick={() => setShowRevForm(v => !v)} className={showRevForm ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'}>
                  {showRevForm ? '× Cancel' : '+ New Revision'}
                </button>
              </div>
              {showRevForm && (
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', animation: 'fadeIn .15s ease-out' }}>
                  <div style={{ marginBottom: 8 }}><div className="form-label">Revision Summary *</div><textarea value={revSummary} onChange={e => setRevSummary(e.target.value)} className="inp" rows={2} placeholder="What changed in this revision…" style={{ fontSize: 11 }} /></div>
                  <div style={{ marginBottom: 8 }}><div className="form-label">Detailed Changes</div><textarea value={revChanges} onChange={e => setRevChanges(e.target.value)} className="inp" rows={3} placeholder="Sections updated, data revised, assumptions changed…" style={{ fontSize: 11 }} /></div>
                  <button onClick={submitRevision} disabled={revSubmitting || !revSummary.trim()} className="btn btn-primary btn-sm">
                    {revSubmitting ? 'Submitting…' : 'Submit Revision'}
                  </button>
                </div>
              )}
            </div>
            {revisions.length === 0 ? (
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '48px 24px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: .3 }}>◎</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>No revisions submitted</div>
                <div style={{ fontSize: 11, color: 'var(--text4)' }}>Track research updates and changes through revisions.</div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 1.5, background: 'var(--border)' }} />
                {[...revisions].reverse().map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', gap: 14, marginBottom: 10, position: 'relative' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 0 ? 'var(--accent)' : 'var(--panel)', border: `2px solid ${i === 0 ? 'var(--accent)' : 'var(--border)'}`, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 800, color: i === 0 ? '#fff' : 'var(--text3)', zIndex: 1 }}>
                      v{r.revisionNum}
                    </div>
                    <div style={{ flex: 1, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 9, padding: '12px 14px', boxShadow: 'var(--shadow)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {i === 0 && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-dim)', padding: '2px 7px', borderRadius: 4, letterSpacing: '.05em' }}>LATEST</span>}
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{r.submittedBy}</span>
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55, marginBottom: r.changes ? 6 : 0 }}>{r.summary}</div>
                      {r.changes && <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5, padding: '6px 10px', background: 'var(--bg)', borderRadius: 5, border: '1px solid var(--border)' }}>{r.changes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TIMELINE TAB ── */}
        {tab === 'Timeline' && (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--panel2)' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Decision Timeline · {timeline.length} events</span>
            </div>
            <div style={{ padding: '20px 20px 16px' }}>
              {timeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text4)', fontSize: 12 }}>No events recorded yet.</div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 1.5, background: 'var(--border)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {timeline.map((event, i) => {
                      const color = TIMELINE_COLOR[event.type] ?? 'var(--text4)';
                      const icon = TIMELINE_ICON[event.type] ?? '·';
                      const dt = new Date(event.at);
                      return (
                        <div key={event.id} style={{ display: 'flex', gap: 14, position: 'relative', animation: `slideUp .2s ease-out ${Math.min(i * 0.03, 0.3)}s both` }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}18`, border: `1.5px solid ${color}44`, color, fontSize: 12, zIndex: 1, boxShadow: '0 0 0 3px var(--panel)' }}>
                            {icon}
                          </div>
                          <div style={{ flex: 1, paddingTop: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color }}>{event.label}</span>
                              <span style={{ fontSize: 9, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>{dt.toLocaleDateString()} {dt.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span style={{ fontSize: 9, color: 'var(--text4)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--mono)' }}>{event.actor}</span>
                            </div>
                            {event.detail && <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{event.detail}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
