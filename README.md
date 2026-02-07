# CodeSage - AI Code Review Application

## Project Structure
- `backend/` - FastAPI Python backend
- `frontend/` - Static HTML/CSS/JS frontend

## Local Development

### Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
python -m http.server 5500 --bind 127.0.0.1
```

## Deployment

### Frontend → Netlify
1. Go to [netlify.com](https://netlify.com) and sign up
2. Drag & drop the `frontend` folder, OR connect your GitHub repo
3. Set publish directory to `frontend`
4. Done! Your frontend is live

### Backend → Render
1. Go to [render.com](https://render.com) and sign up
2. Create a new **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variable:
   - `GROQ_API_KEY` = your API key
6. Deploy!

### After Deployment
Update `frontend/script.js` line 1:
```javascript
const API_URL = "https://your-app-name.onrender.com";
```

## Environment Variables
- `GROQ_API_KEY` - Required for AI code review functionality
