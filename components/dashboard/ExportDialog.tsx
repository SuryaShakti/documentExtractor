import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileType,
  CheckCircle,
  Clock,
  AlertCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface ExportFormat {
  value: "pdf" | "excel" | "doc";
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface ExportOption {
  key: string;
  label: string;
  description: string;
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  documentId?: string; // Optional - if provided, export single document
  type: "project" | "document";
}

const exportFormats: ExportFormat[] = [
  {
    value: "pdf",
    label: "PDF Document",
    description: "Portable document format with tables and formatting",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    value: "excel",
    label: "Excel Spreadsheet",
    description: "Multi-sheet spreadsheet with data analysis capabilities",
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    value: "doc",
    label: "Word Document",
    description: "Formatted document with tables and styling",
    icon: <FileType className="h-5 w-5" />,
  },
];

const exportOptions: ExportOption[] = [
  {
    key: "includeMetadata",
    label: "Include Metadata",
    description: "Add confidence scores and extraction methods",
  },
  {
    key: "includeConfidence",
    label: "Include Confidence Scores",
    description: "Show AI confidence for each extraction",
  },
  {
    key: "includeTimestamps",
    label: "Include Timestamps",
    description: "Show when each extraction was performed",
  },
];

export function ExportDialog({
  open,
  onOpenChange,
  projectId,
  documentId,
  type,
}: ExportDialogProps) {
  const [format, setFormat] = useState<"pdf" | "excel" | "doc">("excel");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([
    "includeConfidence",
  ]);
  const [filename, setFilename] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportData, setExportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load export options when dialog opens
  useEffect(() => {
    if (open) {
      loadExportOptions();
    }
  }, [open, projectId, documentId]);

  // Generate default filename when format changes
  useEffect(() => {
    if (exportData) {
      const baseName =
        type === "document"
          ? exportData.document?.filename || "document"
          : exportData.project?.name || "project";

      const date = new Date().toISOString().split("T")[0];
      const extension =
        format === "excel" ? "xlsx" : format === "doc" ? "docx" : "pdf";

      setFilename(`${baseName}_export_${date}.${extension}`);
    }
  }, [format, exportData, type]);

  const loadExportOptions = async () => {
    setLoading(true);
    try {
      const endpoint =
        type === "document"
          ? `/api/projects/${projectId}/documents/${documentId}/export`
          : `/api/projects/${projectId}/export`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExportData(data.data);
      } else {
        throw new Error("Failed to load export options");
      }
    } catch (error) {
      console.error("Error loading export options:", error);
      toast.error("Failed to load export options");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!filename.trim()) {
      toast.error("Please enter a filename");
      return;
    }

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
          filename: filename.replace(/\.[^/.]+$/, ""), // Remove extension
          includeMetadata: selectedOptions.includes("includeMetadata"),
          includeConfidence: selectedOptions.includes("includeConfidence"),
          includeTimestamps: selectedOptions.includes("includeTimestamps"),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Export completed successfully");
        onOpenChange(false);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const toggleOption = (optionKey: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionKey)
        ? prev.filter((key) => key !== optionKey)
        : [...prev, optionKey]
    );
  };

  const getFileIcon = (format: string) => {
    switch (format) {
      case "pdf":
        return <FileText className="h-4 w-4" />;
      case "excel":
        return <FileSpreadsheet className="h-4 w-4" />;
      case "doc":
        return <FileType className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Loading Export Options...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export {type === "document" ? "Document" : "Project"} Data
          </DialogTitle>
          <DialogDescription>
            Choose your preferred format and options to export the extracted
            data
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="format" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="format">Format</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="format" className="space-y-4">
            <div className="space-y-4">
              <Label>Select Export Format</Label>
              <RadioGroup
                value={format}
                onValueChange={(value: any) => setFormat(value)}
              >
                {exportFormats.map((formatOption) => (
                  <div
                    key={formatOption.value}
                    className="flex items-center space-x-3"
                  >
                    <RadioGroupItem
                      value={formatOption.value}
                      id={formatOption.value}
                    />
                    <Label
                      htmlFor={formatOption.value}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div className="p-2 rounded-lg bg-gray-100">
                        {formatOption.icon}
                      </div>
                      <div>
                        <div className="font-medium">{formatOption.label}</div>
                        <div className="text-sm text-gray-500">
                          {formatOption.description}
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Enter filename"
              />
            </div>
          </TabsContent>

          <TabsContent value="options" className="space-y-4">
            <div className="space-y-4">
              <Label>Export Options</Label>
              {exportOptions.map((option) => (
                <div key={option.key} className="flex items-start space-x-3">
                  <Checkbox
                    id={option.key}
                    checked={selectedOptions.includes(option.key)}
                    onCheckedChange={() => toggleOption(option.key)}
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor={option.key}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {option.label}
                    </Label>
                    <p className="text-sm text-gray-500">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Export Summary</Label>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Format:</span>
                      <span className="font-medium">
                        {exportFormats.find((f) => f.value === format)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Options:</span>
                      <span className="font-medium">
                        {selectedOptions.length} selected
                      </span>
                    </div>
                    {exportData && (
                      <>
                        <div className="flex justify-between">
                          <span>Documents:</span>
                          <span className="font-medium">
                            {exportData.stats?.totalDocuments || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Columns:</span>
                          <span className="font-medium">
                            {exportData.columns?.length || 0}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {exportData && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        Project Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Name:</span>
                        <span className="font-medium">
                          {exportData.project?.name}
                        </span>
                      </div>
                      {exportData.project?.description && (
                        <div className="flex justify-between">
                          <span>Description:</span>
                          <span className="font-medium truncate max-w-[120px]">
                            {exportData.project.description}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Documents:</span>
                        <span className="font-medium">
                          {exportData.stats?.totalDocuments}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Completed:</span>
                        <span className="font-medium text-green-600">
                          {exportData.stats?.completedDocuments}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processing:</span>
                        <span className="font-medium text-blue-600">
                          {exportData.stats?.processingDocuments}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Completion Rate:</span>
                        <span className="font-medium">
                          {exportData.stats?.completionRate}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      Extraction Columns
                    </CardTitle>
                    <CardDescription>
                      {exportData.columns?.length || 0} columns will be exported
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {exportData.columns?.map((col: any) => (
                        <div
                          key={col.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm font-medium">
                            {col.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {col.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {type === "document" && exportData.document && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        Document Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Filename:</span>
                        <span className="font-medium">
                          {exportData.document.filename}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="font-medium">
                          {exportData.document.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Extracted Columns:</span>
                        <span className="font-medium">
                          {exportData.document.extractedColumns}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Info className="h-4 w-4" />
            <span>
              Files will be downloaded to your default download folder
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || !filename.trim()}
              className="flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export {getFileIcon(format)}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
