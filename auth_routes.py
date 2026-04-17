"""
auth_routes.py
--------------
Authentication endpoints for PlanWise.

  POST /api/auth/register  - Create a new account
  POST /api/auth/login     - Login and get JWT token
  GET  /api/auth/me        - Get current user info (requires token)
  POST /api/auth/logout    - Logout (client-side token removal)
"""

from flask import Blueprint, jsonify, request
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from models import db, User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
bcrypt  = Bcrypt()


# ── Register ──────────────────────────────────────────────────────────────────

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Create a new user account.
    Body: { name, email, password, profile, priorities, peak_time }
    """
    data = request.get_json() or {}

    name     = data.get('name', '').strip()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    # Validation
    if not name or not email or not password:
        return jsonify({'error': 'name, email and password are required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists'}), 409

    # Hash password and create user
    pw_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    user = User(
        name          = name,
        email         = email,
        password_hash = pw_hash,
        profile       = data.get('profile', ''),
        priorities    = ','.join(data.get('priorities', [])),
        peak_time     = data.get('peak_time', ''),
    )
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'token': token,
        'user':  user.to_dict(),
    }), 201


# ── Login ─────────────────────────────────────────────────────────────────────

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login with email + password.
    Body: { email, password }
    Returns JWT token.
    """
    data = request.get_json() or {}

    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'email and password are required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.password_hash:
        return jsonify({'error': 'Invalid email or password'}), 401

    if not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({
        'token': token,
        'user':  user.to_dict(),
    })


# ── Me ────────────────────────────────────────────────────────────────────────

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    """Return the currently logged-in user's info."""
    user_id = int(get_jwt_identity())
    user    = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())


# ── Logout ────────────────────────────────────────────────────────────────────

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Logout — token invalidation is handled client-side (remove from localStorage).
    In production you'd maintain a token denylist.
    """
    return jsonify({'message': 'Logged out successfully'})