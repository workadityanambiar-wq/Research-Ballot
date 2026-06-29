'use client';
import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useBreakpoint } from '@/hooks/useBreakpoint';

type AgendaItem = {
  id: string; sortOrder: number; duration: number | null; notes: string | null; createdAt: string;
  idea: { id: string; ticker: string; dir: string; finalScore: number | null; approvalStatus: string } | null;
};
type Attendance = { id: string; userId: string; role: string; createdAt: string };
type Meeting = {
  id: string; title: string; meetingDate: string; agenda: string | null;
  notes: string | null; decisions: string | null; status: string;
  createdBy: string; createdAt: string;
  agendaItems: AgendaItem[];
  attendance: Attendance[];
};

type IdeaOption = { id: string; ticker: string; dir: string; finalScore: number | null };

const STATUS_BADGE: Record<string, string> = {
  COMPLETED: 'badge-long', IN_PROGRESS: 'badge-warn', SCHEDULED: 'badge-accent', CANCELLED: 'badge-dim',
};

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isMobile } = useBreakpoint();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [decisions, setDecisions] = useState('');
  const [ideas, setIdeas] = useState<IdeaOption[]>([]);
  const [selectedIdea, setSelectedIdea] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [joiningMeeting, setJoiningMeeting] = useState(false);

  const load = useCallback(async () => {
    const [mRes, iRes] = await Promise.all([
      fetch(`/api/committee/meetings/${id}`),
      fetch('/api/ideas?status=REVIEW'),
    ]);
    const [m, i] = await Promise.all([mRes.json(), iRes.json()]);
    setMeeting(m);
    setNotes(m.notes ?? '');
    setDecisions(m.decisions ?? '');
    setIdeas(Array.isArray(i) ? i : []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveNotes = async () => {
    setSaving(true);
    await fetch(`/api/committee/meetings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, decisions }),
    });
    setSaving(false);
  };

  const updateStatus = async (status: string) => {
    await fetch(`/api/committee/meetings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const addAgendaItem = async () => {
    if (!selectedIdea) return;
    setAddingItem(true);
    await fetch(`/api/committee/meetings/${id}/agenda`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ideaId: selectedIdea }),
    });
    setSelectedIdea(''); setAddingItem(false);
    load();
  };

  const removeAgendaItem = async (itemId: string) => {
    await fetch(`/api/committee/meetings/${id}/agenda?itemId=${itemId}`, { method: 'DELETE' });
    load();
  };

  const joinMeeting = async () => {
    setJoiningMeeting(true);
    await fetch(`/api/committee/meetings/${id}/attendance`, { method: 'POST' });
    setJoiningMeeting(false);
    load();
  };

  if (loading) return (
    <div style={{ padding: 32, color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12 }}>LOADING MEETING…</div>
  );
  if (!meeting) return (
    <div style={{ padding: 32, color: 'var(--text4)', fontSize: 13 }}>Meeting not found</div>
  );

  const meetingDate = new Date(meeting.meetingDate);
  const agendaIdeaIds = new Set(meeting.agendaItems.map(a => a.idea?.id).filter(Boolean));
  const availableIdeas = ideas.filter(i => !agendaIdeaIds.has(i.id));

  return (
    <div className="scroll-y dash-content" style={{ flex: 1, padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Link href="/dashboard/committee/meetings" style={{ fontSize: 11, color: 'var(--text4)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 6, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text4)'}>
            ← Meetings
          </Link>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{meeting.title}</h1>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {meetingDate.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' at '}
            {meetingDate.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`badge ${STATUS_BADGE[meeting.status] ?? 'badge-dim'}`}>{meeting.status.replace('_', ' ')}</span>
          {meeting.status === 'SCHEDULED' && (
            <button className="btn btn-primary btn-sm" onClick={() => updateStatus('IN_PROGRESS')}>Start Meeting</button>
          )}
          {meeting.status === 'IN_PROGRESS' && (
            <button className="btn btn-primary btn-sm" onClick={() => updateStatus('COMPLETED')}>Complete</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={joinMeeting} disabled={joiningMeeting}>
            {joiningMeeting ? 'Joining…' : 'Join'}
          </button>
        </div>
      </div>

      {/* Body: two-column */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: 16, alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Agenda items */}
          <div className="panel" style={{ padding: 16 }}>
            <div className="sec-title" style={{ marginBottom: 12 }}>Agenda Items</div>
            {meeting.agendaItems.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text4)', padding: '24px 0', fontSize: 12 }}>No agenda items yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {meeting.agendaItems.map((item, idx) => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 6, background: 'var(--panel2)', border: '1px solid var(--border)',
                  }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text4)', width: 18, flexShrink: 0 }}>{idx + 1}</span>
                    {item.idea ? (
                      <>
                        <Link href={`/dashboard/committee/${item.idea.id}`}
                          style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13, color: 'var(--text)', textDecoration: 'none' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--accent)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text)'}>
                          {item.idea.ticker}
                        </Link>
                        <span className={`badge badge-${item.idea.dir === 'LONG' ? 'long' : 'short'}`}>{item.idea.dir}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>Score: {item.idea.finalScore?.toFixed(1) ?? '—'}</span>
                        <span className={`badge ${
                          item.idea.approvalStatus === 'APPROVED' ? 'badge-long' :
                          item.idea.approvalStatus === 'REJECTED' ? 'badge-short' : 'badge-accent'
                        }`} style={{ marginLeft: 'auto' }}>{item.idea.approvalStatus}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text4)' }}>Idea not found</span>
                    )}
                    {item.duration && (
                      <span style={{ fontSize: 10, color: 'var(--text4)', marginLeft: item.idea ? 0 : 'auto' }}>{item.duration}min</span>
                    )}
                    <button onClick={() => removeAgendaItem(item.id)}
                      style={{ marginLeft: item.idea ? 0 : 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--short)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text4)'}>×</button>
                  </div>
                ))}
              </div>
            )}
            {availableIdeas.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <select value={selectedIdea} onChange={e => setSelectedIdea(e.target.value)} className="inp" style={{ flex: 1 }}>
                  <option value="">Add idea to agenda…</option>
                  {availableIdeas.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.ticker} ({i.dir}) — {i.finalScore?.toFixed(1) ?? '—'}
                    </option>
                  ))}
                </select>
                <button className="btn btn-primary btn-sm" onClick={addAgendaItem} disabled={addingItem || !selectedIdea}>Add</button>
              </div>
            )}
          </div>

          {/* Notes & Decisions */}
          <div className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div className="sec-title" style={{ marginBottom: 6 }}>Meeting Notes</div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="inp"
                rows={5}
                placeholder="Meeting notes, discussion points, action items…"
              />
            </div>
            <div>
              <div className="sec-title" style={{ marginBottom: 6 }}>Decisions</div>
              <textarea
                value={decisions}
                onChange={e => setDecisions(e.target.value)}
                className="inp"
                rows={4}
                placeholder="Final decisions and outcomes…"
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={saveNotes} disabled={saving} style={{ alignSelf: 'flex-start' }}>
              {saving ? 'Saving…' : 'Save Notes'}
            </button>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Attendance */}
          <div className="panel" style={{ padding: 16 }}>
            <div className="sec-title" style={{ marginBottom: 12 }}>Attendance ({meeting.attendance.length})</div>
            {meeting.attendance.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text4)' }}>No attendees yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {meeting.attendance.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)',
                      color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontWeight: 700, flexShrink: 0,
                    }}>
                      {a.userId.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{a.userId}</div>
                      <div style={{ fontSize: 10, color: 'var(--text4)' }}>{a.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pre-meeting agenda */}
          {meeting.agenda && (
            <div className="panel" style={{ padding: 16 }}>
              <div className="sec-title" style={{ marginBottom: 8 }}>Pre-meeting Agenda</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{meeting.agenda}</div>
            </div>
          )}

          {/* Decisions summary */}
          {meeting.decisions && (
            <div className="panel" style={{ padding: 16, borderLeft: '3px solid var(--long)' }}>
              <div className="sec-title" style={{ marginBottom: 8 }}>Decisions</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{meeting.decisions}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
