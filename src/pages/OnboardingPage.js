import React, { useState } from 'react';
import './OnboardingPage.css';

const PROFILES = [
  {
    id: 'student',
    icon: '🎓',
    label: 'Student',
    desc: 'Study blocks, deadlines, exam prep',
    color: '#6AF7A2',
  },
  {
    id: 'professional',
    icon: '💼',
    label: 'Professional',
    desc: 'Meetings, deep work, 1:1s',
    color: '#7C6AF7',
  },
  {
    id: 'freelancer',
    icon: '🚀',
    label: 'Freelancer',
    desc: 'Client work, flexible hours, projects',
    color: '#F7A26A',
  },
  {
    id: 'balanced',
    icon: '⚖️',
    label: 'Balanced',
    desc: 'Work, wellness, personal time',
    color: '#6AD4F7',
  },
];

const PRIORITIES = [
  { id: 'deep_work',  icon: '🧠', label: 'Deep Work',  desc: 'Long uninterrupted focus sessions' },
  { id: 'meetings',   icon: '🤝', label: 'Meetings',   desc: 'Collaboration and communication' },
  { id: 'fitness',    icon: '🏋️', label: 'Fitness',    desc: 'Workouts and physical health' },
  { id: 'social',     icon: '🌟', label: 'Social',     desc: 'Friends, family, networking' },
  { id: 'creativity', icon: '🎨', label: 'Creativity', desc: 'Projects, art, side work' },
];

const PEAK_TIMES = [
  { id: 'early_bird', icon: '🌅', label: 'Early Bird',  desc: '5am – 9am', gradient: 'linear-gradient(135deg, #f7a26a, #f7d26a)' },
  { id: 'morning',    icon: '☀️', label: 'Morning',     desc: '9am – 12pm', gradient: 'linear-gradient(135deg, #f7d26a, #6af7a2)' },
  { id: 'afternoon',  icon: '🌤', label: 'Afternoon',   desc: '12pm – 5pm', gradient: 'linear-gradient(135deg, #7c6af7, #6ad4f7)' },
  { id: 'night_owl',  icon: '🌙', label: 'Night Owl',   desc: '8pm – 2am', gradient: 'linear-gradient(135deg, #1a1a2e, #7c6af7)' },
];

const STEPS = [
  { id: 'welcome',   title: null },
  { id: 'profile',   title: "Who are you?" },
  { id: 'priority',  title: "What matters most?" },
  { id: 'peak_time', title: "When do you peak?" },
  { id: 'name',      title: "Last thing — your name" },
  { id: 'done',      title: null },
];

