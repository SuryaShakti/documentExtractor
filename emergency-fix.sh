#!/bin/bash

echo "🔥 EMERGENCY BUILD FIX..."

echo "1. Removing .next cache..."
rm -rf .next

echo "2. Clearing any compiled artifacts..."
find . -name "*.tsbuildinfo" -delete 2>/dev/null || true

echo "3. Building with custom Progress component..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ SUCCESS! Build completed with custom Progress component."
    echo "🎉 The Radix UI Progress issue has been resolved!"
else
    echo "❌ Build still failing. Let's debug further..."
    echo "4. Checking for any remaining Progress imports..."
    grep -r "@radix-ui/react-progress" components/ 2>/dev/null || echo "No Radix Progress imports found in components/"
    
    echo "5. Trying with minimal CSS classes..."
    cat > components/ui/progress.tsx << 'EOF'
'use client';

import * as React from 'react';

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number }
>(({ className = "", value = 0, ...props }, ref) => (
  <div
    ref={ref}
    className={`relative h-4 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}
    {...props}
  >
    <div
      className="h-full bg-blue-600 transition-all duration-300"
      style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }}
    />
  </div>
));

Progress.displayName = 'Progress';
export { Progress };
EOF
    
    echo "6. Building with minimal Progress component..."
    npm run build
fi

echo "Done!"
