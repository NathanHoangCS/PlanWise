"""
ics_utils.py
------------
Utilities for importing and exporting calendar events as .ics (iCalendar) files.
RFC 5545 compliant — works with Google Calendar, Apple Calendar, Outlook.
"""

from datetime import datetime, timezone
import uuid
import re


# ── Export ────────────────────────────────────────────────────────────────────

def events_to_ics(events: list[dict]) -> str:
    """
    Convert a list of event dicts to a valid .ics string.
    Each event must have: title, date, hour, min, end_hour, end_min, type
    """
    lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//PlanWise//PlanWise Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
    ]

    for ev in events:
        try:
            dt = datetime.fromisoformat(ev['date']) if isinstance(ev['date'], str) else ev['date']
            # Build start datetime
            start = dt.replace(
                hour=ev.get('hour', dt.hour),
                minute=ev.get('min', 0),
                second=0,
                microsecond=0,
            )
            # Build end datetime
            end = dt.replace(
                hour=ev.get('end_hour', ev.get('hour', dt.hour) + 1),
                minute=ev.get('end_min', 0),
                second=0,
                microsecond=0,
            )
            # Format as iCal datetime (UTC)
            fmt = '%Y%m%dT%H%M%SZ'
            dtstart = start.strftime(fmt)
            dtend   = end.strftime(fmt)
            dtstamp = datetime.utcnow().strftime(fmt)

            # Map type to category
            categories = {
                'focus':    'FOCUS',
                'meeting':  'MEETING',
                'personal': 'PERSONAL',
            }.get(ev.get('type', 'personal'), 'PERSONAL')

            uid = ev.get('id', str(uuid.uuid4()))

            lines += [
                'BEGIN:VEVENT',
                f'UID:{uid}@planwise',
                f'DTSTAMP:{dtstamp}',
                f'DTSTART:{dtstart}',
                f'DTEND:{dtend}',
                f'SUMMARY:{_escape(ev.get("title", "Event"))}',
                f'CATEGORIES:{categories}',
                f'DESCRIPTION:PlanWise event - {ev.get("type", "personal")}',
                'END:VEVENT',
            ]
        except Exception:
            continue

    lines.append('END:VCALENDAR')
    return '\r\n'.join(lines)


# ── Import ────────────────────────────────────────────────────────────────────

def ics_to_events(ics_content: str) -> list[dict]:
    """
    Parse a .ics string into a list of event dicts compatible with PlanWise.
    Handles VEVENT blocks, DTSTART, DTEND, SUMMARY, CATEGORIES.
    """
    events   = []
    in_event = False
    current  = {}

    for raw_line in ics_content.splitlines():
        line = raw_line.strip()

        if line == 'BEGIN:VEVENT':
            in_event = True
            current  = {}
            continue

        if line == 'END:VEVENT':
            in_event = False
            ev = _parse_vevent(current)
            if ev:
                events.append(ev)
            continue

        if in_event and ':' in line:
            key, _, value = line.partition(':')
            # Handle property parameters (e.g. DTSTART;TZID=America/New_York:...)
            key = key.split(';')[0].upper()
            current[key] = value.strip()

    return events


# ── Helpers ───────────────────────────────────────────────────────────────────

def _escape(text: str) -> str:
    """Escape special characters for iCalendar."""
    return text.replace('\\', '\\\\').replace(';', '\\;').replace(',', '\\,').replace('\n', '\\n')


def _parse_vevent(props: dict) -> dict | None:
    """Convert raw VEVENT properties into a PlanWise event dict."""
    try:
        title   = props.get('SUMMARY', 'Imported Event')
        title   = title.replace('\\,', ',').replace('\\;', ';').replace('\\n', ' ')
        dtstart = props.get('DTSTART', '')
        dtend   = props.get('DTEND',   '')

        start = _parse_ical_dt(dtstart)
        end   = _parse_ical_dt(dtend) if dtend else None

        if not start:
            return None

        end_hour = end.hour if end else start.hour + 1
        end_min  = end.minute if end else 0

        # Infer type from categories or title keywords
        categories = props.get('CATEGORIES', '').lower()
        ev_type = 'meeting'
        if 'focus' in categories or any(w in title.lower() for w in ['study', 'deep work', 'focus', 'coding', 'writing']):
            ev_type = 'focus'
        elif 'personal' in categories or any(w in title.lower() for w in ['gym', 'lunch', 'dinner', 'personal', 'family']):
            ev_type = 'personal'

        return {
            'id':       props.get('UID', str(uuid.uuid4()))[:7],
            'title':    title,
            'type':     ev_type,
            'color':    'focus' if ev_type == 'focus' else 'accent',
            'date':     start.isoformat(),
            'hour':     start.hour,
            'min':      start.minute,
            'end_hour': end_hour,
            'end_min':  end_min,
            'priority': 3,
        }
    except Exception:
        return None


def _parse_ical_dt(dt_str: str) -> datetime | None:
    """Parse iCalendar datetime string to Python datetime."""
    if not dt_str:
        return None
    dt_str = dt_str.strip().rstrip('Z')
    formats = [
        '%Y%m%dT%H%M%S',
        '%Y%m%dT%H%M',
        '%Y%m%d',
    ]
    for fmt in formats:
        try:
            return datetime.strptime(dt_str[:len(fmt.replace('%Y','0000').replace('%m','00').replace('%d','00').replace('%H','00').replace('%M','00').replace('%S','00'))], fmt)
        except ValueError:
            continue
    # Fallback: try removing timezone info
    clean = re.sub(r'[+-]\d{4}$', '', dt_str)
    for fmt in formats:
        try:
            return datetime.strptime(clean[:15], fmt)
        except ValueError:
            continue
    return None