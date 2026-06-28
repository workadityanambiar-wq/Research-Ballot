'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import type { CalendarEvent } from '@/lib/types';

const EVENT_COLORS: Record<string, string> = {
  earnings: 'var(--accent)', fed: 'var(--purple)', cpi: 'var(--warn)',
  nfp: 'var(--warn)', opec: 'var(--short)', company: 'var(--long)',
  dividend: 'var(--long)', other: 'var(--text3)',
};

const EVENT_LABELS: Record<string, string> = {
  earnings: 'Earnings', fed: 'Fed Meeting', cpi: 'CPI', nfp: 'NFP',
  opec: 'OPEC', company: 'Company Event', dividend: 'Dividend', other: 'Other',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const { user } = useApp();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', eventType: 'earnings', date: '', ticker: '', description: '', importance: 'HIGH' });
  const [submitting, setSubmitting] = useState(false);

  const canAddEvents = user && ['CIO', 'PM', 'SR_ANALYST'].includes(user.role);

  useEffect(() => {
    if (!user) return;
    const from = new Date(viewYear, viewMonth, 1).toISOString();
    const to = new Date(viewYear, viewMonth + 1, 0, 23, 59).toISOString();
    fetch(`/api/calendar?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(data => { setEvents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user, viewYear, viewMonth]);

  const addEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;
    setSubmitting(true);
    const r = await fetch('/api/calendar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEvent),
    });
    if (r.ok) {
      const ev = await r.json();
      setEvents(prev => [...prev, ev].sort((a, b) => a.date.localeCompare(b.date)));
      setNewEvent({ title: '', eventType: 'earnings', date: '', ticker: '', description: '', importance: 'HIGH' });
      setShowForm(false);
    }
    setSubmitting(false);
  };

  const deleteEvent = async (id: string) => {
    await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' });
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long' });

  const eventsByDay: Record<number, CalendarEvent[]> = {};
  events.forEach(e => {
    const d = new Date(e.date).getDate();
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d].push(e);
  });

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20, gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Research Calendar</h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Earnings, macro events, company catalysts</p>
        </div>
        {canAddEvents && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'CANCEL' : '+ ADD EVENT'}
          </button>
        )}
      </div>

      {/* Add event form */}
      {showForm && (
        <div className="panel" style={{ padding: 14 }}>
          <div className="sec-title" style={{ marginBottom: 10 }}>New Calendar Event</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <div style={{ gridColumn: '1 / 3' }}>
              <div className="form-label">Title *</div>
              <input className="inp" placeholder="NVDA Q3 Earnings" value={newEvent.title}
                onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <div className="form-label">Type</div>
              <select className="inp" value={newEvent.eventType}
                onChange={e => setNewEvent(p => ({ ...p, eventType: e.target.value }))}>
                {Object.entries(EVENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <div className="form-label">Importance</div>
              <select className="inp" value={newEvent.importance}
                onChange={e => setNewEvent(p => ({ ...p, importance: e.target.value }))}>
                {['LOW', 'MEDIUM', 'HIGH'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <div className="form-label">Date *</div>
              <input className="inp" type="datetime-local" value={newEvent.date}
                onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <div className="form-label">Ticker</div>
              <input className="inp" placeholder="NVDA" value={newEvent.ticker}
                onChange={e => setNewEvent(p => ({ ...p, ticker: e.target.value.toUpperCase() }))} />
            </div>
            <div style={{ gridColumn: '3 / 5' }}>
              <div className="form-label">Description</div>
              <input className="inp" placeholder="Optional details…" value={newEvent.description}
                onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={addEvent} disabled={submitting || !newEvent.title || !newEvent.date}>
              {submitting ? 'SAVING…' : 'ADD EVENT'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Calendar grid */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 16 }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{monthName} {viewYear}</span>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 16 }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 12px 0' }}>
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'var(--text4)', letterSpacing: '.06em', paddingBottom: 6 }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, padding: '0 12px 12px' }}>
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              const dayEvents = eventsByDay[day] ?? [];
              const isSelected = selectedDay === day;
              return (
                <div key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                  style={{
                    minHeight: 70, padding: '4px 6px', border: '1px solid var(--border)', margin: 1, borderRadius: 6, cursor: 'pointer',
                    background: isSelected ? 'var(--accent-dim)' : isToday ? 'var(--purple-dim)' : 'transparent',
                    borderColor: isSelected ? 'var(--accent)' : isToday ? 'var(--purple)' : 'var(--border)',
                    transition: 'all .12s',
                  }}>
                  <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--purple)' : 'var(--text2)', marginBottom: 4 }}>{day}</div>
                  {dayEvents.slice(0, 3).map(e => (
                    <div key={e.id} style={{
                      fontSize: 9, padding: '1px 4px', borderRadius: 3, marginBottom: 2,
                      background: `${EVENT_COLORS[e.eventType] ?? 'var(--text4)'}20`,
                      color: EVENT_COLORS[e.eventType] ?? 'var(--text4)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {e.ticker ? `${e.ticker} · ` : ''}{e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div style={{ fontSize: 9, color: 'var(--text4)' }}>+{dayEvents.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Selected day events */}
          {selectedDay && (
            <div className="panel" style={{ padding: 14 }}>
              <div className="sec-title" style={{ marginBottom: 10 }}>
                {monthName} {selectedDay} · {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
              </div>
              {selectedEvents.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text4)', textAlign: 'center', padding: 12 }}>No events this day</div>
              ) : selectedEvents.map(e => (
                <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: EVENT_COLORS[e.eventType] ?? 'var(--text4)', display: 'inline-block' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{e.title}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="badge badge-dim">{EVENT_LABELS[e.eventType] ?? e.eventType}</span>
                        {e.ticker && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)' }}>{e.ticker}</span>}
                        <span className={`badge badge-${e.importance === 'HIGH' ? 'high' : e.importance === 'MEDIUM' ? 'medium' : 'low'}`}>{e.importance}</span>
                      </div>
                      {e.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{e.description}</div>}
                    </div>
                    {canAddEvents && (
                      <button onClick={() => deleteEvent(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 12 }}>✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming events */}
          <div className="panel" style={{ padding: 14 }}>
            <div className="sec-title" style={{ marginBottom: 10 }}>Upcoming Events</div>
            {loading ? (
              <div style={{ fontSize: 11, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>LOADING…</div>
            ) : events.filter(e => new Date(e.date) >= today).slice(0, 8).map(e => (
              <div key={e.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)', lineHeight: 1 }}>
                    {new Date(e.date).getDate()}
                  </div>
                  <div style={{ fontSize: 8, color: 'var(--text4)', letterSpacing: '.05em' }}>
                    {new Date(e.date).toLocaleString('default', { month: 'short' }).toUpperCase()}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 2, alignItems: 'center' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: EVENT_COLORS[e.eventType], display: 'inline-block' }} />
                    <span style={{ fontSize: 10, color: 'var(--text4)' }}>{EVENT_LABELS[e.eventType]}</span>
                    {e.ticker && <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{e.ticker}</span>}
                  </div>
                </div>
              </div>
            ))}
            {!loading && events.filter(e => new Date(e.date) >= today).length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text4)', textAlign: 'center', padding: 12 }}>No upcoming events</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
