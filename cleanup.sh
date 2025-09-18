#!/bin/bash

# Cleanup script to kill all SQL Agent processes

echo "🧹 Cleaning up SQL Agent processes..."

# Function to kill processes on specific ports
kill_port_processes() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "🔥 Killing processes on port $port: $pids"
        echo $pids | xargs kill -9 2>/dev/null || true
        sleep 1
    else
        echo "✅ No processes found on port $port"
    fi
}

# Kill processes on our specific ports
kill_port_processes 9000
kill_port_processes 3000

# Kill by process name patterns
echo "🔥 Killing processes by name..."

# Python FastAPI server
python_pids=$(pgrep -f "python.*main.py" 2>/dev/null || true)
if [ -n "$python_pids" ]; then
    echo "Killing Python FastAPI processes: $python_pids"
    echo $python_pids | xargs kill -9 2>/dev/null || true
else
    echo "✅ No Python FastAPI processes found"
fi

# Node.js dev server
npm_pids=$(pgrep -f "npm run dev" 2>/dev/null || true)
if [ -n "$npm_pids" ]; then
    echo "Killing npm dev processes: $npm_pids"
    echo $npm_pids | xargs kill -9 2>/dev/null || true
else
    echo "✅ No npm dev processes found"
fi

# Vite dev server
vite_pids=$(pgrep -f "vite" 2>/dev/null || true)
if [ -n "$vite_pids" ]; then
    echo "Killing Vite processes: $vite_pids"
    echo $vite_pids | xargs kill -9 2>/dev/null || true
else
    echo "✅ No Vite processes found"
fi

# Node processes (broader cleanup)
node_pids=$(pgrep -f "node.*vite" 2>/dev/null || true)
if [ -n "$node_pids" ]; then
    echo "Killing Node Vite processes: $node_pids"
    echo $node_pids | xargs kill -9 2>/dev/null || true
fi

sleep 2

# Final check
echo ""
echo "📊 Final port status:"
if lsof -Pi :9000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 9000 still in use"
else
    echo "✅ Port 9000 is free"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 3000 still in use"
else
    echo "✅ Port 3000 is free"
fi

echo ""
echo "🎉 Cleanup complete!"
