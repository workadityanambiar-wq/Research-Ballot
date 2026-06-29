'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { CalendarEvent, EcoEvent } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const RESEARCH_COLORS: Record<string, string> = {
  earnings: 'var(--accent)', fed: 'var(--purple)', cpi: 'var(--warn)',
  nfp: 'var(--warn)', opec: 'var(--short)', company: 'var(--long)',
  dividend: 'var(--long)', other: 'var(--text3)',
};

const RESEARCH_LABELS: Record<string, string> = {
  earnings: 'Earnings', fed: 'Fed Meeting', cpi: 'CPI', nfp: 'NFP',
  opec: 'OPEC', company: 'Company Event', dividend: 'Dividend', other: 'Other',
};

const IMP_STARS: Record<number, string> = { 1: '★', 2: '★★', 3: '★★★' };
const IMP_COLOR: Record<number, string> = { 1: 'var(--text3)', 2: 'var(--warn)', 3: 'var(--short)' };

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { user } = useApp();
  const { isMobile, cols } = useBreakpoint();
  const today = new Date();

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showForm,   setShowForm]   = useState(false);
  const [showEco,    setShowEco]    = useState(true);
  const [ecoLoading, setEcoLoading] = useState(false);
  const [ecoSource,  setEcoSource]  = useState<string>('');

  const [events,    setEvents]    = useState<CalendarEvent[]>([]);
  const [ecoEvents, setEcoEvents] = useState<EcoEvent[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [newEvent, setNewEvent] = useState({
    title: '', eventType: 'earnings', date: '', ticker: '', description: '', importance: 'HIGH',
  });
  const [submitting, setSubmitting] = useState(false);

  const canAddEvents = user && ['CIO', 'PM', 'SR_ANALYST'].includes(user.role);

  // Fetch research events
  useEffect(() => {
    if (!user) return;
    const from = new Date(viewYear, viewMonth, 1).toISOString();
    const to   = new Date(viewYear, viewMonth + 1, 0, 23, 59).toISOString();
    setLoading(true);
    fetch(`/api/calendar?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { setEvents(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user, viewYear, viewMonth]);

  // Fetch economic events from Investing.com proxy
  useEffect(() => {
    if (!user || !showEco) return;
    const from = new Date(viewYear, viewMonth, 1).toISOString();
    const to   = new Date(viewYear, viewMonth + 1, 0, 23, 59).toISOString();
    setEcoLoading(true);
    fetch(`/api/economic-calendar?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => {
        setEcoEvents(d.events ?? []);
        setEcoSource(d.source ?? '');
        setEcoLoading(false);
      })
      .catch(() => { setEcoEvents([]); setEcoLoading(false); });
  }, [user, viewYear, viewMonth, showEco]);

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

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay    = getFirstDayOfMonth(viewYear, viewMonth);
  const monthName   = new Date(viewYear, viewMonth, 1).toLocaleString('default', { month: 'long' });

  // Index research events by local day
  const resByDay: Record<number, CalendarEvent[]> = {};
  events.forEach(e => {
    const d = new Date(e.date).getDate();
    (resByDay[d] ??= []).push(e);
  });

  // Index eco events by local day
  const ecoByDay: Record<number, EcoEvent[]> = {};
  if (showEco) {
    ecoEvents.forEach(e => {
      const d = new Date(e.date).getDate();
      (ecoByDay[d] ??= []).push(e);
    });
  }

  const selectedRes = selectedDay ? (resByDay[selectedDay] ?? []) : [];
  const selectedEco = selectedDay ? (ecoByDay[selectedDay] ?? []) : [];

  // Upcoming: merge & sort research + eco (next 10 combined)
  const now = Date.now();
  const upcomingRes = events
    .filter(e => new Date(e.date).getTime() >= now)
    .slice(0, showEco ? 5 : 8);
  const upcomingEco = showEco
    ? ecoEvents.filter(e => new Date(e.date).getTime() >= now).slice(0, 5)
    : [];
  const upcoming = [
    ...upcomingRes.map(e => ({ key: e.id, date: e.date, type: 'research' as const, res: e })),
    ...upcomingEco.map(e => ({ key: e.id, date: e.date, type: 'eco' as const, eco: e })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);

  return (
    <div className="dash-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20, gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Research Calendar</h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Earnings, macro events, company catalysts
            {ecoSource === 'fmp' && (
              <span style={{ marginLeft: 8, color: 'var(--purple)', fontWeight: 600 }}>
                · Economic data via FMP
              </span>
            )}
            {ecoSource === 'cache' && (
              <span style={{ marginLeft: 8, color: 'var(--text4)' }}>· Eco events cached</span>
            )}
            {ecoLoading && (
              <span style={{ marginLeft: 8, color: 'var(--text4)', fontStyle: 'italic' }}>· Fetching eco events…</span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Eco calendar toggle */}
          <button
            onClick={() => setShowEco(s => !s)}
            style={{
              padding: '5px 12px', borderRadius: 5, fontSize: 10, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--mono)', letterSpacing: '.04em', transition: 'all .15s',
              border: '1px solid var(--border)',
              background: showEco ? 'var(--purple-dim)' : 'var(--panel)',
              color: showEco ? 'var(--purple)' : 'var(--text4)',
            }}
          >
            {showEco ? '★ ECO ON' : '★ ECO OFF'}
          </button>
          {canAddEvents && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'CANCEL' : '+ ADD EVENT'}
            </button>
          )}
        </div>
      </div>

      {/* Add event form */}
      {showForm && (
        <div className="panel" style={{ padding: 14 }}>
          <div className="sec-title" style={{ marginBottom: 10 }}>New Calendar Event</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols(4, 2, 1)}, 1fr)`, gap: 8 }}>
            <div style={{ gridColumn: '1 / 3' }}>
              <div className="form-label">Title *</div>
              <input className="inp" placeholder="NVDA Q3 Earnings" value={newEvent.title}
                onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <div className="form-label">Type</div>
              <select className="inp" value={newEvent.eventType}
                onChange={e => setNewEvent(p => ({ ...p, eventType: e.target.value }))}>
                {Object.entries(RESEARCH_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
            <button className="btn btn-primary btn-sm" onClick={addEvent}
              disabled={submitting || !newEvent.title || !newEvent.date}>
              {submitting ? 'SAVING…' : 'ADD EVENT'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 16, flex: 1, minHeight: 0 }}>

        {/* Calendar grid */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 16 }}>‹</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{monthName} {viewYear}</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--text4)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />Research
                </span>
                {showEco && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--text4)' }}>
                    <span style={{ fontSize: 8, color: 'var(--purple)' }}>★</span>Eco (FMP)
                  </span>
                )}
              </div>
            </div>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 16 }}>›</button>
          </div>

          {/* Eco unavailable notice */}
          {showEco && !ecoLoading && ecoSource === 'error' && (
            <div style={{ padding: '8px 16px', background: 'rgba(168,85,247,.06)', borderBottom: '1px solid rgba(168,85,247,.15)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 9, color: 'var(--purple)' }}>★</span>
              <span style={{ fontSize: 10, color: 'var(--text3)', flex: 1 }}>
                Economic data unavailable — set FMP_API_KEY in environment variables.
              </span>
            </div>
          )}

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 12px 0', flexShrink: 0 }}>
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'var(--text4)', letterSpacing: '.06em', paddingBottom: 6 }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="scroll-y" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, padding: '0 12px 12px', alignContent: 'start' }}>
            {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              const dayRes = resByDay[day] ?? [];
              const dayEco = ecoByDay[day] ?? [];
              const isSelected = selectedDay === day;
              const totalCount = dayRes.length + dayEco.length;

              return (
                <div key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                  style={{
                    minHeight: 72, padding: '4px 5px', border: '1px solid var(--border)', margin: 1,
                    borderRadius: 6, cursor: 'pointer',
                    background: isSelected ? 'var(--accent-dim)' : isToday ? 'var(--purple-dim)' : 'transparent',
                    borderColor: isSelected ? 'var(--accent)' : isToday ? 'var(--purple)' : 'var(--border)',
                    transition: 'all .12s',
                  }}>
                  <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--purple)' : 'var(--text2)', marginBottom: 3 }}>{day}</div>

                  {/* Research events */}
                  {dayRes.slice(0, 2).map(e => (
                    <div key={e.id} style={{
                      fontSize: 8, padding: '1px 4px', borderRadius: 3, marginBottom: 2,
                      background: `${RESEARCH_COLORS[e.eventType] ?? 'var(--text4)'}22`,
                      color: RESEARCH_COLORS[e.eventType] ?? 'var(--text4)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {e.ticker ? `${e.ticker} · ` : ''}{e.title}
                    </div>
                  ))}

                  {/* Economic events */}
                  {showEco && dayEco.slice(0, dayRes.length >= 2 ? 1 : 2).map(e => (
                    <div key={e.id} style={{
                      fontSize: 8, padding: '1px 4px', borderRadius: 3, marginBottom: 2,
                      background: e.importance === 3 ? 'rgba(168,85,247,.12)' : 'rgba(168,85,247,.06)',
                      color: e.importance === 3 ? 'var(--purple)' : 'var(--text3)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      borderLeft: `2px solid ${IMP_COLOR[e.importance]}`,
                    }}>
                      {IMP_STARS[e.importance]} {e.title}
                    </div>
                  ))}

                  {totalCount > (dayRes.length >= 2 ? 3 : 4) && (
                    <div style={{ fontSize: 8, color: 'var(--text4)' }}>+{totalCount - (dayRes.length >= 2 ? 3 : 4)} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="scroll-y" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Selected day */}
          {selectedDay !== null && (
            <div className="panel" style={{ padding: 14 }}>
              <div className="sec-title" style={{ marginBottom: 10 }}>
                {monthName} {selectedDay} · {selectedRes.length + selectedEco.length} event{selectedRes.length + selectedEco.length !== 1 ? 's' : ''}
              </div>

              {selectedRes.length === 0 && selectedEco.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text4)', textAlign: 'center', padding: 12 }}>No events this day</div>
              ) : (
                <>
                  {/* Research events */}
                  {selectedRes.map(e => (
                    <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: RESEARCH_COLORS[e.eventType] ?? 'var(--text4)', display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{e.title}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className="badge badge-dim">{RESEARCH_LABELS[e.eventType] ?? e.eventType}</span>
                            {e.ticker && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)' }}>{e.ticker}</span>}
                            <span className={`badge badge-${e.importance === 'HIGH' ? 'high' : e.importance === 'MEDIUM' ? 'medium' : 'low'}`}>{e.importance}</span>
                          </div>
                          {e.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{e.description}</div>}
                        </div>
                        {canAddEvents && (
                          <button onClick={() => deleteEvent(e.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 12, flexShrink: 0 }}>✕</button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Eco events */}
                  {showEco && selectedEco.length > 0 && (
                    <>
                      {selectedRes.length > 0 && (
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--purple)', letterSpacing: '.08em', padding: '8px 0 4px', textTransform: 'uppercase' }}>
                          Economic Events · FMP
                        </div>
                      )}
                      {selectedEco.map(e => (
                        <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ flexShrink: 0, paddingTop: 2 }}>
                              <span style={{ fontSize: 10, color: IMP_COLOR[e.importance] }}>{IMP_STARS[e.importance]}</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{e.title}</span>
                                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--purple)', background: 'rgba(168,85,247,.1)', padding: '1px 5px', borderRadius: 3 }}>{e.currency}</span>
                                <span style={{ fontSize: 9, color: 'var(--text4)', marginLeft: 'auto' }}>
                                  {new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
                                </span>
                              </div>
                              {(e.actual !== null || e.forecast !== null || e.previous !== null) && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                  {e.actual !== null && (
                                    <div style={{ padding: '3px 7px', background: 'var(--bg)', borderRadius: 3, border: '1px solid var(--border)' }}>
                                      <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 1 }}>ACTUAL</div>
                                      <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{e.actual}</div>
                                    </div>
                                  )}
                                  {e.forecast !== null && (
                                    <div style={{ padding: '3px 7px', background: 'var(--bg)', borderRadius: 3, border: '1px solid var(--border)' }}>
                                      <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 1 }}>FORECAST</div>
                                      <div className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>{e.forecast}</div>
                                    </div>
                                  )}
                                  {e.previous !== null && (
                                    <div style={{ padding: '3px 7px', background: 'var(--bg)', borderRadius: 3, border: '1px solid var(--border)' }}>
                                      <div style={{ fontSize: 7, color: 'var(--text4)', marginBottom: 1 }}>PREVIOUS</div>
                                      <div className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>{e.previous}</div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Upcoming events */}
          <div className="panel" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="sec-title">Upcoming Events</span>
              {showEco && ecoEvents.length > 0 && (
                <span style={{ fontSize: 9, color: 'var(--purple)', fontFamily: 'var(--mono)' }}>
                  {ecoEvents.filter(e => new Date(e.date).getTime() >= now).length} eco
                </span>
              )}
            </div>

            {loading && <div style={{ fontSize: 11, color: 'var(--text4)', fontFamily: 'var(--mono)' }}>LOADING…</div>}

            {!loading && upcoming.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--text4)', textAlign: 'center', padding: 12 }}>No upcoming events</div>
            )}

            {upcoming.map(item => {
              const dt = new Date(item.date);
              return (
                <div key={item.key} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{dt.getDate()}</div>
                    <div style={{ fontSize: 8, color: 'var(--text4)', letterSpacing: '.05em' }}>
                      {dt.toLocaleString('default', { month: 'short' }).toUpperCase()}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {item.type === 'research' ? (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.res!.title}
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 2, alignItems: 'center' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: RESEARCH_COLORS[item.res!.eventType], display: 'inline-block' }} />
                          <span style={{ fontSize: 10, color: 'var(--text4)' }}>{RESEARCH_LABELS[item.res!.eventType]}</span>
                          {item.res!.ticker && <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{item.res!.ticker}</span>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.eco!.title}
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 2, alignItems: 'center' }}>
                          <span style={{ fontSize: 9, color: IMP_COLOR[item.eco!.importance] }}>{IMP_STARS[item.eco!.importance]}</span>
                          <span style={{ fontSize: 10, color: 'var(--purple)' }}>Economic</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text4)' }}>{item.eco!.currency}</span>
                          {item.eco!.forecast !== null && (
                            <span style={{ fontSize: 9, color: 'var(--text4)', marginLeft: 2 }}>est. {item.eco!.forecast}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="panel" style={{ padding: 12 }}>
            <div className="sec-title" style={{ marginBottom: 8 }}>Legend</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Object.entries(RESEARCH_LABELS).map(([k, l]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: RESEARCH_COLORS[k], display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{l}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                {([1, 2, 3] as const).map(imp => (
                  <div key={imp} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <span style={{ fontSize: 9, color: IMP_COLOR[imp], width: 22 }}>{IMP_STARS[imp]}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                      {imp === 1 ? 'Low' : imp === 2 ? 'Medium' : 'High'} Impact (FMP)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
