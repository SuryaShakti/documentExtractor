#!/bin/bash

# Stop any existing development server
echo "🛑 Stopping existing development server..."
pkill -f "next dev" 2>/dev/null || true

# Wait a moment
sleep 2

# Start the development server
echo "🚀 Starting development server with debugging..."
cd /Users/surya/Desktop/PRACTICE_CODE/documentExtractor
npm run dev
