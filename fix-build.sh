#!/bin/bash

echo "🧹 Cleaning Next.js cache and node_modules..."
rm -rf .next
rm -rf node_modules/.cache

echo "📦 Updating browserslist database..."
npx update-browserslist-db@latest

echo "🔄 Reinstalling dependencies..."
npm ci

echo "✅ All done! Try running 'npm run build' now."
