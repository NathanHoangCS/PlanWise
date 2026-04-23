import uuid
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from models import db, Event, User
from data_structures import EventHashMap, EventMinHeap
from trie_search import TrieSearch

bp = Blueprint('api', __name__, url_prefix='/api')

# ── In-memory data structure layer ────────────────────────────────────────────
_event_map   = EventHashMap()
_event_heap  = EventMinHeap()
_event_trie  = TrieSearch()
_cache_built = False

def _build_cache():
    global _cache_built
    events = [e.to_dict() for e in Event.query.all()]
    for ev in events:
        _event_map.insert(ev)
        _event_trie.insert(ev)
    _event_heap.build_from_list(events)
    _cache_built = True

def _ensure_cache():
    if not _cache_built:
        _build_cache()

# ── Health ────────────────────────────────────────────────────────────────────
@bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'PlanWise API'})

# ── Users ─────────────────────────────────────────────────────────────────────
@bp.route('/users', methods=['GET'])
def get_users():
    users = User.query.order_by(User.created_at).all()
    return jsonify([u.to_dict() for u in users])

@bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

@bp.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('email'):
        return jsonify({'error': 'name and email are required'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 409
    user = User(name=data['name'], email=data['email'])
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({'deleted': user_id}), 200

# ── Events ────────────────────────────────────────────────────────────────────
@bp.route('/events', methods=['GET'])
def get_events():
    # Get user_id from JWT if present
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            user_id = int(identity)
    except Exception:
        pass

    if not user_id:
        user_id = request.args.get('user_id', type=int)

    month = request.args.get('month', type=int)
    year  = request.args.get('year',  type=int)

    query = Event.query
    if user_id:
        query = query.filter_by(user_id=user_id)

    events = [e.to_dict() for e in query.all()]

    if month and year:
        events = [
            e for e in events
            if datetime.fromisoformat(e['date']).month == month
            and datetime.fromisoformat(e['date']).year  == year
        ]

    events.sort(key=lambda e: e['date'])
    return jsonify(events)

@bp.route('/events/<string:event_id>', methods=['GET'])
def get_event(event_id):
    _ensure_cache()
    event = _event_map.get(event_id)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    return jsonify(event)

@bp.route('/events', methods=['POST'])
def create_event():
    data = request.get_json()
    required = ['title', 'date', 'hour', 'min', 'end_hour', 'end_min', 'type']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400
    event_id = str(uuid.uuid4())[:7]
    try:
        dt = datetime.fromisoformat(data['date'])
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    event = Event(
        id=event_id, title=data['title'], type=data['type'],
        color='focus' if data['type'] == 'focus' else 'accent',
        date=dt, hour=data['hour'], min=data['min'],
        end_hour=data['end_hour'], end_min=data['end_min'],
        priority=data.get('priority', 3), user_id=data.get('user_id'),
    )
    db.session.add(event)
    db.session.commit()
    event_dict = event.to_dict()
    _ensure_cache()
    _event_map.insert(event_dict)
    _event_heap.push(event_dict)
    _event_trie.insert(event_dict)
    return jsonify(event_dict), 201

@bp.route('/events/<string:event_id>', methods=['PUT'])
def update_event(event_id):
    _ensure_cache()
    event = Event.query.get_or_404(event_id)
    data  = request.get_json()
    for field in ['title', 'type', 'date', 'hour', 'min', 'end_hour', 'end_min', 'priority']:
        if field in data:
            if field == 'date':
                setattr(event, field, datetime.fromisoformat(data[field]))
            else:
                setattr(event, field, data[field])
    if 'type' in data:
        event.color = 'focus' if data['type'] == 'focus' else 'accent'
    db.session.commit()
    event_dict = event.to_dict()
    _event_map.insert(event_dict)
    _event_heap.remove(event_id)
    _event_heap.push(event_dict)
    _event_trie.delete(event_id)
    _event_trie.insert(event_dict)
    return jsonify(event_dict)

@bp.route('/events/<string:event_id>', methods=['DELETE'])
def delete_event(event_id):
    _ensure_cache()
    event = Event.query.get_or_404(event_id)
    db.session.delete(event)
    db.session.commit()
    _event_map.delete(event_id)
    _event_heap.remove(event_id)
    _event_trie.delete(event_id)
    return jsonify({'deleted': event_id}), 200

@bp.route('/events/search', methods=['GET'])
def search_events():
    """
    Search events by title prefix using the TrieSearch data structure.
    O(m + k) where m = query length, k = number of results.

    Query params:
      q      - search prefix (required)
      limit  - max results (default 8)
      user_id - filter by user (optional)
    """
    _ensure_cache()
    query   = request.args.get('q', '').strip()
    limit   = request.args.get('limit', default=8, type=int)
    user_id = request.args.get('user_id', type=int)

    if not query:
        return jsonify({'results': [], 'query': '', 'data_structure': 'Trie'})

    # Trie prefix search — O(m + k)
    results = _event_trie.search(query, limit=50)

    # Filter by user if specified
    if user_id:
        results = [e for e in results if e.get('user_id') == user_id]

    return jsonify({
        'results':        results[:limit],
        'query':          query,
        'total':          len(results),
        'data_structure': 'Trie',
        'trie_size':      _event_trie.size(),
        'trie_nodes':     _event_trie.node_count(),
    })

@bp.route('/events/upcoming', methods=['GET'])
def get_upcoming():
    _ensure_cache()
    n = request.args.get('n', default=5, type=int)
    upcoming = _event_heap.top_n(n, after=datetime.utcnow())
    return jsonify({
        'data_structure': 'MinHeap',
        'description': 'Events ordered by (datetime, priority) using a binary min-heap',
        'events': upcoming,
    })

@bp.route('/suggestions', methods=['GET'])
def get_suggestions():
    _ensure_cache()
    upcoming = _event_heap.top_n(10, after=datetime.utcnow())
    focus_count   = sum(1 for e in upcoming if e.get('type') == 'focus')
    meeting_count = sum(1 for e in upcoming if e.get('type') == 'meeting')
    suggestions = [
        {'id': 's1', 'title': 'Best time for deep work', 'time': 'Tomorrow 9-11am', 'reason': 'Your focus score peaks in morning hours', 'icon': '🧠'},
        {'id': 's2', 'title': 'Schedule 1:1 meeting', 'time': 'Thu 2-3pm', 'reason': 'Low conflict, high energy window detected', 'icon': '🤝'},
    ]
    if focus_count == 0:
        suggestions.append({'id': 's3', 'title': 'Add a focus block', 'time': 'Today 3-5pm', 'reason': 'No focus blocks scheduled this week', 'icon': '⚡'})
    if meeting_count > 3:
        suggestions.append({'id': 's4', 'title': 'Meeting overload detected', 'time': 'Consider async updates', 'reason': f'{meeting_count} meetings upcoming - protect your focus time', 'icon': '⚠️'})
    return jsonify(suggestions)