"""
data_structures.py
------------------
Custom data structures used by PlanWise to efficiently manage calendar events.

  EventHashMap  – O(1) average-case lookup / insert / delete by event ID
  EventMinHeap  – min-heap ordered by (date, priority) for upcoming events
"""

import heapq
from datetime import datetime


# ── HashMap ────────────────────────────────────────────────────────────────────

class EventHashMap:
    """
    A hash map that stores events keyed by their string ID.

    Why: O(1) average lookup instead of O(n) list scan when checking
    whether an event exists or fetching it by ID.

    Internally uses Python's dict (open-addressing hash table) but wraps
    it in a class so the data-structure choice is explicit and documented.
    """

    def __init__(self):
        self._map: dict = {}          # { event_id: event_dict }
        self._date_index: dict = {}   # { 'YYYY-MM-DD': [event_id, ...] }

    # ── core operations ──────────────────────────────────────────────────────

    def insert(self, event: dict) -> None:
        """Insert or overwrite an event. O(1) average."""
        eid = event['id']
        self._map[eid] = event

        # maintain secondary date index
        day_key = event['date'][:10]          # 'YYYY-MM-DD'
        self._date_index.setdefault(day_key, [])
        if eid not in self._date_index[day_key]:
            self._date_index[day_key].append(eid)

    def get(self, event_id: str) -> dict | None:
        """Return event by ID, or None if not found. O(1) average."""
        return self._map.get(event_id)

    def delete(self, event_id: str) -> bool:
        """Remove an event. Returns True if found and deleted. O(1) average."""
        if event_id not in self._map:
            return False
        event = self._map.pop(event_id)
        day_key = event['date'][:10]
        if day_key in self._date_index:
            self._date_index[day_key] = [
                eid for eid in self._date_index[day_key] if eid != event_id
            ]
        return True

    def get_by_date(self, date_str: str) -> list[dict]:
        """Return all events on a given day (YYYY-MM-DD). O(k) where k = events that day."""
        ids = self._date_index.get(date_str, [])
        return [self._map[eid] for eid in ids if eid in self._map]

    def get_by_month(self, year: int, month: int) -> list[dict]:
        """Return all events in a given month."""
        prefix = f"{year}-{month:02d}"
        results = []
        for day_key, ids in self._date_index.items():
            if day_key.startswith(prefix):
                results.extend(self._map[eid] for eid in ids if eid in self._map)
        return results

    def all(self) -> list[dict]:
        """Return all events as a list."""
        return list(self._map.values())

    def __len__(self) -> int:
        return len(self._map)

    def __contains__(self, event_id: str) -> bool:
        return event_id in self._map


# ── MinHeap ────────────────────────────────────────────────────────────────────

class EventMinHeap:
    """
    A min-heap of upcoming events ordered by (datetime, priority).

    Why: Efficiently retrieve the N nearest / highest-priority upcoming
    events for the AI suggestions panel without sorting the full event list
    each time. peek() and pop() are O(log n); build is O(n).

    priority: 1 = high, 2 = medium, 3 = low
    Heap entry: (datetime_obj, priority, event_id, event_dict)
    """

    def __init__(self):
        self._heap: list = []
        self._deleted: set = set()   # lazy-deletion tombstone set

    def push(self, event: dict) -> None:
        """Add an event to the heap. O(log n)."""
        try:
            dt = datetime.fromisoformat(event['date'])
        except (ValueError, KeyError):
            return
        priority = event.get('priority', 3)
        heapq.heappush(self._heap, (dt, priority, event['id'], event))

    def pop(self) -> dict | None:
        """Remove and return the earliest / highest-priority event. O(log n)."""
        while self._heap:
            dt, priority, eid, event = heapq.heappop(self._heap)
            if eid not in self._deleted:
                return event
        return None

    def peek(self) -> dict | None:
        """Return (but don't remove) the top event. O(log n) amortised."""
        while self._heap:
            dt, priority, eid, event = self._heap[0]
            if eid not in self._deleted:
                return event
            heapq.heappop(self._heap)
        return None

    def remove(self, event_id: str) -> None:
        """Lazily mark an event as deleted. O(1)."""
        self._deleted.add(event_id)

    def top_n(self, n: int, after: datetime | None = None) -> list[dict]:
        """
        Return up to n upcoming events (optionally after a given datetime).
        Does NOT mutate the heap — creates a copy for iteration.
        O(n log n).
        """
        after = after or datetime.utcnow()
        temp = []
        results = []
        heap_copy = list(self._heap)

        while heap_copy and len(results) < n:
            dt, priority, eid, event = heapq.heappop(heap_copy)
            if eid in self._deleted:
                continue
            if dt >= after:
                results.append(event)
            temp.append((dt, priority, eid, event))

        return results

    def build_from_list(self, events: list[dict]) -> None:
        """Rebuild heap from a list of event dicts. O(n)."""
        self._heap = []
        self._deleted = set()
        entries = []
        for event in events:
            try:
                dt = datetime.fromisoformat(event['date'])
                priority = event.get('priority', 3)
                entries.append((dt, priority, event['id'], event))
            except (ValueError, KeyError):
                pass
        heapq.heapify(entries)
        self._heap = entries

    def __len__(self) -> int:
        return len(self._heap) - len(self._deleted)