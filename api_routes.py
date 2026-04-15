"""
ai_routes.py
------------
AI-powered endpoints for PlanWise using the Anthropic Claude API.

Endpoints:
  POST /api/ai/suggestions   - Personalized suggestions based on patterns + profile
  POST /api/ai/parse-event   - Parse natural language into a structured event
  POST /api/ai/analyze       - Full schedule analysis with insights
"""

import os
import json
from datetime import datetime

import anthropic
from flask import Blueprint, jsonify, request
from models import Event, User
from PatternEngine import PatternEngine

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

# Anthropic client — reads ANTHROPIC_API_KEY from environment
client = anthropic.Anthropic()


def _get_user_events(user_id: int | None) -> list[dict]:
    """Fetch events for a user (or all events if no user_id)."""
    if user_id:
        events = Event.query.filter_by(user_id=user_id).all()
    else:
        events = Event.query.all()
    return [e.to_dict() for e in events]


# ── Suggestions ───────────────────────────────────────────────────────────────

@ai_bp.route('/suggestions', methods=['POST'])
def get_ai_suggestions():
    """
    Generate personalized scheduling suggestions.

    Body:
      user_id   (optional int)
      profile   (object: { profile, priorities, peakTime, name })
    """
    data    = request.get_json() or {}
    user_id = data.get('user_id')
    profile = data.get('profile', {})

    # Run pattern engine over event history
    events   = _get_user_events(user_id)
    patterns = PatternEngine(events).analyze()

    # Build context prompt for Claude
    profile_desc = {
        'student':      'a student managing study sessions, deadlines, and classes',
        'professional': 'a professional managing meetings, deep work, and 1:1s',
        'freelancer':   'a freelancer managing client work, projects, and flexible hours',
        'balanced':     'someone balancing work, wellness, and personal time',
    }.get(profile.get('profile', ''), 'a person managing their schedule')

    peak_desc = {
        'early_bird': 'most productive early morning (5-9am)',
        'morning':    'most productive in the morning (9am-12pm)',
        'afternoon':  'most productive in the afternoon (12-5pm)',
        'night_owl':  'most productive at night (8pm-2am)',
    }.get(profile.get('peakTime', ''), 'productive throughout the day')

    priorities = ', '.join(profile.get('priorities', [])) or 'general productivity'

    prompt = f"""You are a smart scheduling assistant for PlanWise calendar app.

User profile:
- They are {profile_desc}
- They are {peak_desc}
- Their top priorities: {priorities}
- Name: {profile.get('name', 'User')}

Their scheduling patterns (analyzed from {patterns['total_events']} events):
- Event breakdown: {json.dumps(patterns['type_breakdown'])}
- Preferred days by type: {json.dumps(patterns['preferred_days'])}
- Preferred hours by type: {json.dumps(patterns['preferred_hours'])}
- Average event duration: {patterns['avg_duration_mins']} minutes
- Meetings per week: {patterns['meetings_per_week']}
- Focus blocks per week: {patterns['focus_per_week']}
- Overloaded days: {patterns['overloaded_days'] or 'none'}
- Longest focus streak: {patterns['focus_streak_hours']} hours

Generate exactly 3 personalized scheduling suggestions. Each must be specific to their patterns.
Respond ONLY with valid JSON array, no markdown, no explanation:
[
  {{
    "id": "s1",
    "title": "short action title",
    "time": "specific time suggestion e.g. Tomorrow 9-11am",
    "reason": "one sentence explanation based on their patterns",
    "icon": "single emoji",
    "type": "focus|meeting|personal"
  }}
]"""

    try:
        message = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=600,
            messages=[{'role': 'user', 'content': prompt}]
        )
        raw = message.content[0].text.strip()
        # Strip markdown fences if present
        if raw.startswith('```'):
            raw = raw.split('\n', 1)[1].rsplit('```', 1)[0].strip()
        suggestions = json.loads(raw)
        return jsonify({'suggestions': suggestions, 'patterns': patterns})
    except Exception as e:
        # Fallback to pattern-based suggestions if API fails
        fallback = _fallback_suggestions(patterns, profile)
        return jsonify({'suggestions': fallback, 'patterns': patterns, 'fallback': True})


# ── Natural language event parsing ───────────────────────────────────────────

