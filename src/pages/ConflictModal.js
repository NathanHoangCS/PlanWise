import React, { useState } from 'react';
import './CalendarPage.css';
import AIPanel from './AIPanel';
import PatternNudge from './PatternNudge';
import ConflictModal from './ConflictModal';

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

/* ── WeekView ── */
function WeekView({ weekDates, events, today, onSlotClick, onEventClick }) {
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
      <div className="week-body">
        <div className="week-time-col">
          {HOURS.map(h => (
            <div key={h} className="week-time-slot">{formatTime(h)}</div>
          ))}
        </div>
        {weekDates.map(d => {
          const dayEvents = events.filter(e => isSameDay(e.date, d));
          return (
            <div key={d.toISOString()} className="week-day-col">
              {HOURS.map(h => (
                <div
                  key={h}
                  className="week-hour-cell"
                  onClick={() => {
                    const slot = new Date(d);
                    slot.setHours(h, 0, 0, 0);
                    onSlotClick(slot);
                  }}
                />
              ))}
              {dayEvents.map(ev => {
                const top = ((ev.hour - 7) + ev.min / 60) * 56;
                const duration = ((ev.endHour + ev.endMin / 60) - (ev.hour + ev.min / 60));
                const height = Math.max(duration * 56, 28);
                return (
                  <div
                    key={ev.id}
                    className={`week-event ${ev.color}`}
                    style={{ top: `${top}px`, height: `${height}px` }}
                    onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                  >
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
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [conflict, setConflict] = useState(null); // { reasoning, newEvent, conflicts }

  function handleKeepBoth() {
    if (!conflict) return;
    const ev = conflict.newEvent;
    setEvents(prev => [...prev, {
      ...ev,
      endHour: ev.end_hour ?? ev.endHour,
      endMin:  ev.end_min  ?? ev.endMin,
    }]);
    setConflict(null);
  }

  function handleReplaceExisting() {
    if (!conflict) return;
    const idsToRemove = new Set(conflict.conflicts.map(c => c.id));
    const ev = conflict.newEvent;
    setEvents(prev => [
      ...prev.filter(e => !idsToRemove.has(e.id)),
      { ...ev, endHour: ev.end_hour ?? ev.endHour, endMin: ev.end_min ?? ev.endMin },
    ]);
    setConflict(null);
  }

  function handleCancelNew() {
    setConflict(null);
  }

  function handleNudgeAccept(nudge) {
    // Add the nudged event to today at the suggested hour
    const hourNum = parseInt(nudge.hour) || 9;
    const isPm = nudge.hour?.includes('pm') && hourNum !== 12;
    const h = isPm ? hourNum + 12 : hourNum;
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    setEvents(prev => [...prev, {
      id: randomId(),
      title: nudge.title,
      date: d,
      hour: h, min: 0,
      endHour: h + 1, endMin: 0,
      color: nudge.type === 'focus' ? 'focus' : 'accent',
      type: nudge.type,
    }]);
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
      const res = await fetch('http://localhost:5000/api/ai/conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_event: {
            ...ev,
            date: ev.date.toISOString(),
            end_hour: ev.endHour,
            end_min: ev.endMin,
          },
          user_id: profile?.userId || null,
          profile: profile || {},
        }),
      });
      const data = await res.json();
      if (data.has_conflict) {
        setConflict({
          reasoning: data.reasoning,
          newEvent: { ...ev, end_hour: ev.endHour, end_min: ev.endMin },
          conflicts: data.conflicts,
        });
        return; // Don't add yet — wait for user decision
      }
    } catch {
      // If conflict check fails, just add the event
    }
    setEvents(prev => [...prev, ev]);
  }
  function handleEventClick(ev) {
    setSelectedEvent(ev);
  }
  function handleDeleteEvent(id) {
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
          onEventParsed={(parsed) => {
            const d = new Date(parsed.date);
            setEvents(prev => [...prev, {
              id: randomId(),
              title: parsed.title,
              date: d,
              hour: parsed.hour,
              min: parsed.min,
              endHour: parsed.end_hour,
              endMin: parsed.end_min,
              color: parsed.type === 'focus' ? 'focus' : 'accent',
              type: parsed.type,
            }]);
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
        </div>

        {/* Calendar body */}
        <div className="cal-body">
          {view === 'month' ? (
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