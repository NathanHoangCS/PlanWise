import os
from flask import Flask, jsonify
from flask_cors import CORS
from models import db
from api_routes import bp
from ai_routes import ai_bp

def create_app():
    app = Flask(__name__)
    CORS(app)

    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///planwise.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    app.register_blueprint(bp)
    app.register_blueprint(ai_bp)

    @app.route('/')
    def home():
        return jsonify({'message': 'PlanWise API is running!'})

    @app.route('/health')
    def health():
        return jsonify({'status': 'ok'})

    with app.app_context():
        db.create_all()
        # No seeding — users start with a blank slate

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)