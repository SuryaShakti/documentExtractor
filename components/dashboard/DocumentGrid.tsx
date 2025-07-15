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
  Settings,
  X,
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
import { ColumnSettings } from "@/components/table/column-settings";
import { ExportDialog } from "./ExportDialog";
import { DocumentCollectionModal } from "./DocumentCollectionModal";

import {
  useDocuments,
  useDocumentActions,
  useActiveProject,
  useProjectActions,
  useCollectionActions,
} from "@/lib/stores";
import { useToast } from "@/hooks/use-toast";
import { UpdateColumnData } from "@/lib/api/projects";

interface DocumentGridProps {
  projectId: string;
  searchTerm?: string;
}

// Custom cell renderers  
const DocumentCollectionRenderer = ({ data }: any) => {
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
    <div 
      className="flex items-center space-x-3 py-2 cursor-pointer hover:bg-gray-50 rounded-md transition-colors" 
      onClick={() => {
        // This will be handled by the parent component to open the collection modal
        if (data.onCollectionClick) {
          data.onCollectionClick(data.id);
        }
      }}
    >
      <div className="flex-shrink-0">
        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center text-lg relative">
          📁
          {data.documentCount > 1 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {data.documentCount}
            </span>
          )}
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
          <span>{data.documentCount} document{data.documentCount !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span>{formatFileSize(data.size)}</span>
          <span>•</span>
          <span>{data.uploadDate}</span>
        </div>
      </div>
    </div>
  );
};

// Updated DataChipRenderer with proper custom properties access
// Data Chip Detail Modal Component
const DataChipDetailModal = ({
  isOpen,
  onClose,
  value,
  columnName,
  bgColor,
}: {
  isOpen: boolean;
  onClose: () => void;
  value: any;
  columnName: string;
  bgColor: string;
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-[99999] p-4"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        position: "fixed",
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: bgColor }}
            />
            <h2 className="text-lg font-semibold text-gray-900">
              {columnName}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-200"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content - Just the full value */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-base leading-relaxed text-gray-900 whitespace-pre-wrap break-words">
              {value.value}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={onClose}
            className="bg-gray-900 hover:bg-gray-800 text-white px-6"
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
};

const DataChipRenderer = ({ value, colDef, column, context }: any) => {
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

  // Get custom properties from multiple sources
  const customProps =
    colDef?.customProperties || column?.getColDef()?.customProperties;

  // Try to get color from various sources
  let bgColor = "#3b82f6"; // Default color

  if (customProps?.color) {
    bgColor = customProps.color;
  } else if (customProps?.styling?.backgroundColor) {
    bgColor = customProps.styling.backgroundColor;
  }

  const columnName =
    customProps?.name || column?.getColDef()?.headerName || "Unknown Column";

  const handleChipClick = () => {
    if (context?.onDataChipClick) {
      context.onDataChipClick(value, columnName, bgColor);
    }
  };

  return (
    <div className="flex items-center space-x-2 h-full">
      <div
        className="px-2 py-1 rounded text-white text-xs font-medium max-w-full truncate cursor-pointer hover:opacity-80 transition-opacity"
        style={{ backgroundColor: bgColor }}
        onClick={handleChipClick}
      >
        {value.value}
      </div>
    </div>
  );
};

