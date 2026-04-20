import React, { useState, useEffect, useCallback } from 'react';
import './CalendarPage.css';
import AIPanel from './AIPanel';
import PatternNudge from './PatternNudge';
import ConflictModal from './ConflictModal';
import ICSSync from './ICSSync';

const API = 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('planwise_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* helper: convert DB event (snake_case) → frontend event (camelCase + Date) */
function dbToFrontend(ev) {
  return {
    id:       ev.id,
    title:    ev.title,
    type:     ev.type,
    color:    ev.color,
    date:     new Date(ev.date),
    hour:     ev.hour,
    min:      ev.min,
    endHour:  ev.end_hour,
    endMin:   ev.end_min,
    priority: ev.priority,
    user_id:  ev.user_id,
  };
}

/* ── Helpers ── */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am – 8pm

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
function getWeekDates(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    return dd;
  });
}
function formatTime(h, m = 0) {
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2,'0')}${ampm}` : `${hh}${ampm}`;
}
function randomId() {
  return Math.random().toString(36).slice(2, 9);
}

/* ── No seed events — users start with a blank slate ── */

/* ── EventModal ── */
function EventModal({ date, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('meeting');
  const [hour, setHour] = useState(date ? date.getHours() || 9 : 9);
  const [min, setMin] = useState(0);
  const [endHour, setEndHour] = useState(date ? (date.getHours() || 9) + 1 : 10);
  const [endMin, setEndMin] = useState(0);

  function handleSave() {
    if (!title.trim()) return;
    const eventDate = date ? new Date(date) : new Date();
    eventDate.setHours(hour, min, 0, 0);
    onSave({
      id: randomId(),
      title: title.trim(),
      date: eventDate,
      hour, min, endHour, endMin,
      color: type === 'focus' ? 'focus' : 'accent',
      type,
    });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Event</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <input
            className="modal-input"
            placeholder="Event title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
          <div className="modal-type-row">
            {['meeting','focus','personal'].map(t => (
              <button
                key={t}
                className={`type-btn ${type === t ? 'active' : ''}`}
                onClick={() => setType(t)}
              >
                {t === 'meeting' ? '🤝' : t === 'focus' ? '🧠' : '🎯'} {t}
              </button>
            ))}
          </div>
          <div className="modal-time-row">
            <div className="time-group">
              <label>Start</label>
              <div className="time-selects">
                <select value={hour} onChange={e => setHour(+e.target.value)}>
                  {HOURS.map(h => <option key={h} value={h}>{formatTime(h)}</option>)}
                </select>
                <select value={min} onChange={e => setMin(+e.target.value)}>
                  {[0,15,30,45].map(m => <option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
                </select>
              </div>
            </div>
            <span className="time-arrow">→</span>
            <div className="time-group">
              <label>End</label>
              <div className="time-selects">
                <select value={endHour} onChange={e => setEndHour(+e.target.value)}>
                  {HOURS.map(h => <option key={h} value={h}>{formatTime(h)}</option>)}
                </select>
                <select value={endMin} onChange={e => setEndMin(+e.target.value)}>
                  {[0,15,30,45].map(m => <option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
                </select>
              </div>
            </div>
          </div>
          {type === 'focus' && (
            <div className="focus-badge-note">
              🛡️ This block will be protected from auto-scheduling
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={!title.trim()}>Add Event</button>
        </div>
      </div>
    </div>
  );
}

/* ── MonthView ── */
function MonthView({ year, month, events, today, onDayClick, onEventClick }) {
  const totalDays = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);
  const cells = Array.from({ length: firstDay + totalDays }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  return (
    <div className="month-view">
      <div className="month-day-headers">
        {DAYS.map(d => <div key={d} className="month-day-label">{d}</div>)}
      </div>
      <div className="month-grid">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="month-cell empty" />;
          const cellDate = new Date(year, month, day);
          const isToday = isSameDay(cellDate, today);
          const dayEvents = events.filter(e => isSameDay(e.date, cellDate));
          return (
            <div
              key={day}
              className={`month-cell ${isToday ? 'today' : ''}`}
              onClick={() => onDayClick(cellDate)}
            >
              <span className="month-day-num">{day}</span>
              <div className="month-cell-events">
                {dayEvents.slice(0, 3).map(ev => (
                  <div
                    key={ev.id}
                    className={`month-event-chip ${ev.color}`}
                    onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="month-event-more">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── WeekView with drag and drop ── */
function WeekView({ weekDates, events, today, onSlotClick, onEventClick, onEventDrop }) {
  const [dragging, setDragging]       = useState(null); // { ev, offsetY }
  const [dropTarget, setDropTarget]   = useState(null); // { date, hour }
  const [ghost, setGhost]             = useState(null); // { top, dayIndex }
  const bodyRef                       = React.useRef(null);

  const SLOT_H  = 56;   // px per hour
  const GUTTER  = 56;   // px for time gutter
  const START_H = 7;    // first hour shown

  function handleDragStart(e, ev) {
    e.stopPropagation();
    const rect   = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    setDragging({ ev, offsetY });
    // Hide default drag ghost
    const blank = document.createElement('div');
    blank.style.opacity = '0';
    document.body.appendChild(blank);
    e.dataTransfer.setDragImage(blank, 0, 0);
    setTimeout(() => document.body.removeChild(blank), 0);
  }

  function handleBodyDragOver(e) {
    e.preventDefault();
    if (!dragging || !bodyRef.current) return;
    const bodyRect = bodyRef.current.getBoundingClientRect();
    const colWidth = (bodyRect.width - GUTTER) / weekDates.length;
    const x        = e.clientX - bodyRect.left - GUTTER;
    const y        = e.clientY - bodyRect.top + bodyRef.current.scrollTop;

    const dayIndex = Math.max(0, Math.min(weekDates.length - 1, Math.floor(x / colWidth)));
    const rawHour  = y / SLOT_H + START_H - dragging.offsetY / SLOT_H;
    const hour     = Math.max(START_H, Math.min(20, Math.round(rawHour * 2) / 2));
    const snapHour = Math.floor(hour);
    const snapMin  = hour % 1 === 0.5 ? 30 : 0;

    setDropTarget({ date: weekDates[dayIndex], hour: snapHour, min: snapMin, dayIndex });
    setGhost({
      top:      (hour - START_H) * SLOT_H,
      dayIndex,
      height:   Math.max(((dragging.ev.endHour + dragging.ev.endMin / 60) -
                          (dragging.ev.hour    + dragging.ev.min    / 60)) * SLOT_H, 28),
    });
  }

  function handleBodyDrop(e) {
    e.preventDefault();
    if (!dragging || !dropTarget) { resetDrag(); return; }
    const ev      = dragging.ev;
    const duration = (ev.endHour + ev.endMin / 60) - (ev.hour + ev.min / 60);
    const newStart = dropTarget.hour + dropTarget.min / 60;
    const newEnd   = newStart + duration;
    const newDate  = new Date(dropTarget.date);
    newDate.setHours(dropTarget.hour, dropTarget.min, 0, 0);

    onEventDrop({
      ...ev,
      date:     newDate,
      hour:     dropTarget.hour,
      min:      dropTarget.min,
      endHour:  Math.floor(newEnd),
      endMin:   Math.round((newEnd % 1) * 60),
    });
    resetDrag();
  }

  function resetDrag() {
    setDragging(null);
    setDropTarget(null);
    setGhost(null);
  }

  return (
    <div className="week-view">
      <div className="week-header">
        <div className="week-gutter" />
        {weekDates.map(d => (
          <div key={d.toISOString()} className={`week-day-col-header ${isSameDay(d, today) ? 'today' : ''}`}>
            <span className="week-day-label">{DAYS[d.getDay()]}</span>
            <span className={`week-day-num ${isSameDay(d, today) ? 'today' : ''}`}>{d.getDate()}</span>
          </div>
        ))}
      </div>
      <div
        className="week-body"
        ref={bodyRef}
        onDragOver={handleBodyDragOver}
        onDrop={handleBodyDrop}
        onDragLeave={e => { if (!bodyRef.current?.contains(e.relatedTarget)) resetDrag(); }}
      >
        <div className="week-time-col">
          {HOURS.map(h => (
            <div key={h} className="week-time-slot">{formatTime(h)}</div>
          ))}
        </div>
        {weekDates.map((d, dayIndex) => {
          const dayEvents = events.filter(e => isSameDay(e.date, d));
          const isDropDay = dropTarget?.dayIndex === dayIndex;
          return (
            <div
              key={d.toISOString()}
              className={`week-day-col ${isDropDay ? 'drop-active' : ''}`}
            >
              {HOURS.map(h => (
                <div
                  key={h}
                  className={`week-hour-cell ${isDropDay && dropTarget?.hour === h ? 'drop-highlight' : ''}`}
                  onClick={() => {
                    if (dragging) return;
                    const slot = new Date(d);
                    slot.setHours(h, 0, 0, 0);
                    onSlotClick(slot);
                  }}
                />
              ))}
              {/* Drop ghost */}
              {ghost && isDropDay && dragging && (
                <div
                  className={`week-event ${dragging.ev.color} drag-ghost`}
                  style={{ top: `${ghost.top}px`, height: `${ghost.height}px` }}
                >
                  <span className="week-event-title">{dragging.ev.title}</span>
                </div>
              )}
              {dayEvents.map(ev => {
                const top      = ((ev.hour - 7) + ev.min / 60) * 56;
                const duration = ((ev.endHour + ev.endMin / 60) - (ev.hour + ev.min / 60));
                const height   = Math.max(duration * 56, 28);
                const isDragging = dragging?.ev.id === ev.id;
                return (
                  <div
                    key={ev.id}
                    className={`week-event ${ev.color} ${isDragging ? 'is-dragging' : ''}`}
                    style={{ top: `${top}px`, height: `${height}px` }}
                    draggable
                    onDragStart={e => handleDragStart(e, ev)}
                    onDragEnd={resetDrag}
                    onClick={e => { if (!dragging) { e.stopPropagation(); onEventClick(ev); } }}
                  >
                    <span className="week-event-drag-handle">⠿</span>
                    <span className="week-event-title">{ev.title}</span>
                    <span className="week-event-time">{formatTime(ev.hour, ev.min)}–{formatTime(ev.endHour, ev.endMin)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function CalendarPage({ profile }) {
  const [today] = useState(new Date());
  const [current, setCurrent] = useState(new Date());
  const [view, setView] = useState('month');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [conflict, setConflict] = useState(null);

  // ── Load events from DB on mount ─────────────────────────────────────────
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/events`, { headers: authHeaders() });
      const data = await res.json();
      // Filter to current user's events only
      const userId = profile?.userId;
      const filtered = userId
        ? data.filter(e => e.user_id === userId)
        : data;
      setEvents(filtered.map(dbToFrontend));
    } catch {
      // If backend is down, start with empty calendar
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.userId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function persistEvent(ev) {
    try {
      const res = await fetch(`${API}/api/events`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title:    ev.title,
          type:     ev.type,
          date:     ev.date instanceof Date ? ev.date.toISOString() : ev.date,
          hour:     ev.hour,
          min:      ev.min,
          end_hour: ev.endHour ?? ev.end_hour,
          end_min:  ev.endMin  ?? ev.end_min,
          priority: ev.priority || 3,
          user_id:  profile?.userId || null,
        }),
      });
      const saved = await res.json();
      return dbToFrontend(saved);
    } catch {
      return ev; // fallback: use local event if API fails
    }
  }

  async function handleKeepBoth() {
    if (!conflict) return;
    const saved = await persistEvent(conflict.newEvent);
    setEvents(prev => [...prev, saved]);
    setConflict(null);
  }

  async function handleReplaceExisting() {
    if (!conflict) return;
    const idsToRemove = new Set(conflict.conflicts.map(c => c.id));
    // Delete conflicting events from DB
    for (const id of idsToRemove) {
      try {
        await fetch(`${API}/api/events/${id}`, {
          method: 'DELETE',
          headers: authHeaders(),
        });
      } catch {}
    }
    const saved = await persistEvent(conflict.newEvent);
    setEvents(prev => [
      ...prev.filter(e => !idsToRemove.has(e.id)),
      saved,
    ]);
    setConflict(null);
  }

  function handleCancelNew() {
    setConflict(null);
  }

  async function handleNudgeAccept(nudge) {
    const hourNum = parseInt(nudge.hour) || 9;
    const isPm = nudge.hour?.includes('pm') && hourNum !== 12;
    const h = isPm ? hourNum + 12 : hourNum;
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    const ev = {
      id: randomId(), title: nudge.title,
      date: d, hour: h, min: 0,
      endHour: h + 1, endMin: 0,
      color: nudge.type === 'focus' ? 'focus' : 'accent',
      type: nudge.type,
    };
    const saved = await persistEvent(ev);
    setEvents(prev => [...prev, saved]);
  }

  const year = current.getFullYear();
  const month = current.getMonth();
  const weekDates = getWeekDates(current);

  function prevPeriod() {
    const d = new Date(current);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrent(d);
  }
  function nextPeriod() {
    const d = new Date(current);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrent(d);
  }
  function goToday() { setCurrent(new Date()); }

  function handleDayClick(date) {
    setSelectedDate(date);
    setShowModal(true);
  }
  function handleSlotClick(date) {
    setSelectedDate(date);
    setShowModal(true);
  }
  async function handleSaveEvent(ev) {
    // Check for conflicts via AI before adding
    try {
      const res = await fetch(`${API}/api/ai/conflicts`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          new_event: {
            ...ev,
            date:     ev.date.toISOString(),
            end_hour: ev.endHour,
            end_min:  ev.endMin,
          },
          user_id: profile?.userId || null,
          profile: profile || {},
        }),
      });
      const data = await res.json();
      if (data.has_conflict) {
        setConflict({
          reasoning: data.reasoning,
          newEvent:  { ...ev, end_hour: ev.endHour, end_min: ev.endMin },
          conflicts: data.conflicts,
        });
        return;
      }
    } catch {}
    // No conflict — persist to DB then update UI
    const saved = await persistEvent(ev);
    setEvents(prev => [...prev, saved]);
  }
  function handleEventClick(ev) {
    setSelectedEvent(ev);
  }
  async function handleEventDrop(updatedEv) {
    // Optimistically update UI
    setEvents(prev => prev.map(e => e.id === updatedEv.id ? updatedEv : e));
    // Persist to DB
    try {
      await fetch(`${API}/api/events/${updatedEv.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          date:     updatedEv.date.toISOString(),
          hour:     updatedEv.hour,
          min:      updatedEv.min,
          end_hour: updatedEv.endHour,
          end_min:  updatedEv.endMin,
        }),
      });
    } catch {
      loadEvents();
    }
  }

  async function handleDeleteEvent(id) {
    try {
      await fetch(`${API}/api/events/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
    } catch {}
    setEvents(prev => prev.filter(e => e.id !== id));
    setSelectedEvent(null);
  }

  const headerLabel = view === 'month'
    ? `${MONTHS[month]} ${year}`
    : `${MONTHS[weekDates[0].getMonth()]} ${weekDates[0].getDate()} – ${MONTHS[weekDates[6].getMonth()]} ${weekDates[6].getDate()}, ${year}`;

  const focusCount = events.filter(e => e.type === 'focus').length;
  const meetingCount = events.filter(e => e.type === 'meeting').length;

  return (
    <div className="calendar-page">
      {/* Sidebar */}
      <aside className="cal-sidebar">
        <button className="btn-new-event" onClick={() => { setSelectedDate(new Date()); setShowModal(true); }}>
          <span>+</span> New Event
        </button>

        {/* Mini stats */}
        <div className="sidebar-section">
          <div className="sidebar-label">This Month</div>
          {events.length === 0 ? (
            <div className="empty-state-hint">
              <span>📅</span>
              <p>Your calendar is empty.<br/>Click a day or <strong>+ New Event</strong> to get started!</p>
            </div>
          ) : (
          <div className="stat-row">
            <div className="stat-chip accent">
              <span className="stat-num">{meetingCount}</span>
              <span className="stat-text">Meetings</span>
            </div>
            <div className="stat-chip focus">
              <span className="stat-num">{focusCount}</span>
              <span className="stat-text">Focus Blocks</span>
            </div>
          </div>
          )}
        </div>

        {/* AI Panel */}
        <AIPanel
          profile={profile}
          onEventParsed={async (parsed) => {
            const ev = {
              id: randomId(),
              title:    parsed.title,
              date:     new Date(parsed.date),
              hour:     parsed.hour,
              min:      parsed.min,
              endHour:  parsed.end_hour,
              endMin:   parsed.end_min,
              color:    parsed.type === 'focus' ? 'focus' : 'accent',
              type:     parsed.type,
            };
            const saved = await persistEvent(ev);
            setEvents(prev => [...prev, saved]);
          }}
        />
      </aside>

      {/* Main Calendar */}
      <div className="cal-main">
        {/* Toolbar */}
        <div className="cal-toolbar">
          <div className="toolbar-left">
            <button className="btn-today" onClick={goToday}>Today</button>
            <div className="nav-arrows">
              <button onClick={prevPeriod}>‹</button>
              <button onClick={nextPeriod}>›</button>
            </div>
            <h2 className="cal-title">{headerLabel}</h2>
          </div>
          <div className="view-switcher">
            <button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>Month</button>
            <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>Week</button>
          </div>
          <ICSSync
            profile={profile}
            onImport={imported => {
              const frontendEvents = imported.map(ev => ({
                id:      ev.id,
                title:   ev.title,
                type:    ev.type,
                color:   ev.color,
                date:    new Date(ev.date),
                hour:    ev.hour,
                min:     ev.min,
                endHour: ev.end_hour,
                endMin:  ev.end_min,
              }));
              setEvents(prev => [...prev, ...frontendEvents]);
            }}
          />
        </div>

        {/* Calendar body */}
        <div className="cal-body">
          {loading ? (
            <div className="cal-loading">
              <div className="cal-loading-dots">
                <span /><span /><span />
              </div>
              <span>Loading your calendar…</span>
            </div>
          ) : view === 'month' ? (
            <MonthView
              year={year} month={month}
              events={events} today={today}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
            />
          ) : (
            <WeekView
              weekDates={weekDates}
              events={events} today={today}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
              onEventDrop={handleEventDrop}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <EventModal
          date={selectedDate}
          onClose={() => setShowModal(false)}
          onSave={handleSaveEvent}
        />
      )}

      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal event-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedEvent.title}</h3>
              <button className="modal-close" onClick={() => setSelectedEvent(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="event-detail-row">
                <span>🕐</span>
                <span>{formatTime(selectedEvent.hour, selectedEvent.min)} – {formatTime(selectedEvent.endHour, selectedEvent.endMin)}</span>
              </div>
              <div className="event-detail-row">
                <span>📅</span>
                <span>{selectedEvent.date.toDateString()}</span>
              </div>
              <div className="event-detail-row">
                <span>{selectedEvent.type === 'focus' ? '🧠' : '🤝'}</span>
                <span className={`type-tag ${selectedEvent.color}`}>{selectedEvent.type}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-danger" onClick={() => handleDeleteEvent(selectedEvent.id)}>Delete</button>
              <button className="btn-ghost" onClick={() => setSelectedEvent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict modal */}
      {conflict && (
        <ConflictModal
          reasoning={conflict.reasoning}
          newEvent={conflict.newEvent}
          conflicts={conflict.conflicts}
          onKeepBoth={handleKeepBoth}
          onReplaceExisting={handleReplaceExisting}
          onCancelNew={handleCancelNew}
        />
      )}

      {/* Pattern nudge toast */}
      <PatternNudge
        profile={profile}
        onAccept={handleNudgeAccept}
      />
    </div>
  );
}