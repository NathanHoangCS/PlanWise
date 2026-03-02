"""
User service - handles business logic for user operations
Separates business logic from route handlers
"""

from app.models.user import User

class UserService:
    @staticmethod
    def get_all_users():
        """Retrieve all users"""
        # In a real app, this would query the database
        users = [
            User(1, "John Doe", "john@example.com"),
            User(2, "Jane Smith", "jane@example.com")
        ]
        return [user.to_dict() for user in users]
    
    @staticmethod
    def get_user_by_id(user_id):
        """Retrieve a user by ID"""
        # In a real app, query from database
        user = User(user_id, "Example User", "user@example.com")
        return user.to_dict()
    
    @staticmethod
    def create_user(data):
        """Create a new user"""
        # In a real app, save to database
        new_user = User(
            id=None,  # Database would auto-generate
            name=data.get('name'),
            email=data.get('email')
        )
        return new_user.to_dict()