import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import CalendarPage from './pages/CalendarPage';
import UsersPage from './pages/UsersPage';

function App() {
  return (
    <Router>
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
              <NavLink to="/users" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Users</NavLink>
            </nav>
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;