"use client";

import React, { useState, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddColumnDialog } from "@/components/table/add-column-dialog";
import { UploadDocumentDialog } from "@/components/table/upload-document-dialog";
import { DataChip } from "@/components/table/data-chip";
import { Plus, Filter, Search, FileText, Settings } from "lucide-react";
import { ClientSideRowModelModule, ModuleRegistry } from "ag-grid-community";
import { ColumnSettings } from "@/components/table/column-settings";

ModuleRegistry.registerModules([ClientSideRowModelModule]);

// Types
export type Document = {
  id: string;
  filename: string;
  uploadDate: string;
  fileUrl: string;
  fileType: string;
};

export type Column = {
  id: string;
  name: string;
  prompt: string;
  aiModel: string;
  width: number;
  color?: string;
  type?:
    | "text"
    | "date"
    | "price"
    | "location"
    | "person"
    | "organization"
    | "status"
    | "collection";
};

export type ExtractedData = {
  documentId: string;
  columnId: string;
  value: string;
  type?:
    | "text"
    | "date"
    | "price"
    | "location"
    | "person"
    | "organization"
    | "status"
    | "collection";
  status?: "yes" | "no" | "pending";
};

// Mock initial data
const initialDocuments: Document[] = [
  {
    id: "doc-1",
    filename: "Enterprise Agreement.pdf",
    uploadDate: "2025-01-15",
    fileType: "application/pdf",
    fileUrl: "#",
  },
  {
    id: "doc-2",
    filename: "Carrier Contract.docx",
    uploadDate: "2025-01-14",
    fileType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileUrl: "#",
  },
  {
    id: "doc-3",
    filename: "Safety Shield Terms.pdf",
    uploadDate: "2025-01-13",
    fileType: "application/pdf",
    fileUrl: "#",
  },
];

const initialColumns: Column[] = [
  {
    id: "col-1",
    name: "Line Of Business",
    prompt: "Extract the line of business or business type from this document",
    aiModel: "gpt-4",
    width: 150,
    color: "#f97316",
    type: "collection",
  },
  {
    id: "col-2",
    name: "Document Summary",
    prompt: "Provide a brief summary of this document",
    aiModel: "gpt-4",
    width: 200,
    type: "text",
  },
  {
    id: "col-3",
    name: "Customer",
    prompt: "Extract the customer or client name from this document",
    aiModel: "gpt-4",
    width: 180,
    type: "text",
  },
  {
    id: "col-4",
    name: "New Logo",
    prompt: "Determine if this document mentions a new logo or branding",
    aiModel: "gpt-4",
    width: 120,
    color: "#22c55e",
    type: "status",
  },
  {
    id: "col-5",
    name: "Agreement, Order & Contract",
    prompt: "Extract agreement date, order details, and contract information",
    aiModel: "gpt-4",
    width: 250,
    type: "text",
  },
  {
    id: "col-6",
    name: "Payment Terms",
    prompt: "Extract payment terms and conditions from this document",
    aiModel: "gpt-4",
    width: 180,
    type: "text",
  },
];

const initialExtractedData: ExtractedData[] = [
  // Document 1 data
  {
    documentId: "doc-1",
    columnId: "col-1",
    value: "Enterprise",
    type: "collection",
  },
  {
    documentId: "doc-1",
    columnId: "col-2",
    value:
      "Enterprise agreement covering service terms and conditions for business operations",
    type: "text",
  },
  {
    documentId: "doc-1",
    columnId: "col-3",
    value: "Insight Global",
    type: "text",
  },
  {
    documentId: "doc-1",
    columnId: "col-4",
    value: "Yes",
    type: "status",
    status: "yes",
  },
  {
    documentId: "doc-1",
    columnId: "col-5",
    value: "Agreement Date: 2025-01-15, Enterprise Service Contract",
    type: "text",
  },
  {
    documentId: "doc-1",
    columnId: "col-6",
    value: "Net 30 days",
    type: "text",
  },

  // Document 2 data
  {
    documentId: "doc-2",
    columnId: "col-1",
    value: "Carrier",
    type: "collection",
  },
  {
    documentId: "doc-2",
    columnId: "col-2",
    value:
      "Carrier service agreement with emergency provisions and logistics terms",
    type: "text",
  },
  {
    documentId: "doc-2",
    columnId: "col-3",
    value: "Emergency Twenty Logistics",
    type: "text",
  },
  {
    documentId: "doc-2",
    columnId: "col-4",
    value: "No",
    type: "status",
    status: "no",
  },
  {
    documentId: "doc-2",
    columnId: "col-5",
    value: "Agreement Date: 2025-01-14, Carrier Service Contract",
    type: "text",
  },
  {
    documentId: "doc-2",
    columnId: "col-6",
    value: "Net 15 days",
    type: "text",
  },

  // Document 3 data
  {
    documentId: "doc-3",
    columnId: "col-1",
    value: "Safety Shield",
    type: "collection",
  },
  {
    documentId: "doc-3",
    columnId: "col-2",
    value: "General Terms for safety and compliance requirements in workplace",
    type: "text",
  },
  {
    documentId: "doc-3",
    columnId: "col-3",
    value: "Winchester Public Safety",
    type: "text",
  },
  {
    documentId: "doc-3",
    columnId: "col-4",
    value: "No",
    type: "status",
    status: "no",
  },
  {
    documentId: "doc-3",
    columnId: "col-5",
    value: "Agreement Date: 2025-01-13, Safety Compliance Contract",
    type: "text",
  },
  {
    documentId: "doc-3",
    columnId: "col-6",
    value: "Net 45 days",
    type: "text",
  },
];

