#!/bin/bash

# Setup script for local development

echo "Setting up local development environment..."

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Creating .env.local from env.example..."
    cp env.example .env.local
    echo "✅ Created .env.local"
    echo "📝 Please update .env.local with your local backend URL"
else
    echo "✅ .env.local already exists"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your backend URL"
echo "2. Start your backend server"
echo "3. Run 'npm run dev' to start the frontend"
echo ""
echo "For production deployment, see DEPLOYMENT.md"
