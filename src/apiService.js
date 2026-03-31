const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const apiService = {
  // ── Health ──────────────────────────────────────────────────────────────
  getHealth: async () => {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // ── Users ────────────────────────────────────────────────────────────────
  getUsers: async () => {
    const res = await fetch(`${API_BASE}/api/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  getUser: async (id) => {
    const res = await fetch(`${API_BASE}/api/users/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch user ${id}`);
    return res.json();
  },

  createUser: async (data) => {
    const res = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create user');
    return res.json();
  },

  // ── Events ───────────────────────────────────────────────────────────────
  getEvents: async ({ month, year } = {}) => {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (year)  params.set('year', year);
    const res = await fetch(`${API_BASE}/api/events?${params}`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  createEvent: async (data) => {
    const res = await fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create event');
    return res.json();
  },

  deleteEvent: async (id) => {
    const res = await fetch(`${API_BASE}/api/events/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete event ${id}`);
    return res.json();
  },

  // ── Suggestions ──────────────────────────────────────────────────────────
  getSuggestions: async () => {
    const res = await fetch(`${API_BASE}/api/suggestions`);
    if (!res.ok) throw new Error('Failed to fetch suggestions');
    return res.json();
  },
};

export { apiService };