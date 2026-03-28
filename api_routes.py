from flask import Blueprint, jsonify, request
from datetime import datetime

bp = Blueprint('api', __name__, url_prefix='/api')

# ── In-memory store (replace with DB later) ──────────────────────────────────
_users = [
    {"id": 1, "name": "John Doe",   "email": "john@example.com"},
    {"id": 2, "name": "Jane Smith", "email": "jane@example.com"},
]
_events = [
    {
        "id": "e1",
        "title": "Team Standup",
        "type": "meeting",
        "date": datetime.today().replace(hour=9, minute=0).isoformat(),
        "end_hour": 9, "end_min": 30,
        "hour": 9, "min": 0,
        "color": "accent",
    },
    {
        "id": "e2",
        "title": "Deep Work Block",
        "type": "focus",
        "date": datetime.today().replace(hour=10, minute=0).isoformat(),
        "end_hour": 12, "end_min": 0,
        "hour": 10, "min": 0,
        "color": "focus",
    },
]
_next_user_id = 3

# ── Health ────────────────────────────────────────────────────────────────────

@bp.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "PlanWise API"})

# ── Users ─────────────────────────────────────────────────────────────────────

@bp.route('/users', methods=['GET'])
def get_users():
    return jsonify(_users)

@bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = next((u for u in _users if u["id"] == user_id), None)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user)

@bp.route('/users', methods=['POST'])
def create_user():
    global _next_user_id
    data = request.get_json()
    if not data or not data.get("name") or not data.get("email"):
        return jsonify({"error": "name and email are required"}), 400
    user = {"id": _next_user_id, "name": data["name"], "email": data["email"]}
    _users.append(user)
    _next_user_id += 1
    return jsonify(user), 201

# ── Events ────────────────────────────────────────────────────────────────────

@bp.route('/events', methods=['GET'])
def get_events():
    """Return all calendar events, optionally filtered by month/year."""
    month = request.args.get('month', type=int)
    year  = request.args.get('year',  type=int)
    events = _events
    if month and year:
        events = [
            e for e in _events
            if datetime.fromisoformat(e["date"]).month == month
            and datetime.fromisoformat(e["date"]).year  == year
        ]
    return jsonify(events)

@bp.route('/events/<string:event_id>', methods=['GET'])
def get_event(event_id):
    event = next((e for e in _events if e["id"] == event_id), None)
    if not event:
        return jsonify({"error": "Event not found"}), 404
    return jsonify(event)

@bp.route('/events', methods=['POST'])
def create_event():
    data = request.get_json()
    required = ["title", "date", "hour", "min", "end_hour", "end_min", "type"]
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400
    import uuid
    event = {
        "id":       str(uuid.uuid4())[:7],
        "title":    data["title"],
        "type":     data["type"],
        "date":     data["date"],
        "hour":     data["hour"],
        "min":      data["min"],
        "end_hour": data["end_hour"],
        "end_min":  data["end_min"],
        "color":    "focus" if data["type"] == "focus" else "accent",
    }
    _events.append(event)
    return jsonify(event), 201

@bp.route('/events/<string:event_id>', methods=['DELETE'])
def delete_event(event_id):
    global _events
    before = len(_events)
    _events = [e for e in _events if e["id"] != event_id]
    if len(_events) == before:
        return jsonify({"error": "Event not found"}), 404
    return jsonify({"deleted": event_id}), 200

# ── ML Suggestions ────────────────────────────────────────────────────────────

@bp.route('/suggestions', methods=['GET'])
def get_suggestions():
    """
    Returns AI-generated scheduling suggestions.
    In production this would call the ML model. For now returns mock data.
    """
    suggestions = [
        {
            "id": "s1",
            "title": "Best time for deep work",
            "time": "Tomorrow 9–11am",
            "reason": "Your focus score peaks in morning hours",
            "icon": "🧠",
        },
        {
            "id": "s2",
            "title": "Schedule 1:1 meeting",
            "time": "Thu 2–3pm",
            "reason": "Low conflict, high energy window detected",
            "icon": "🤝",
        },
        {
            "id": "s3",
            "title": "Protect lunch break",
            "time": "Daily 12–1pm",
            "reason": "You've skipped lunch 4 days this week",
            "icon": "⚡",
        },
    ]
    return jsonify(suggestions)