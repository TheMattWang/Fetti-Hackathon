#!/bin/bash

echo "🌐 Starting SQL Agent Frontend..."

# Navigate to app directory
cd "$(dirname "$0")/app"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start the development server
echo "🔥 Starting React development server on http://localhost:3000"
npm run dev
