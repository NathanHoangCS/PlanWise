import React, { useState, useEffect, useRef, useCallback } from 'react';
import './SearchBar.css';

const API = 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('planwise_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatTime(h, m = 0) {
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, '0')}${ampm}` : `${hh}${ampm}`;
}

export default function SearchBar({ profile, onResultClick }) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(-1); // keyboard nav index
  const inputRef  = useRef(null);
  const dropRef   = useRef(null);
  const debounceRef = useRef(null);

  // ── Search ────────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const userId = profile?.userId ? `&user_id=${profile.userId}` : '';
      const res    = await fetch(
        `${API}/api/events/search?q=${encodeURIComponent(q)}${userId}`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      setResults(data.results || []);
      setOpen(true);
      setSelected(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.userId]);

  // Debounce input — wait 200ms before searching
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(query), 200);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (!dropRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard navigation
  function handleKeyDown(e) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, -1));
    } else if (e.key === 'Enter' && selected >= 0) {
      e.preventDefault();
      handleSelect(results[selected]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  function handleSelect(ev) {
    onResultClick && onResultClick(ev);
    setQuery('');
    setOpen(false);
    setResults([]);
    setSelected(-1);
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark>{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  }

  return (
    <div className="search-bar">
      <div className="search-input-wrap">
        <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={inputRef}
          className="search-input"
          placeholder="Search events…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button className="search-clear" onClick={() => { setQuery(''); setResults([]); setOpen(false); }}>
            ✕
          </button>
        )}
        {loading && <div className="search-spinner" />}
      </div>

      {open && results.length > 0 && (
        <div ref={dropRef} className="search-dropdown">
          <div className="search-dropdown-header">
            <span className="search-trie-label">⚡ Trie search</span>
            <span className="search-count">{results.length} result{results.length !== 1 ? 's' : ''}</span>
          </div>
          {results.map((ev, idx) => (
            <button
              key={ev.id}
              className={`search-result ${idx === selected ? 'selected' : ''}`}
              onClick={() => handleSelect(ev)}
              onMouseEnter={() => setSelected(idx)}
            >
              <span className={`search-result-dot ${ev.type === 'focus' ? 'focus' : 'accent'}`} />
              <div className="search-result-body">
                <div className="search-result-title">
                  {highlightMatch(ev.title, query)}
                </div>
                <div className="search-result-meta">
                  {new Date(ev.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' · '}
                  {formatTime(ev.hour, ev.min)}
                  {' · '}
                  <span className={`search-type-tag ${ev.type === 'focus' ? 'focus' : 'accent'}`}>{ev.type}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query && results.length === 0 && !loading && (
        <div ref={dropRef} className="search-dropdown search-empty">
          No events found for "<strong>{query}</strong>"
        </div>
      )}
    </div>
  );
}