"use client";

import { Calendar, DollarSign, MapPin, User, Building, AlignLeft, CheckCircle, XCircle, Clock, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExtractedData } from "./document-table";

interface DataChipProps {
  data: ExtractedData;
}

export function DataChip({ data }: DataChipProps) {
  // Determine chip type and styling based on data type or content pattern
  const detectType = () => {
    if (data.type) return data.type;
    
    // If type is not explicitly set, try to detect from value
    const value = data.value;
    
    // Check for date patterns
    if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(value)) {
      return "date";
    }
    
    // Check for price patterns
    if (/^\$?\d+(\.\d{2})?$/.test(value)) {
      return "price";
    }
    
    // Check for location patterns (city, state or address-like)
    if (/^[A-Z][a-z]+,\s[A-Z]{2}$/.test(value)) {
      return "location";
    }
    
    // Default to text
    return "text";
  };
  
  const type = data.type || detectType();
  
  // Define chip styles and icons based on type
  const getChipStyles = () => {
    switch (type) {
      case "status":
        if (data.status === "yes") {
          return {
            icon: <CheckCircle className="h-3 w-3" />,
            bgColor: "bg-green-50",
            textColor: "text-green-700",
            borderColor: "border-green-200",
            dotColor: "bg-green-500"
          };
        } else if (data.status === "no") {
          return {
            icon: <XCircle className="h-3 w-3" />,
            bgColor: "bg-red-50",
            textColor: "text-red-700", 
            borderColor: "border-red-200",
            dotColor: "bg-red-500"
          };
        } else {
          return {
            icon: <Clock className="h-3 w-3" />,
            bgColor: "bg-yellow-50",
            textColor: "text-yellow-700",
            borderColor: "border-yellow-200",
            dotColor: "bg-yellow-500"
          };
        }
      case "collection":
        return {
          icon: <Package className="h-3 w-3" />,
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
          borderColor: "border-blue-200",
          dotColor: "bg-blue-500"
        };
      case "date":
        return {
          icon: <Calendar className="h-3 w-3" />,
          bgColor: "bg-purple-50",
          textColor: "text-purple-700",
          borderColor: "border-purple-200",
          dotColor: "bg-purple-500"
        };
      case "price":
        return {
          icon: <DollarSign className="h-3 w-3" />,
          bgColor: "bg-green-50",
          textColor: "text-green-700",
          borderColor: "border-green-200",
          dotColor: "bg-green-500"
        };
      case "location":
        return {
          icon: <MapPin className="h-3 w-3" />,
          bgColor: "bg-orange-50",
          textColor: "text-orange-700",
          borderColor: "border-orange-200",
          dotColor: "bg-orange-500"
        };
      case "person":
        return {
          icon: <User className="h-3 w-3" />,
          bgColor: "bg-purple-50",
          textColor: "text-purple-700",
          borderColor: "border-purple-200",
          dotColor: "bg-purple-500"
        };
      case "organization":
        return {
          icon: <Building className="h-3 w-3" />,
          bgColor: "bg-indigo-50",
          textColor: "text-indigo-700",
          borderColor: "border-indigo-200",
          dotColor: "bg-indigo-500"
        };
      default:
        return {
          icon: <AlignLeft className="h-3 w-3" />,
          bgColor: "bg-gray-50",
          textColor: "text-gray-700",
          borderColor: "border-gray-200",
          dotColor: "bg-gray-500"
        };
    }
  };
  
  const styles = getChipStyles();
  
  // For status chips, use a different design
  if (type === "status") {
    return (
      <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", styles.dotColor)} />
        <span className={cn("text-sm font-medium", styles.textColor)}>
          {data.value}
        </span>
      </div>
    );
  }
  
  // For collection type, use colored background
  if (type === "collection") {
    const getCollectionColor = (value: string) => {
      switch (value.toLowerCase()) {
        case "enterprise":
          return "bg-orange-100 text-orange-800 border-orange-200";
        case "carrier":
          return "bg-pink-100 text-pink-800 border-pink-200";
        case "safety shield":
          return "bg-cyan-100 text-cyan-800 border-cyan-200";
        default:
          return "bg-blue-100 text-blue-800 border-blue-200";
      }
    };
    
    return (
      <div 
        className={cn(
          "inline-flex items-center px-2 py-1 rounded text-xs font-medium border",
          getCollectionColor(data.value)
        )}
      >
        <span>{data.value}</span>
      </div>
    );
  }
  
  // For short text, display as chip
  if (data.value.length < 50) {
    return (
      <div 
        className={cn(
          "inline-flex items-center px-2 py-1 rounded text-xs font-medium border",
          styles.bgColor,
          styles.textColor,
          styles.borderColor
        )}
      >
        {styles.icon}
        <span className="ml-1 truncate max-w-xs">{data.value}</span>
      </div>
    );
  }
  
  // For longer text, display as formatted text
  return (
    <div className="text-sm">
      <div 
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border mb-1",
          styles.bgColor,
          styles.textColor,
          styles.borderColor
        )}
      >
        {styles.icon}
        <span className="ml-1">{type}</span>
      </div>
      <p className="line-clamp-2 text-gray-700">{data.value}</p>
    </div>
  );
}