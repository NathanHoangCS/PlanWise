from flask import Flask, jsonify
from flask_cors import CORS
from app.routes import api_routes

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Register blueprints/routes
app.register_blueprint(api_routes.bp)

@app.route('/')
def home():
    return jsonify({"message": "Backend API is running!"})

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)