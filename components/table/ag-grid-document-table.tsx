"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddColumnDialog } from "@/components/table/add-column-dialog";
import { UploadDocumentDialog } from "@/components/table/upload-document-dialog";
import { DataChip } from "@/components/table/data-chip";
import {
  Plus,
  Filter,
  Search,
  FileText,
  Settings,
  Loader2,
  Upload,
} from "lucide-react";
import { ClientSideRowModelModule, ModuleRegistry } from "ag-grid-community";
import { ColumnSettings } from "@/components/table/column-settings";

import {
  useActiveProject,
  useDocuments,
  useDocumentLoading,
  useProjectActions,
  useDocumentActions,
} from "@/lib/stores";
import { AddColumnData, UpdateColumnData } from "@/lib/api/projects";

ModuleRegistry.registerModules([ClientSideRowModelModule]);

interface AgGridDocumentTableProps {
  projectId: string;
}

export function AgGridDocumentTable({ projectId }: AgGridDocumentTableProps) {
  const activeProject = useActiveProject();
  const documents = useDocuments();
  const isLoading = useDocumentLoading();

  const { addColumn, updateColumn, deleteColumn, refreshActiveProject } =
    useProjectActions();

  const { getDocuments, uploadDocuments } = useDocumentActions();

  const [isAddColumnDialogOpen, setIsAddColumnDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeColumnSettings, setActiveColumnSettings] = useState<
    string | null
  >(null);
  const [settingsPosition, setSettingsPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const settingsButtonRefs = useRef<{
    [key: string]: HTMLButtonElement | null;
  }>({});

  // Load documents when component mounts or project changes
  useEffect(() => {
    if (projectId) {
      getDocuments(projectId);
    }
  }, [projectId, getDocuments]);

  // Convert project column definitions to array format
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

  // Custom header for dynamic columns
  const CustomHeader = (props: any) => {
    const colId = props.column.colId;
    const col = columns.find((c) => c.id === colId);

    const handleSettingsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const buttonElement = e.currentTarget;
      const rect = buttonElement.getBoundingClientRect();

      setSettingsPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX - 280,
      });
      setActiveColumnSettings(colId);
    };

    return (
      <div className="flex items-center justify-between pr-2">
        <span className="truncate">{col?.name || props.displayName}</span>
        <Button
          ref={(el) => {
            settingsButtonRefs.current[colId] = el;
          }}
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

  // Prepare ag-grid columns
  const agGridColumns = useMemo(() => {
    if (!activeProject?.gridConfiguration) return [];

    const { columnDefs, gridOptions } = activeProject.gridConfiguration;

    const baseColumns = [
      {
        headerName: "#",
        field: "index",
        width: columnDefs.index?.width || 60,
        pinned: "left" as const,
        valueGetter: (params: any) => params.node.rowIndex + 1,
        cellStyle: columnDefs.index?.cellStyle || {
          display: "flex",
          alignItems: "center",
          fontSize: "14px",
          color: "#6b7280",
          borderRight: "1px solid #e5e7eb",
        },
        sortable: false,
        filter: false,
        resizable: false,
      },
      {
        headerName: columnDefs.filename?.headerName || "Document Bundle",
        field: "filename",
        width: columnDefs.filename?.width || 320,
        pinned: "left" as const,
        sortable: true,
        filter: true,
        resizable: true,
        cellRenderer: (params: any) => (
          <div className="flex items-center gap-3 py-2">
            <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-gray-900 truncate">
                {params.data.filename}
              </span>
              <span className="text-xs text-gray-500">
                {params.data.uploadDate}
              </span>
            </div>
          </div>
        ),
        cellStyle: columnDefs.filename?.cellStyle || {
          borderRight: "1px solid #e5e7eb",
        },
      },
    ];

    const dynamicColumns = columns.map((col) => ({
      headerName: col.name,
      field: col.id,
      width: col.width,
      headerComponent: CustomHeader,
      sortable: true,
      filter: true,
      resizable: true,
      cellRenderer: (params: any) => {
        const cellData = params.data[col.id];
        return cellData ? (
          <div className="py-2">
            <DataChip data={cellData} />
          </div>
        ) : (
          <span className="text-gray-400 text-sm py-2">—</span>
        );
      },
      cellStyle: { borderRight: "1px solid #e5e7eb" },
    }));

    return [...baseColumns, ...dynamicColumns];
  }, [activeProject, columns]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    if (!searchTerm) return documents;

    return documents.filter((doc) =>
      doc.filename?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

  // Handle document upload
  const handleDocumentUpload = async (files: File[]) => {
    try {
      await uploadDocuments(projectId, files);
      setIsUploadDialogOpen(false);
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  // Handle adding a new column
  const handleAddColumn = async (columnData: AddColumnData) => {
    try {
      await addColumn(projectId, columnData);
      setIsAddColumnDialogOpen(false);
    } catch (error) {
      console.error("Add column error:", error);
    }
  };

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
      setSettingsPosition(null);
    } catch (error) {
      console.error("Delete column error:", error);
    }
  };

  if (!activeProject) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-gray-600 font-medium mb-2">
              No project selected
            </div>
            <div className="text-gray-500 text-sm">
              Select a project from the sidebar to view documents
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading documents...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {activeProject.name}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              Build
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              Review
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-900"
            >
              Automate
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900"
          >
            Export
          </Button>
          <Button
            onClick={() => setIsUploadDialogOpen(true)}
            variant="outline"
            size="sm"
            className="mr-2"
          >
            <Upload className="h-4 w-4 mr-1" /> Upload Documents
          </Button>
          <Button
            onClick={() => setIsAddColumnDialogOpen(true)}
            size="sm"
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Column
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64 h-8 text-sm border-gray-200"
            />
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-gray-600">
            <Filter className="h-4 w-4 mr-1" /> Sort and Filter
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{filteredDocuments.length} documents</span>
          <span>•</span>
          <span>
            Last updated:{" "}
            {new Date(
              activeProject.gridConfiguration.meta.lastUpdated
            ).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* AG Grid Table */}
      <div
        className="ag-theme-alpine"
        style={{ width: "100%", height: "500px" }}
      >
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
          rowData={filteredDocuments}
          columnDefs={agGridColumns}
          domLayout={activeProject.gridConfiguration.gridOptions.domLayout}
          rowSelection={
            activeProject.gridConfiguration.gridOptions.rowSelection
          }
          suppressCellFocus={
            activeProject.gridConfiguration.gridOptions.suppressCellFocus
          }
          enableCellTextSelection={
            activeProject.gridConfiguration.gridOptions.enableCellTextSelection
          }
          rowHeight={activeProject.gridConfiguration.gridOptions.rowHeight}
          headerHeight={
            activeProject.gridConfiguration.gridOptions.headerHeight
          }
          defaultColDef={
            activeProject.gridConfiguration.gridOptions.defaultColDef
          }
        />

        {/* Column Settings Modal */}
        {activeColumnSettings && settingsPosition && (
          <div
            className="fixed z-[9999]"
            style={{
              top: settingsPosition.top,
              left: settingsPosition.left,
              minWidth: 320,
            }}
          >
            <ColumnSettings
              column={columns.find((col) => col.id === activeColumnSettings)!}
              onClose={() => {
                setActiveColumnSettings(null);
                setSettingsPosition(null);
              }}
              onDelete={() => handleDeleteColumn(activeColumnSettings)}
              onColorChange={(color) =>
                setColumnColor(activeColumnSettings, color)
              }
              onUpdate={(updates) =>
                updateColumnSettings(activeColumnSettings, updates)
              }
            />
          </div>
        )}
      </div>

      {/* Add Column Dialog */}
      <AddColumnDialog
        open={isAddColumnDialogOpen}
        onOpenChange={setIsAddColumnDialogOpen}
        onAdd={handleAddColumn}
      />

      {/* Upload Document Dialog */}
      <UploadDocumentDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onUpload={handleDocumentUpload}
      />
    </div>
  );
}

export default AgGridDocumentTable;
