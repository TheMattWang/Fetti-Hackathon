#!/bin/bash

# Custom build script to handle caniuse-lite issues

echo "🔧 Installing dependencies..."
npm ci

echo "🔄 Updating browserslist database..."
npx update-browserslist-db@latest

echo "🧹 Cleaning caniuse-lite cache..."
rm -rf node_modules/.cache
rm -rf .next

echo "🏗️ Building Next.js app..."
npm run build

echo "✅ Build completed successfully!"
