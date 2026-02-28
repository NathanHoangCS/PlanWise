from flask import Blueprint, jsonify, request

bp = Blueprint('api', __name__, url_prefix='/api')

@bp.route('/users', methods=['GET'])
def get_users():
    """Get all users - example endpoint"""
    users = [
        {"id": 1, "name": "John Doe", "email": "john@example.com"},
        {"id": 2, "name": "Jane Smith", "email": "jane@example.com"}
    ]
    return jsonify(users)

@bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Get a specific user by ID"""
    user = {"id": user_id, "name": "Example User", "email": "user@example.com"}
    return jsonify(user)

@bp.route('/users', methods=['POST'])
def create_user():
    """Create a new user"""
    data = request.get_json()
    # Add your logic here to save to database
    return jsonify({"message": "User created", "data": data}), 201