@ai_bp.route('/parse-event', methods=['POST'])
def parse_event():
    """
    Parse a natural language string into a structured event.

    Body: { "text": "study for calc exam Friday 2 hours" }
    Returns structured event data ready for the calendar.
    """
    data = request.get_json() or {}
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'text is required'}), 400

    today = datetime.now()
    prompt = f"""Parse this natural language event description into structured calendar data.
Today is {today.strftime('%A, %B %d, %Y')}.

Input: "{text}"

Respond ONLY with valid JSON, no markdown:
{{
  "title": "clean event title",
  "type": "meeting|focus|personal",
  "date": "YYYY-MM-DDTHH:MM:SS",
  "hour": 14,
  "min": 0,
  "end_hour": 16,
  "end_min": 0,
  "priority": 2,
  "confidence": 0.9,
  "notes": "any clarification needed"
}}

Rules:
- priority: 1=high, 2=medium, 3=low
- If no time mentioned, use 9:00am for work/study, 6pm for personal
- If no duration mentioned, use 1 hour for meetings, 2 hours for focus/study
- type "focus" for study/work/coding blocks, "meeting" for calls/meetings, "personal" for everything else
- confidence: how sure you are about the parsing (0-1)"""

    try:
        message = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=300,
            messages=[{'role': 'user', 'content': prompt}]
        )
        raw = message.content[0].text.strip()
        if raw.startswith('```'):
            raw = raw.split('\n', 1)[1].rsplit('```', 1)[0].strip()
        event_data = json.loads(raw)
        return jsonify({'event': event_data, 'original': text})
    except Exception as e:
        return jsonify({'error': f'Could not parse event: {str(e)}'}), 500


# ── Schedule analysis ─────────────────────────────────────────────────────────

@ai_bp.route('/analyze', methods=['POST'])
def analyze_schedule():
    """
    Full AI analysis of a user's schedule with insights and recommendations.

    Body: { user_id, profile }
    """
    data    = request.get_json() or {}
    user_id = data.get('user_id')
    profile = data.get('profile', {})

    events   = _get_user_events(user_id)
    patterns = PatternEngine(events).analyze()

    if patterns['total_events'] == 0:
        return jsonify({
            'analysis': "Your calendar is empty — start adding events and I'll learn your patterns!",
            'patterns': patterns,
            'score': None,
        })

    prompt = f"""Analyze this person's scheduling data and provide insights.

Profile: {profile.get('profile', 'unknown')} | Peak: {profile.get('peakTime', 'unknown')}
Patterns: {json.dumps(patterns, indent=2)}

Provide a brief, friendly analysis (3-4 sentences max) covering:
1. One positive pattern you notice
2. One area to improve
3. One specific action they can take this week

Keep it conversational and specific to their data. No bullet points — just natural prose."""

    try:
        message = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=250,
            messages=[{'role': 'user', 'content': prompt}]
        )
        analysis = message.content[0].text.strip()

        # Compute a simple productivity score
        score = _compute_score(patterns)

        return jsonify({
            'analysis': analysis,
            'patterns': patterns,
            'score': score,
        })
    except Exception as e:
        return jsonify({
            'analysis': 'Could not generate analysis — check your API key.',
            'patterns': patterns,
            'score': _compute_score(patterns),
            'error': str(e),
        })


# ── Helpers ───────────────────────────────────────────────────────────────────

def _compute_score(patterns: dict) -> int:
    """
    Simple 0-100 productivity score based on patterns.
    Higher = better balance of focus time vs meetings.
    """
    score = 50
    if patterns['focus_per_week'] >= 3:   score += 15
    if patterns['meetings_per_week'] <= 5: score += 10
    if not patterns['overloaded_days']:    score += 10
    if patterns['focus_streak_hours'] >= 2: score += 10
    if patterns['total_events'] >= 5:      score += 5
    return min(score, 100)


def _fallback_suggestions(patterns: dict, profile: dict) -> list:
    """Pattern-based suggestions when API is unavailable."""
    suggestions = []

    if patterns['focus_per_week'] < 2:
        suggestions.append({
            'id': 's1', 'icon': '🧠',
            'title': 'Add more focus blocks',
            'time': 'Tomorrow morning',
            'reason': 'You have fewer than 2 focus sessions per week',
            'type': 'focus',
        })

    if patterns['meetings_per_week'] > 5:
        suggestions.append({
            'id': 's2', 'icon': '⚠️',
            'title': 'Reduce meeting load',
            'time': 'This week',
            'reason': f"You average {patterns['meetings_per_week']} meetings/week — consider async alternatives",
            'type': 'meeting',
        })

    if patterns['overloaded_days']:
        suggestions.append({
            'id': 's3', 'icon': '📅',
            'title': 'Spread out your schedule',
            'time': 'Next week',
            'reason': f"{len(patterns['overloaded_days'])} days have 3+ events — redistribute for less stress",
            'type': 'personal',
        })

    if not suggestions:
        suggestions.append({
            'id': 's1', 'icon': '✨',
            'title': 'Keep building your schedule',
            'time': 'This week',
            'reason': 'Add more events so PlanWise can learn your patterns',
            'type': 'personal',
        })

    return suggestions[:3]


# ── Pattern nudges ────────────────────────────────────────────────────────────

