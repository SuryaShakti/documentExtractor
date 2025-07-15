import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, FileSpreadsheet, FileType, Download } from "lucide-react";
import { toast } from "sonner";

interface QuickExportButtonProps {
  projectId: string;
  documentId?: string;
  type: "project" | "document";
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const exportFormats = [
  {
    value: "excel",
    label: "Excel",
    icon: <FileSpreadsheet className="h-4 w-4" />,
    description: "Spreadsheet format",
  },
  {
    value: "pdf",
    label: "PDF",
    icon: <FileText className="h-4 w-4" />,
    description: "Document format",
  },
  {
    value: "doc",
    label: "Word",
    icon: <FileType className="h-4 w-4" />,
    description: "Word document",
  },
];

export function QuickExportButton({
  projectId,
  documentId,
  type,
  variant = "outline",
  size = "sm",
}: QuickExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleQuickExport = async (format: "pdf" | "excel" | "doc") => {
    setIsExporting(true);
    try {
      const endpoint =
        type === "document"
          ? `/api/projects/${projectId}/documents/${documentId}/export`
          : `/api/projects/${projectId}/export`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format,
          includeConfidence: true,
          includeTimestamps: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Exported as ${format.toUpperCase()}`);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }
    } catch (error: any) {
      console.error("Quick export error:", error);
      toast.error(error.message || "Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={isExporting}
          className="flex items-center gap-2"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {exportFormats.map((format) => (
          <DropdownMenuItem
            key={format.value}
            onClick={() => handleQuickExport(format.value as any)}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {format.icon}
            <div>
              <div className="font-medium">{format.label}</div>
              <div className="text-xs text-gray-500">{format.description}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
