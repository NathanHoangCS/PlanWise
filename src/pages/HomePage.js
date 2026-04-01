import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/apiService';
import './HomePage.css';

function HomePage() {
  const [status, setStatus] = useState('');

  useEffect(() => {
    apiService.getHealth()
      .then(data => setStatus(data.status))
      .catch(() => setStatus('offline'));
  }, []);

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-badge">✨ Smart Scheduling</div>
        <h1 className="home-heading">Plan with <em>intention.</em><br />Execute with clarity.</h1>
        <p className="home-sub">
          PlanWise learns your scheduling habits and uses ML to suggest optimal meeting times,
          protect focus blocks, and keep your calendar working <em>for</em> you.
        </p>
        <div className="home-actions">
          <Link to="/calendar" className="cta-primary">Open Calendar →</Link>
          <Link to="/users" className="cta-ghost">View Team</Link>
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
          <p>Automatically blocks off deep work time so you can reach flow state.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📅</div>
          <h3>Smart Calendar</h3>
          <p>Month and week views with one-click event creation and conflict detection.</p>
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