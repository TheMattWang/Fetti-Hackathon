#!/bin/bash

# Deploy SQL Agent Backend to Render
echo "🚀 Deploying SQL Agent Backend to Render..."

# Check if we're in the right directory
if [ ! -f "render.yaml" ]; then
    echo "❌ Error: render.yaml not found. Make sure you're in the server directory."
    exit 1
fi

# Check if requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: requirements.txt not found."
    exit 1
fi

echo "✅ Files found. Ready to deploy!"

echo ""
echo "📋 Next steps:"
echo "1. Push your code to GitHub:"
echo "   git add ."
echo "   git commit -m 'Add Render deployment config'"
echo "   git push origin main"
echo ""
echo "2. Go to https://render.com and:"
echo "   - Sign up/login with GitHub"
echo "   - Click 'New +' → 'Web Service'"
echo "   - Connect your repository"
echo "   - Render will auto-detect the render.yaml"
echo "   - Set OPENAI_API_KEY in Environment Variables"
echo "   - Click 'Create Web Service'"
echo ""
echo "3. Your backend will be available at:"
echo "   https://your-app-name.onrender.com"
echo ""
echo "4. Update your frontend to use the new backend URL"
echo ""
echo "🎉 That's it! Your hybrid architecture will be ready."
