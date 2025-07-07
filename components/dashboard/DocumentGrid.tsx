"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  GridReadyEvent,
  CellValueChangedEvent,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

import {
  FileText,
  Download,
  Play,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  Brain,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  useDocuments,
  useDocumentActions,
  useActiveProject,
  useProjectActions,
} from "@/lib/stores";
import { useToast } from "@/hooks/use-toast";

interface DocumentGridProps {
  projectId: string;
  searchTerm?: string;
}

// Custom cell renderers
const DocumentBundleRenderer = ({ data }: any) => {
  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes("pdf")) return "📄";
    if (mimeType?.includes("word")) return "📝";
    if (mimeType?.includes("image")) return "🖼️";
    if (mimeType?.includes("csv")) return "📊";
    return "📎";
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="flex items-center space-x-3 py-2">
      <div className="flex-shrink-0">
        <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
          {getFileIcon(data.fileType)}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {data.originalName || data.filename}
          </p>
          {getStatusIcon(data.status)}
        </div>
        <div className="flex items-center space-x-3 text-xs text-gray-500">
          <span>{formatFileSize(data.size)}</span>
          <span>{data.uploadDate}</span>
        </div>
      </div>
    </div>
  );
};

const DataChipRenderer = ({ value, colDef }: any) => {
  if (!value || !value.value) {
    return (
      <div className="flex items-center h-full">
        <span className="text-gray-400 italic">No data</span>
      </div>
    );
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const customProps = colDef?.customProperties;
  const bgColor = customProps?.styling?.backgroundColor || "#3b82f6";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2 h-full">
            <div
              className="px-2 py-1 rounded text-white text-xs font-medium max-w-full truncate"
              style={{ backgroundColor: bgColor }}
            >
              {value.value}
            </div>
            {value.confidence && (
              <Badge
                variant="secondary"
                className={`text-xs ${getConfidenceColor(value.confidence)}`}
              >
                {Math.round(value.confidence * 100)}%
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <p>
              <strong>Value:</strong> {value.value}
            </p>
            <p>
              <strong>Confidence:</strong>{" "}
              {Math.round((value.confidence || 0) * 100)}%
            </p>
            <p>
              <strong>Extracted:</strong>{" "}
              {new Date(value.extractedAt).toLocaleString()}
            </p>
            <p>
              <strong>Method:</strong> {value.extractedBy?.method || "Unknown"}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const ActionCellRenderer = (params: any) => {
  const { data, api, context } = params;
  const { downloadDocument, processDocument, deleteDocument, extractDataWithAI } =
    useDocumentActions();
  const { toast } = useToast();
  const activeProject = context?.activeProject;

  // Check if there are extractable columns
  const hasExtractableColumns = () => {
    if (!activeProject?.gridConfiguration?.columnDefs) return false;
    
    const columnDefs = activeProject.gridConfiguration.columnDefs;
    
    // Check if columnDefs is a Map and iterate properly
    if (columnDefs instanceof Map) {
      for (const [columnId, columnDef] of columnDefs.entries()) {
        // Skip system columns (index, filename)
        if (columnId === 'index' || columnId === 'filename') {
          continue;
        }
        
        if (columnDef.customProperties && 
            columnDef.customProperties.extraction?.enabled &&
            columnDef.customProperties.extraction?.status === 'active') {
          return true;
        }
      }
    } else if (typeof columnDefs === 'object' && columnDefs !== null) {
      // Handle case where columnDefs might be a plain object
      for (const [columnId, columnDef] of Object.entries(columnDefs)) {
        // Skip system columns (index, filename)
        if (columnId === 'index' || columnId === 'filename') {
          continue;
        }
        
        if (columnDef.customProperties && 
            columnDef.customProperties.extraction?.enabled &&
            columnDef.customProperties.extraction?.status === 'active') {
          return true;
        }
      }
    }
    
    return false;
  };

  const handleDownload = async () => {
    try {
      await downloadDocument(data.projectId, data.id, true);
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProcess = async () => {
    try {
      await processDocument(data.projectId, data.id);
      api.refreshCells();
      toast({
        title: "Processing Started",
        description: "Document processing has been initiated.",
      });
    } catch (error) {
      console.error("Processing failed:", error);
      toast({
        title: "Processing Failed",
        description: "Failed to start document processing. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExtractData = async () => {
    if (!hasExtractableColumns()) {
      toast({
        title: "No Columns to Extract",
        description: "Please add columns with extraction rules before extracting data.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Extraction Started",
        description: "AI data extraction has been initiated. Please wait...",
      });
      
      await extractDataWithAI(data.projectId, data.id);
      api.refreshCells();
      
      toast({
        title: "Extraction Completed",
        description: "Data has been successfully extracted from the document.",
      });
    } catch (error: any) {
      console.error("Extraction failed:", error);
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this document?")) {
      try {
        await deleteDocument(data.projectId, data.id);
        api.refreshCells();
        toast({
          title: "Document Deleted",
          description: "The document has been successfully deleted.",
        });
      } catch (error) {
        console.error("Delete failed:", error);
        toast({
          title: "Delete Failed",
          description: "Failed to delete the document. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="flex items-center space-x-1 h-full">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download document</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleExtractData}
              disabled={data.status === "processing"}
            >
              <Brain className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Extract data with AI</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleProcess}
              disabled={data.status === "processing"}
            >
              <Play className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Process with AI</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => window.open(data.fileUrl, "_blank")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View Original
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const CustomHeaderRenderer = ({ displayName, column }: any) => {
  const customProps = column.getColDef().customProperties;

  if (!customProps) {
    return <span>{displayName}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: customProps.color }}
            />
            <span className="font-medium">{displayName}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs max-w-xs">
            <p>
              <strong>Name:</strong> {customProps.name}
            </p>
            <p>
              <strong>Type:</strong> {customProps.type}
            </p>
            <p>
              <strong>AI Model:</strong> {customProps.aiModel}
            </p>
            <p>
              <strong>Prompt:</strong> {customProps.prompt}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function DocumentGrid({
  projectId,
  searchTerm = "",
}: DocumentGridProps) {
  const documents = useDocuments();
  const { getDocuments, updateExtractedData } = useDocumentActions();
  const activeProject = useActiveProject();
  const gridRef = useRef<AgGridReact>(null);
  const [loading, setLoading] = useState(true);

  // Load documents
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true);
        console.log(
          "Loading documents for project:",
          projectId,
          "with search term:",
          searchTerm
        );
        await getDocuments(projectId, { search: searchTerm });
      } catch (error) {
        console.error("Failed to load documents:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [projectId, searchTerm, getDocuments]);

  // Generate column definitions from project configuration
  const columnDefs = useMemo((): ColDef[] => {
    if (!activeProject?.gridConfiguration?.columnDefs) {
      return [];
    }

    const colDefs = Object.values(
      activeProject.gridConfiguration.columnDefs
    ).map((colDef: any) => {
      const baseCol: ColDef = {
        field: colDef.field,
        headerName: colDef.headerName,
        width: colDef.width,
        resizable: colDef.resizable,
        sortable: colDef.sortable,
        filter: colDef.filter,
        pinned: colDef.pinned || undefined,
        cellStyle: colDef.cellStyle,
        editable: false,
      };

      // Custom renderers based on column type
      if (colDef.id === "filename") {
        baseCol.cellRenderer = DocumentBundleRenderer;
        baseCol.width = 320;
      } else if (colDef.id === "index") {
        baseCol.width = 60;
        baseCol.cellStyle = {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          color: "#6b7280",
        };
        baseCol.valueGetter = (params) =>
          params.node?.rowIndex ? params.node.rowIndex + 1 : "";
      } else if (colDef.customProperties) {
        baseCol.cellRenderer = DataChipRenderer;
        baseCol.headerComponent = CustomHeaderRenderer;
        baseCol.editable = true;
        baseCol.valueSetter = (params) => {
          updateExtractedData(projectId, params.data.id, colDef.id, {
            value: params.newValue,
          }).catch((error) => {
            console.error("Failed to update extracted data:", error);
          });
          return true; // Assume success for synchronous return
        };
      }

      return baseCol;
    });

    // Add actions column
    colDefs.push({
      field: "actions",
      headerName: "Actions",
      width: 160,
      resizable: false,
      sortable: false,
      filter: false,
      pinned: "right",
      cellRenderer: ActionCellRenderer,
      cellRendererParams: {
        context: { activeProject }
      },
      cellStyle: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    });

    return colDefs;
  }, [
    activeProject?.gridConfiguration?.columnDefs,
    projectId,
    updateExtractedData,
  ]);

  // Process row data to include projectId
  const rowData = useMemo(() => {
    return documents.map((doc) => ({
      ...doc,
      projectId,
    }));
  }, [documents, projectId]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    console.log("Cell value changed:", event);
  }, []);

  const defaultColDef = useMemo(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
      floatingFilter: false,
      suppressMenu: true,
    }),
    []
  );

  const gridOptions = {
    ...activeProject?.gridConfiguration?.gridOptions,
    rowHeight: 60,
    headerHeight: 45,
    suppressCellFocus: true,
    enableCellTextSelection: true,
    rowSelection: "multiple" as const,
    animateRows: true,
    pagination: true,
    paginationPageSize: 25,
    paginationPageSizeSelector: [10, 25, 50, 100],
    suppressPaginationPanel: false,
    suppressScrollOnNewData: true,
    loadingOverlayComponent: () => (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    ),
    noRowsOverlayComponent: () => (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <FileText className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No documents found</p>
        <p className="text-sm">Upload documents to start extracting data</p>
      </div>
    ),
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full ag-theme-alpine">
      <AgGridReact
        ref={gridRef}
        columnDefs={columnDefs}
        rowData={rowData}
        defaultColDef={defaultColDef}
        gridOptions={gridOptions}
        onGridReady={onGridReady}
        onCellValueChanged={onCellValueChanged}
        maintainColumnOrder={true}
        allowContextMenuWithControlKey={true}
        preventDefaultOnContextMenu={true}
      />
    </div>
  );
}

export default DocumentGrid;
