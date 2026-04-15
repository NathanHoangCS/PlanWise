"""
pattern_engine.py
-----------------
Analyzes a user's event history to detect scheduling patterns.
Uses the EventHashMap and EventMinHeap from data_structures.py.

Detected patterns are passed to the AI layer (ai_routes.py) to generate
personalized, context-aware suggestions.
"""

from collections import defaultdict
from datetime import datetime, timedelta
from data_structures import EventHashMap, EventMinHeap


class PatternEngine:
    """
    Detects scheduling habits from a user's event history.

    Patterns detected:
      - Preferred days for each event type
      - Preferred hours for each event type
      - Average event duration
      - Meeting density (meetings per week)
      - Focus block frequency
      - Overloaded days (3+ events)
      - Longest focus streak (consecutive focus hours)
    """

    def __init__(self, events: list[dict]):
        # Load events into HashMap for O(1) access
        self._map = EventHashMap()
        for ev in events:
            self._map.insert(ev)

        # Load into MinHeap for chronological processing
        self._heap = EventMinHeap()
        self._heap.build_from_list(events)

        self._events = events

    # ── Public API ────────────────────────────────────────────────────────────

    def analyze(self) -> dict:
        """Run all pattern detectors and return a summary dict."""
        if not self._events:
            return self._empty_patterns()

        return {
            'total_events':       len(self._events),
            'type_breakdown':     self._type_breakdown(),
            'preferred_days':     self._preferred_days(),
            'preferred_hours':    self._preferred_hours(),
            'avg_duration_mins':  self._avg_duration(),
            'meetings_per_week':  self._meetings_per_week(),
            'focus_per_week':     self._focus_per_week(),
            'overloaded_days':    self._overloaded_days(),
            'busiest_day':        self._busiest_day(),
            'focus_streak_hours': self._focus_streak(),
            'top_event_types':    self._top_event_types(),
            'upcoming_count':     len(self._heap.top_n(20)),
        }

    # ── Private detectors ─────────────────────────────────────────────────────

    def _type_breakdown(self) -> dict:
        counts = defaultdict(int)
        for ev in self._events:
            counts[ev.get('type', 'other')] += 1
        return dict(counts)

    def _preferred_days(self) -> dict:
        """Returns most common day-of-week per event type."""
        day_counts = defaultdict(lambda: defaultdict(int))
        day_names  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

        for ev in self._events:
            try:
                dt  = datetime.fromisoformat(ev['date'])
                day = day_names[dt.weekday() + 1 if dt.weekday() < 6 else 0]
                day_counts[ev.get('type', 'other')][day] += 1
            except (ValueError, KeyError):
                pass

        result = {}
        for ev_type, days in day_counts.items():
            result[ev_type] = max(days, key=days.get)
        return result

    def _preferred_hours(self) -> dict:
        """Returns most common start hour per event type."""
        hour_counts = defaultdict(lambda: defaultdict(int))
        for ev in self._events:
            try:
                hour = ev.get('hour', datetime.fromisoformat(ev['date']).hour)
                hour_counts[ev.get('type', 'other')][hour] += 1
            except (ValueError, KeyError):
                pass

        result = {}
        for ev_type, hours in hour_counts.items():
            best_hour = max(hours, key=hours.get)
            # Format as human-readable
            ampm = 'am' if best_hour < 12 else 'pm'
            h    = best_hour % 12 or 12
            result[ev_type] = f"{h}{ampm}"
        return result

    def _avg_duration(self) -> float:
        """Average event duration in minutes across all events."""
        durations = []
        for ev in self._events:
            start = ev.get('hour', 0) * 60 + ev.get('min', 0)
            end   = ev.get('end_hour', ev.get('hour', 0)) * 60 + ev.get('end_min', 0)
            dur   = end - start
            if dur > 0:
                durations.append(dur)
        return round(sum(durations) / len(durations), 1) if durations else 60.0

    def _meetings_per_week(self) -> float:
        meetings = [e for e in self._events if e.get('type') == 'meeting']
        if not meetings:
            return 0.0
        try:
            dates = [datetime.fromisoformat(e['date']) for e in meetings]
            span_days = (max(dates) - min(dates)).days or 1
            weeks = max(span_days / 7, 1)
            return round(len(meetings) / weeks, 1)
        except Exception:
            return len(meetings)

    def _focus_per_week(self) -> float:
        focus = [e for e in self._events if e.get('type') == 'focus']
        if not focus:
            return 0.0
        try:
            dates = [datetime.fromisoformat(e['date']) for e in focus]
            span_days = (max(dates) - min(dates)).days or 1
            weeks = max(span_days / 7, 1)
            return round(len(focus) / weeks, 1)
        except Exception:
            return len(focus)

    def _overloaded_days(self) -> list[str]:
        """Days with 3+ events scheduled."""
        day_counts = defaultdict(int)
        for ev in self._events:
            try:
                day_key = ev['date'][:10]
                day_counts[day_key] += 1
            except KeyError:
                pass
        return [day for day, count in day_counts.items() if count >= 3]

    def _busiest_day(self) -> str | None:
        day_counts = defaultdict(int)
        for ev in self._events:
            try:
                day_counts[ev['date'][:10]] += 1
            except KeyError:
                pass
        if not day_counts:
            return None
        return max(day_counts, key=day_counts.get)

    def _focus_streak(self) -> float:
        """Longest consecutive block of focus time (in hours)."""
        focus_events = sorted(
            [e for e in self._events if e.get('type') == 'focus'],
            key=lambda e: e['date']
        )
        max_hours = 0.0
        for ev in focus_events:
            start = ev.get('hour', 0) + ev.get('min', 0) / 60
            end   = ev.get('end_hour', ev.get('hour', 0)) + ev.get('end_min', 0) / 60
            max_hours = max(max_hours, end - start)
        return round(max_hours, 1)

    def _top_event_types(self) -> list[str]:
        breakdown = self._type_breakdown()
        return sorted(breakdown, key=breakdown.get, reverse=True)[:3]

    def _empty_patterns(self) -> dict:
        return {
            'total_events': 0, 'type_breakdown': {},
            'preferred_days': {}, 'preferred_hours': {},
            'avg_duration_mins': 60, 'meetings_per_week': 0,
            'focus_per_week': 0, 'overloaded_days': [],
            'busiest_day': None, 'focus_streak_hours': 0,
            'top_event_types': [], 'upcoming_count': 0,
        }