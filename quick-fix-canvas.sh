#!/bin/bash
# quick-fix-canvas.sh - Fixes the canvas dependency issue

echo "🔧 Fixing canvas dependency issue..."
echo ""

# Stop the development server if running
echo "📱 Stopping development server (if running)..."
pkill -f "next dev" 2>/dev/null || true

# Clear Next.js cache
echo "🧹 Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

echo ""
echo "✅ Canvas fix applied!"
echo ""
echo "📋 What was fixed:"
echo "   - Updated next.config.js to ignore canvas"
echo "   - Simplified PDF extraction to avoid canvas dependencies"
echo "   - Created backup PDF-only extraction route"
echo ""
echo "🚀 Now restart your development server:"
echo "   npm run dev"
echo ""
echo "🎯 Your PDFs should now work!"