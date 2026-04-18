import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import './App.css';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import HomePage from './pages/HomePage';
import CalendarPage from './pages/CalendarPage';
import UsersPage from './pages/UsersPage';

function AppShell() {
  const [profile, setProfile]   = useState(null);
  const [authState, setAuthState] = useState('checking'); // checking | login | onboarding | app
  const navigate = useNavigate();

  useEffect(() => {
    const token   = localStorage.getItem('planwise_token');
    const saved   = localStorage.getItem('planwise_profile');

    if (token && saved) {
      try {
        setProfile(JSON.parse(saved));
        setAuthState('app');
      } catch {
        setAuthState('login');
      }
    } else if (saved) {
      // Had onboarding but no token — send to login
      setAuthState('login');
    } else {
      // Brand new user — onboarding
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
    if (data?.goToLogin) {
      setAuthState('login');
      return;
    }
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

  if (authState === 'checking') return null;
  if (authState === 'onboarding') return (
    <OnboardingPage onComplete={handleOnboardingComplete} />
  );
  if (authState === 'login') return (
    <LoginPage
      onLogin={handleLogin}
      onSignUp={() => setAuthState('onboarding')}
    />
  );

  const firstName    = profile?.name?.split(' ')[0] || 'there';
  const profileEmoji = { student: '🎓', professional: '💼', freelancer: '🚀', balanced: '⚖️' }[profile?.profile] || '👋';

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
            <button className="header-reset" onClick={handleLogout} title="Sign out">↩</button>
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