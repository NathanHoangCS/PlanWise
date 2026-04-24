import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import './App.css';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import HomePage from './pages/HomePage';
import CalendarPage from './pages/CalendarPage';
import UsersPage from './pages/UsersPage';

function AppShell() {
  const [profile, setProfile]     = useState(null);
  const [authState, setAuthState] = useState('checking');
  const [theme, setTheme]         = useState(() => localStorage.getItem('planwise_theme') || 'dark');
  const [time, setTime]           = useState('');
  const [backendOnline, setBackendOnline] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('planwise_theme', theme);
  }, [theme]);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = now.getHours() % 12 || 12;
      const m = String(now.getMinutes()).padStart(2, '0');
      const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
      setTime(`${h}:${m} ${ampm}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch('http://localhost:5000/health')
      .then(r => r.json())
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('planwise_token');
    const saved = localStorage.getItem('planwise_profile');
    if (token && saved) {
      try { setProfile(JSON.parse(saved)); setAuthState('app'); }
      catch { setAuthState('login'); }
    } else if (saved) {
      setAuthState('login');
    } else {
      setAuthState('onboarding');
    }
  }, []);

  function handleLogin(user) {
    const saved = localStorage.getItem('planwise_profile');
    if (saved) setProfile(JSON.parse(saved));
    setAuthState('app');
    navigate('/');
  }

  function handleOnboardingComplete(data) {
    if (data?.goToLogin) { setAuthState('login'); return; }
    const saved = localStorage.getItem('planwise_profile');
    if (saved) setProfile(JSON.parse(saved));
    setAuthState('app');
    navigate('/');
  }

  function handleLogout() {
    localStorage.removeItem('planwise_token');
    localStorage.removeItem('planwise_profile');
    setProfile(null);
    setAuthState('login');
  }

  function toggleTheme() { setTheme(t => t === 'dark' ? 'light' : 'dark'); }

  if (authState === 'checking') return null;
  if (authState === 'onboarding') return <OnboardingPage onComplete={handleOnboardingComplete} />;
  if (authState === 'login') return <LoginPage onLogin={handleLogin} onSignUp={() => setAuthState('onboarding')} />;

  const firstName    = profile?.name?.split(' ')[0] || 'User';
  const profileEmoji = { student: '🎓', professional: '💼', freelancer: '🚀', balanced: '⚖️' }[profile?.profile] || '👤';

  return (
    <div className="App">
      {/* XP Title Bar */}
      <header className="App-header">
        <div className="header-inner">
          <div className="brand">
            <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="11" height="11" rx="1" fill="white" opacity="0.9"/>
              <rect x="15" y="2" width="11" height="11" rx="1" fill="white" opacity="0.5"/>
              <rect x="2" y="15" width="11" height="11" rx="1" fill="white" opacity="0.5"/>
              <rect x="15" y="15" width="11" height="11" rx="1" fill="white" opacity="0.9"/>
            </svg>
            <span className="brand-name">PlanWise</span>
          </div>
          <nav className="App-nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Home</NavLink>
            <NavLink to="/calendar" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Calendar</NavLink>
            <NavLink to="/users" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Team</NavLink>
          </nav>
          <div className="header-profile">
            <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <span className="header-name">{profileEmoji} {firstName}</span>
            <button className="header-reset" onClick={handleLogout} title="Sign out">✕</button>
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

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'mobile-nav-item active' : 'mobile-nav-item'}>
          <span>⌂</span><span>Home</span>
        </NavLink>
        <NavLink to="/calendar" className={({ isActive }) => isActive ? 'mobile-nav-item active' : 'mobile-nav-item'}>
          <span>▦</span><span>Calendar</span>
        </NavLink>
        <NavLink to="/users" className={({ isActive }) => isActive ? 'mobile-nav-item active' : 'mobile-nav-item'}>
          <span>◉</span><span>Team</span>
        </NavLink>
        <button className="mobile-nav-item" onClick={handleLogout}>
          <span>↩</span><span>Sign out</span>
        </button>
      </nav>

      {/* XP Status Footer */}
      <div className="xp-footer">
        <div className="xp-footer-panel">
          <div className={`xp-footer-dot ${backendOnline === false ? 'offline' : ''}`} />
          {backendOnline === null ? 'Connecting...' : backendOnline ? 'Backend online' : 'Backend offline'}
        </div>
        <div className="xp-footer-panel">
          ✦ AI active
        </div>
        <div className="xp-footer-right">
          <div className="xp-footer-user">
            {profileEmoji} {firstName}
          </div>
          <button className="xp-footer-theme" onClick={toggleTheme}>
            {theme === 'dark' ? '☀ Light' : '☾ Dark'}
          </button>
          <div className="xp-footer-time">{time}</div>
        </div>
      </div>
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