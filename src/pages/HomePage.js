import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/apiService';
import './HomePage.css';

function HomePage({ profile }) {
  const [status, setStatus] = useState('');

  useEffect(() => {
    apiService.getHealth()
      .then(data => setStatus(data.status))
      .catch(() => setStatus('offline'));
  }, []);

  const firstName = profile?.name?.split(' ')[0] || 'there';

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-hero-titlebar">
          <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="2" width="11" height="11" rx="1" fill="white" opacity="0.9"/>
            <rect x="15" y="2" width="11" height="11" rx="1" fill="white" opacity="0.5"/>
            <rect x="2" y="15" width="11" height="11" rx="1" fill="white" opacity="0.5"/>
            <rect x="15" y="15" width="11" height="11" rx="1" fill="white" opacity="0.9"/>
          </svg>
          <div className="home-hero-titlebar-text">Welcome back, {firstName}</div>
        </div>
        <div className="home-hero-body">
          <div className="home-badge">✦ Smart Scheduling</div>
          <h1 className="home-heading">
            Your calendar,<br /><em>finally intelligent.</em>
          </h1>
          <p className="home-sub">
            PlanWise learns from how you plan and builds smarter
            recommendations around your <em>real life</em> — not a template.
          </p>
          <div className="home-actions">
            <Link to="/calendar" className="cta-primary">Open Calendar →</Link>
            <Link to="/users" className="cta-ghost">View Team</Link>
          </div>
        </div>
      </div>

      <div className="home-features">
        <div className="feature-card">
          <div className="feature-icon">🧠</div>
          <h3>ML Suggestions</h3>
          <p>Learns from your patterns to recommend the best times for focus and meetings.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🛡️</div>
          <h3>Focus Protection</h3>
          <p>Automatically detects your deep work blocks and warns before scheduling over them.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📅</div>
          <h3>Smart Calendar</h3>
          <p>Month and week views with drag-and-drop, natural language input, and conflict detection.</p>
        </div>
      </div>

      <div className="home-status">
        <span className={`status-dot ${status === 'ok' ? 'online' : status === 'offline' ? 'offline' : 'loading'}`} />
        Backend {status === 'ok' ? 'connected' : status === 'offline' ? 'offline' : 'connecting…'}
      </div>
    </div>
  );
}

export default HomePage;