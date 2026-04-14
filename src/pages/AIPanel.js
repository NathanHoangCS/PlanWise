import React, { useState, useEffect, useCallback } from 'react';
import './AIPanel.css';

export default function AIPanel({ profile, onEventParsed }) {
  const [suggestions, setSuggestions]   = useState([]);
  const [analysis, setAnalysis]         = useState('');
  const [score, setScore]               = useState(null);
  const [loading, setLoading]           = useState(false);
  const [nlInput, setNlInput]           = useState('');
  const [parsing, setParsing]           = useState(false);
  const [parseResult, setParseResult]   = useState(null);
  const [parseError, setParseError]     = useState('');
  const [activeTab, setActiveTab]       = useState('suggestions');

  const fetchSuggestions = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.userId || null,
          profile,
        }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const fetchAnalysis = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.userId || null,
          profile,
        }),
      });
      const data = await res.json();
      setAnalysis(data.analysis || '');
      setScore(data.score);
    } catch {
      setAnalysis('Could not load analysis.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  async function handleParseEvent(e) {
    e.preventDefault();
    if (!nlInput.trim()) return;
    setParsing(true);
    setParseResult(null);
    setParseError('');
    try {
      const res = await fetch('http://localhost:5000/api/ai/parse-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: nlInput }),
      });
      const data = await res.json();
      if (data.event) {
        setParseResult(data.event);
      } else {
        setParseError(data.error || 'Could not parse event');
      }
    } catch {
      setParseError('Could not connect to AI service');
    } finally {
      setParsing(false);
    }
  }

  function handleAddParsedEvent() {
    if (parseResult && onEventParsed) {
      onEventParsed(parseResult);
      setNlInput('');
      setParseResult(null);
    }
  }

  function formatHour(h, m = 0) {
    const ampm = h >= 12 ? 'pm' : 'am';
    const hh = h % 12 || 12;
    return m ? `${hh}:${String(m).padStart(2,'0')}${ampm}` : `${hh}${ampm}`;
  }

  return (
    <div className="ai-panel">
      {/* Header */}
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <span className="ai-spark">✦</span>
          <span>AI Assistant</span>
        </div>
        <div className="ai-tabs">
          <button
            className={activeTab === 'suggestions' ? 'active' : ''}
            onClick={() => { setActiveTab('suggestions'); fetchSuggestions(); }}
          >Suggestions</button>
          <button
            className={activeTab === 'analyze' ? 'active' : ''}
            onClick={() => { setActiveTab('analyze'); fetchAnalysis(); }}
          >Insights</button>
        </div>
      </div>

      {/* Natural language input */}
      <div className="ai-nl-section">
        <form onSubmit={handleParseEvent} className="ai-nl-form">
          <input
            className="ai-nl-input"
            placeholder='e.g. "study for exam Friday 2 hours"'
            value={nlInput}
            onChange={e => setNlInput(e.target.value)}
          />
          <button type="submit" className="ai-nl-btn" disabled={parsing || !nlInput.trim()}>
            {parsing ? '…' : '→'}
          </button>
        </form>
        {parseError && <div className="ai-parse-error">{parseError}</div>}
        {parseResult && (
          <div className="ai-parse-result">
            <div className="ai-parse-preview">
              <span className="ai-parse-icon">
                {parseResult.type === 'focus' ? '🧠' : parseResult.type === 'meeting' ? '🤝' : '🎯'}
              </span>
              <div>
                <div className="ai-parse-title">{parseResult.title}</div>
                <div className="ai-parse-time">
                  {new Date(parseResult.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' · '}
                  {formatHour(parseResult.hour, parseResult.min)}–{formatHour(parseResult.end_hour, parseResult.end_min)}
                </div>
              </div>
              <div className="ai-parse-confidence">
                {Math.round((parseResult.confidence || 0.8) * 100)}%
              </div>
            </div>
            <div className="ai-parse-actions">
              <button className="ai-parse-add" onClick={handleAddParsedEvent}>Add to calendar</button>
              <button className="ai-parse-dismiss" onClick={() => setParseResult(null)}>Dismiss</button>
            </div>
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="ai-panel-body">
        {loading ? (
          <div className="ai-loading">
            <div className="ai-loading-dots">
              <span /><span /><span />
            </div>
            <span>Analyzing your schedule…</span>
          </div>
        ) : activeTab === 'suggestions' ? (
          <div className="ai-suggestions">
            {suggestions.length === 0 ? (
              <div className="ai-empty">
                Add more events to get personalized suggestions
              </div>
            ) : (
              suggestions.map(s => (
                <div key={s.id} className={`ai-suggestion-card ${s.type || 'personal'}`}>
                  <div className="ai-sug-icon">{s.icon}</div>
                  <div className="ai-sug-body">
                    <div className="ai-sug-title">{s.title}</div>
                    <div className="ai-sug-time">{s.time}</div>
                    <div className="ai-sug-reason">{s.reason}</div>
                  </div>
                </div>
              ))
            )}
            <button className="ai-refresh" onClick={fetchSuggestions}>↻ Refresh</button>
          </div>
        ) : (
          <div className="ai-insights">
            {score !== null && (
              <div className="ai-score-card">
                <div className="ai-score-label">Schedule Score</div>
                <div className="ai-score-ring">
                  <svg viewBox="0 0 60 60">
                    <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
                    <circle
                      cx="30" cy="30" r="24" fill="none"
                      stroke="#7C6AF7" strokeWidth="6"
                      strokeDasharray={`${(score / 100) * 150.8} 150.8`}
                      strokeLinecap="round"
                      transform="rotate(-90 30 30)"
                    />
                  </svg>
                  <span className="ai-score-num">{score}</span>
                </div>
              </div>
            )}
            {analysis && (
              <div className="ai-analysis-text">{analysis}</div>
            )}
            <button className="ai-refresh" onClick={fetchAnalysis}>↻ Re-analyze</button>
          </div>
        )}
      </div>
    </div>
  );
}