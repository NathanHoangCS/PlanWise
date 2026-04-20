import React, { useState, useRef } from 'react';
import './ICSSync.css';

const API = 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('planwise_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ICSSync({ profile, onImport }) {
  const [open, setOpen]           = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
  const fileRef                   = useRef(null);

  async function handleExport() {
    try {
      const url = `${API}/api/ics/export${profile?.userId ? `?user_id=${profile.userId}` : ''}`;
      const res = await fetch(url, { headers: authHeaders() });

      if (!res.ok) throw new Error('Export failed');

      // Trigger browser download
      const blob     = await res.blob();
      const link     = document.createElement('a');
      link.href      = URL.createObjectURL(blob);
      link.download  = 'planwise-calendar.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      setResult({ type: 'export', message: 'Calendar exported! Open the .ics file to import into Google Calendar.' });
    } catch {
      setError('Export failed — make sure the backend is running');
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API}/api/ics/import`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Import failed');
        return;
      }

      setResult({ type: 'import', message: data.message, events: data.events });
      if (data.events?.length > 0 && onImport) {
        onImport(data.events);
      }
    } catch {
      setError('Import failed — make sure the backend is running');
    } finally {
      setImporting(false);
      // Reset file input
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="ics-sync">
      <button
        className="ics-toggle-btn"
        onClick={() => { setOpen(o => !o); setResult(null); setError(''); }}
        title="Google Calendar sync"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Sync
      </button>

      {open && (
        <div className="ics-dropdown">
          <div className="ics-dropdown-header">
            <span>📅 Calendar Sync</span>
            <button onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="ics-options">
            {/* Export */}
            <button className="ics-option" onClick={handleExport}>
              <div className="ics-option-icon">⬇️</div>
              <div className="ics-option-body">
                <div className="ics-option-title">Export to Google Calendar</div>
                <div className="ics-option-desc">Download .ics file — open it to import into Google Calendar, Apple Calendar, or Outlook</div>
              </div>
            </button>

            {/* Import */}
            <button className="ics-option" onClick={() => fileRef.current?.click()} disabled={importing}>
              <div className="ics-option-icon">{importing ? '⏳' : '⬆️'}</div>
              <div className="ics-option-body">
                <div className="ics-option-title">{importing ? 'Importing…' : 'Import from .ics file'}</div>
                <div className="ics-option-desc">Upload a .ics file exported from Google Calendar, Apple Calendar, or Outlook</div>
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".ics"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </div>

          {/* Result */}
          {result && (
            <div className={`ics-result ${result.type}`}>
              <span>{result.type === 'import' ? '✅' : '📥'}</span>
              <span>{result.message}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="ics-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Google Calendar instructions */}
          <div className="ics-instructions">
            <div className="ics-instructions-title">How to import into Google Calendar:</div>
            <ol>
              <li>Export your PlanWise calendar above</li>
              <li>Open Google Calendar → Settings → Import & Export</li>
              <li>Upload the downloaded .ics file</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}