'use client';
import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import RichEditor from '@/components/ui/RichEditor';
import type { ResearchDoc, ResearchCatalyst, ResearchRisk, ResearchAttachment, ResearchReference, ResearchComment } from '@/lib/types';

type FullDoc = ResearchDoc & {
  idea: { id: string; ticker: string; dir: string; approvalStatus: string; entry: number; stop: number; target: number; thesis: string; catalysts: string[]; risks: string[] } | null;
  catalysts: ResearchCatalyst[];
  risks: ResearchRisk[];
  attachments: ResearchAttachment[];
  references: ResearchReference[];
  comments: ResearchComment[];
};

const TABS = ['Overview', 'Thesis', 'Catalysts', 'Risks', 'Valuation', 'Financials', 'Technical', 'Attachments', 'References', 'Committee'] as const;
type Tab = typeof TABS[number];

// Detect if idea was submitted as an investment memo (JSON thesis)
function detectMemoType(thesis: string | null): 'investment' | 'trading' {
  if (!thesis) return 'trading';
  try {
    const p = JSON.parse(thesis);
    if (p && typeof p === 'object' && ('executiveSummary' in p || 'financial' in p)) return 'investment';
  } catch {}
  return 'trading';
}

// Parse the JSON memo into its sections (for investment ideas)
type ParsedMemo = { executiveSummary?: string; thesis?: string; financial?: string; valuation?: string };
function parseMemo(thesis: string | null): ParsedMemo {
  if (!thesis) return {};
  try { return JSON.parse(thesis) as ParsedMemo; } catch { return {}; }
}

const STATUS_OPTIONS = ['DRAFT', 'IN_PROGRESS', 'COMPLETE', 'RISK_REVIEW', 'COMMITTEE_REVIEW', 'ARCHIVED'] as const;
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', IN_PROGRESS: 'In Progress', COMPLETE: 'Complete',
  RISK_REVIEW: 'Risk Review', COMMITTEE_REVIEW: 'Committee Review', ARCHIVED: 'Archived',
};
const IMP_COLOR: Record<string, string> = {
  LOW: 'var(--long)', MEDIUM: 'var(--warn)', HIGH: 'var(--short)', CRITICAL: 'var(--purple)',
};

function CompletionBar({ pct, label }: { pct: number; label: string }) {
  const color = pct >= 80 ? 'var(--long)' : pct >= 50 ? 'var(--accent)' : 'var(--warn)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 100, fontSize: 10, color: 'var(--text3)' }}>{label}</span>
      <div className="bar-track" style={{ flex: 1, height: 6 }}>
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ width: 30, textAlign: 'right', fontSize: 10, color, fontFamily: 'var(--mono)' }}>{pct}%</span>
    </div>
  );
}

