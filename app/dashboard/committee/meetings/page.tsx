'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Meeting = {
  id: string; title: string; meetingDate: string; agenda: string | null;
  notes: string | null; status: string; createdBy: string; createdAt: string;
  agendaItems: { id: string; idea: { ticker: string; dir: string } | null }[];
  attendance: { userId: string }[];
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [agenda, setAgenda] = useState('');
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(async () => {
    const res = await fetch('/api/committee/meetings');
    const data = await res.json();
    setMeetings(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createMeeting = async () => {
    if (!title.trim() || !date) return;
    setCreating(true);
    await fetch('/api/committee/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, meetingDate: date, agenda }),
    });
    setTitle(''); setDate(''); setAgenda(''); setShowForm(false); setCreating(false);
    load();
  };

  const filtered = filter === 'ALL' ? meetings : meetings.filter(m => m.status === filter);

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Committee Meetings</h1>
          <p className="text-[var(--text3)] text-sm mt-0.5">Schedule and manage investment committee meetings</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn btn-primary btn-sm">
          {showForm ? 'Cancel' : '+ Schedule Meeting'}
        </button>
      </div>

      {showForm && (
        <div className="panel p-5 space-y-3">
          <div className="sec-title">New Meeting</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="inp w-full"
                placeholder="e.g. Weekly IC Review — June 28" />
            </div>
            <div>
              <label className="form-label">Date & Time *</label>
              <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="inp w-full" />
            </div>
          </div>
          <div>
            <label className="form-label">Agenda</label>
            <textarea value={agenda} onChange={e => setAgenda(e.target.value)} className="inp w-full" rows={3}
              placeholder="Meeting agenda and objectives…" />
          </div>
          <button onClick={createMeeting} disabled={creating || !title.trim() || !date} className="btn btn-primary btn-sm">
            Create Meeting
          </button>
        </div>
      )}

      <div className="flex gap-2">
        {['ALL', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}>
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-[var(--text3)]">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="panel p-12 text-center text-[var(--text4)]">No meetings found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const d = new Date(m.meetingDate);
            const isPast = d < new Date();
            return (
              <Link key={m.id} href={`/dashboard/committee/meetings/${m.id}`}
                className="panel p-4 flex items-center gap-4 hover:border-[var(--accent)] transition-colors block">
                <div className="text-center w-14 shrink-0">
                  <div className="text-2xl font-bold font-mono">{d.getDate()}</div>
                  <div className="text-xs text-[var(--text4)]">{d.toLocaleDateString('en', { month: 'short' })}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.title}</div>
                  <div className="text-xs text-[var(--text3)] mt-0.5">
                    {d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{m.agendaItems.length} items
                    {' · '}{m.attendance.length} attendees
                  </div>
                  {m.agendaItems.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {m.agendaItems.slice(0, 4).map(a => a.idea && (
                        <span key={a.id} className={`badge badge-sm ${a.idea.dir === 'LONG' ? 'badge-long' : 'badge-short'}`}>
                          {a.idea.ticker}
                        </span>
                      ))}
                      {m.agendaItems.length > 4 && (
                        <span className="badge badge-dim badge-sm">+{m.agendaItems.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
                <span className={`badge shrink-0 ${
                  m.status === 'COMPLETED' ? 'badge-long' :
                  m.status === 'SCHEDULED' ? (isPast ? 'badge-warn' : 'badge-accent') :
                  m.status === 'IN_PROGRESS' ? 'badge-warn' : 'badge-dim'
                }`}>{m.status.replace('_', ' ')}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
