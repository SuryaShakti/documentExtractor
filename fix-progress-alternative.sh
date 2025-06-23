#!/bin/bash

echo "🔧 SWITCHING TO ALTERNATIVE PROGRESS COMPONENT..."

echo "1. Backing up original progress.tsx..."
cp components/ui/progress.tsx components/ui/progress-original.tsx.bak

echo "2. Replacing with alternative progress component..."
cp components/ui/progress-alt.tsx components/ui/progress.tsx

echo "3. Trying to build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ SUCCESS! Alternative Progress component works."
else
    echo "❌ Still failing. Checking other issues..."
    echo "4. Removing all Radix UI Progress usage..."
    
    # Remove @radix-ui/react-progress import and replace with simple div
    echo "Creating minimal progress component..."
    cat > components/ui/progress.tsx << 'EOF'
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number }
>(({ className, value = 0, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('relative h-4 w-full overflow-hidden rounded-full bg-gray-200', className)}
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

    echo "5. Trying build again with minimal component..."
    npm run build
fi

echo "Done!"
