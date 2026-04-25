# PlanWise

> A smart calendar that learns your scheduling habits and uses AI to suggest optimal times, detect conflicts, and protect your focus blocks.

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=flat&logo=flask)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite)


---

## What it does

Most calendar apps give you a blank grid and leave you to figure it out. PlanWise is different — it starts empty and learns.

As you add events, a custom **pattern engine** analyzes your scheduling habits and surfaces AI-powered suggestions tailored to you. Schedule deep work every Tuesday morning? It notices. Cramming back-to-back meetings on Fridays? It'll say something.

The AI layer (powered by the Claude API) handles everything from conflict reasoning to natural language event creation. Type "study for exam Friday 2 hours" and it parses it into a real, properly scheduled event.

---

## Features

- 🔐 **Full auth** — JWT login, bcrypt password hashing, isolated data per user
- 📅 **Calendar views** — month and week views with drag-and-drop rescheduling
- ✏️ **Event editing** — edit title, type, time, and priority inline
- 🧠 **AI suggestions** — personalized recommendations based on your real patterns
- ⚡ **Natural language input** — "meeting with team Thursday 3pm" becomes a real event
- ⚠️ **Conflict detection** — AI reasoning explains *why* events conflict and asks which takes priority
- 🔔 **Pattern nudges** — detects recurring habits and prompts you to re-add them
- 🔍 **Trie search** — prefix search across all your events using a custom Trie data structure
- 📤 **Google Calendar sync** — export/import `.ics` files compatible with Google, Apple, and Outlook
- 🌙 **Dark/light mode** — persistent across sessions
- 📱 **Mobile responsive** — full bottom nav and touch-friendly layout

---

## Data Structures

This project uses custom-built data structures on the backend rather than relying on library abstractions. They're not just there for show — they're actively used by the API layer.

### HashMap (`data_structures.py`)
```
EventHashMap — O(1) average-case lookup, insert, delete by event ID
              — maintains a secondary date index for O(k) day-based queries
```
Used by every event GET, PUT, and DELETE endpoint to avoid scanning the full database on each request.

### MinHeap (`data_structures.py`)
```
EventMinHeap — binary min-heap ordered by (datetime, priority)
             — lazy deletion with tombstone set
             — O(log n) insert/delete, O(n log n) top-n retrieval
```
Powers the upcoming events panel and the AI suggestion engine. Surfaces the next N high-priority events without sorting the full list.

### Trie (`trie_search.py`)
```
TrieSearch — prefix tree for event title search
           — O(m) search where m = query length
           — much faster than O(n*m) linear scan at scale
           — stores event references at every node for instant retrieval
```
Powers the search bar. Typing "st" instantly returns "Standup", "Study session", etc. via prefix traversal.

### Pattern Engine (`pattern_engine.py`)
```
PatternEngine — reads from HashMap + MinHeap to analyze event history
              — detects: preferred days/hours per type, meeting density,
                focus frequency, overloaded days, longest focus streak
```
Feeds structured context into the Claude API to generate personalized, data-driven suggestions rather than generic tips.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│                                                          │
│  CalendarPage  ←→  AIPanel  ←→  SearchBar               │
│       │                              │                   │
│  EventModal  ConflictModal  PatternNudge  ICSSync        │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / JWT
┌──────────────────────▼──────────────────────────────────┐
│                    Flask Backend                          │
│                                                          │
│  api_routes.py   auth_routes.py   ai_routes.py           │
│  ics_routes.py                                           │
│       │                  │                               │
│  EventHashMap        PatternEngine                       │
│  EventMinHeap    ───►  Claude API                        │
│  TrieSearch                                              │
│       │                                                  │
│  SQLAlchemy ORM                                          │
│       │                                                  │
│    SQLite DB (planwise.db)                               │
└─────────────────────────────────────────────────────────┘
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/events` | Get user's events |
| POST | `/api/events` | Create event |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |
| GET | `/api/events/search?q=` | Trie prefix search |
| GET | `/api/events/upcoming` | MinHeap priority queue |
| POST | `/api/ai/suggestions` | AI suggestions via Claude |
| POST | `/api/ai/parse-event` | Natural language → event |
| POST | `/api/ai/conflicts` | Conflict detection + reasoning |
| POST | `/api/ai/analyze` | Schedule analysis + score |
| POST | `/api/ai/nudges` | Pattern-based nudge detection |
| GET | `/api/ics/export` | Export as .ics |
| POST | `/api/ics/import` | Import .ics file |

---

## Tech Stack

**Frontend**
- React 18
- CSS Variables (dark/light theming)
- HTML5 Drag and Drop API
- localStorage (auth token + preferences)

**Backend**
- Python / Flask
- SQLAlchemy + SQLite
- Flask-JWT-Extended (auth)
- Flask-Bcrypt (password hashing)
- Anthropic Claude API (AI features)

---

## Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- An [Anthropic API key](https://console.anthropic.com)

### Backend

```bash
# Clone the repo
git clone https://github.com/NathanHoangCS/PlanWise.git
cd PlanWise

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set your API key
export ANTHROPIC_API_KEY=your_key_here

# Start the backend (runs on port 5000)
python main.py
```

### Frontend

```bash
# In a second terminal, from the project root
cd src  # if using a separate frontend folder, otherwise stay in root
npm install
npm start
```

The app will open at `http://localhost:3000`.

> **Note:** Delete `planwise.db` if you need to reset the database. It will be recreated automatically on next start.

---

## Project Structure

```
PlanWise/
├── main.py                  # Flask app factory
├── models.py                # SQLAlchemy models (User, Event)
├── api_routes.py            # Event CRUD endpoints
├── auth_routes.py           # Register / login / JWT
├── ai_routes.py             # Claude API integration
├── ics_routes.py            # .ics export/import
├── data_structures.py       # EventHashMap + EventMinHeap
├── trie_search.py           # TrieSearch for event search
├── pattern_engine.py        # Scheduling pattern analysis
├── ics_utils.py             # ICS file parser/generator
├── requirements.txt
│
└── src/
    ├── App.js               # Auth gate + routing
    ├── pages/
    │   ├── OnboardingPage   # Multi-step profile setup
    │   ├── LoginPage        # Returning user login
    │   ├── CalendarPage     # Main calendar (month + week)
    │   ├── HomePage         # Landing with feature cards
    │   ├── UsersPage        # Team members
    │   ├── AIPanel          # Suggestions + insights
    │   ├── SearchBar        # Trie-powered search
    │   ├── ConflictModal    # AI conflict resolution
    │   ├── PatternNudge     # Habit detection toasts
    │   └── ICSSync          # Google Calendar sync
    └── services/
        └── apiService.js    # Backend API client
```

---

## License

MIT
