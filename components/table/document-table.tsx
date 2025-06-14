"use client";

import React,{ useState, useRef, useEffect } from "react";
import {
  PlusCircle,
  UploadCloud,
  Settings,
  Trash2,
  Check,
  X,
  Plus,
  Filter,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddColumnDialog } from "@/components/table/add-column-dialog";
import { UploadDocumentDialog } from "@/components/table/upload-document-dialog";
import { DataChip } from "@/components/table/data-chip";
import { ColumnSettings } from "@/components/table/column-settings";
import { cn } from "@/lib/utils";
import { useResizableColumns } from "@/hooks/use-resizable-columns";

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

// Mock initial data with sample content
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
      "Document 1: Enterprise agreement covering service terms and conditions",
    type: "text",
  },
  { documentId: "doc-1", columnId: "col-3", value: "Insight", type: "text" },
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
    value: "Agreement Date: Not specified",
    type: "text",
  },
  { documentId: "doc-1", columnId: "col-6", value: "Text", type: "text" },

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
    value: "Document 1: Carrier service agreement with emergency provisions",
    type: "text",
  },
  {
    documentId: "doc-2",
    columnId: "col-3",
    value: "Emergency Twenty",
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
    value: "Agreement Date: 2025-01-14",
    type: "date",
  },
  { documentId: "doc-2", columnId: "col-6", value: "File", type: "text" },

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
    value: "General Terms for safety and compliance requirements",
    type: "text",
  },
  {
    documentId: "doc-3",
    columnId: "col-3",
    value: "Winchester Public",
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
    value: "Agreement Date: 2025-01-13",
    type: "date",
  },
  { documentId: "doc-3", columnId: "col-6", value: "Number", type: "text" },
];

