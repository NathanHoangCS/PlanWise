import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from models import db
from api_routes import bp
from ai_routes import ai_bp
from auth_routes import auth_bp, bcrypt
from ics_routes import ics_bp

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

    app.config['SQLALCHEMY_DATABASE_URI']        = 'sqlite:///planwise.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY']                 = os.environ.get('JWT_SECRET', 'planwise-dev-secret-change-in-prod')
    app.config['JWT_ACCESS_TOKEN_EXPIRES']       = False

    db.init_app(app)
    bcrypt.init_app(app)
    JWTManager(app)

    app.register_blueprint(bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(ics_bp)

    @app.route('/')
    def home():
        return jsonify({'message': 'PlanWise API is running!'})

    @app.route('/health')
    def health():
        return jsonify({'status': 'ok'})

    with app.app_context():
        db.create_all()

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)