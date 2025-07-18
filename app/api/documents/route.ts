import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import connectDB from "@/lib/database/mongodb";
import Document from "@/lib/models/Document";
import DocumentCollection from "@/lib/models/DocumentCollection";
import Project from "@/lib/models/Project";

// Types for the document grid schema (maintaining backward compatibility)
export interface DocumentGridSchema {
  meta: {
    totalRows: number;
    totalCols: number;
    lastUpdated: string;
    version: string;
  };
  gridOptions: {
    domLayout: "normal" | "autoHeight" | "print";
    rowSelection: {
      enableClickSelection: boolean;
    };
    suppressCellFocus: boolean;
    enableCellTextSelection: boolean;
    rowHeight: number;
    headerHeight: number;
    defaultColDef: {
      resizable: boolean;
      sortable: boolean;
      filter: boolean;
    };
  };
  columnDefs: {
    [key: string]: {
      field: string;
      headerName: string;
      width: number;
      pinned?: string;
      sortable?: boolean;
      filter?: boolean;
      resizable?: boolean;
      cellStyle?: Record<string, any>;
      cellRenderer?: string;
      headerComponent?: string;
      customProperties?: {
        id: string;
        name: string;
        prompt: string;
        aiModel: string;
        type: string;
        color: string;
        extraction: {
          enabled: boolean;
          status: string;
        };
        styling: {
          backgroundColor: string;
          textColor: string;
          fontFamily: string;
          fontSize: number;
          fontWeight: string;
          alignment: string;
        };
      };
    };
  };
  rowData: Array<{
    id: string;
    filename: string;
    uploadDate: string;
    fileType: string;
    fileUrl: string;
    documents: any[];
    documentCount: number;
    [key: string]: any;
  }>;
}

const DATA_FILE_PATH = path.join(process.cwd(), "data", "documents.json");

// Helper function to read data from JSON file (fallback for compatibility)
async function readDataFromFile(): Promise<DocumentGridSchema> {
  try {
    const fileContents = await fs.readFile(DATA_FILE_PATH, "utf8");
    return JSON.parse(fileContents);
  } catch (error) {
    console.error("Error reading legacy data file:", error);
    // Return default data if file doesn't exist or is corrupted
    const defaultData: DocumentGridSchema = {
      meta: {
        totalRows: 0,
        totalCols: 2,
        lastUpdated: new Date().toISOString(),
        version: "1.0",
      },
      gridOptions: {
        domLayout: "normal",
        rowSelection: {
          enableClickSelection: false,
        },
        suppressCellFocus: true,
        enableCellTextSelection: true,
        rowHeight: 60,
        headerHeight: 45,
        defaultColDef: {
          resizable: true,
          sortable: true,
          filter: true,
        },
      },
      columnDefs: {
        index: {
          field: "index",
          headerName: "#",
          width: 60,
          pinned: "left",
          sortable: false,
          filter: false,
          resizable: false,
          cellStyle: {
            display: "flex",
            alignItems: "center",
            fontSize: "14px",
            color: "#6b7280",
            borderRight: "1px solid #e5e7eb",
          },
        },
        filename: {
          field: "filename",
          headerName: "Document Collection",
          width: 320,
          pinned: "left",
          cellStyle: {
            borderRight: "1px solid #e5e7eb",
          },
          cellRenderer: "documentCollectionRenderer",
        },
      },
      rowData: [],
    };
    return defaultData;
  }
}

// Helper function to write data to JSON file (fallback for compatibility)
async function writeDataToFile(data: DocumentGridSchema): Promise<void> {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(DATA_FILE_PATH);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    
    await fs.writeFile(DATA_FILE_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing data file:", error);
    throw new Error("Failed to save data");
  }
}

// Helper function to get data from database or fallback to file
async function getDocumentData(): Promise<DocumentGridSchema> {
  try {
    await connectDB();
    
    // Try to get a sample project's data from database
    const projects = await Project.find().limit(1);
    
    if (projects.length > 0) {
      const project = projects[0];
      console.log('Found project:', project.name, 'ID:', project._id);
      
      const collections = await DocumentCollection.find({ projectId: project._id, status: { $ne: 'deleted' } })
        .populate({
          path: 'documents',
          populate: {
            path: 'uploaderId',
            select: 'firstName lastName email'
          }
        })
        .sort({ order: 1 });

      console.log('Found', collections.length, 'collections for project');

      // Convert to grid format
      const rowData = collections.map(collection => {
        const primaryDoc = collection.documents[0];
        console.log('Processing collection:', collection.name, 'with documents:', collection.documents.length);
        
        // Safely handle MongoDB Map for extractedData
        let extractedDataObj = {};
        if (collection.extractedData) {
          try {
            // Handle different Map formats from MongoDB
            if (collection.extractedData instanceof Map) {
              extractedDataObj = Object.fromEntries(collection.extractedData);
            } else if (typeof collection.extractedData === 'object' && collection.extractedData !== null) {
              // If it's already a plain object, use it directly
              extractedDataObj = collection.extractedData;
            }
          } catch (error) {
            console.warn('Failed to process extractedData for collection', collection.name, ':', error);
            extractedDataObj = {};
          }
        }
        
        return {
          id: collection._id.toString(),
          filename: collection.name,
          originalName: collection.name,
          uploadDate: collection.createdAt.toISOString().split('T')[0],
          fileType: primaryDoc?.fileMetadata?.mimeType || 'collection',
          fileUrl: primaryDoc?.cloudinary?.secureUrl || '#',
          size: collection.stats.totalSize,
          status: primaryDoc?.processing?.status || 'completed',
          uploader: primaryDoc?.uploaderId,
          documents: collection.documents, // Make sure this is included
          documentCount: collection.stats.documentCount,
          hiddenDocuments: collection.settings.hiddenDocuments || [],
          // Include extracted data from collection (safely converted)
          ...extractedDataObj
        };
      });

      // Convert project grid configuration
      const columnDefs: any = {};
      if (project.gridConfiguration && project.gridConfiguration.columnDefs) {
        project.gridConfiguration.columnDefs.forEach((column, key) => {
          columnDefs[key] = column;
        });
      }

      return {
        meta: {
          totalRows: collections.length,
          totalCols: Object.keys(columnDefs).length || 2,
          lastUpdated: new Date().toISOString(),
          version: "3.0"
        },
        gridOptions: project.gridConfiguration?.gridOptions || {
          domLayout: "normal",
          rowSelection: { enableClickSelection: false },
          suppressCellFocus: true,
          enableCellTextSelection: true,
          rowHeight: 60,
          headerHeight: 45,
          defaultColDef: {
            resizable: true,
            sortable: true,
            filter: true,
          },
        },
        columnDefs,
        rowData
      };
    }
  } catch (error) {
    console.error("Error getting data from database:", error);
  }

  // Fallback to file-based data
  return await readDataFromFile();
}