const ActionCellRenderer = (params: any) => {
  const { data, api, context } = params;
  const {
    downloadDocument,
    processDocument,
    deleteDocument,
  } = useDocumentActions();
  const { extractData, deleteCollection } = useCollectionActions();
  const { toast } = useToast();
  const activeProject = context?.activeProject;

  // Check if there are extractable columns
  const hasExtractableColumns = () => {
    if (!activeProject?.gridConfiguration?.columnDefs) return false;

    const columnDefs = activeProject.gridConfiguration.columnDefs;

    // Check if columnDefs is a Map and iterate properly
    if (columnDefs instanceof Map) {
      // @ts-ignore
      for (const [columnId, columnDef] of columnDefs.entries()) {
        // Skip system columns (index, filename)
        if (columnId === "index" || columnId === "filename") {
          continue;
        }

        if (
          columnDef.customProperties &&
          columnDef.customProperties.extraction?.enabled &&
          columnDef.customProperties.extraction?.status === "active"
        ) {
          return true;
        }
      }
    } else if (typeof columnDefs === "object" && columnDefs !== null) {
      // Handle case where columnDefs might be a plain object
      for (const [columnId, columnDef] of Object.entries(columnDefs)) {
        // Skip system columns (index, filename)
        if (columnId === "index" || columnId === "filename") {
          continue;
        }

        if (
          (columnDef as any).customProperties &&
          (columnDef as any).customProperties.extraction?.enabled &&
          (columnDef as any).customProperties.extraction?.status === "active"
        ) {
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
        description:
          "Please add columns with extraction rules before extracting data.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Extraction Started",
        description: "AI data extraction has been initiated. Please wait...",
      });

      // Extract data for the collection instead of individual document
      await extractData(data.id);
      api.refreshCells();

      toast({
        title: "Extraction Completed",
        description: "Data has been successfully extracted from the collection.",
      });
    } catch (error: any) {
      console.error("Extraction failed:", error);
      toast({
        title: "Extraction Failed",
        description:
          error.message || "Failed to extract data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this collection?")) {
      try {
        await deleteCollection(data.id);
        api.refreshCells();
        toast({
          title: "Collection Deleted",
          description: "The collection has been successfully deleted.",
        });
      } catch (error) {
        console.error("Delete failed:", error);
        toast({
          title: "Delete Failed",
          description: "Failed to delete the collection. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleExport = () => {
    // This will be handled by the parent component
    if (params.context?.onExportDocument) {
      params.context.onExportDocument(data.id);
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
          <TooltipContent position="bottom" side="bottom" align="start">
            Download collection
          </TooltipContent>
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
          <TooltipContent side="bottom" align="start">
            Extract data with AI
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* <TooltipProvider>
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
      </TooltipProvider> */}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => window.open(data.fileUrl, "_blank")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View Collection
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExport}>
            <FileText className="mr-2 h-4 w-4" />
            Export Data
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDelete} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Collection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export function DocumentGrid({
  projectId,
  searchTerm = "",
}: DocumentGridProps) {
  const documents = useDocuments();
  const { getDocuments, updateExtractedData, uploadDocuments } = useDocumentActions();
  const { updateColumn, deleteColumn } = useProjectActions();
  const { 
    updateCollection, 
    addDocumentToCollection, 
    removeDocumentFromCollection, 
    toggleDocumentVisibility, 
    reorderDocuments 
  } = useCollectionActions();
  const activeProject = useActiveProject();
  const gridRef = useRef<AgGridReact>(null);
  const [loading, setLoading] = useState(true);

  // Column settings state
  const [activeColumnSettings, setActiveColumnSettings] = useState<
    string | null
  >(null);

  // Data chip modal state
  const [dataChipModal, setDataChipModal] = useState<{
    isOpen: boolean;
    value: any;
    columnName: string;
    bgColor: string;
  }>({
    isOpen: false,
    value: null,
    columnName: "",
    bgColor: "#3b82f6",
  });

  // Export dialog state
  const [exportDialog, setExportDialog] = useState<{
    isOpen: boolean;
    documentId?: string;
  }>({
    isOpen: false,
  });

  // Collection modal state
  const [collectionModal, setCollectionModal] = useState<{
    isOpen: boolean;
    collectionId?: string;
  }>({
    isOpen: false,
  });

  // Handle document export
  const handleExportDocument = (documentId: string) => {
    setExportDialog({
      isOpen: true,
      documentId,
    });
  };

  // Handle collection modal
  const handleCollectionClick = (collectionId: string) => {
    console.log('Collection clicked:', collectionId);
    console.log('Available collections:', documents);
    const collection = documents.find(doc => doc.id === collectionId);
    console.log('Selected collection:', collection);
    
    setCollectionModal({
      isOpen: true,
      collectionId,
    });
  };

  // Convert project column definitions to array format (similar to AgGridDocumentTable)
  const columns = useMemo(() => {
    if (!activeProject?.gridConfiguration?.columnDefs) return [];

    return Object.entries(activeProject.gridConfiguration.columnDefs)
      .filter(([key]) => key !== "index" && key !== "filename")
      .map(([key, colDef]) => ({
        id: key,
        name: colDef.headerName,
        prompt: colDef.customProperties?.prompt || "",
        aiModel: colDef.customProperties?.aiModel || "gpt-4",
        width: colDef.width,
        color: colDef.customProperties?.color,
        type: colDef.customProperties?.type as any,
      }));
  }, [activeProject]);

  // Handle data chip click - MOVED BEFORE columnDefs useMemo
  const handleDataChipClick = useCallback(
    (value: any, columnName: string, bgColor: string) => {
      setDataChipModal({
        isOpen: true,
        value,
        columnName,
        bgColor,
      });
    },
    []
  );

  // Custom header for dynamic columns with settings button
  const CustomHeaderRenderer = ({ displayName, column }: any) => {
    const colId = column.getColId();
    const colDef = column.getColDef();
    const customProps = colDef.customProperties;
    const col = columns.find((c) => c.id === colId);

    // Don't show settings for system columns
    if (colId === "index" || colId === "filename" || colId === "actions") {
      if (!customProps) {
        return <span>{displayName}</span>;
      }

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-2">
                {customProps?.color && (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: customProps.color }}
                  />
                )}
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
    }

    const handleSettingsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setActiveColumnSettings(colId);
    };

    return (
      <div className="flex items-center justify-between pr-2">
        <div className="flex items-center space-x-2">
          {customProps?.color && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: customProps.color }}
            />
          )}
          <span className="truncate font-medium">
            {col?.name || displayName}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-gray-200"
          onClick={handleSettingsClick}
        >
          <Settings className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  // Load documents (now actually loads collections)
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true);
        console.log(
          "Loading collections for project:",
          projectId,
          "with search term:",
          searchTerm
        );
        // For now, we'll still use the documents API which has been updated to return collections
        await getDocuments(projectId, { search: searchTerm });
      } catch (error) {
        console.error("Failed to load collections:", error);
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
        // Store custom properties directly in the column definition
        // @ts-ignore
        customProperties: colDef.customProperties,
      };

      // Custom renderers based on column type
      if (colDef.id === "filename") {
        baseCol.cellRenderer = DocumentCollectionRenderer;
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
        baseCol.cellRendererParams = {
          context: {
            activeProject,
            onDataChipClick: handleDataChipClick,
          },
        };
        baseCol.valueSetter = (params) => {
          // For collections, we'll update the collection's extracted data
          // This is a simplified approach - in a full implementation you might need
          // to handle this differently based on your aggregation strategy
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
        context: {
          activeProject,
          onExportDocument: handleExportDocument,
        },
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
    handleDataChipClick, // Add this as a dependency
  ]);

  // Process row data to include projectId and collection click handler
  const rowData = useMemo(() => {
    return documents.map((doc) => ({
      ...doc,
      projectId,
      onCollectionClick: handleCollectionClick,
    }));
  }, [documents, projectId, handleCollectionClick]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    console.log("Cell value changed:", event);
  }, []);

  // Set a column color
  const setColumnColor = async (columnId: string, color: string) => {
    await updateColumn(projectId, columnId, { color });
  };

  // Update column settings
  const updateColumnSettings = async (
    columnId: string,
    updates: Partial<UpdateColumnData>
  ) => {
    await updateColumn(projectId, columnId, updates);
  };

  // Handle column deletion
  const handleDeleteColumn = async (columnId: string) => {
    try {
      await deleteColumn(projectId, columnId);
      setActiveColumnSettings(null);
    } catch (error) {
      console.error("Delete column error:", error);
    }
  };

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
        <p className="text-lg font-medium">No collections found</p>
        <p className="text-sm">Upload documents to start creating collections</p>
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
    <div className="h-full w-full ag-theme-alpine relative">
      <style jsx global>{`
        .ag-theme-alpine .ag-header-cell {
          border-right: 1px solid #e5e7eb !important;
        }
        .ag-theme-alpine .ag-cell {
          border-right: 1px solid #e5e7eb !important;
        }
        .ag-theme-alpine .ag-header-cell-resize::after {
          display: none;
        }
        .ag-theme-alpine .ag-pinned-left-header .ag-header-cell {
          border-right: 2px solid #d1d5db !important;
        }
        .ag-theme-alpine .ag-pinned-left-cols .ag-cell {
          border-right: 2px solid #d1d5db !important;
        }
      `}</style>

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

      {/* Column Settings Modal - Centered */}
      {activeColumnSettings && (
        <ColumnSettings
          column={columns.find((col) => col.id === activeColumnSettings)!}
          onClose={() => setActiveColumnSettings(null)}
          onDelete={() => handleDeleteColumn(activeColumnSettings)}
          onColorChange={(color) => setColumnColor(activeColumnSettings, color)}
          onUpdate={(updates) =>
            updateColumnSettings(
              activeColumnSettings,
              updates as Partial<UpdateColumnData>
            )
          }
        />
      )}

      {/* Data Chip Detail Modal */}
      {dataChipModal.isOpen && (
        <DataChipDetailModal
          isOpen={dataChipModal.isOpen}
          onClose={() =>
            setDataChipModal((prev) => ({ ...prev, isOpen: false }))
          }
          value={dataChipModal.value}
          columnName={dataChipModal.columnName}
          bgColor={dataChipModal.bgColor}
        />
      )}

      {/* Export Dialog */}
      {exportDialog.isOpen && (
        <ExportDialog
          open={exportDialog.isOpen}
          onOpenChange={(open) => setExportDialog({ isOpen: open })}
          projectId={projectId}
          documentId={exportDialog.documentId}
          type="document"
        />
      )}

      {/* Collection Modal */}
      {collectionModal.isOpen && collectionModal.collectionId && (() => {
        const collection = documents.find(doc => doc.id === collectionModal.collectionId);
        return collection ? (
          <DocumentCollectionModal
            isOpen={collectionModal.isOpen}
            onClose={() => setCollectionModal({ isOpen: false })}
            collection={{
              _id: collection.id,
              name: collection.filename || collection.originalName,
              documents: collection.documents || [],
              documentCount: collection.documentCount || 0,
              stats: collection.stats || {
                totalSize: collection.size || 0,
                lastModified: collection.uploadDate || new Date().toISOString()
              },
              settings: collection.settings || {
                hiddenDocuments: collection.hiddenDocuments || []
              }
            } as any}
            onUpdateCollection={updateCollection}
            onAddDocument={async (collectionId, file) => {
              // ✅ FIXED: Upload directly to the specific collection
              try {
                console.log(`Uploading file to collection ${collectionId}:`, file.name);
                
                // Import collection service dynamically
                const { collectionService } = await import('@/lib/api/collections');
                
                // Upload to the specific collection
                const result = await collectionService.uploadToCollection(collectionId, [file]);
                
                if (result.success) {
                  console.log('Upload successful:', result.data);
                  // Refresh the grid data to show updated collection
                  await getDocuments(projectId, { search: searchTerm });
                } else {
                  throw new Error(result.error || 'Upload failed');
                }
              } catch (error: any) {
                console.error('Collection upload failed:', error);
                throw error; // Re-throw to be handled by the modal
              }
            }}
            onRemoveDocument={removeDocumentFromCollection}
            onToggleDocumentVisibility={toggleDocumentVisibility}
            onReorderDocuments={reorderDocuments}
          />
        ) : null;
      })()}
    </div>
  );
}

export default DocumentGrid;
