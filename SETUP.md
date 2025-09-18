# 🚀 SQL Agent with Server-Driven UI - Local Setup

This guide will help you run the complete SQL Agent system locally, including both the LangGraph backend and React frontend.

## 📋 Prerequisites

- **Python 3.10+** with virtual environment
- **Node.js 18.0+** and npm
- **Google API Key** for Gemini (set in `.env`)

## 🏗️ Architecture Overview

```
┌─────────────────┐    HTTP/SSE    ┌─────────────────┐    LangGraph    ┌─────────────────┐
│   React Frontend│ ◄──────────────► │  FastAPI Server │ ◄──────────────► │  SQL Agent      │
│   (Port 3000)   │                 │   (Port 8000)   │                 │  (LangGraph)    │
└─────────────────┘                 └─────────────────┘                 └─────────────────┘
```

## 🔧 Setup Instructions

### 1. Environment Setup

Create a `.env` file in the project root:

```bash
# Copy your Google API key here
GOOGLE=your_google_api_key_here
```

### 2. Backend Setup (Terminal 1)

```bash
# Navigate to project root
cd /path/to/Fetti-Hackathon

# Activate your virtual environment
source venv/bin/activate

# Install server dependencies
cd server
pip install -r requirements.txt

# Go back to project root
cd ..

# Start the backend server
./start-backend.sh
```

The FastAPI server will start on `http://localhost:9000`

### 3. Frontend Setup (Terminal 2) 

```bash
# Navigate to project root
cd /path/to/Fetti-Hackathon

# Start the frontend
./start-frontend.sh
```

The React frontend will start on `http://localhost:3000`

## 🎯 Quick Start Commands

### Option 1: Using the Combined Script (Recommended)
```bash
# Starts both servers with automatic cleanup
./start-both.sh

# Press Ctrl+C to stop both servers cleanly
```

### Option 2: Using Individual Scripts
```bash
# Terminal 1 - Backend
./start-backend.sh

# Terminal 2 - Frontend  
./start-frontend.sh
```

### Option 3: Manual Commands
```bash
# Terminal 1 - Backend
cd server
python main.py

# Terminal 2 - Frontend
cd app
npm run dev
```

### Option 4: Manual Cleanup
```bash
# If you need to manually kill all processes
./cleanup.sh
```

## 🧪 Testing the System

1. **Open your browser** to `http://localhost:3000`

2. **Check connection status** - You should see a green "Connected" indicator

3. **Try a sample query**:
   - "What is the most common place for drop offs?"
   - "Show me daily trip counts"
   - "Which users have taken the most trips?"

4. **Watch the magic happen**:
   - Your query gets sent to the FastAPI server
   - The server processes it with your LangGraph SQL agent
   - Results stream back as UI components (Tables/Charts/Maps)
   - The frontend updates in real-time!

## 🔍 Troubleshooting

### Backend Issues

**Agent fails to initialize:**
```bash
# Check if your .env file has the GOOGLE API key
cat .env

# Test the agent directly
cd agent
python agent.py
```

**Database connection issues:**
```bash
# Check if rides.sqlite exists in project root
ls -la rides.sqlite

# Test database connection
python -c "from agent.utils.tools import DatabaseManager; dm = DatabaseManager(); dm.print_database_info()"
```

### Frontend Issues

**"Not connected to agent" error:**
- Make sure the backend server is running on port 9000
- Check browser console for CORS errors
- Verify the endpoint in App.tsx matches your backend

**Dependencies issues:**
```bash
cd app
rm -rf node_modules package-lock.json
npm install
```

### Common Issues

**Port conflicts:**
- Backend (9000): Change port in `server/main.py`
- Frontend (3000): Change port in `app/vite.config.ts`

**CORS errors:**
- Ensure frontend URL is in CORS origins in `server/main.py`
- Check that both servers are running on expected ports

## 📊 What You Should See

### Frontend Interface
- Clean, modern UI with query input
- Connection status indicator
- Real-time streaming updates
- Interactive tables with sorting/filtering
- Dynamic charts and visualizations
- Error handling and debug information

### Backend Logs
- Agent initialization messages
- Database connection info
- Query processing logs
- SSE client connections
- Request/response tracking

## 🎨 UI Components

The system supports three whitelisted component types:

### 📋 Tables
- Interactive sorting and filtering
- Pagination support
- Configurable columns
- Security: Max 200 rows per table

### 📊 Charts  
- Line, bar, and scatter plots
- Multi-series support
- Custom styling and colors
- Security: Max 1000 points per chart

### 🗺️ Maps
- GeoJSON feature support
- Configurable zoom and center
- Popup information display
- Security: Max 5000 features per map

## 🔒 Security Features

- **Component Whitelisting**: Only approved components render
- **Patch Validation**: All updates validated with Zod schemas  
- **Payload Limits**: Size restrictions on all data
- **CORS Protection**: Restricted to known origins
- **Error Boundaries**: Graceful failure handling
- **Request Tracking**: Full observability with request IDs

## 🚀 Development Features

- **Hot Reload**: Both frontend and backend support hot reloading
- **Debug Mode**: Comprehensive debug panel in development
- **Error Handling**: User-friendly error messages
- **Type Safety**: Full TypeScript coverage
- **Code Quality**: ESLint and formatting rules

## 📝 Next Steps

Once you have the system running, you can:

1. **Customize the agent responses** in `server/main.py`
2. **Add new component types** to the frontend registry
3. **Enhance the SQL processing** in the agent folder
4. **Add authentication** and user management
5. **Deploy to production** with proper environment configs

## 🆘 Need Help?

If you encounter issues:

1. Check both terminal outputs for error messages
2. Verify all dependencies are installed
3. Ensure your `.env` file is properly configured
4. Test each component individually
5. Check the browser console for frontend errors

The system is designed to be robust and provide clear error messages to help you debug any issues!
