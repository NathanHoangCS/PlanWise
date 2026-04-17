from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)
    profile       = db.Column(db.String(50),  default='')
    priorities    = db.Column(db.String(200), default='')
    peak_time     = db.Column(db.String(50),  default='')
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    events = db.relationship('Event', backref='owner', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':         self.id,
            'name':       self.name,
            'email':      self.email,
            'profile':    self.profile,
            'priorities': self.priorities.split(',') if self.priorities else [],
            'peak_time':  self.peak_time,
            'created_at': self.created_at.isoformat(),
        }


class Event(db.Model):
    __tablename__ = 'events'

    id         = db.Column(db.String(36), primary_key=True)
    title      = db.Column(db.String(200), nullable=False)
    type       = db.Column(db.String(50),  default='meeting')
    color      = db.Column(db.String(20),  default='accent')
    date       = db.Column(db.DateTime,    nullable=False)
    hour       = db.Column(db.Integer,     nullable=False)
    min        = db.Column(db.Integer,     default=0)
    end_hour   = db.Column(db.Integer,     nullable=False)
    end_min    = db.Column(db.Integer,     default=0)
    priority   = db.Column(db.Integer,     default=3)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':       self.id,
            'title':    self.title,
            'type':     self.type,
            'color':    self.color,
            'date':     self.date.isoformat(),
            'hour':     self.hour,
            'min':      self.min,
            'end_hour': self.end_hour,
            'end_min':  self.end_min,
            'priority': self.priority,
            'user_id':  self.user_id,
        }