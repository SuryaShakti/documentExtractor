#!/bin/bash
# test-pdf-fix.sh - Tests the PDF extraction fixes

echo "🧪 Testing PDF extraction fixes..."
echo ""

# Stop the development server if running
echo "📱 Stopping development server..."
pkill -f "next dev" 2>/dev/null || true
sleep 2

# Clear cache
echo "🧹 Clearing cache..."
rm -rf .next

# Start development server in background
echo "🚀 Starting development server..."
npm run dev &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 10

# Test the PDF parsing
echo "🧪 Testing PDF download and parsing..."
curl -s "http://localhost:3000/api/test-pdf" | jq '.' || echo "Install jq for better JSON formatting"

echo ""
echo "📋 Now test your extraction with:"
echo "   - Go to your dashboard"
echo "   - Click extract on a PDF document" 
echo "   - Check the server console for logs"

# Keep server running
echo ""
echo "🎯 Development server is running (PID: $SERVER_PID)"
echo "   Press Ctrl+C to stop"
wait $SERVER_PID