"use client";

// NEW: Cell-level extraction status indicators (additive enhancement)
// Shows customization status, confidence, and extraction info

import { useState, useEffect } from "react";
import {
  Target,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  Edit3,
  History,
  Zap,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface CellStatusIndicatorProps {
  value: string;
  confidence: number;
  isCustomized: boolean;
  extractedAt?: Date;
  extractionHistory?: Array<{
    prompt: string;
    result: string;
    confidence: number;
    timestamp: Date;
    model?: string;
  }>;
  onCustomizeClick?: () => void;
  onQuickExtractClick?: () => void;
  showDetails?: boolean;
  variant?: "chip" | "full" | "minimal";
}

export function CellStatusIndicator({
  value,
  confidence,
  isCustomized,
  extractedAt,
  extractionHistory = [],
  onCustomizeClick,
  onQuickExtractClick,
  showDetails = false,
  variant = "chip",
}: CellStatusIndicatorProps) {
  const [showHover, setShowHover] = useState(false);

  const getStatusColor = () => {
    if (!value) return "bg-gray-100 text-gray-600 border-gray-200";
    if (confidence >= 0.8) return "bg-green-100 text-green-800 border-green-200";
    if (confidence >= 0.5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getStatusIcon = () => {
    if (!value) return <Clock className="h-3 w-3" />;
    if (confidence >= 0.8) return <CheckCircle className="h-3 w-3" />;
    if (confidence >= 0.5) return <AlertCircle className="h-3 w-3" />;
    return <X className="h-3 w-3" />;
  };

  const getConfidenceTrend = () => {
    if (extractionHistory.length < 2) return null;
    
    const current = confidence;
    const previous = extractionHistory[extractionHistory.length - 2]?.confidence || 0;
    
    if (current > previous) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (current < previous) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Minimal variant (just the indicator)
  if (variant === "minimal") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              {isCustomized && (
                <Target className="h-3 w-3 text-blue-600" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div>Confidence: {Math.round(confidence * 100)}%</div>
              {isCustomized && <div>Custom prompt used</div>}
              {extractedAt && <div>Extracted {formatTimeAgo(extractedAt)}</div>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Chip variant (default)
  if (variant === "chip") {
    return (
      <HoverCard open={showHover} onOpenChange={setShowHover}>
        <HoverCardTrigger asChild>
          <div
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all ${getStatusColor()} ${
              isCustomized ? 'ring-2 ring-blue-400 ring-offset-1' : ''
            }`}
            onMouseEnter={() => setShowHover(true)}
            onMouseLeave={() => setShowHover(false)}
          >
            {getStatusIcon()}
            <span className="max-w-[150px] truncate">
              {value || "No data"}
            </span>
            {isCustomized && (
              <Target className="h-3 w-3 text-blue-600" title="Custom prompt used" />
            )}
            {getConfidenceTrend()}
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80" side="top">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Cell Status</span>
                {isCustomized && (
                  <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
                    <Target className="h-3 w-3 mr-1" />
                    Custom
                  </Badge>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {Math.round(confidence * 100)}% confidence
              </div>
            </div>

            {/* Value */}
            <div>
              <div className="text-xs text-gray-600 mb-1">Extracted Value</div>
              <div className="text-sm font-medium bg-gray-50 p-2 rounded border">
                {value || <span className="text-gray-400">No value extracted</span>}
              </div>
            </div>

            {/* Confidence Bar */}
            <div>
              <div className="text-xs text-gray-600 mb-2">Confidence Level</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      confidence >= 0.8 ? 'bg-green-500' :
                      confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${confidence * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium">
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Last Extracted */}
            {extractedAt && (
              <div>
                <div className="text-xs text-gray-600 mb-1">Last Extracted</div>
                <div className="text-xs text-gray-700">
                  {formatTimeAgo(extractedAt)}
                </div>
              </div>
            )}

            {/* Extraction History */}
            {extractionHistory.length > 0 && (
              <div>
                <div className="text-xs text-gray-600 mb-2">Recent History</div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {extractionHistory.slice(-3).reverse().map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">
                        {Math.round(entry.confidence * 100)}% confidence
                      </span>
                      <span className="text-gray-500">
                        {formatTimeAgo(new Date(entry.timestamp))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex items-center gap-2">
              {onCustomizeClick && (
                <Button
                  onClick={onCustomizeClick}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  Customize
                </Button>
              )}
              {onQuickExtractClick && (
                <Button
                  onClick={onQuickExtractClick}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Re-extract
                </Button>
              )}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  // Full variant (detailed view)
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">Cell Extraction Status</h4>
          {isCustomized && (
            <Badge variant="default" className="bg-blue-100 text-blue-800">
              <Target className="h-3 w-3 mr-1" />
              Custom Prompt
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm text-gray-600">
            {Math.round(confidence * 100)}% confidence
          </span>
        </div>
      </div>

      {/* Current Value */}
      <div>
        <div className="text-sm text-gray-600 mb-2">Current Value</div>
        <div className="p-3 bg-gray-50 rounded border text-sm">
          {value || <span className="text-gray-400">No value extracted</span>}
        </div>
      </div>

      {/* Confidence Visualization */}
      <div>
        <div className="text-sm text-gray-600 mb-2">Confidence Level</div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all ${
                  confidence >= 0.8 ? 'bg-green-500' :
                  confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${confidence * 100}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium w-12">
              {Math.round(confidence * 100)}%
            </span>
            {getConfidenceTrend()}
          </div>
          <div className="text-xs text-gray-500">
            {confidence >= 0.8 && "High confidence - extraction likely correct"}
            {confidence >= 0.5 && confidence < 0.8 && "Medium confidence - may need verification"}
            {confidence < 0.5 && "Low confidence - likely needs correction"}
          </div>
        </div>
      </div>

      {/* Extraction Details */}
      {extractedAt && (
        <div>
          <div className="text-sm text-gray-600 mb-2">Extraction Details</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Last Extracted:</span>
              <div>{formatTimeAgo(extractedAt)}</div>
            </div>
            <div>
              <span className="text-gray-500">Total Extractions:</span>
              <div>{extractionHistory.length + 1}</div>
            </div>
          </div>
        </div>
      )}

      {/* Extraction History */}
      {extractionHistory.length > 0 && (
        <div>
          <div className="text-sm text-gray-600 mb-2 flex items-center gap-1">
            <History className="h-4 w-4" />
            Extraction History
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {extractionHistory.slice(-5).reverse().map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    entry.confidence >= 0.8 ? 'bg-green-500' :
                    entry.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span>{Math.round(entry.confidence * 100)}% confidence</span>
                </div>
                <span className="text-gray-500">
                  {formatTimeAgo(new Date(entry.timestamp))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t">
        {onCustomizeClick && (
          <Button
            onClick={onCustomizeClick}
            size="sm"
            variant="outline"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            {isCustomized ? "Edit Custom Prompt" : "Customize Prompt"}
          </Button>
        )}
        {onQuickExtractClick && (
          <Button
            onClick={onQuickExtractClick}
            size="sm"
            variant="outline"
          >
            <Zap className="h-4 w-4 mr-2" />
            Re-extract Data
          </Button>
        )}
      </div>
    </div>
  );
}

export default CellStatusIndicator;
