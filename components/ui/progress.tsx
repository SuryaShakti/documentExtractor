'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// Custom Progress component to bypass Radix UI issue
const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: number;
    max?: number;
  }
>(({ className, value = 0, max = 100, ...props }, ref) => {
  // Ensure value is a valid number between 0 and max
  const safeValue = typeof value === 'number' && !isNaN(value) 
    ? Math.max(0, Math.min(max, value)) 
    : 0;
  
  const percentage = max > 0 ? (safeValue / max) * 100 : 0;

  return (
    <div
      ref={ref}
      className={cn(
        'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
        className
      )}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
});

Progress.displayName = 'Progress';

export { Progress };
