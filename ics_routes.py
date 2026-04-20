"""
ics_routes.py
-------------
Flask endpoints for Google Calendar / iCalendar sync.

  GET  /api/ics/export          - Download all user events as .ics
  POST /api/ics/import          - Upload a .ics file and import events
"""

import uuid
from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from models import db, Event
from ics_utils import events_to_ics, ics_to_events

ics_bp = Blueprint('ics', __name__, url_prefix='/api/ics')


# ── Export ────────────────────────────────────────────────────────────────────

@ics_bp.route('/export', methods=['GET'])
def export_ics():
    """
    Export all events for the authenticated user as a .ics file.
    Returns a downloadable file response.
    """
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            user_id = int(identity)
    except Exception:
        pass

    # Also accept user_id as query param as fallback
    if not user_id:
        user_id = request.args.get('user_id', type=int)

    query = Event.query
    if user_id:
        query = query.filter_by(user_id=user_id)

    events = [e.to_dict() for e in query.all()]
    ics_content = events_to_ics(events)

    return Response(
        ics_content,
        mimetype='text/calendar',
        headers={
            'Content-Disposition': 'attachment; filename=planwise-calendar.ics',
            'Content-Type': 'text/calendar; charset=utf-8',
        }
    )


# ── Import ────────────────────────────────────────────────────────────────────

@ics_bp.route('/import', methods=['POST'])
def import_ics():
    """
    Import events from an uploaded .ics file.
    Accepts multipart/form-data with a 'file' field.
    Returns list of imported events.
    """
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            user_id = int(identity)
    except Exception:
        pass

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if not file.filename.endswith('.ics'):
        return jsonify({'error': 'File must be a .ics file'}), 400

    try:
        ics_content = file.read().decode('utf-8')
    except Exception:
        return jsonify({'error': 'Could not read file'}), 400

    parsed_events = ics_to_events(ics_content)
    if not parsed_events:
        return jsonify({'error': 'No valid events found in file'}), 400

    imported = []
    skipped  = 0

    from datetime import datetime
    for ev_data in parsed_events:
        try:
            # Check for duplicate by title + date
            dt = datetime.fromisoformat(ev_data['date'])
            exists = Event.query.filter_by(
                title=ev_data['title'],
                user_id=user_id,
            ).first()
            if exists:
                skipped += 1
                continue

            event = Event(
                id       = str(uuid.uuid4())[:7],
                title    = ev_data['title'],
                type     = ev_data['type'],
                color    = ev_data['color'],
                date     = dt,
                hour     = ev_data['hour'],
                min      = ev_data['min'],
                end_hour = ev_data['end_hour'],
                end_min  = ev_data['end_min'],
                priority = ev_data.get('priority', 3),
                user_id  = user_id,
            )
            db.session.add(event)
            imported.append(event.to_dict())
        except Exception:
            skipped += 1
            continue

    db.session.commit()

    return jsonify({
        'imported': len(imported),
        'skipped':  skipped,
        'events':   imported,
        'message':  f'Successfully imported {len(imported)} events' + (f', skipped {skipped} duplicates' if skipped else ''),
    }), 201