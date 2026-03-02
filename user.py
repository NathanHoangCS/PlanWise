"""
Example user model
If using SQLAlchemy, you'd define your database models here
"""

class User:
    def __init__(self, id, name, email):
        self.id = id
        self.name = name
        self.email = email
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email
        }

# Example with SQLAlchemy (commented out):
# from flask_sqlalchemy import SQLAlchemy
# db = SQLAlchemy()
#
# class User(db.Model):
#     id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(db.String(100), nullable=False)
#     email = db.Column(db.String(120), unique=True, nullable=False)