import React, { useState } from 'react';
import './LoginPage.css';

export default function LoginPage({ onLogin, onSignUp }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      // Save token + profile to localStorage
      localStorage.setItem('planwise_token', data.token);
      localStorage.setItem('planwise_profile', JSON.stringify({
        userId:    data.user.id,
        name:      data.user.name,
        email:     data.user.email,
        profile:   data.user.profile,
        priorities: data.user.priorities,
        peakTime:  data.user.peak_time,
        onboarded: true,
      }));
      onLogin(data.user);
    } catch {
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect x="2" y="2" width="14" height="14" rx="3" fill="#7C6AF7"/>
            <rect x="20" y="2" width="14" height="14" rx="3" fill="#7C6AF7" opacity="0.45"/>
            <rect x="2" y="20" width="14" height="14" rx="3" fill="#7C6AF7" opacity="0.45"/>
            <rect x="20" y="20" width="14" height="14" rx="3" fill="#7C6AF7"/>
          </svg>
          <span className="login-brand">PlanWise</span>
        </div>

        <h2 className="login-heading">Welcome back</h2>
        <p className="login-sub">Sign in to your calendar</p>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="login-field">
            <label>Email</label>
            <input
              className="login-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div className="login-field">
            <label>Password</label>
            <input
              className="login-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            className="login-btn"
            type="submit"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <div className="login-divider"><span>or</span></div>

        <button className="login-signup-btn" onClick={onSignUp}>
          Create a new account
        </button>
      </div>
    </div>
  );
}