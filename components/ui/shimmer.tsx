"use client";

import { cn } from "@/lib/utils";

interface ShimmerProps {
  className?: string;
  variant?: "data-chip" | "text" | "rectangle" | "circle";
  bgColor?: string;
}

export function Shimmer({ 
  className, 
  variant = "rectangle",
  bgColor = "#3b82f6"
}: ShimmerProps) {
  const baseClasses = "animate-pulse relative overflow-hidden";
  
  const getVariantClasses = () => {
    switch (variant) {
      case "data-chip":
        return "h-6 rounded px-3 py-1 inline-flex items-center";
      case "text":
        return "h-4 rounded";
      case "circle":
        return "rounded-full";
      case "rectangle":
      default:
        return "rounded";
    }
  };

  const shimmerEffect = (
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
  );

  if (variant === "data-chip") {
    return (
      <div 
        className={cn(
          baseClasses,
          getVariantClasses(),
          "text-white text-xs font-medium opacity-60",
          className
        )}
        style={{ backgroundColor: bgColor }}
      >
        {shimmerEffect}
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-white/30 rounded-full" />
          <div className="w-16 h-3 bg-white/30 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        baseClasses,
        getVariantClasses(),
        "bg-gray-200",
        className
      )}
    >
      {shimmerEffect}
    </div>
  );
}

// Add the shimmer keyframe animation to global CSS
export const shimmerStyles = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;