export default function OnboardingPage({ onComplete }) {
  const [step, setStep]         = useState(0);
  const [profile, setProfile]   = useState(null);
  const [priorities, setPriorities] = useState([]);
  const [peakTime, setPeakTime] = useState(null);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');

  function togglePriority(id) {
    setPriorities(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id].slice(0, 3)
    );
  }

  function canAdvance() {
    if (step === 1) return !!profile;
    if (step === 2) return priorities.length > 0;
    if (step === 3) return !!peakTime;
    if (step === 4) return name.trim().length > 0 && email.trim().length > 0 && password.length >= 6;
    return true;
  }

  async function handleFinish() {
    setSaving(true);
    try {
      // Register user via auth endpoint
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:       name.trim(),
          email:      email.trim(),
          password:   password.trim(),
          profile,
          priorities,
          peak_time:  peakTime,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error || 'Registration failed');
        setSaving(false);
        return;
      }

      // Save token + profile to localStorage
      localStorage.setItem('planwise_token', data.token);
      localStorage.setItem('planwise_profile', JSON.stringify({
        userId:    data.user.id,
        name:      data.user.name,
        email:     data.user.email,
        profile,
        priorities,
        peakTime,
        setupAt:   new Date().toISOString(),
        onboarded: true,
      }));
      setStep(5);
    } catch {
      setSaveError('Could not connect to server — check the backend is running');
    } finally {
      setSaving(false);
    }
  }

  function handleComplete() {
    onComplete({ profile, priorities, peakTime, name });
  }

  const selectedProfile = PROFILES.find(p => p.id === profile);

  // ── Step renders ────────────────────────────────────────────────────────────

  if (step === 0) return (
    <div className="ob-screen ob-welcome">
      <div className="ob-welcome-content">
        <div className="ob-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="3" y="3" width="19" height="19" rx="4" fill="#7C6AF7"/>
            <rect x="26" y="3" width="19" height="19" rx="4" fill="#7C6AF7" opacity="0.4"/>
            <rect x="3" y="26" width="19" height="19" rx="4" fill="#7C6AF7" opacity="0.4"/>
            <rect x="26" y="26" width="19" height="19" rx="4" fill="#7C6AF7"/>
          </svg>
          <span>PlanWise</span>
        </div>
        <h1 className="ob-welcome-heading">
          Your calendar,<br /><em>finally intelligent.</em>
        </h1>
        <p className="ob-welcome-sub">
          Start with a blank slate. PlanWise learns from how you plan and
          builds smarter recommendations around your real life — not a template.
        </p>
        <div className="ob-welcome-pills">
          <span>🎓 Students</span>
          <span>💼 Professionals</span>
          <span>🚀 Freelancers</span>
          <span>⚖️ Everyone</span>
        </div>
        <button className="ob-cta" onClick={() => setStep(1)}>
          Get started →
        </button>
        <p className="ob-welcome-note">Takes about 60 seconds · No credit card</p>
      </div>
      <div className="ob-welcome-visual">
        <div className="ob-floating-card" style={{ top: '10%', left: '5%', animationDelay: '0s' }}>
          <span>🧠</span> Deep work blocked
        </div>
        <div className="ob-floating-card" style={{ top: '35%', right: '0%', animationDelay: '0.4s' }}>
          <span>📅</span> 3 conflicts resolved
        </div>
        <div className="ob-floating-card" style={{ bottom: '25%', left: '8%', animationDelay: '0.8s' }}>
          <span>✨</span> Pattern detected
        </div>
        <div className="ob-floating-card" style={{ bottom: '8%', right: '5%', animationDelay: '1.2s' }}>
          <span>🎯</span> Goal on track
        </div>
        <div className="ob-grid-preview">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className={`ob-grid-cell ${[2,3,8,9,10,15,22,23,28,29].includes(i) ? 'filled' : ''} ${[3,9,22].includes(i) ? 'focus' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );

  if (step === 5) return (
    <div className="ob-screen ob-done">
      <div className="ob-done-content">
        <div className="ob-done-icon">🎉</div>
        <h2 className="ob-done-heading">You're all set, {name.split(' ')[0]}!</h2>
        <p className="ob-done-sub">
          Your {selectedProfile?.label} profile is ready. PlanWise will start
          learning your patterns as you build your schedule.
        </p>
        <div className="ob-done-summary">
          <div className="ob-done-row">
            <span className="ob-done-label">Profile</span>
            <span className="ob-done-value">{selectedProfile?.icon} {selectedProfile?.label}</span>
          </div>
          <div className="ob-done-row">
            <span className="ob-done-label">Focus areas</span>
            <span className="ob-done-value">
              {priorities.map(p => PRIORITIES.find(pr => pr.id === p)?.icon).join(' ')}
              {' '}
              {priorities.map(p => PRIORITIES.find(pr => pr.id === p)?.label).join(', ')}
            </span>
          </div>
          <div className="ob-done-row">
            <span className="ob-done-label">Peak time</span>
            <span className="ob-done-value">
              {PEAK_TIMES.find(t => t.id === peakTime)?.icon}{' '}
              {PEAK_TIMES.find(t => t.id === peakTime)?.label}
            </span>
          </div>
        </div>
        <button className="ob-cta" onClick={handleComplete}>
          Open my calendar →
        </button>
      </div>
    </div>
  );

  // Steps 1–4
  return (
    <div className="ob-screen ob-step">
      {/* Progress bar */}
      <div className="ob-progress">
        <div className="ob-progress-bar" style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      <div className="ob-step-content">
        <div className="ob-step-header">
          <span className="ob-step-num">Step {step} of 4</span>
          <h2 className="ob-step-title">{STEPS[step].title}</h2>
        </div>

        {/* Step 1 — Profile */}
        {step === 1 && (
          <div className="ob-grid-2">
            {PROFILES.map(p => (
              <button
                key={p.id}
                className={`ob-profile-card ${profile === p.id ? 'selected' : ''}`}
                style={{ '--card-color': p.color }}
                onClick={() => setProfile(p.id)}
              >
                <span className="ob-card-icon">{p.icon}</span>
                <span className="ob-card-label">{p.label}</span>
                <span className="ob-card-desc">{p.desc}</span>
                {profile === p.id && <span className="ob-check">✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — Priorities */}
        {step === 2 && (
          <>
            <p className="ob-step-hint">Pick up to 3</p>
            <div className="ob-grid-list">
              {PRIORITIES.map(p => (
                <button
                  key={p.id}
                  className={`ob-priority-card ${priorities.includes(p.id) ? 'selected' : ''}`}
                  onClick={() => togglePriority(p.id)}
                >
                  <span className="ob-card-icon">{p.icon}</span>
                  <div>
                    <div className="ob-card-label">{p.label}</div>
                    <div className="ob-card-desc">{p.desc}</div>
                  </div>
                  {priorities.includes(p.id) && (
                    <span className="ob-badge">{priorities.indexOf(p.id) + 1}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 3 — Peak time */}
        {step === 3 && (
          <div className="ob-grid-2">
            {PEAK_TIMES.map(t => (
              <button
                key={t.id}
                className={`ob-time-card ${peakTime === t.id ? 'selected' : ''}`}
                style={{ '--card-gradient': t.gradient }}
                onClick={() => setPeakTime(t.id)}
              >
                <span className="ob-time-icon">{t.icon}</span>
                <span className="ob-card-label">{t.label}</span>
                <span className="ob-card-desc">{t.desc}</span>
                {peakTime === t.id && <span className="ob-check">✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* Step 4 — Name */}
        {step === 4 && (
          <div className="ob-name-form">
            <div className="ob-field">
              <label>Your name</label>
              <input
                className="ob-input"
                placeholder="e.g. Nathan Hoang"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="ob-field">
              <label>Email</label>
              <input
                className="ob-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="ob-field">
              <label>Password</label>
              <input
                className="ob-input"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            {saveError && (
              <div style={{
                background: 'rgba(247,106,106,0.1)',
                border: '1px solid rgba(247,106,106,0.25)',
                color: '#F76A6A',
                fontSize: '0.8rem',
                padding: '10px 14px',
                borderRadius: '10px',
              }}>{saveError}</div>
            )}
            <p className="ob-privacy-note">🔒 Your password is securely hashed</p>
          </div>
        )}

        {/* Nav */}
        <div className="ob-nav">
          {step > 1 && (
            <button className="ob-back" onClick={() => setStep(s => s - 1)}>
              ← Back
            </button>
          )}
          {step < 4 ? (
            <button
              className="ob-next"
              disabled={!canAdvance()}
              onClick={() => setStep(s => s + 1)}
            >
              Continue →
            </button>
          ) : (
            <button
              className="ob-next"
              disabled={!canAdvance() || saving}
              onClick={handleFinish}
            >
              {saving ? 'Setting up…' : 'Finish setup →'}
            </button>
          )}
        </div>
        <button className="ob-start-over" onClick={() => {
          setStep(0);
          setProfile(null);
          setPriorities([]);
          setPeakTime(null);
          setName('');
          setEmail('');
          setPassword('');
          setSaveError('');
        }}>
          ↩ Start over
        </button>
      </div>
    </div>
  );
}