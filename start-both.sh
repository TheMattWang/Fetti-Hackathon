#!/bin/bash

# Start both servers for the SQL Agent system

echo "🚀 Starting SQL Agent System..."

# Function to kill processes on specific ports
kill_port_processes() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "🔥 Killing existing processes on port $port..."
        echo $pids | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
kill_port_processes 9000
kill_port_processes 3000

# Also kill by process name (more thorough cleanup)
pkill -f "python.*main.py" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

sleep 2
echo "✅ Cleanup complete"

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    
    # Kill the background processes we started
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # Give processes time to shut down gracefully
    sleep 2
    
    # Force kill any remaining processes on our ports
    echo "🧹 Final cleanup..."
    kill_port_processes 9000
    kill_port_processes 3000
    
    # Kill by process name as backup
    pkill -f "python.*main.py" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    echo "✅ All servers stopped"
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGINT SIGTERM

# Start backend server
echo "🔥 Starting FastAPI backend server..."
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"
source venv/bin/activate
cd server
python main.py &
BACKEND_PID=$!

# Give backend time to start
sleep 5

# Check if backend started successfully
if ! curl -s http://localhost:9000/health > /dev/null; then
    echo "❌ Backend failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Backend server running on http://localhost:9000"

# Start frontend server
echo "🌐 Starting React frontend server..."
cd "$PROJECT_ROOT/app"
echo "Current directory: $(pwd)"
echo "Checking package.json..."
ls package.json
npm run dev &
FRONTEND_PID=$!

# Give frontend time to start
sleep 3

echo "✅ Frontend server running on http://localhost:3000"
echo ""
echo "🎉 SQL Agent System is ready!"
echo "📱 Open your browser to: http://localhost:3000"
echo "🔍 Backend API: http://localhost:9000"
echo "📊 Health check: http://localhost:9000/health"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for processes
wait
