import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import './App.css';
import OnboardingPage from './pages/OnboardingPage';
import HomePage from './pages/HomePage';
import CalendarPage from './pages/CalendarPage';
import UsersPage from './pages/UsersPage';

function AppShell() {
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('planwise_profile');
    if (saved) {
      try { setProfile(JSON.parse(saved)); } catch {}
    }
    setChecking(false);
  }, []);

  function handleOnboardingComplete(data) {
    const saved = localStorage.getItem('planwise_profile');
    if (saved) setProfile(JSON.parse(saved));
    else setProfile(data);
    navigate('/');
  }

  if (checking) return null;

  if (!profile) {
    return <OnboardingPage onComplete={handleOnboardingComplete} />;
  }

  const firstName = profile.name?.split(' ')[0] || 'there';
  const profileEmoji = {
    student: '🎓', professional: '💼', freelancer: '🚀', balanced: '⚖️'
  }[profile.profile] || '👋';

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-inner">
          <div className="brand">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="11" height="11" rx="2" fill="#7C6AF7"/>
              <rect x="15" y="2" width="11" height="11" rx="2" fill="#7C6AF7" opacity="0.5"/>
              <rect x="2" y="15" width="11" height="11" rx="2" fill="#7C6AF7" opacity="0.5"/>
              <rect x="15" y="15" width="11" height="11" rx="2" fill="#7C6AF7"/>
            </svg>
            <span className="brand-name">PlanWise</span>
          </div>
          <nav className="App-nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Home</NavLink>
            <NavLink to="/calendar" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Calendar</NavLink>
            <NavLink to="/users" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Team</NavLink>
          </nav>
          <div className="header-profile">
            <span>{profileEmoji}</span>
            <span className="header-name">{firstName}</span>
            <button className="header-reset" onClick={() => {
              localStorage.removeItem('planwise_profile');
              setProfile(null);
            }}>↩</button>
          </div>
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage profile={profile} />} />
          <Route path="/calendar" element={<CalendarPage profile={profile} />} />
          <Route path="/users" element={<UsersPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;