// Helper function to generate random colors for new columns
function getRandomColor(): string {
  const colors = [
    "#f97316",
    "#3b82f6", 
    "#8b5cf6",
    "#22c55e",
    "#06b6d4",
    "#f59e0b",
    "#ef4444",
    "#10b981",
    "#8b5cf6",
    "#f97316",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export async function GET() {
  try {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const data = await getDocumentData();
    
    // Add cache headers to prevent caching during development
    const response = NextResponse.json(data);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error("Error fetching document data:", error);
    return NextResponse.json(
      { error: "Failed to fetch document data", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "addDocument") {
      // This action is now handled by the upload API which creates collections automatically
      return NextResponse.json({ 
        success: false, 
        error: "Use the upload API to add documents. Each document will automatically create a collection." 
      }, { status: 400 });
    }

    if (body.action === "addColumn") {
      // Handle legacy add column action
      const data = await getDocumentData();
      
      const columnId = `col_${Date.now()}`;
      const columnColor = body.color || getRandomColor();

      const newColumnDef = {
        field: columnId,
        headerName: body.name,
        width: body.width || 150,
        resizable: true,
        sortable: true,
        filter: true,
        cellRenderer: "dataChipRenderer",
        cellStyle: {
          borderRight: "1px solid #e5e7eb",
        },
        headerComponent: "customHeaderRenderer",
        customProperties: {
          id: columnId,
          name: body.name,
          prompt: body.prompt,
          aiModel: body.aiModel,
          type: body.type,
          color: columnColor,
          extraction: {
            enabled: true,
            status: "active",
          },
          styling: {
            backgroundColor: columnColor,
            textColor: "#ffffff",
            fontFamily: "Inter",
            fontSize: 12,
            fontWeight: "medium",
            alignment: "left",
          },
        },
      };

      data.columnDefs[columnId] = newColumnDef;

      // Add empty data for this column to all existing rows
      data.rowData.forEach((row) => {
        row[columnId] = {
          value: "",
          type: body.type,
          status: null,
          confidence: 0,
          extractedAt: new Date().toISOString(),
        };
      });

      data.meta.totalCols = Object.keys(data.columnDefs).length;
      data.meta.lastUpdated = new Date().toISOString();

      await writeDataToFile(data);
      return NextResponse.json({
        success: true,
        column: newColumnDef,
        columnId,
      });
    }

    if (body.action === "deleteColumn") {
      const data = await getDocumentData();
      const { columnId } = body;

      delete data.columnDefs[columnId];

      data.rowData.forEach((row) => {
        delete row[columnId];
      });

      data.meta.totalCols = Object.keys(data.columnDefs).length;
      data.meta.lastUpdated = new Date().toISOString();

      await writeDataToFile(data);
      return NextResponse.json({ success: true });
    }

    if (body.action === "updateColumn") {
      const data = await getDocumentData();
      const { columnId, updates } = body;

      if (data.columnDefs[columnId]) {
        if (updates.name) {
          data.columnDefs[columnId].headerName = updates.name;
          if (data.columnDefs[columnId].customProperties) {
            data.columnDefs[columnId].customProperties!.name = updates.name;
          }
        }
        if (updates.width) data.columnDefs[columnId].width = updates.width;

        if (data.columnDefs[columnId].customProperties) {
          const props = data.columnDefs[columnId].customProperties!;
          if (updates.prompt) props.prompt = updates.prompt;
          if (updates.aiModel) props.aiModel = updates.aiModel;
          if (updates.type) props.type = updates.type;
          if (updates.color) {
            props.color = updates.color;
            props.styling.backgroundColor = updates.color;
          }
        }

        data.meta.lastUpdated = new Date().toISOString();
        await writeDataToFile(data);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const columnId = searchParams.get("columnId");

    if (!columnId) {
      return NextResponse.json(
        { error: "Column ID is required" },
        { status: 400 }
      );
    }

    const data = await getDocumentData();

    delete data.columnDefs[columnId];

    data.rowData.forEach((row) => {
      delete row[columnId];
    });

    data.meta.totalCols = Object.keys(data.columnDefs).length;
    data.meta.lastUpdated = new Date().toISOString();

    await writeDataToFile(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting column:", error);
    return NextResponse.json(
      { error: "Failed to delete column" },
      { status: 500 }
    );
  }
}
