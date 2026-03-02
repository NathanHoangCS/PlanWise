# Full Stack Project (React + Python/Flask)

A full-stack web application with React frontend and Python/Flask backend.

## Project Structure

```
project/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API integration
│   │   └── utils/        # Helper functions
│   └── public/
├── backend/           # Python/Flask API
│   ├── app/
│   │   ├── routes/       # API endpoints
│   │   ├── models/       # Data models
│   │   ├── services/     # Business logic
│   │   └── utils/        # Helper functions
│   └── requirements.txt
```

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
```

3. Activate virtual environment:
```bash
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Create .env file (copy from .env.example):
```bash
cp .env.example .env
```

6. Run the backend:
```bash
python -m app.main
```

Backend will run on http://localhost:5000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create .env file (copy from .env.example):
```bash
cp .env.example .env
```

4. Run the frontend:
```bash
npm start
```

Frontend will run on http://localhost:3000

## Running Both Together

Option 1: Use two terminal windows
- Terminal 1: Run backend (from backend folder)
- Terminal 2: Run frontend (from frontend folder)

Option 2: Use a process manager like `concurrently` (add to root package.json)

## API Endpoints

- `GET /` - Health check
- `GET /health` - Health status
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user

## Technologies Used

### Frontend
- React 18
- React Router
- CSS

### Backend
- Python 3
- Flask
- Flask-CORS

## Development

- Frontend runs on port 3000
- Backend runs on port 5000
- CORS is enabled for local development