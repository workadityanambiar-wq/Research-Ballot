'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useBreakpoint } from '@/hooks/useBreakpoint';

type Meeting = {
  id: string; title: string; meetingDate: string; agenda: string | null;
  notes: string | null; status: string; createdBy: string; createdAt: string;
  agendaItems: { id: string; idea: { ticker: string; dir: string } | null }[];
  attendance: { userId: string }[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  SCHEDULED:   { label: 'Scheduled',   color: 'var(--accent)', bg: 'var(--accent-dim)', border: 'rgba(37,99,235,.2)' },
  IN_PROGRESS: { label: 'In Progress', color: 'var(--warn)',   bg: 'var(--warn-dim)',   border: 'rgba(217,119,6,.2)' },
  COMPLETED:   { label: 'Completed',   color: 'var(--long)',   bg: 'var(--long-dim)',   border: 'rgba(22,163,74,.2)' },
  CANCELLED:   { label: 'Cancelled',   color: 'var(--text4)', bg: 'var(--bg)',          border: 'var(--border2)' },
};

function MeetingCard({ meeting, idx }: { meeting: Meeting; idx: number }) {
  const d = new Date(meeting.meetingDate);
  const isPast = d < new Date();
  const isToday = d.toDateString() === new Date().toDateString();
  const status = (isPast && meeting.status === 'SCHEDULED') ? 'SCHEDULED' : meeting.status;
  const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG.SCHEDULED;
  const daysUntil = Math.ceil((d.getTime() - Date.now()) / 86400000);
  const tickers = meeting.agendaItems.filter(a => a.idea).map(a => a.idea!);

  return (
    <Link href={`/dashboard/committee/meetings/${meeting.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: isToday ? 'linear-gradient(135deg, rgba(37,99,235,0.03) 0%, var(--panel) 60%)' : 'var(--panel)',
        border: `1px solid ${isToday ? 'rgba(37,99,235,.3)' : 'var(--border)'}`,
        borderRadius: 10, padding: '16px', boxShadow: isToday ? '0 4px 16px rgba(37,99,235,.08)' : 'var(--shadow)',
        transition: 'all .18s', cursor: 'pointer',
        animation: `slideUp .22s ease-out ${Math.min(idx * 0.04, 0.25)}s both`,
      } as React.CSSProperties}
        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 24px rgba(0,0,0,.09)'; el.style.borderColor = 'rgba(37,99,235,.3)'; }}
        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = isToday ? '0 4px 16px rgba(37,99,235,.08)' : 'var(--shadow)'; el.style.borderColor = isToday ? 'rgba(37,99,235,.3)' : 'var(--border)'; }}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {/* Date block */}
          <div style={{
            width: 52, height: 52, borderRadius: 10, flexShrink: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: isToday ? 'var(--accent)' : 'var(--bg)',
            border: `1px solid ${isToday ? 'transparent' : 'var(--border)'}`,
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, fontFamily: 'var(--mono)', color: isToday ? '#fff' : 'var(--text)' }}>{d.getDate()}</div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: isToday ? 'rgba(255,255,255,.8)' : 'var(--text4)' }}>
              {d.toLocaleDateString('en', { month: 'short' })}
            </div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
                  {meeting.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: 'var(--text4)' }}>
                  <span style={{ fontFamily: 'var(--mono)' }}>{d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>·</span>
                  <span>{meeting.agendaItems.length} agenda item{meeting.agendaItems.length !== 1 ? 's' : ''}</span>
                  <span>·</span>
                  <span>{meeting.attendance.length} attendee{meeting.attendance.length !== 1 ? 's' : ''}</span>
                  {isToday && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>TODAY</span>}
                  {!isToday && !isPast && daysUntil <= 3 && (
                    <span style={{ color: 'var(--warn)', fontWeight: 600 }}>in {daysUntil}d</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, padding: '3px 8px', borderRadius: 5, letterSpacing: '.05em', fontFamily: 'var(--mono)' }}>
                  {sc.label.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Tickers */}
            {tickers.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                {tickers.slice(0, 6).map((t, i) => (
                  <span key={i} className={`badge ${t.dir === 'LONG' ? 'badge-long' : 'badge-short'}`} style={{ fontSize: 9 }}>
                    {t.ticker}
                  </span>
                ))}
                {tickers.length > 6 && (
                  <span className="badge badge-dim" style={{ fontSize: 9 }}>+{tickers.length - 6} more</span>
                )}
              </div>
            )}

            {/* Agenda preview */}
            {meeting.agenda && (
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                {meeting.agenda}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function MeetingsPage() {
  const { cols } = useBreakpoint();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [agenda, setAgenda] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

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

  const filtered = meetings
    .filter(m => filter === 'ALL' || m.status === filter)
    .filter(m => !search || m.title.toLowerCase().includes(search.toLowerCase()));

  const todayMeetings = meetings.filter(m => new Date(m.meetingDate).toDateString() === new Date().toDateString());
  const upcoming = meetings.filter(m => m.status === 'SCHEDULED' && new Date(m.meetingDate) >= new Date());
  const completed = meetings.filter(m => m.status === 'COMPLETED');

  return (
    <div className="scroll-y dash-content" style={{ height: '100%', padding: '18px 20px', background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Link href="/dashboard/committee" style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 600, letterSpacing: '.04em', textDecoration: 'none' }}>← COMMITTEE</Link>
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em', marginBottom: 3 }}>Committee Meetings</h1>
          <p style={{ fontSize: 11, color: 'var(--text3)' }}>Schedule, manage, and review investment committee sessions</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className={showForm ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'} style={{ flexShrink: 0, marginTop: 4 }}>
          {showForm ? '× Cancel' : '+ Schedule Meeting'}
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(4, 2, 2)}, 1fr)`, gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Total Meetings', value: meetings.length, color: 'var(--text2)', icon: '▦' },
          { label: 'Upcoming', value: upcoming.length, color: 'var(--accent)', icon: '◷' },
          { label: 'Today', value: todayMeetings.length, color: todayMeetings.length > 0 ? 'var(--warn)' : 'var(--text4)', icon: '◉' },
          { label: 'Completed', value: completed.length, color: 'var(--long)', icon: '✓' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, color: s.color, opacity: .7 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 9, color: 'var(--text4)', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's timeline */}
      {todayMeetings.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(124,58,237,0.04) 100%)', border: '1px solid rgba(37,99,235,.14)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10 }}>Today's Schedule</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {todayMeetings.map(m => {
              const d = new Date(m.meetingDate);
              return (
                <Link key={m.id} href={`/dashboard/committee/meetings/${m.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', minWidth: 160, transition: 'all .12s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
                  >
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
                      {d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{m.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{m.agendaItems.length} items</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Schedule New Meeting</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(2, 2, 1)}, 1fr)`, gap: 10, marginBottom: 10 }}>
            <div>
              <div className="form-label">Meeting Title *</div>
              <input value={title} onChange={e => setTitle(e.target.value)} className="inp"
                placeholder="e.g. Weekly IC Review — Q2 2026" />
            </div>
            <div>
              <div className="form-label">Date & Time *</div>
              <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="inp" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div className="form-label">Agenda</div>
            <textarea value={agenda} onChange={e => setAgenda(e.target.value)} className="inp" rows={2}
              placeholder="Meeting agenda and objectives…" style={{ resize: 'vertical' }} />
          </div>
          <button onClick={createMeeting} disabled={creating || !title.trim() || !date} className="btn btn-primary btn-sm">
            {creating ? 'Creating…' : 'Create Meeting'}
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search meetings…" className="inp"
          style={{ width: 200, fontSize: 11 }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[['ALL', 'All'], ['SCHEDULED', 'Scheduled'], ['IN_PROGRESS', 'In Progress'], ['COMPLETED', 'Completed'], ['CANCELLED', 'Cancelled']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={filter === v ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}>
              {l}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>{filtered.length} meetings</span>
      </div>

      {/* Meeting list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, height: 90, animation: 'pulse 1.5s ease infinite' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '48px 24px', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: .5 }}>▦</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>
            {search ? 'No meetings match your search' : 'No meetings found'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 16 }}>
            {filter === 'ALL' ? 'Schedule your first investment committee meeting.' : `No ${filter.replace('_', ' ').toLowerCase()} meetings.`}
          </div>
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
            + Schedule Meeting
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((m, i) => <MeetingCard key={m.id} meeting={m} idx={i} />)}
        </div>
      )}
    </div>
  );
}