export function AgGridDocumentTable() {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [extractedData, setExtractedData] =
    useState<ExtractedData[]>(initialExtractedData);
  const [isAddColumnDialogOpen, setIsAddColumnDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeColumnSettings, setActiveColumnSettings] = useState<
    string | null
  >(null);

  // Custom header for dynamic columns
  const CustomHeader = (props: any) => {
    const colId = props.column.colId;
    const col = columns.find((c) => c.id === colId);
    return (
      <div className="flex items-center justify-between pr-2">
        <span className="truncate">{col?.name || props.displayName}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-gray-200"
          onClick={(e) => {
            e.stopPropagation();
            setActiveColumnSettings(colId);
          }}
        >
          <Settings className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  // Prepare ag-grid columns
  const agGridColumns = useMemo(() => {
    const baseColumns = [
      {
        headerName: "#",
        field: "index",
        width: 60,
        pinned: "left" as const,
        valueGetter: (params: any) => params.node.rowIndex + 1,
        cellStyle: {
          display: "flex",
          alignItems: "center",
          fontSize: "14px",
          color: "#6b7280",
          borderRight: "1px solid #e5e7eb",
        },
        headerClass: "ag-header-cell ag-header-cell-number",
      },
      {
        headerName: "Document Bundle",
        field: "filename",
        width: 320,
        pinned: "left" as const,
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
        cellStyle: { borderRight: "1px solid #e5e7eb" },
      },
    ];

    const dynamicColumns = columns.map((col) => ({
      headerName: col.name,
      field: col.id,
      width: col.width,
      headerComponent: CustomHeader,
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
  }, [columns]);

  // Prepare ag-grid row data
  const agGridRows = useMemo(() => {
    return documents.map((doc) => {
      const row: any = { ...doc };
      columns.forEach((col) => {
        const cell = extractedData.find(
          (data) => data.documentId === doc.id && data.columnId === col.id
        );
        row[col.id] = cell;
      });
      return row;
    });
  }, [documents, columns, extractedData]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!searchTerm) return agGridRows;
    return agGridRows.filter((row) =>
      row.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [agGridRows, searchTerm]);

  // Handle document upload
  const handleDocumentUpload = (document: Document) => {
    setDocuments((prev) => [...prev, document]);
    if (columns.length > 0) {
      const newExtractedData = columns.map((column) => ({
        documentId: document.id,
        columnId: column.id,
        value: `Extracted data for ${column.name} from ${document.filename}`,
        type: column.type || ("text" as ExtractedData["type"]),
      }));
      setExtractedData((prev) => [...prev, ...newExtractedData]);
    }
  };

  // Handle adding a new column
  const handleAddColumn = (column: Column) => {
    setColumns((prev) => [...prev, column]);
    if (documents.length > 0) {
      const newExtractedData = documents.map((doc) => ({
        documentId: doc.id,
        columnId: column.id,
        value: `Extracted data for ${column.name} from ${doc.filename}`,
        type: column.type || ("text" as ExtractedData["type"]),
      }));
      setExtractedData((prev) => [...prev, ...newExtractedData]);
    }
  };

  // Set a column color
  const setColumnColor = (columnId: string, color: string) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, color } : col))
    );
  };

  // Update column settings
  const updateColumnSettings = (columnId: string, updates: Partial<Column>) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, ...updates } : col))
    );
  };

  // Handle column deletion
  const handleDeleteColumn = (columnId: string) => {
    setColumns((prev) => prev.filter((col) => col.id !== columnId));
    setExtractedData((prev) =>
      prev.filter((data) => data.columnId !== columnId)
    );
    setActiveColumnSettings(null);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Knowledge Hub (AG Grid)
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
          <span>{filteredRows.length} items</span>
        </div>
      </div>

      {/* AG Grid Table */}
      <div
        className="ag-theme-alpine"
        style={{ width: "100%", height: "500px" }}
      >
        <AgGridReact
          rowData={filteredRows}
          columnDefs={agGridColumns}
          domLayout="normal"
          suppressRowClickSelection={true}
          suppressCellFocus={true}
          enableCellTextSelection={true}
          rowHeight={60}
          headerHeight={45}
          defaultColDef={{
            resizable: true,
            sortable: true,
            filter: true,
          }}
        />
        {/* Column Settings Modal */}
        {activeColumnSettings && (
          <div
            className="fixed z-[9999] top-32 right-10"
            style={{ minWidth: 320 }}
          >
            <ColumnSettings
              column={columns.find((col) => col.id === activeColumnSettings)!}
              onClose={() => setActiveColumnSettings(null)}
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