@ai_bp.route('/nudges', methods=['POST'])
def get_nudges():
    """
    Detects recurring patterns and returns nudge suggestions.
    e.g. "You usually add a Deep Work block on Mondays — add it again?"

    Body: { user_id, current_day: "Monday" }
    Only fires when user has 3+ events (enough data to detect patterns).
    """
    data       = request.get_json() or {}
    user_id    = data.get('user_id')
    current_day = data.get('current_day', '')

    events   = _get_user_events(user_id)
    patterns = PatternEngine(events).analyze()

    # Need at least 3 events to detect meaningful patterns
    if patterns['total_events'] < 3:
        return jsonify({'nudges': [], 'enough_data': False})

    nudges = []
    preferred_days = patterns.get('preferred_days', {})
    preferred_hours = patterns.get('preferred_hours', {})

    for event_type, day in preferred_days.items():
        if day.lower() == current_day.lower():
            hour = preferred_hours.get(event_type, '9am')
            # Find a recent event of this type to get the title
            recent = next(
                (e for e in reversed(events) if e.get('type') == event_type),
                None
            )
            title = recent['title'] if recent else event_type.capitalize()
            nudges.append({
                'id':    f'nudge_{event_type}',
                'title': title,
                'type':  event_type,
                'day':   day,
                'hour':  hour,
                'message': f'You usually schedule "{title}" on {day}s at {hour} — add it again?',
                'icon':  '🧠' if event_type == 'focus' else '🤝' if event_type == 'meeting' else '🎯',
            })

    return jsonify({'nudges': nudges[:2], 'enough_data': True})


# ── Conflict detection ────────────────────────────────────────────────────────

@ai_bp.route('/conflicts', methods=['POST'])
def check_conflicts():
    """
    Check if a new event conflicts with existing events.
    Uses Claude to explain conflicts with context and reasoning.

    Body:
      new_event  { title, date, hour, min, end_hour, end_min, type }
      user_id    (optional)
      profile    (optional)
    """
    data      = request.get_json() or {}
    new_event = data.get('new_event', {})
    user_id   = data.get('user_id')
    profile   = data.get('profile', {})

    if not new_event:
        return jsonify({'error': 'new_event is required'}), 400

    # Get existing events
    events   = _get_user_events(user_id)
    patterns = PatternEngine(events).analyze()

    # Find overlapping events
    new_start = new_event.get('hour', 0) * 60 + new_event.get('min', 0)
    new_end   = new_event.get('end_hour', 0) * 60 + new_event.get('end_min', 0)
    new_date  = new_event.get('date', '')[:10]

    conflicts = []
    for ev in events:
        if ev.get('date', '')[:10] != new_date:
            continue
        ev_start = ev.get('hour', 0) * 60 + ev.get('min', 0)
        ev_end   = ev.get('end_hour', 0) * 60 + ev.get('end_min', 0)
        # Overlap check: two ranges overlap if start1 < end2 AND start2 < end1
        if new_start < ev_end and ev_start < new_end:
            conflicts.append(ev)

    if not conflicts:
        return jsonify({'conflicts': [], 'has_conflict': False})

    # Build context for Claude
    def fmt_time(h, m=0):
        ampm = 'am' if h < 12 else 'pm'
        hh = h % 12 or 12
        return f"{hh}:{str(m).zfill(2)}{ampm}"

    conflict_descriptions = []
    for c in conflicts:
        conflict_descriptions.append(
            f"- '{c['title']}' ({c['type']}) at "
            f"{fmt_time(c.get('hour',0), c.get('min',0))}–"
            f"{fmt_time(c.get('end_hour',0), c.get('end_min',0))}"
        )

    new_desc = (
        f"'{new_event.get('title','New Event')}' ({new_event.get('type','meeting')}) "
        f"at {fmt_time(new_event.get('hour',0), new_event.get('min',0))}–"
        f"{fmt_time(new_event.get('end_hour',0), new_event.get('end_min',0))}"
    )

    preferred_type = patterns.get('preferred_hours', {}).get(
        conflicts[0].get('type', ''), 'this time'
    )

    prompt = f"""You are a scheduling assistant. A user is trying to add a new calendar event that conflicts with existing events.

User profile: {profile.get('profile', 'unknown')} | Peak time: {profile.get('peakTime', 'unknown')}

New event they want to add:
{new_desc}

Conflicts with:
{chr(10).join(conflict_descriptions)}

Their scheduling patterns show they prefer {conflicts[0].get('type','meetings')} at {preferred_type}.

Write a single conversational sentence (max 20 words) explaining the conflict and asking which takes priority.
Be specific about what's conflicting. No bullet points, just the sentence.
Example format: "This meeting overlaps with your usual focus block — which takes priority?"
"""

    try:
        message = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=80,
            messages=[{'role': 'user', 'content': prompt}]
        )
        reasoning = message.content[0].text.strip().strip('"')
    except Exception:
        # Fallback reasoning without AI
        conflict = conflicts[0]
        reasoning = (
            f"'{new_event.get('title')}' overlaps with your "
            f"'{conflict.get('title')}' {conflict.get('type')} — which takes priority?"
        )

    return jsonify({
        'has_conflict': True,
        'conflicts':    conflicts,
        'reasoning':    reasoning,
        'new_event':    new_event,
    })