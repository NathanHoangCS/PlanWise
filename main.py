from flask import Flask, jsonify
from flask_cors import CORS
from models import db
from api_routes import bp

def create_app():
    app = Flask(__name__)
    CORS(app)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///planwise.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    app.register_blueprint(bp)

    @app.route('/')
    def home():
        return jsonify({'message': 'PlanWise API is running!'})

    @app.route('/health')
    def health():
        return jsonify({'status': 'ok'})

    with app.app_context():
        db.create_all()
        _seed_data()

    return app


def _seed_data():
    from models import User, Event
    from datetime import datetime, timedelta
    import uuid

    if User.query.count() > 0:
        return

    users = [
        User(name='Nathan Hoang', email='nathan@planwise.com'),
        User(name='Jane Smith',   email='jane@planwise.com'),
        User(name='Alex Chen',    email='alex@planwise.com'),
    ]
    db.session.add_all(users)
    db.session.flush()

    today = datetime.today().replace(second=0, microsecond=0)
    events = [
        Event(id=str(uuid.uuid4())[:7], title='Team Standup',
              type='meeting', color='accent', priority=2,
              date=today.replace(hour=9, minute=0),
              hour=9, min=0, end_hour=9, end_min=30),
        Event(id=str(uuid.uuid4())[:7], title='Deep Work Block',
              type='focus', color='focus', priority=1,
              date=(today + timedelta(days=1)).replace(hour=10, minute=0),
              hour=10, min=0, end_hour=12, end_min=0),
        Event(id=str(uuid.uuid4())[:7], title='Product Review',
              type='meeting', color='accent', priority=2,
              date=(today + timedelta(days=2)).replace(hour=14, minute=0),
              hour=14, min=0, end_hour=15, end_min=0),
        Event(id=str(uuid.uuid4())[:7], title='1:1 with Manager',
              type='meeting', color='accent', priority=1,
              date=(today + timedelta(days=3)).replace(hour=11, minute=0),
              hour=11, min=0, end_hour=11, end_min=30),
    ]
    db.session.add_all(events)
    db.session.commit()
    print('Database seeded with sample data')


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)