export default function ResearchWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id: ideaId } = use(params);
  const { user } = useApp();
  const { isMobile } = useBreakpoint();
  const [doc, setDoc] = useState<FullDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('Overview');
  const [error, setError] = useState('');

  // Catalyst/Risk/Attachment/Reference/Comment local state
  const [newCatalyst, setNewCatalyst] = useState({ title: '', description: '', importance: 'HIGH', probability: '', timeline: '', expectedImpact: '' });
  const [newRisk, setNewRisk] = useState({ description: '', severity: 'HIGH', probability: '', mitigation: '' });
  const [newAttachment, setNewAttachment] = useState({ title: '', fileUrl: '', fileType: 'link', description: '' });
  const [newReference, setNewReference] = useState({ title: '', source: 'Bloomberg', url: '', notes: '' });
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/research/${ideaId}`);
      if (!r.ok) { setError('Research workspace not found'); setLoading(false); return; }
      const data = await r.json();
      setDoc(data);
    } catch { setError('Failed to load research'); }
    setLoading(false);
  }, [ideaId]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const saveField = useCallback(async (field: string, value: string) => {
    const r = await fetch(`/api/research/${ideaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    if (r.ok) {
      const { completionScore, qualityScore } = await r.json();
      setDoc(prev => prev ? { ...prev, completionScore, qualityScore } : prev);
    }
  }, [ideaId]);

  const saveStatus = async (status: string) => {
    await fetch(`/api/research/${ideaId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setDoc(prev => prev ? { ...prev, status: status as ResearchDoc['status'] } : prev);
  };

  const addCatalyst = async () => {
    if (!newCatalyst.title || !newCatalyst.description) return;
    setSubmitting(true);
    const r = await fetch(`/api/research/${ideaId}/catalysts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newCatalyst, probability: newCatalyst.probability ? Number(newCatalyst.probability) : null }),
    });
    if (r.ok) {
      const item = await r.json();
      setDoc(prev => prev ? { ...prev, catalysts: [...prev.catalysts, item] } : prev);
      setNewCatalyst({ title: '', description: '', importance: 'HIGH', probability: '', timeline: '', expectedImpact: '' });
    }
    setSubmitting(false);
  };

  const removeCatalyst = async (catalystId: string) => {
    await fetch(`/api/research/${ideaId}/catalysts?catalystId=${catalystId}`, { method: 'DELETE' });
    setDoc(prev => prev ? { ...prev, catalysts: prev.catalysts.filter(c => c.id !== catalystId) } : prev);
  };

  const addRisk = async () => {
    if (!newRisk.description) return;
    setSubmitting(true);
    const r = await fetch(`/api/research/${ideaId}/risks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newRisk, probability: newRisk.probability ? Number(newRisk.probability) : null }),
    });
    if (r.ok) {
      const item = await r.json();
      setDoc(prev => prev ? { ...prev, risks: [...prev.risks, item] } : prev);
      setNewRisk({ description: '', severity: 'HIGH', probability: '', mitigation: '' });
    }
    setSubmitting(false);
  };

  const removeRisk = async (riskId: string) => {
    await fetch(`/api/research/${ideaId}/risks?riskId=${riskId}`, { method: 'DELETE' });
    setDoc(prev => prev ? { ...prev, risks: prev.risks.filter(r => r.id !== riskId) } : prev);
  };

  const addAttachment = async () => {
    if (!newAttachment.title || !newAttachment.fileUrl) return;
    setSubmitting(true);
    const r = await fetch(`/api/research/${ideaId}/attachments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAttachment),
    });
    if (r.ok) {
      const item = await r.json();
      setDoc(prev => prev ? { ...prev, attachments: [item, ...prev.attachments] } : prev);
      setNewAttachment({ title: '', fileUrl: '', fileType: 'link', description: '' });
    }
    setSubmitting(false);
  };

  const removeAttachment = async (attachId: string) => {
    await fetch(`/api/research/${ideaId}/attachments?attachId=${attachId}`, { method: 'DELETE' });
    setDoc(prev => prev ? { ...prev, attachments: prev.attachments.filter(a => a.id !== attachId) } : prev);
  };

  const addReference = async () => {
    if (!newReference.title || !newReference.source) return;
    setSubmitting(true);
    const r = await fetch(`/api/research/${ideaId}/references`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReference),
    });
    if (r.ok) {
      const item = await r.json();
      setDoc(prev => prev ? { ...prev, references: [item, ...prev.references] } : prev);
      setNewReference({ title: '', source: 'Bloomberg', url: '', notes: '' });
    }
    setSubmitting(false);
  };

  const removeReference = async (refId: string) => {
    await fetch(`/api/research/${ideaId}/references?refId=${refId}`, { method: 'DELETE' });
    setDoc(prev => prev ? { ...prev, references: prev.references.filter(r => r.id !== refId) } : prev);
  };

  const postComment = async (content: string, parentId?: string) => {
    if (!content.trim()) return;
    setSubmitting(true);
    const r = await fetch(`/api/research/${ideaId}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, parentId }),
    });
    if (r.ok) {
      const comment = await r.json();
      setDoc(prev => {
        if (!prev) return prev;
        if (parentId) {
          return {
            ...prev,
            comments: prev.comments.map(c =>
              c.id === parentId ? { ...c, replies: [...(c.replies ?? []), comment] } : c
            ),
          };
        }
        return { ...prev, comments: [...prev.comments, { ...comment, replies: [] }] };
      });
      if (parentId) { setReplyTo(null); setReplyText(''); } else setNewComment('');
    }
    setSubmitting(false);
  };

  const deleteComment = async (commentId: string) => {
    await fetch(`/api/research/${ideaId}/comments?commentId=${commentId}`, { method: 'DELETE' });
    setDoc(prev => prev ? { ...prev, comments: prev.comments.filter(c => c.id !== commentId) } : prev);
  };

  const canEdit = doc && user && (doc.authorId === user.legacyId || ['CIO', 'PM'].includes(user.role));

  const ideaType = detectMemoType(doc?.idea?.thesis ?? null);
  const parsedMemo = parseMemo(doc?.idea?.thesis ?? null);

  // For investment memos: merge JSON sections as fallback when workspace fields are empty
  const effectiveThesis    = doc?.thesis     || (ideaType === 'investment' ? parsedMemo.thesis       ?? '' : '');
  const effectiveFinancials= doc?.financials || (ideaType === 'investment' ? parsedMemo.financial    ?? '' : '');
  const effectiveValuation = doc?.valuation  || (ideaType === 'investment' ? parsedMemo.valuation    ?? '' : '');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>
      LOADING WORKSPACE…
    </div>
  );
  if (error || !doc) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{error || 'Not found'}</div>
      <Link href="/dashboard/research"><button className="btn btn-ghost btn-sm">← Back to Pipeline</button></Link>
    </div>
  );

  const idea = doc.idea;

  return (
    <div className="dash-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Workspace header */}
      <div style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)', padding: '12px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/dashboard/research" style={{ color: 'var(--text4)', fontSize: 18, lineHeight: 1 }}>←</Link>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>
                  {idea?.ticker ?? ideaId}
                </span>
                {idea?.dir && (
                  <span className={`badge badge-${idea.dir === 'LONG' ? 'long' : 'short'}`}>{idea.dir}</span>
                )}
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '.07em', padding: '2px 7px', borderRadius: 4,
                  color: ideaType === 'investment' ? 'var(--accent)' : 'var(--purple)',
                  background: ideaType === 'investment' ? 'var(--accent-dim)' : 'rgba(139,92,246,.1)',
                  border: `1px solid ${ideaType === 'investment' ? 'rgba(37,99,235,.3)' : 'rgba(139,92,246,.3)'}`,
                }}>
                  {ideaType === 'investment' ? '◆ INVESTMENT MEMO' : '◈ TRADING IDEA'}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text4)' }}>{ideaId}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Research Workspace · {doc.authorId}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Completion */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--mono)', color: doc.completionScore >= 80 ? 'var(--long)' : doc.completionScore >= 50 ? 'var(--accent)' : 'var(--warn)' }}>
                {doc.completionScore}%
              </div>
              <div style={{ fontSize: 9, color: 'var(--text4)', letterSpacing: '.05em' }}>COMPLETE</div>
            </div>
            <div style={{ width: 1, height: 32, background: 'var(--border)' }} />
            {/* Quality */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--purple)' }}>{doc.qualityScore}</div>
              <div style={{ fontSize: 9, color: 'var(--text4)', letterSpacing: '.05em' }}>QUALITY</div>
            </div>
            <div style={{ width: 1, height: 32, background: 'var(--border)' }} />
            {/* Status selector */}
            <div>
              <div style={{ fontSize: 9, color: 'var(--text4)', letterSpacing: '.05em', marginBottom: 3 }}>STATUS</div>
              {canEdit ? (
                <select className="inp" value={doc.status} onChange={e => saveStatus(e.target.value)}
                  style={{ fontSize: 10, padding: '3px 6px', width: 'auto' }}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              ) : (
                <span className="badge badge-accent">{STATUS_LABELS[doc.status] ?? doc.status}</span>
              )}
            </div>
            {/* Post Mortem link for approved ideas */}
            {idea?.approvalStatus === 'APPROVED' && (
              <Link href={`/dashboard/research/${ideaId}/postmortem`}>
                <button className="btn btn-ghost btn-sm">POST MORTEM</button>
              </Link>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 2, marginTop: 12, borderBottom: '1px solid var(--border)', marginBottom: -1, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {TABS.map(t => {
            const badge = t === 'Catalysts' ? doc.catalysts.length :
              t === 'Risks' ? doc.risks.length :
              t === 'Attachments' ? doc.attachments.length :
              t === 'References' ? doc.references.length :
              t === 'Committee' ? doc.comments.length : null;
            return (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: '7px 12px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500,
                  background: 'transparent', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                  color: tab === t ? 'var(--accent)' : 'var(--text3)',
                  transition: 'all .12s', display: 'flex', alignItems: 'center', gap: 5,
                }}>
                {t}
                {badge !== null && badge > 0 && (
                  <span style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 10, padding: '0 5px', fontSize: 9, fontFamily: 'var(--mono)' }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="scroll-y" style={{ flex: 1, padding: 20 }}>

        {/* ── OVERVIEW ── */}
        {tab === 'Overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            {/* Idea snapshot */}
            <div className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="sec-title">Idea Snapshot</div>
              {idea && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Entry', val: `$${idea.entry}` },
                    { label: 'Stop', val: `$${idea.stop}` },
                    { label: 'Target', val: `$${idea.target}` },
                    { label: 'R/R', val: ((idea.target - idea.entry) / Math.abs(idea.entry - idea.stop)).toFixed(2) },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ background: 'var(--bg)', borderRadius: 6, padding: '8px 10px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text4)', letterSpacing: '.05em', textTransform: 'uppercase' }}>{label}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, marginTop: 2 }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                <span className="sec-title" style={{ display: 'block', marginBottom: 6 }}>Initial Thesis</span>
                {idea?.thesis ?? '—'}
              </div>
            </div>

            {/* Research progress */}
            <div className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="sec-title">Research Completion</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <CompletionBar pct={doc.overview ? 100 : 0} label="Overview" />
                <CompletionBar pct={doc.thesis && doc.thesis.length > 100 ? 100 : doc.thesis ? 40 : 0} label="Thesis" />
                <CompletionBar pct={doc.financials && doc.financials.length > 80 ? 100 : doc.financials ? 40 : 0} label="Financials" />
                <CompletionBar pct={doc.valuation && doc.valuation.length > 80 ? 100 : doc.valuation ? 40 : 0} label="Valuation" />
                <CompletionBar pct={doc.technical && doc.technical.length > 50 ? 100 : doc.technical ? 40 : 0} label="Technical" />
                <CompletionBar pct={doc.catalysts.length >= 2 ? 100 : doc.catalysts.length === 1 ? 50 : 0} label="Catalysts" />
                <CompletionBar pct={doc.risks.length >= 2 ? 100 : doc.risks.length === 1 ? 50 : 0} label="Risks" />
                <CompletionBar pct={doc.attachments.length > 0 ? 100 : 0} label="Attachments" />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text4)', letterSpacing: '.05em' }}>COMPLETION</div>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 20, color: 'var(--accent)' }}>{doc.completionScore}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--text4)', letterSpacing: '.05em' }}>QUALITY SCORE</div>
                  <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 20, color: 'var(--purple)' }}>{doc.qualityScore}</div>
                </div>
              </div>
            </div>

            {/* Executive Summary (investment memos) */}
            {ideaType === 'investment' && parsedMemo.executiveSummary && (
              <div className="panel" style={{ padding: 16, gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div className="sec-title" style={{ margin: 0 }}>Executive Summary</div>
                  <span style={{ fontSize: 9, color: 'var(--accent)', background: 'var(--accent-dim)', padding: '1px 6px', borderRadius: 3, fontWeight: 600 }}>From Memo</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {parsedMemo.executiveSummary}
                </p>
              </div>
            )}

            {/* Notes / Overview */}
            <div className="panel" style={{ padding: 16, gridColumn: '1 / -1' }}>
              <div className="sec-title" style={{ marginBottom: 8 }}>
                {ideaType === 'investment' ? 'Additional Notes' : 'Overview & Notes'}
              </div>
              <RichEditor
                value={doc.overview ?? ''}
                onSave={v => saveField('overview', v)}
                placeholder="Add context, key data points, quick notes about this idea…"
                readOnly={!canEdit}
              />
            </div>
          </div>
        )}

        {/* ── THESIS ── */}
        {tab === 'Thesis' && (
          <div style={{ maxWidth: 860 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Investment Thesis</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Articulate the core investment case. What is the market missing? Why now?</div>
            </div>
            {!doc.thesis && effectiveThesis && (
              <div style={{ padding: '8px 12px', background: 'var(--accent-dim)', border: '1px solid rgba(37,99,235,.25)', borderRadius: 5, marginBottom: 10, fontSize: 10, color: 'var(--accent)' }}>
                Content imported from Investment Memo submission. Save to persist any edits.
              </div>
            )}
            <RichEditor
              value={effectiveThesis}
              onSave={v => saveField('thesis', v)}
              placeholder="The primary investment thesis…"
              minHeight={400}
              readOnly={!canEdit}
            />
          </div>
        )}

        {/* ── CATALYSTS ── */}
        {tab === 'Catalysts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Catalysts · {doc.catalysts.length}</div>

            {/* Existing catalysts */}
            {doc.catalysts.map(c => (
              <div key={c.id} className="panel" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{c.title}</span>
                      <span className="badge" style={{ background: `${IMP_COLOR[c.importance]}20`, color: IMP_COLOR[c.importance], border: `1px solid ${IMP_COLOR[c.importance]}40` }}>
                        {c.importance}
                      </span>
                      {c.probability !== null && (
                        <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{c.probability}% prob</span>
                      )}
                      {c.timeline && (
                        <span style={{ fontSize: 10, color: 'var(--text4)' }}>· {c.timeline}</span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{c.description}</p>
                    {c.expectedImpact && (
                      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--long)', fontFamily: 'var(--mono)' }}>Impact: {c.expectedImpact}</div>
                    )}
                  </div>
                  {canEdit && (
                    <button onClick={() => removeCatalyst(c.id)} className="btn btn-danger btn-sm">✕</button>
                  )}
                </div>
              </div>
            ))}

            {doc.catalysts.length === 0 && (
              <div className="panel2" style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
                No catalysts added yet
              </div>
            )}

            {/* Add form */}
            {canEdit && (
              <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="sec-title">Add Catalyst</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div className="form-label">Title *</div>
                    <input className="inp" placeholder="e.g. Earnings beat Q3" value={newCatalyst.title}
                      onChange={e => setNewCatalyst(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div>
                    <div className="form-label">Importance</div>
                    <select className="inp" value={newCatalyst.importance}
                      onChange={e => setNewCatalyst(p => ({ ...p, importance: e.target.value }))}>
                      {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="form-label">Probability (%)</div>
                    <input className="inp" type="number" min="0" max="100" placeholder="75"
                      value={newCatalyst.probability} onChange={e => setNewCatalyst(p => ({ ...p, probability: e.target.value }))} />
                  </div>
                  <div>
                    <div className="form-label">Timeline</div>
                    <input className="inp" placeholder="e.g. Q3 2025" value={newCatalyst.timeline}
                      onChange={e => setNewCatalyst(p => ({ ...p, timeline: e.target.value }))} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="form-label">Expected Impact</div>
                    <input className="inp" placeholder="e.g. +12% price appreciation" value={newCatalyst.expectedImpact}
                      onChange={e => setNewCatalyst(p => ({ ...p, expectedImpact: e.target.value }))} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="form-label">Description *</div>
                    <textarea className="inp" rows={3} placeholder="Describe this catalyst in detail…"
                      value={newCatalyst.description} onChange={e => setNewCatalyst(p => ({ ...p, description: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={addCatalyst} disabled={submitting || !newCatalyst.title || !newCatalyst.description}>
                  ADD CATALYST
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── RISKS ── */}
        {tab === 'Risks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Risks · {doc.risks.length}</div>

            {doc.risks.map(r => (
              <div key={r.id} className="panel" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span className={`badge badge-${r.severity === 'HIGH' || r.severity === 'CRITICAL' ? 'high' : r.severity === 'MEDIUM' ? 'medium' : 'low'}`}>
                        {r.severity}
                      </span>
                      {r.probability !== null && (
                        <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{r.probability}% prob</span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{r.description}</p>
                    {r.mitigation && (
                      <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--long-dim)', borderRadius: 5, fontSize: 11, color: 'var(--long)' }}>
                        Mitigation: {r.mitigation}
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <button onClick={() => removeRisk(r.id)} className="btn btn-danger btn-sm">✕</button>
                  )}
                </div>
              </div>
            ))}

            {doc.risks.length === 0 && (
              <div className="panel2" style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>No risks added yet</div>
            )}

            {canEdit && (
              <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="sec-title">Add Risk</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div className="form-label">Severity</div>
                    <select className="inp" value={newRisk.severity}
                      onChange={e => setNewRisk(p => ({ ...p, severity: e.target.value }))}>
                      {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="form-label">Probability (%)</div>
                    <input className="inp" type="number" min="0" max="100" placeholder="30"
                      value={newRisk.probability} onChange={e => setNewRisk(p => ({ ...p, probability: e.target.value }))} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="form-label">Description *</div>
                    <textarea className="inp" rows={3} placeholder="Describe this risk…"
                      value={newRisk.description} onChange={e => setNewRisk(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="form-label">Mitigation Plan</div>
                    <textarea className="inp" rows={2} placeholder="How would you mitigate this risk?"
                      value={newRisk.mitigation} onChange={e => setNewRisk(p => ({ ...p, mitigation: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={addRisk} disabled={submitting || !newRisk.description}>ADD RISK</button>
              </div>
            )}
          </div>
        )}

        {/* ── VALUATION ── */}
        {tab === 'Valuation' && (
          <div style={{ maxWidth: 860 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Valuation Analysis</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>DCF, comparable companies, historical multiples, sum of parts.</div>
            </div>
            {!doc.valuation && effectiveValuation && (
              <div style={{ padding: '8px 12px', background: 'var(--accent-dim)', border: '1px solid rgba(37,99,235,.25)', borderRadius: 5, marginBottom: 10, fontSize: 10, color: 'var(--accent)' }}>
                Content imported from Investment Memo submission. Save to persist any edits.
              </div>
            )}
            <RichEditor value={effectiveValuation} onSave={v => saveField('valuation', v)}
              placeholder="Valuation methodology and assumptions…" minHeight={400} readOnly={!canEdit} />
          </div>
        )}

        {/* ── FINANCIALS ── */}
        {tab === 'Financials' && (
          <div style={{ maxWidth: 860 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Financial Analysis</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Revenue, margins, cash flow, debt, capital allocation, management quality.</div>
            </div>
            {!doc.financials && effectiveFinancials && (
              <div style={{ padding: '8px 12px', background: 'var(--accent-dim)', border: '1px solid rgba(37,99,235,.25)', borderRadius: 5, marginBottom: 10, fontSize: 10, color: 'var(--accent)' }}>
                Content imported from Investment Memo submission. Save to persist any edits.
              </div>
            )}
            <RichEditor value={effectiveFinancials} onSave={v => saveField('financials', v)}
              placeholder="Revenue growth, margin expansion, FCF generation, balance sheet quality…" minHeight={400} readOnly={!canEdit} />
          </div>
        )}

        {/* ── TECHNICAL ── */}
        {tab === 'Technical' && (
          <div style={{ maxWidth: 860 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Technical Analysis</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Chart patterns, support/resistance, moving averages, volume, indicators.</div>
            </div>
            <RichEditor value={doc.technical ?? ''} onSave={v => saveField('technical', v)}
              placeholder="Chart setup, key levels, trend analysis, technical indicators…" minHeight={400} readOnly={!canEdit} />
            {idea?.ticker && (
              <div className="panel2" style={{ marginTop: 12, padding: 12 }}>
                <div className="sec-title" style={{ marginBottom: 8 }}>TradingView Chart</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  View <a href={`https://www.tradingview.com/chart/?symbol=${idea.ticker}`} target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--accent)' }}>{idea.ticker} on TradingView ↗</a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ATTACHMENTS ── */}
        {tab === 'Attachments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Attachments · {doc.attachments.length}</div>

            {doc.attachments.map(a => (
              <div key={a.id} className="panel" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, background: 'var(--accent-dim)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  {a.fileType === 'pdf' ? '📄' : a.fileType === 'xlsx' ? '📊' : a.fileType === 'image' ? '🖼' : a.fileType === 'pptx' ? '📑' : '🔗'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 12 }}>{a.title}</a>
                  {a.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{a.description}</div>}
                  <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 3, fontFamily: 'var(--mono)' }}>
                    {a.uploadedBy} · {new Date(a.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {canEdit && (
                  <button onClick={() => removeAttachment(a.id)} className="btn btn-danger btn-sm">✕</button>
                )}
              </div>
            ))}

            {doc.attachments.length === 0 && (
              <div className="panel2" style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>No attachments yet</div>
            )}

            {canEdit && (
              <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="sec-title">Add Attachment</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div className="form-label">Title *</div>
                    <input className="inp" placeholder="Q3 Earnings Report" value={newAttachment.title}
                      onChange={e => setNewAttachment(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div>
                    <div className="form-label">Type</div>
                    <select className="inp" value={newAttachment.fileType}
                      onChange={e => setNewAttachment(p => ({ ...p, fileType: e.target.value }))}>
                      {['link', 'pdf', 'xlsx', 'pptx', 'image', 'note'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="form-label">URL *</div>
                    <input className="inp" placeholder="https://…" value={newAttachment.fileUrl}
                      onChange={e => setNewAttachment(p => ({ ...p, fileUrl: e.target.value }))} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="form-label">Description</div>
                    <input className="inp" placeholder="What is this document?" value={newAttachment.description}
                      onChange={e => setNewAttachment(p => ({ ...p, description: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={addAttachment} disabled={submitting || !newAttachment.title || !newAttachment.fileUrl}>
                  ADD ATTACHMENT
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── REFERENCES ── */}
        {tab === 'References' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>References · {doc.references.length}</div>

            {doc.references.map(r => (
              <div key={r.id} className="panel" style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-dim">{r.source}</span>
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>{r.title} ↗</a>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{r.title}</span>
                      )}
                    </div>
                    {r.notes && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{r.notes}</div>}
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 3, fontFamily: 'var(--mono)' }}>
                      Added by {r.addedBy} · {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {canEdit && (
                    <button onClick={() => removeReference(r.id)} className="btn btn-danger btn-sm">✕</button>
                  )}
                </div>
              </div>
            ))}

            {doc.references.length === 0 && (
              <div className="panel2" style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>No references added yet</div>
            )}

            {canEdit && (
              <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="sec-title">Add Reference</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div className="form-label">Title *</div>
                    <input className="inp" placeholder="Q3 2025 Earnings Call" value={newReference.title}
                      onChange={e => setNewReference(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div>
                    <div className="form-label">Source *</div>
                    <select className="inp" value={newReference.source}
                      onChange={e => setNewReference(p => ({ ...p, source: e.target.value }))}>
                      {['Bloomberg', 'Reuters', 'SEC Filing', 'Annual Report', 'Investor Presentation', 'Research Paper', 'Company Website', 'FactSet', 'Other'].map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="form-label">URL</div>
                    <input className="inp" placeholder="https://…" value={newReference.url}
                      onChange={e => setNewReference(p => ({ ...p, url: e.target.value }))} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="form-label">Notes</div>
                    <textarea className="inp" rows={2} value={newReference.notes}
                      onChange={e => setNewReference(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={addReference} disabled={submitting || !newReference.title || !newReference.source}>
                  ADD REFERENCE
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── COMMITTEE ── */}
        {tab === 'Committee' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Investment Committee · {ideaId}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Discussion, questions, and committee decisions</div>
            </div>

            {/* Comments */}
            {doc.comments.length === 0 && (
              <div className="panel2" style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>No committee discussion yet</div>
            )}

            {doc.comments.map(c => (
              <div key={c.id}>
                <div className="panel" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                      {(c.authorName ?? c.authorId).substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{c.authorName ?? c.authorId}</span>
                        <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>
                          {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>{c.content}</p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--accent)', padding: 0 }}>
                          {replyTo === c.id ? 'Cancel' : 'Reply'}
                        </button>
                        {user?.legacyId === c.authorId && (
                          <button onClick={() => deleteComment(c.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--short)', padding: 0 }}>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {(c.replies ?? []).map(r => (
                  <div key={r.id} style={{ marginLeft: 24, marginTop: 4 }}>
                    <div className="panel2" style={{ padding: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{r.authorName ?? r.authorId}</span>
                        <span style={{ fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>
                          {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{r.content}</p>
                    </div>
                  </div>
                ))}

                {/* Reply input */}
                {replyTo === c.id && (
                  <div style={{ marginLeft: 24, marginTop: 6, display: 'flex', gap: 8 }}>
                    <input className="inp" placeholder="Write a reply…" value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(replyText, c.id); } }}
                      style={{ flex: 1, fontSize: 12 }} />
                    <button className="btn btn-primary btn-sm" onClick={() => postComment(replyText, c.id)} disabled={submitting || !replyText.trim()}>
                      REPLY
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* New comment */}
            <div className="panel" style={{ padding: 14 }}>
              <div className="sec-title" style={{ marginBottom: 8 }}>Add to Discussion</div>
              <textarea className="inp" rows={3} placeholder="Share your analysis, questions, or committee remarks…"
                value={newComment} onChange={e => setNewComment(e.target.value)} />
              <div style={{ marginTop: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => postComment(newComment)} disabled={submitting || !newComment.trim()}>
                  POST COMMENT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
