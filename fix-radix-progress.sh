#!/bin/bash

echo "🔥 FIXING RADIX UI PROGRESS ISSUE..."

echo "1. Removing node_modules and package-lock.json..."
rm -rf node_modules
rm -f package-lock.json

echo "2. Clearing npm cache..."
npm cache clean --force

echo "3. Removing .next build cache..."
rm -rf .next

echo "4. Installing fresh dependencies..."
npm install

echo "5. Updating @radix-ui/react-progress specifically..."
npm install @radix-ui/react-progress@latest

echo "6. Updating all Radix UI packages..."
npm install \
  @radix-ui/react-progress@latest \
  @radix-ui/react-dialog@latest \
  @radix-ui/react-dropdown-menu@latest \
  @radix-ui/react-slot@latest

echo "7. Building the project..."
npm run build

echo "✅ Done! If this still fails, try the alternative fix."