export function DocumentTable() {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [extractedData, setExtractedData] =
    useState<ExtractedData[]>(initialExtractedData);
  const [isAddColumnDialogOpen, setIsAddColumnDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [activeColumnSettings, setActiveColumnSettings] = useState<
    string | null
  >(null);
  const [searchTerm, setSearchTerm] = useState("");
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Setup resizable columns
  const { startResizing, columnWidths, updateColumnWidth, isResizing } =
    useResizableColumns(columns);

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

  // Handle column deletion
  const handleDeleteColumn = (columnId: string) => {
    setColumns((prev) => prev.filter((col) => col.id !== columnId));
    setExtractedData((prev) =>
      prev.filter((data) => data.columnId !== columnId)
    );
    setActiveColumnSettings(null);
  };

  // Get cell data
  const getCellData = (documentId: string, columnId: string) => {
    return extractedData.find(
      (data) => data.documentId === documentId && data.columnId === columnId
    );
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

  // Calculate dynamic styles for cells/columns
  const getColumnStyle = (columnId: string) => {
    const column = columns.find((col) => col.id === columnId);
    const width = columnWidths[columnId] || column?.width || 200;
    return {
      width: `${width}px`,
      minWidth: `${width}px`,
      maxWidth: `${width}px`,
    };
  };

  // Filter documents based on search
  const filteredDocuments = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate total table width for infinite scroll
  const totalTableWidth = React.useMemo(() => {
    const fixedColumnsWidth = 12 + 320; // S No. + Document Bundle
    const dynamicColumnsWidth = columns.reduce((total, column) => {
      return total + (columnWidths[column.id] || column.width || 200);
    }, 0);
    const addColumnWidth = 60; // Add column button
    return fixedColumnsWidth + dynamicColumnsWidth + addColumnWidth;
  }, [columns, columnWidths]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Knowledge Hub</h2>
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
            <Plus className="h-4 w-4 mr-1" />
            Add Column
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
            <Filter className="h-4 w-4 mr-1" />
            Sort and Filter
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{filteredDocuments.length} items</span>
        </div>
      </div>

      {/* Table Container with Infinite Width */}
      <div
        className="overflow-auto relative"
        ref={tableContainerRef}
        style={{
          cursor: isResizing ? "col-resize" : "default",
          userSelect: isResizing ? "none" : "auto",
        }}
      >
        <div style={{ minWidth: `${totalTableWidth}px` }}>
          <Table className="table-fixed">
            <TableHeader className="sticky top-0 bg-gray-50 z-10">
              <TableRow className="border-b border-gray-200 hover:bg-gray-50">
                <TableHead className="w-12 text-center font-medium sticky left-0 bg-gray-50 z-20 border-r border-gray-200 text-xs text-gray-600">
                  #
                </TableHead>
                <TableHead className="w-80 font-medium sticky left-12 bg-gray-50 z-20 border-r border-gray-200 text-xs text-gray-600">
                  Document Bundle
                </TableHead>

                {columns.map((column, index) => (
                  <TableHead
                    key={column.id}
                    style={getColumnStyle(column.id)}
                    className="font-medium relative group border-r border-gray-200 text-xs text-gray-600 bg-gray-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between pr-4">
                      <span className="truncate">{column.name}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-gray-200"
                          onClick={() => setActiveColumnSettings(column.id)}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-gray-200"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Resizable handle */}
                    <div
                      className="absolute right-0 top-0 h-full w-2 bg-transparent hover:bg-blue-500/20 cursor-col-resize transition-colors z-30"
                      onMouseDown={(e) => startResizing(e, column.id)}
                      style={{
                        cursor: "col-resize",
                        right: "-1px",
                      }}
                    />

                    {/* Column settings popup */}
                    {activeColumnSettings === column.id && (
                      <div
                        className="fixed z-[9999]"
                        style={{
                          top: "120px",
                          right: "20px",
                        }}
                      >
                        <ColumnSettings
                          column={column}
                          onClose={() => setActiveColumnSettings(null)}
                          onDelete={() => handleDeleteColumn(column.id)}
                          onColorChange={(color) =>
                            setColumnColor(column.id, color)
                          }
                          onUpdate={(updates) =>
                            updateColumnSettings(column.id, updates)
                          }
                        />
                      </div>
                    )}
                  </TableHead>
                ))}

                <TableHead className="w-12 border-r border-gray-200 bg-gray-50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                    onClick={() => setIsAddColumnDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow className="hover:bg-gray-50/50">
                  <TableCell
                    colSpan={columns.length + 3}
                    className="h-40 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <UploadCloud className="h-10 w-10 mb-2 text-gray-400" />
                      <p className="text-sm">No documents found</p>
                      <Button
                        variant="outline"
                        className="mt-4 text-sm"
                        onClick={() => setIsUploadDialogOpen(true)}
                      >
                        Upload Document
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc, index) => (
                  <TableRow
                    key={doc.id}
                    className="hover:bg-gray-50/50 border-b border-gray-100"
                  >
                    <TableCell className="text-center font-medium sticky left-0 bg-white z-20 border-r border-gray-200 w-12 text-sm text-gray-600">
                      {index + 1}
                    </TableCell>
                    <TableCell className="sticky left-12 bg-white z-20 border-r border-gray-200 w-80">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4 text-blue-600"
                          >
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {doc.filename}
                          </span>
                          <span className="text-xs text-gray-500">
                            {doc.uploadDate}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {columns.map((column) => {
                      const cellData = getCellData(doc.id, column.id);
                      return (
                        <TableCell
                          key={`${doc.id}-${column.id}`}
                          style={getColumnStyle(column.id)}
                          className="border-r border-gray-200 py-3 overflow-hidden"
                        >
                          {cellData ? (
                            <DataChip data={cellData} />
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                      );
                    })}

                    <TableCell className="w-12 border-r border-gray-200" />
                  </TableRow>
                ))
              )}

              {/* Add new document row */}
              <TableRow className="hover:bg-gray-50/50 border-b border-gray-100">
                <TableCell className="sticky left-0 bg-white z-20 border-r border-gray-200 w-12 text-center text-sm text-gray-400">
                  +
                </TableCell>
                <TableCell className="sticky left-12 bg-white z-20 border-r border-gray-200 w-80">
                  <Button
                    variant="ghost"
                    className="flex items-center text-gray-600 hover:text-gray-900 h-8 px-2 text-sm"
                    onClick={() => setIsUploadDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span>New entity</span>
                  </Button>
                </TableCell>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    style={getColumnStyle(column.id)}
                    className="border-r border-gray-200"
                  />
                ))}
                <TableCell className="w-12 border-r border-gray-200" />
              </TableRow>
            </TableBody>
          </Table>
        </div>
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
