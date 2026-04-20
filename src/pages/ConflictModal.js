import React from 'react';
import './ConflictModal.css';

function formatTime(h, m = 0) {
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, '0')}${ampm}` : `${hh}${ampm}`;
}

export default function ConflictModal({
  reasoning,
  newEvent,
  conflicts,
  onKeepBoth,
  onReplaceExisting,
  onCancelNew,
}) {
  return (
    <div className="conflict-overlay" onClick={onCancelNew}>
      <div className="conflict-modal" onClick={e => e.stopPropagation()}>

        {/* Icon */}
        <div className="conflict-icon">⚡</div>

        {/* AI reasoning */}
        <h3 className="conflict-heading">Scheduling Conflict</h3>
        <p className="conflict-reasoning">"{reasoning}"</p>

        {/* Side by side comparison */}
        <div className="conflict-comparison">
          <div className="conflict-event new">
            <div className="conflict-event-label">New</div>
            <div className={`conflict-event-chip ${newEvent.type === 'focus' ? 'focus' : 'accent'}`}>
              <span className="conflict-event-icon">
                {newEvent.type === 'focus' ? '🧠' : newEvent.type === 'meeting' ? '🤝' : '🎯'}
              </span>
              <div>
                <div className="conflict-event-title">{newEvent.title}</div>
                <div className="conflict-event-time">
                  {formatTime(newEvent.hour, newEvent.min)}–{formatTime(newEvent.end_hour, newEvent.end_min)}
                </div>
              </div>
            </div>
          </div>

          <div className="conflict-vs">vs</div>

          <div className="conflict-event existing">
            <div className="conflict-event-label">Existing</div>
            {conflicts.map(c => (
              <div key={c.id} className={`conflict-event-chip ${c.type === 'focus' ? 'focus' : 'accent'}`}>
                <span className="conflict-event-icon">
                  {c.type === 'focus' ? '🧠' : c.type === 'meeting' ? '🤝' : '🎯'}
                </span>
                <div>
                  <div className="conflict-event-title">{c.title}</div>
                  <div className="conflict-event-time">
                    {formatTime(c.hour, c.min)}–{formatTime(c.end_hour, c.end_min)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="conflict-actions">
          <button className="conflict-btn primary" onClick={onKeepBoth}>
            Keep both
          </button>
          <button className="conflict-btn danger" onClick={onReplaceExisting}>
            Replace existing
          </button>
          <button className="conflict-btn ghost" onClick={onCancelNew}>
            Cancel new event
          </button>
        </div>

      </div>
    </div>
  );
}