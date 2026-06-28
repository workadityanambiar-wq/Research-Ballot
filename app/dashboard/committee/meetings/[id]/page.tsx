'use client';
import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';

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

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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

  if (loading) return <div className="p-8 text-[var(--text3)]">Loading meeting…</div>;
  if (!meeting) return <div className="p-8 text-[var(--text4)]">Meeting not found</div>;

  const meetingDate = new Date(meeting.meetingDate);
  const isPast = meetingDate < new Date();
  const agendaIdeaIds = new Set(meeting.agendaItems.map(a => a.idea?.id).filter(Boolean));
  const availableIdeas = ideas.filter(i => !agendaIdeaIds.has(i.id));

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/committee/meetings" className="text-[var(--text4)] text-sm hover:text-[var(--text)]">
              ← Meetings
            </Link>
          </div>
          <h1 className="text-xl font-bold">{meeting.title}</h1>
          <div className="text-[var(--text3)] text-sm mt-0.5">
            {meetingDate.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' at '}{meetingDate.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${
            meeting.status === 'COMPLETED' ? 'badge-long' :
            meeting.status === 'IN_PROGRESS' ? 'badge-warn' :
            meeting.status === 'SCHEDULED' ? 'badge-accent' : 'badge-dim'
          }`}>{meeting.status}</span>
          {meeting.status === 'SCHEDULED' && (
            <button onClick={() => updateStatus('IN_PROGRESS')} className="btn btn-primary btn-sm">Start Meeting</button>
          )}
          {meeting.status === 'IN_PROGRESS' && (
            <button onClick={() => updateStatus('COMPLETED')} className="btn btn-primary btn-sm">Complete</button>
          )}
          <button onClick={joinMeeting} disabled={joiningMeeting} className="btn btn-ghost btn-sm">
            {joiningMeeting ? 'Joining…' : 'Join'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Agenda */}
        <div className="lg:col-span-2 space-y-4">
          <div className="panel p-4">
            <div className="sec-title mb-3">Agenda Items</div>
            {meeting.agendaItems.length === 0 ? (
              <div className="text-center text-[var(--text4)] py-6">No agenda items yet</div>
            ) : (
              <div className="space-y-2">
                {meeting.agendaItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--panel2)]">
                    <div className="text-[var(--text4)] font-mono text-sm w-5">{idx + 1}</div>
                    {item.idea ? (
                      <>
                        <Link href={`/dashboard/committee/${item.idea.id}`}
                          className="font-mono font-bold hover:text-[var(--accent)]">{item.idea.ticker}</Link>
                        <span className={`badge ${item.idea.dir === 'LONG' ? 'badge-long' : 'badge-short'}`}>
                          {item.idea.dir}
                        </span>
                        <span className="text-sm text-[var(--text3)]">
                          Score: {item.idea.finalScore?.toFixed(1) ?? '—'}
                        </span>
                        <span className={`badge ml-auto ${
                          item.idea.approvalStatus === 'APPROVED' ? 'badge-long' :
                          item.idea.approvalStatus === 'REJECTED' ? 'badge-short' : 'badge-accent'
                        }`}>{item.idea.approvalStatus}</span>
                      </>
                    ) : (
                      <span className="text-[var(--text4)] text-sm">Idea not found</span>
                    )}
                    {item.duration && <span className="text-xs text-[var(--text4)] ml-1">{item.duration}min</span>}
                    <button onClick={() => removeAgendaItem(item.id)}
                      className="ml-auto text-[var(--text4)] hover:text-red-500 text-sm">×</button>
                  </div>
                ))}
              </div>
            )}
            {availableIdeas.length > 0 && (
              <div className="flex gap-2 mt-3">
                <select value={selectedIdea} onChange={e => setSelectedIdea(e.target.value)} className="inp flex-1 text-sm">
                  <option value="">Add idea to agenda…</option>
                  {availableIdeas.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.ticker} ({i.dir}) — {i.finalScore?.toFixed(1) ?? '—'}
                    </option>
                  ))}
                </select>
                <button onClick={addAgendaItem} disabled={addingItem || !selectedIdea} className="btn btn-primary btn-sm">
                  Add
                </button>
              </div>
            )}
          </div>

          <div className="panel p-4 space-y-3">
            <div className="sec-title">Meeting Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="inp w-full" rows={5}
              placeholder="Meeting notes, discussion points, action items…" />
            <div className="sec-title">Decisions</div>
            <textarea value={decisions} onChange={e => setDecisions(e.target.value)} className="inp w-full" rows={4}
              placeholder="Final decisions and outcomes…" />
            <button onClick={saveNotes} disabled={saving} className="btn btn-primary btn-sm">
              {saving ? 'Saving…' : 'Save Notes'}
            </button>
          </div>
        </div>

        {/* Right: Info */}
        <div className="space-y-4">
          <div className="panel p-4">
            <div className="sec-title mb-3">Attendance ({meeting.attendance.length})</div>
            {meeting.attendance.length === 0 ? (
              <div className="text-[var(--text4)] text-sm">No attendees yet</div>
            ) : (
              <div className="space-y-2">
                {meeting.attendance.map(a => (
                  <div key={a.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-white text-xs flex items-center justify-center font-bold">
                      {a.userId.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{a.userId}</div>
                      <div className="text-xs text-[var(--text4)]">{a.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {meeting.agenda && (
            <div className="panel p-4">
              <div className="sec-title mb-2">Pre-meeting Agenda</div>
              <div className="text-sm text-[var(--text2)] whitespace-pre-wrap">{meeting.agenda}</div>
            </div>
          )}

          {meeting.decisions && (
            <div className="panel p-4 border-l-2 border-[var(--long)]">
              <div className="sec-title mb-2">Decisions</div>
              <div className="text-sm text-[var(--text2)] whitespace-pre-wrap">{meeting.decisions}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
