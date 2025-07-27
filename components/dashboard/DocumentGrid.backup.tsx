"use client";

// BACKUP: Original DocumentGrid with cell-level customization support
// This is the backup version with all the advanced features

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  GridReadyEvent,
  CellValueChangedEvent,
  CellContextMenuEvent,
  GridApi,
  ColumnApi,
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
  Edit3,
  Target,
  RotateCcw,
  Zap,
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ColumnSettings } from "@/components/table/column-settings";
import { ExportDialog } from "./ExportDialog";
import { DocumentCollectionModal } from "./DocumentCollectionModal";
// NEW: Import cell customization dialog
import { CellCustomizationDialog } from "./cell-customization/CellCustomizationDialog";

import {
  useDocuments,
  useDocumentActions,
  useActiveProject,
  useProjectActions,
  useCollectionActions,
  useExtractionStates,
} from "@/lib/stores";
import { useToast } from "@/hooks/use-toast";
import { Shimmer } from "@/components/ui/shimmer";

interface DocumentGridProps {
  projectId: string;
  searchTerm?: string;
}

// NEW: Enhanced data chip renderer with cell customization indicators
const DataChipRenderer = ({ data, colDef, value }: any) => {
  const columnId = colDef.field;
  const extractedData = data.extractedData?.[columnId];
  
  // NEW: Check if cell has custom prompt
  const isCustomized = extractedData?.cellCustomization?.isCustomized || false;
  const confidence = extractedData?.confidence || 0;
  const status = extractedData?.status;

  const getStatusColor = () => {
    if (!value) return "bg-gray-100 text-gray-600";
    if (confidence >= 0.8) return "bg-green-100 text-green-800";
    if (confidence >= 0.5) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getStatusIcon = () => {
    if (!value) return <Clock className="h-3 w-3" />;
    if (confidence >= 0.8) return <CheckCircle className="h-3 w-3" />;
    if (confidence >= 0.5) return <AlertCircle className="h-3 w-3" />;
    return <X className="h-3 w-3" />;
  };

  return (
    <div className="flex items-center gap-2 p-1">
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()} ${
          isCustomized ? 'ring-2 ring-blue-400 ring-offset-1' : ''
        }`}
        title={isCustomized ? `Custom prompt (${Math.round(confidence * 100)}% confidence)` : `${Math.round(confidence * 100)}% confidence`}
      >
        {getStatusIcon()}
        <span className="max-w-[200px] truncate">
          {value || "No data"}
        </span>
        {isCustomized && (
          <Target className="h-3 w-3 text-blue-600" title="Custom prompt used" />
        )}
      </div>
    </div>
  );
};

// NEW: Enhanced header renderer with customization info
const CustomHeaderRenderer = ({ column, displayName }: any) => {
  const columnId = column.getColId();
  const [customizedCount, setCustomizedCount] = useState(0);

  // This would need to be calculated based on actual data
  // For now, showing the concept
  
  return (
    <div className="flex items-center justify-between w-full">
      <span className="font-medium">{displayName}</span>
      {customizedCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          {customizedCount} custom
        </Badge>
      )}
    </div>
  );
};

// Existing Document Collection Renderer (unchanged)
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
    <div className="flex items-center gap-3 p-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{getFileIcon(data.fileMetadata?.mimeType)}</span>
        <div>
          <div className="font-medium text-sm">{data.filename}</div>
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span>{formatFileSize(data.fileMetadata?.size || 0)}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              {getStatusIcon(data.processing?.status)}
              {data.processing?.status || "pending"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export function DocumentGrid({ projectId, searchTerm }: DocumentGridProps) {
  const { toast } = useToast();
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [columnApi, setColumnApi] = useState<ColumnApi | null>(null);

  // Existing state
  const documents = useDocuments();
  const { getDocuments, extractDocument } = useDocumentActions();
  const activeProject = useActiveProject();
  const { updateProject, getProject } = useProjectActions();
  const { createCollection } = useCollectionActions();
  const extractionStates = useExtractionStates();

  // NEW: Cell customization state
  const [cellCustomizationDialog, setCellCustomizationDialog] = useState<{
    open: boolean;
    projectId: string;
    documentId: string;
    columnId: string;
    columnName: string;
    documentName: string;
    currentValue?: string;
  }>({
    open: false,
    projectId: "",
    documentId: "",
    columnId: "",
    columnName: "",
    documentName: "",
  });

  // Existing state
  const [activeColumnSettings, setActiveColumnSettings] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState<any[]>([]);

  // Load documents
  useEffect(() => {
    if (projectId) {
      getDocuments(projectId);
    }
  }, [projectId, getDocuments]);

  // Filter documents based on search
  const filteredDocuments = useMemo(() => {
    if (!searchTerm) return documents;
    return documents.filter(
      (doc) =>
        doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.originalName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

  // Build column definitions
  const columnDefs = useMemo(() => {
    if (!activeProject) return [];
    if (!activeProject.gridConfiguration) {
      console.warn('Active project missing gridConfiguration');
      return [];
    }
    if (!activeProject.gridConfiguration.columnDefs) {
      console.warn('Active project missing columnDefs');
      return [];
    }

    const cols: ColDef[] = [];
    const columnDefs = activeProject.gridConfiguration.columnDefs;

    // Handle both Map and Object cases for columnDefs
    const columnEntries = columnDefs instanceof Map 
      ? Array.from(columnDefs.entries())
      : Object.entries(columnDefs || {});

    for (const [columnId, columnDef] of columnEntries) {
      // Ensure columnDef exists and has required properties
      if (!columnDef || typeof columnDef !== 'object') {
        console.warn(`Invalid column definition for ${columnId}:`, columnDef);
        continue;
      }

      // Type assertion to ensure we have the right structure
      const col = columnDef as any;
      
      if (columnId === "index") {
        cols.push({
          field: columnId,
          headerName: col.headerName || '#',
          width: col.width || 60,
          pinned: col.pinned as any,
          sortable: false,
          filter: false,
          resizable: false,
          cellStyle: col.cellStyle || {},
          valueGetter: (params) => params.node?.rowIndex != null ? params.node.rowIndex + 1 : "",
        });
      } else if (columnId === "filename") {
        cols.push({
          field: columnId,
          headerName: col.headerName || 'Document Collection',
          width: col.width || 320,
          pinned: col.pinned as any,
          cellRenderer: DocumentCollectionRenderer,
          cellStyle: col.cellStyle || {},
        });
      } else {
        // NEW: Enhanced data columns with cell customization support
        cols.push({
          field: columnId,
          headerName: col.headerName || columnId,
          width: col.width || 150,
          resizable: col.resizable !== false,
          sortable: col.sortable !== false,
          filter: col.filter !== false,
          cellRenderer: DataChipRenderer, // NEW: Enhanced renderer
          headerComponent: CustomHeaderRenderer, // NEW: Enhanced header
          cellStyle: col.cellStyle || {},
          // NEW: Add context menu support
          onCellContextMenu: (params: any) => {
            handleCellContextMenu(params, columnId, col.headerName || columnId);
          },
          valueGetter: (params) => {
            const extractedData = params.data?.extractedData?.[columnId];
            return extractedData?.value || "";
          },
        });
      }
    }

    return cols;
  }, [activeProject]);

  // NEW: Handle cell context menu (right-click)
  const handleCellContextMenu = useCallback((params: any, columnId: string, columnName: string) => {
    // Don't show context menu for system columns
    if (columnId === "index" || columnId === "filename") return;

    const documentData = params.data;
    if (!documentData) return;

    // Set up cell customization dialog
    setCellCustomizationDialog({
      open: true,
      projectId,
      documentId: documentData._id,
      columnId,
      columnName,
      documentName: documentData.filename,
      currentValue: documentData.extractedData?.[columnId]?.value || "",
    });
  }, [projectId]);

  // NEW: Handle cell customization saved
  const handleCellCustomizationSaved = useCallback(() => {
    // Refresh documents to show updated customization
    getDocuments(projectId);
    toast({
      title: "Customization Saved",
      description: "Cell-level prompt has been saved successfully.",
    });
  }, [projectId, getDocuments, toast]);

  // NEW: Quick extract single cell
  const handleQuickExtractCell = useCallback(async (documentId: string, columnId: string) => {
    try {
      const response = await fetch("/api/extract-cell", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          projectId,
          documentId,
          columnId,
        }),
      });

      if (response.ok) {
        getDocuments(projectId); // Refresh to show new result
        toast({
          title: "Extraction Complete",
          description: "Cell data has been extracted successfully.",
        });
      } else {
        throw new Error("Extraction failed");
      }
    } catch (error) {
      toast({
        title: "Extraction Failed",
        description: "Failed to extract cell data. Please try again.",
        variant: "destructive",
      });
    }
  }, [projectId, getDocuments, toast]);

  // Helper functions for ColumnSettings (restored from original)
  const getColumnsArray = useCallback(() => {
    if (!activeProject?.gridConfiguration?.columnDefs) return [];
    
    const columnEntries = activeProject.gridConfiguration.columnDefs instanceof Map 
      ? Array.from(activeProject.gridConfiguration.columnDefs.entries())
      : Object.entries(activeProject.gridConfiguration.columnDefs || {});
    
    return columnEntries.map(([columnId, columnDef]: [string, any]) => ({
      id: columnId,
      name: columnDef?.customProperties?.name || columnDef?.headerName || columnId,
      prompt: columnDef?.customProperties?.prompt || '',
      aiModel: columnDef?.customProperties?.aiModel || 'gpt-4',
      type: columnDef?.customProperties?.type || 'text',
      color: columnDef?.customProperties?.color || '#3b82f6',
      width: columnDef?.width || 150,
    }));
  }, [activeProject]);

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    if (!activeProject) return;
    
    try {
      // Remove column from project
      const currentColumnDefs = activeProject.gridConfiguration.columnDefs;
      let updatedColumnDefs;
      
      if (currentColumnDefs instanceof Map) {
        updatedColumnDefs = new Map(currentColumnDefs);
        updatedColumnDefs.delete(columnId);
      } else {
        updatedColumnDefs = { ...currentColumnDefs };
        delete updatedColumnDefs[columnId];
      }
      
      await updateProject(activeProject._id, {
        gridConfiguration: {
          ...activeProject.gridConfiguration,
          columnDefs: updatedColumnDefs,
        },
      });
      
      await getProject(activeProject._id);
      setActiveColumnSettings(null);
      
      toast({
        title: "Column Deleted",
        description: "Column has been removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete column.",
        variant: "destructive",
      });
    }
  }, [activeProject, updateProject, getProject, toast]);

  const handleUpdateColumnSettings = useCallback(async (columnId: string, updates: any) => {
    if (!activeProject) return;
    
    try {
      const currentColumnDef = activeProject.gridConfiguration.columnDefs instanceof Map
        ? activeProject.gridConfiguration.columnDefs.get(columnId)
        : activeProject.gridConfiguration.columnDefs[columnId];
      
      const updatedColumnDef = {
        ...currentColumnDef,
        headerName: updates.name || currentColumnDef?.headerName,
        width: updates.width || currentColumnDef?.width,
        customProperties: {
          ...currentColumnDef?.customProperties,
          name: updates.name,
          prompt: updates.prompt,
          aiModel: updates.aiModel,
          type: updates.type,
          color: updates.color,
        },
      };
      
      const updatedColumnDefs = activeProject.gridConfiguration.columnDefs instanceof Map
        ? new Map(activeProject.gridConfiguration.columnDefs)
        : { ...activeProject.gridConfiguration.columnDefs };
      
      if (updatedColumnDefs instanceof Map) {
        updatedColumnDefs.set(columnId, updatedColumnDef);
      } else {
        updatedColumnDefs[columnId] = updatedColumnDef;
      }
      
      await updateProject(activeProject._id, {
        gridConfiguration: {
          ...activeProject.gridConfiguration,
          columnDefs: updatedColumnDefs,
        },
      });
      
      await getProject(activeProject._id);
      
      toast({
        title: "Column Updated",
        description: "Column settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update column settings.",
        variant: "destructive",
      });
    }
  }, [activeProject, updateProject, getProject, toast]);

  const setColumnColor = useCallback(async (columnId: string, color: string) => {
    await handleUpdateColumnSettings(columnId, { color });
  }, [handleUpdateColumnSettings]);

  // Existing handlers (unchanged)
  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
    setColumnApi(params.columnApi);
  };

  const handleExtractAll = async () => {
    if (!activeProject) return;

    for (const document of filteredDocuments) {
      if (document.processing?.status !== "completed") {
        try {
          await extractDocument(document._id, projectId);
        } catch (error) {
          console.error(`Failed to extract document ${document._id}:`, error);
        }
      }
    }
  };

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <Shimmer className="h-8 w-48" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        {/* NEW: Enhanced toolbar with cell-level actions */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center gap-4">
            <h3 className="font-medium text-gray-900">
              {filteredDocuments.length} Documents
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>
                {Object.values(extractionStates).filter(state => state === "processing").length} processing
              </span>
              <span>•</span>
              <span>
                {filteredDocuments.filter(doc => doc.processing?.status === "completed").length} completed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleExtractAll}
              size="sm"
              variant="outline"
              disabled={filteredDocuments.every(doc => doc.processing?.status === "completed")}
            >
              <Brain className="h-4 w-4 mr-2" />
              Extract All
            </Button>

            <Button
              onClick={() => {
                // Get the first custom column (not index or filename) for editing
                const columns = getColumnsArray();
                const customColumn = columns.find(col => col.id !== 'index' && col.id !== 'filename');
                if (customColumn) {
                  setActiveColumnSettings(customColumn.id);
                } else {
                  toast({
                    title: "No Columns",
                    description: "Please add some extraction columns first.",
                    variant: "destructive",
                  });
                }
              }}
              size="sm"
              variant="outline"
            >
              <Settings className="h-4 w-4 mr-2" />
              Columns
            </Button>

            <Button
              onClick={() => setShowExportDialog(true)}
              size="sm"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* NEW: Help text for cell customization */}
        <div className="px-4 py-2 bg-blue-50 border-b text-sm text-blue-700">
          💡 <strong>New:</strong> Right-click on any data cell to customize its extraction prompt for better results.
          Cells with custom prompts will show a blue ring indicator.
        </div>

        {/* Grid Container */}
        <div className="flex-1 ag-theme-alpine">
          <AgGridReact
            ref={gridRef}
            rowData={filteredDocuments}
            columnDefs={columnDefs}
            onGridReady={onGridReady}
            enableCellTextSelection={true}
            suppressCellFocus={true}
            rowSelection="multiple"
            onSelectionChanged={() => {
              const selectedNodes = gridApi?.getSelectedNodes() || [];
              setSelectedRowData(selectedNodes.map(node => node.data));
            }}
            // NEW: Enable context menu for cell customization
            allowContextMenuWithControlKey={true}
            suppressContextMenu={false}
            defaultColDef={{
              resizable: true,
              sortable: true,
              filter: true,
            }}
            suppressRowClickSelection={true}
            rowHeight={60}
            headerHeight={45}
          />
        </div>

        {/* NEW: Cell Customization Dialog */}
        <CellCustomizationDialog
          open={cellCustomizationDialog.open}
          onOpenChange={(open) => setCellCustomizationDialog(prev => ({ ...prev, open }))}
          projectId={cellCustomizationDialog.projectId}
          documentId={cellCustomizationDialog.documentId}
          columnId={cellCustomizationDialog.columnId}
          columnName={cellCustomizationDialog.columnName}
          documentName={cellCustomizationDialog.documentName}
          currentValue={cellCustomizationDialog.currentValue}
          onCustomizationSaved={handleCellCustomizationSaved}
        />

        {/* Existing Dialogs (unchanged) */}
        {activeColumnSettings && (() => {
          const column = getColumnsArray().find((col) => col.id === activeColumnSettings);
          return column ? (
            <ColumnSettings
              column={column}
              onClose={() => setActiveColumnSettings(null)}
              onDelete={() => handleDeleteColumn(activeColumnSettings)}
              onColorChange={(color) => setColumnColor(activeColumnSettings, color)}
              onUpdate={(updates) =>
                handleUpdateColumnSettings(activeColumnSettings, updates)
              }
            />
          ) : null;
        })()}

        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          projectId={projectId}
          type="project"
        />

        <DocumentCollectionModal
          open={showCollectionModal}
          onOpenChange={setShowCollectionModal}
          projectId={projectId}
          selectedDocuments={selectedRowData}
          onCollectionCreated={() => {
            setSelectedRowData([]);
            getDocuments(projectId);
          }}
        />
      </div>
    </TooltipProvider>
  );
}

export default DocumentGrid;
