import React, { useState, useEffect, useCallback } from 'react';
import './PatternNudge.css';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function PatternNudge({ profile, onAccept }) {
  const [nudges, setNudges]       = useState([]);
  const [visible, setVisible]     = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkNudges = useCallback(async () => {
    if (!profile || dismissed) return;

    const today = DAYS[new Date().getDay()];

    try {
      const res = await fetch('http://localhost:5000/api/ai/nudges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:     profile.userId || null,
          current_day: today,
        }),
      });
      const data = await res.json();
      if (data.nudges && data.nudges.length > 0) {
        setNudges(data.nudges);
        // Small delay so it doesn't pop immediately on page load
        setTimeout(() => setVisible(true), 1800);
      }
    } catch {
      // Silently fail — nudges are optional
    }
  }, [profile, dismissed]);

  useEffect(() => {
    checkNudges();
  }, [checkNudges]);

  function handleAccept(nudge) {
    onAccept && onAccept(nudge);
    handleDismiss();
  }

  function handleDismiss() {
    setVisible(false);
    setDismissed(true);
  }

  if (!visible || nudges.length === 0) return null;

  const nudge = nudges[0]; // Show one at a time

  return (
    <div className={`pattern-nudge ${visible ? 'nudge-enter' : 'nudge-exit'}`}>
      <div className="nudge-icon">{nudge.icon}</div>
      <div className="nudge-body">
        <div className="nudge-message">{nudge.message}</div>
      </div>
      <div className="nudge-actions">
        <button
          className="nudge-yes"
          onClick={() => handleAccept(nudge)}
        >
          Add it
        </button>
        <button
          className="nudge-no"
          onClick={handleDismiss}
        >
          Not today
        </button>
      </div>
      <button className="nudge-close" onClick={handleDismiss}>✕</button>
    </div>
  );
}