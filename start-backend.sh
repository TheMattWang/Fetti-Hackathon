#!/bin/bash

echo "🚀 Starting SQL Agent Backend Server..."

# Navigate to project root
cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
fi

# Install server dependencies if needed
echo "📦 Installing server dependencies..."
cd server
pip install -r requirements.txt

# Start the FastAPI server
echo "🔥 Starting FastAPI server on http://localhost:9000"
python main.py
