'use client';
import { useState, useEffect, useCallback, use } from 'react';

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

const TABS = ['Overview', 'Questions', 'Challenges', 'Votes', 'Revisions', 'Timeline'] as const;
type Tab = typeof TABS[number];

export default function CommitteeIdeaPage({ params }: { params: Promise<{ ideaId: string }> }) {
  const { ideaId } = use(params);
  const [tab, setTab] = useState<Tab>('Overview');
  const [data, setData] = useState<CommitteeData | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);

  const [qText, setQText] = useState('');
  const [qPriority, setQPriority] = useState('MEDIUM');
  const [qSubmitting, setQSubmitting] = useState(false);

  const [cCategory, setCCategory] = useState('THESIS');
  const [cDesc, setCDesc] = useState('');
  const [cEvidence, setCEvidence] = useState('');
  const [cPriority, setCPriority] = useState('MEDIUM');
  const [cSubmitting, setCSubmitting] = useState(false);

  const [vDecision, setVDecision] = useState('APPROVE');
  const [vSummary, setVSummary] = useState('');
  const [vStrengths, setVStrengths] = useState('');
  const [vConcerns, setVConcerns] = useState('');
  const [vConditions, setVConditions] = useState('');
  const [vSubmitting, setVSubmitting] = useState(false);

  const [revSummary, setRevSummary] = useState('');
  const [revChanges, setRevChanges] = useState('');
  const [revSubmitting, setRevSubmitting] = useState(false);

  const [timeline, setTimeline] = useState<{ id: string; type: string; label: string; detail: string; actor: string; at: string }[]>([]);

  const load = useCallback(async () => {
    const [dRes, rRes] = await Promise.all([
      fetch(`/api/committee/${ideaId}`),
      fetch(`/api/committee/${ideaId}/readiness`),
    ]);
    const [d, r] = await Promise.all([dRes.json(), rRes.json()]);
    setData(d);
    setReadiness(r);
    setLoading(false);
  }, [ideaId]);

  const loadTimeline = useCallback(async () => {
    const res = await fetch(`/api/decision-timeline/${ideaId}`);
    const d = await res.json();
    setTimeline(d.events ?? []);
  }, [ideaId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'Timeline') loadTimeline(); }, [tab, loadTimeline]);

  const submitQuestion = async () => {
    if (!qText.trim()) return;
    setQSubmitting(true);
    await fetch(`/api/committee/${ideaId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: qText, priority: qPriority }),
    });
    setQText(''); setQSubmitting(false);
    load();
  };

  const answerQuestion = async (id: string, answer: string) => {
    await fetch(`/api/committee/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer, status: 'ANSWERED' }),
    });
    load();
  };

  const submitChallenge = async () => {
    if (!cDesc.trim()) return;
    setCSubmitting(true);
    await fetch(`/api/committee/${ideaId}/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: cCategory, description: cDesc, evidence: cEvidence, priority: cPriority }),
    });
    setCDesc(''); setCEvidence(''); setCSubmitting(false);
    load();
  };

  const resolveChallenge = async (id: string, resolution: string) => {
    await fetch(`/api/committee/challenges/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution, status: 'ADDRESSED' }),
    });
    load();
  };

  const submitVote = async () => {
    if (!vSummary.trim()) return;
    setVSubmitting(true);
    await fetch(`/api/committee/${ideaId}/vote-justification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: vDecision, summary: vSummary, keyStrengths: vStrengths, keyConcerns: vConcerns, conditions: vConditions }),
    });
    setVSubmitting(false);
    load();
  };

  const submitRevision = async () => {
    if (!revSummary.trim()) return;
    setRevSubmitting(true);
    await fetch(`/api/committee/${ideaId}/revisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: revSummary, changes: revChanges }),
    });
    setRevSummary(''); setRevChanges(''); setRevSubmitting(false);
    load();
  };

  if (loading) return <div className="p-8 text-[var(--text3)]">Loading committee room…</div>;
  if (!data) return <div className="p-8 text-[var(--text3)]">Not found</div>;

  const { idea, questions, challenges, voteJustifications, revisions } = data;

  const DECISION_COLORS: Record<string, string> = {
    APPROVE: 'badge-long', REJECT: 'badge-short', APPROVE_WITH_CONDITIONS: 'badge-warn', ABSTAIN: 'badge-dim',
  };

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-bold">{idea.ticker}</span>
            <span className={`badge ${idea.dir === 'LONG' ? 'badge-long' : 'badge-short'}`}>{idea.dir}</span>
            <span className="badge badge-accent">{idea.approvalStatus}</span>
          </div>
          <div className="text-[var(--text3)] text-sm mt-1 flex items-center gap-4 flex-wrap">
            <span>Final Score: <span className="font-mono text-[var(--text)]">{idea.finalScore?.toFixed(1) ?? '—'}</span></span>
            {idea.quantScore > 0 && (
              <span>Quant: <span className="font-mono" style={{ color: idea.quantScore >= 80 ? 'var(--long)' : idea.quantScore >= 70 ? 'var(--accent)' : idea.quantScore >= 60 ? 'var(--warn)' : 'var(--short)' }}>{idea.quantScore.toFixed(1)}</span>
                {idea.quantScoreData && <span className="text-xs ml-1 text-[var(--text4)]">· {idea.quantScoreData.quantLabel}</span>}
              </span>
            )}
            {readiness && (
              <span>
                Readiness: <span className={`font-mono ${readiness.ready ? 'text-[var(--long)]' : 'text-[var(--warn)]'}`}>
                  {readiness.pct}%
                </span>
                {readiness.ready ? ' ✓ Ready' : ` · ${readiness.openChallenges} challenges open`}
              </span>
            )}
          </div>
        </div>
        <a href={`/dashboard/ideas/${idea.id}`} className="btn btn-ghost btn-sm">View Idea</a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text3)] hover:text-[var(--text)]'
            }`}>
            {t}
            {t === 'Questions' && questions.filter(q => q.status === 'OPEN').length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--warn)] text-white text-[10px] font-bold">
                {questions.filter(q => q.status === 'OPEN').length}
              </span>
            )}
            {t === 'Challenges' && challenges.filter(c => c.status === 'OPEN').length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {challenges.filter(c => c.status === 'OPEN').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'Overview' && readiness && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="panel p-5">
            <div className="sec-title mb-4">Research Readiness</div>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl font-bold" style={{ color: readiness.ready ? 'var(--long)' : 'var(--warn)' }}>
                {readiness.pct}%
              </div>
              <div>
                <div className={`text-sm font-medium ${readiness.ready ? 'text-[var(--long)]' : 'text-[var(--warn)]'}`}>
                  {readiness.ready ? 'Ready for vote' : 'Not ready'}
                </div>
                <div className="text-xs text-[var(--text4)]">{readiness.score} / {readiness.maxScore} points</div>
              </div>
            </div>
            <div className="space-y-2">
              {readiness.checklist.map(item => (
                <div key={item.key} className="flex items-center gap-3">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    item.done ? 'bg-[var(--long)] text-white' : 'bg-[var(--border)] text-[var(--text4)]'
                  }`}>{item.done ? '✓' : '○'}</span>
                  <span className={`text-sm ${item.done ? 'text-[var(--text)]' : 'text-[var(--text3)]'}`}>{item.label}</span>
                  <span className="ml-auto text-xs text-[var(--text4)]">{item.weight}pts</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <div className="sec-title mb-4">Committee Status</div>
            <div className="space-y-3">
              {[
                { label: 'Open Questions', value: questions.filter(q => q.status === 'OPEN').length, warn: true },
                { label: 'Open Challenges', value: challenges.filter(c => c.status === 'OPEN').length, warn: true },
                { label: 'Votes Submitted', value: voteJustifications.length, warn: false },
                { label: 'Revisions', value: revisions.length, warn: false },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <span className="text-sm text-[var(--text3)]">{row.label}</span>
                  <span className={`font-mono font-bold ${row.warn && row.value > 0 ? 'text-[var(--warn)]' : 'text-[var(--text)]'}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
            {data.researchDoc?.overview && (
              <div className="mt-4 p-3 rounded bg-[var(--panel2)] text-sm text-[var(--text2)]">
                {data.researchDoc.overview.slice(0, 300)}{data.researchDoc.overview.length > 300 ? '…' : ''}
              </div>
            )}
          </div>

          {/* Quant Breakdown */}
          <div className="panel p-5">
            <div className="sec-title mb-4">Quant Score Breakdown</div>
            {idea.quantScoreData ? (() => {
              const qd = idea.quantScoreData!;
              const sc = (v: number) => v >= 8 ? 'var(--long)' : v >= 7 ? 'var(--accent)' : v >= 6 ? 'var(--warn)' : 'var(--short)';
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '6px 10px', background: 'var(--bg)', borderRadius: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{qd.quantLabel}</span>
                    <span className="font-mono font-bold text-base" style={{ color: idea.quantScore >= 80 ? 'var(--long)' : idea.quantScore >= 70 ? 'var(--accent)' : idea.quantScore >= 60 ? 'var(--warn)' : 'var(--short)' }}>
                      {qd.finalQuantScore.toFixed(1)} / 100
                    </span>
                  </div>
                  <div className="space-y-2">
                    {([
                      ['Trend (25%)', qd.trendScore, qd.trendLabel],
                      ['Momentum (20%)', qd.momentumScore, qd.momentumLabel],
                      ['Trend Quality (15%)', qd.trendQualityScore, qd.trendQualityLabel],
                      ['MA Alignment (15%)', qd.maAlignmentScore, ''],
                      ['Volatility (10%)', qd.volatilityScore, qd.volatilityLabel],
                      ['S/R Levels (10%)', qd.srScore, ''],
                      ['Breakout (5%)', qd.breakoutScore, ''],
                      ['Volume (5%)', qd.volumeScore, ''],
                    ] as [string, number, string][]).map(([l, v, lbl]) => (
                      <div key={l}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 10, color: 'var(--text4)' }}>{l}{lbl ? ` · ${lbl}` : ''}</span>
                          <span className="font-mono text-xs" style={{ color: sc(v) }}>{v.toFixed(1)}</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 4, width: `${(v / 10) * 100}%`, background: sc(v), transition: 'width .4s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
                    {[['RSI 14', qd.rsi14.toFixed(1)], ['ADX 14', qd.adx14.toFixed(1)]].map(([k, v]) => (
                      <div key={k} style={{ padding: '5px 8px', background: 'var(--bg)', borderRadius: 4, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 8, color: 'var(--text4)' }}>{k}</div>
                        <div className="font-mono text-sm font-bold">{v}</div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })() : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text4)', fontSize: 12 }}>
                No quant data<br />
                <span style={{ fontSize: 10 }}>(submitted before MT5 integration)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Questions */}
      {tab === 'Questions' && (
        <div className="space-y-4">
          <div className="panel p-4">
            <div className="sec-title mb-3">Raise a Question</div>
            <div className="flex gap-2">
              <select value={qPriority} onChange={e => setQPriority(e.target.value)} className="inp w-28 text-sm">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
              <input value={qText} onChange={e => setQText(e.target.value)} placeholder="Your question…"
                className="inp flex-1" onKeyDown={e => e.key === 'Enter' && submitQuestion()} />
              <button onClick={submitQuestion} disabled={qSubmitting || !qText.trim()} className="btn btn-primary btn-sm">
                Submit
              </button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="panel p-8 text-center text-[var(--text4)]">No questions yet</div>
          ) : (
            <div className="space-y-2">
              {questions.map(q => (
                <div key={q.id} className="panel p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${q.priority === 'HIGH' || q.priority === 'CRITICAL' ? 'badge-warn' : 'badge-dim'}`}>
                          {q.priority}
                        </span>
                        <span className={`badge ${q.status === 'ANSWERED' ? 'badge-long' : 'badge-accent'}`}>{q.status}</span>
                        <span className="text-xs text-[var(--text4)]">{q.raisedBy}</span>
                      </div>
                      <div className="text-sm">{q.question}</div>
                      {q.answer && (
                        <div className="mt-2 p-3 rounded bg-[var(--panel2)] text-sm text-[var(--text2)] border-l-2 border-[var(--long)]">
                          <span className="text-xs text-[var(--text4)]">Answer by {q.answeredBy}: </span>
                          {q.answer}
                        </div>
                      )}
                    </div>
                    {q.status === 'OPEN' && (
                      <button onClick={() => {
                        const ans = prompt('Your answer:');
                        if (ans) answerQuestion(q.id, ans);
                      }} className="btn btn-ghost btn-sm shrink-0">Answer</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Challenges */}
      {tab === 'Challenges' && (
        <div className="space-y-4">
          <div className="panel p-4 space-y-3">
            <div className="sec-title">Raise a Challenge</div>
            <div className="flex gap-2">
              <select value={cCategory} onChange={e => setCCategory(e.target.value)} className="inp text-sm">
                {['THESIS', 'FINANCIALS', 'VALUATION', 'TECHNICALS', 'RISK', 'TIMING', 'MANAGEMENT', 'MACRO', 'OTHER'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select value={cPriority} onChange={e => setCPriority(e.target.value)} className="inp w-28 text-sm">
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <textarea value={cDesc} onChange={e => setCDesc(e.target.value)} placeholder="Describe the challenge…"
              className="inp w-full" rows={3} />
            <textarea value={cEvidence} onChange={e => setCEvidence(e.target.value)} placeholder="Supporting evidence (optional)…"
              className="inp w-full" rows={2} />
            <button onClick={submitChallenge} disabled={cSubmitting || !cDesc.trim()} className="btn btn-primary btn-sm">
              Submit Challenge
            </button>
          </div>

          {challenges.length === 0 ? (
            <div className="panel p-8 text-center text-[var(--text4)]">No challenges yet</div>
          ) : (
            <div className="space-y-2">
              {challenges.map(c => (
                <div key={c.id} className={`panel p-4 ${c.status === 'OPEN' ? 'border-l-2 border-red-500' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge badge-warn">{c.category}</span>
                        <span className={`badge ${c.status === 'ADDRESSED' ? 'badge-long' : c.status === 'OPEN' ? 'badge-short' : 'badge-dim'}`}>
                          {c.status}
                        </span>
                        <span className="badge badge-dim">{c.priority}</span>
                        <span className="text-xs text-[var(--text4)]">{c.raisedBy}</span>
                      </div>
                      <div className="text-sm font-medium">{c.description}</div>
                      {c.evidence && <div className="text-xs text-[var(--text3)] mt-1">{c.evidence}</div>}
                      {c.resolution && (
                        <div className="mt-2 p-2 rounded bg-[var(--panel2)] text-sm text-[var(--long)] border-l-2 border-[var(--long)]">
                          Resolution: {c.resolution}
                        </div>
                      )}
                    </div>
                    {c.status === 'OPEN' && (
                      <button onClick={() => {
                        const res = prompt('Resolution:');
                        if (res) resolveChallenge(c.id, res);
                      }} className="btn btn-ghost btn-sm shrink-0">Resolve</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Votes */}
      {tab === 'Votes' && (
        <div className="space-y-4">
          <div className="panel p-4 space-y-3">
            <div className="sec-title">Submit Vote Justification</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Decision</label>
                <select value={vDecision} onChange={e => setVDecision(e.target.value)} className="inp w-full">
                  <option value="APPROVE">Approve</option>
                  <option value="REJECT">Reject</option>
                  <option value="APPROVE_WITH_CONDITIONS">Approve with Conditions</option>
                  <option value="ABSTAIN">Abstain</option>
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Summary *</label>
              <textarea value={vSummary} onChange={e => setVSummary(e.target.value)} className="inp w-full" rows={3}
                placeholder="Your overall assessment…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Key Strengths</label>
                <textarea value={vStrengths} onChange={e => setVStrengths(e.target.value)} className="inp w-full" rows={2} />
              </div>
              <div>
                <label className="form-label">Key Concerns</label>
                <textarea value={vConcerns} onChange={e => setVConcerns(e.target.value)} className="inp w-full" rows={2} />
              </div>
            </div>
            <div>
              <label className="form-label">Conditions (if applicable)</label>
              <textarea value={vConditions} onChange={e => setVConditions(e.target.value)} className="inp w-full" rows={2} />
            </div>
            <button onClick={submitVote} disabled={vSubmitting || !vSummary.trim()} className="btn btn-primary btn-sm">
              Submit Justification
            </button>
          </div>

          {voteJustifications.length === 0 ? (
            <div className="panel p-8 text-center text-[var(--text4)]">No votes submitted yet</div>
          ) : (
            <div className="space-y-3">
              {voteJustifications.map(j => (
                <div key={j.id} className="panel p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${DECISION_COLORS[j.decision] ?? 'badge-dim'}`}>{j.decision}</span>
                      <span className="text-sm font-medium">{j.userId}</span>
                    </div>
                    <span className="text-xs text-[var(--text4)]">{new Date(j.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm mb-2">{j.summary}</p>
                  {j.keyStrengths && <div className="text-xs text-[var(--long)] mt-1">✓ {j.keyStrengths}</div>}
                  {j.keyConcerns && <div className="text-xs text-[var(--short)] mt-1">✗ {j.keyConcerns}</div>}
                  {j.conditions && <div className="text-xs text-[var(--warn)] mt-1">⚠ {j.conditions}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Revisions */}
      {tab === 'Revisions' && (
        <div className="space-y-4">
          <div className="panel p-4 space-y-3">
            <div className="sec-title">Submit Research Revision</div>
            <div>
              <label className="form-label">Revision Summary *</label>
              <textarea value={revSummary} onChange={e => setRevSummary(e.target.value)} className="inp w-full" rows={2}
                placeholder="What changed in this revision…" />
            </div>
            <div>
              <label className="form-label">Detailed Changes</label>
              <textarea value={revChanges} onChange={e => setRevChanges(e.target.value)} className="inp w-full" rows={3}
                placeholder="Specific sections updated, data revised, etc." />
            </div>
            <button onClick={submitRevision} disabled={revSubmitting || !revSummary.trim()} className="btn btn-primary btn-sm">
              Submit Revision
            </button>
          </div>

          {revisions.length === 0 ? (
            <div className="panel p-8 text-center text-[var(--text4)]">No revisions yet</div>
          ) : (
            <div className="space-y-2">
              {revisions.map(r => (
                <div key={r.id} className="panel p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-accent">Rev #{r.revisionNum}</span>
                      <span className="text-sm font-medium">{r.submittedBy}</span>
                    </div>
                    <span className="text-xs text-[var(--text4)]">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm">{r.summary}</div>
                  {r.changes && <div className="text-xs text-[var(--text3)] mt-1">{r.changes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {tab === 'Timeline' && (
        <div className="panel p-4">
          <div className="sec-title mb-4">Decision Timeline</div>
          {timeline.length === 0 ? (
            <div className="text-center text-[var(--text4)] py-8">No events yet</div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--border)]" />
              <div className="space-y-4 pl-10">
                {timeline.map(event => {
                  const COLOR: Record<string, string> = {
                    IDEA_SUBMITTED: 'var(--accent)', QUESTION_RAISED: 'var(--warn)',
                    QUESTION_ANSWERED: 'var(--long)', CHALLENGE_RAISED: '#ef4444',
                    CHALLENGE_RESOLVED: 'var(--long)', REVISION_SUBMITTED: 'var(--purple)',
                    VOTE_SUBMITTED: 'var(--accent)',
                  };
                  const color = COLOR[event.type] ?? 'var(--text4)';
                  return (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-6 w-3 h-3 rounded-full border-2 border-[var(--panel)] top-1"
                        style={{ backgroundColor: color }} />
                      <div className="text-xs text-[var(--text4)] mb-0.5">
                        {new Date(event.at).toLocaleDateString()} · {event.actor}
                      </div>
                      <div className="text-sm font-medium" style={{ color }}>{event.label}</div>
                      <div className="text-sm text-[var(--text2)]">{event.detail}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
