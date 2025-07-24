import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/database/mongodb";
import Project from "@/lib/models/Project";
import Document from "@/lib/models/Document";
import DocumentCollection from "@/lib/models/DocumentCollection"; // NEW: Added DocumentCollection
import User from "@/lib/models/User";
import jwt from "jsonwebtoken";

interface CellCustomizationData {
  columnName: string;
  defaultPrompt: string;
  effectivePrompt: string;
  isCustomized: boolean;
  cellCustomization: any;
  currentValue: string;
  confidence: number;
  lastExtracted: string | null;
  extractionHistory?: Array<{
    timestamp: string;
    prompt: string;
    result: string;
    confidence: number;
    aiModel: string;
  }>;
}

// Helper function to authenticate user
async function authenticateUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    throw new Error("Access denied. No token provided.");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await User.findById(decoded.id).select("-password");

    if (!user || user.status !== "active") {
      throw new Error("Invalid or inactive user.");
    }

    return user;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token expired");
    }
    throw new Error("Invalid token");
  }
}

// Helper function to verify project access
async function verifyProjectAccess(projectId: string, userId: string) {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const hasAccess = project.ownerId.toString() === userId ||
    project.collaborators.some((collab: any) => collab.userId.toString() === userId);

  if (!hasAccess) {
    throw new Error("Access denied to project");
  }

  return project;
}

// GET /api/cell-customization - Get cell information including default prompt
export async function GET(request: NextRequest) {
  try {
    console.log("🚀 Cell customization API called");
    await connectDB();

    const user = await authenticateUser(request);
    console.log("✅ User authenticated:", user.email);
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const documentId = searchParams.get('documentId'); // This is actually a collection ID
    const columnId = searchParams.get('columnId');

    console.log("📋 Parameters:", { projectId, collectionId: documentId, columnId });

    if (!projectId || !documentId || !columnId) {
      console.log("❌ Missing parameters");
      return NextResponse.json({
        success: false,
        error: "Missing required parameters: projectId, documentId (collectionId), columnId"
      }, { status: 400 });
    }

    // Verify project access
    console.log("🔍 Verifying project access...");
    const project = await verifyProjectAccess(projectId, user._id.toString());
    console.log("✅ Project access verified:", project.name);

    // Find document collection (the documentId is actually a collection ID)
    console.log("🔍 Finding document collection...");
    const collection = await DocumentCollection.findById(documentId);
    if (!collection) {
      console.log("❌ Document collection not found with ID:", documentId);
      return NextResponse.json({
        success: false,
        error: "Document collection not found"
      }, { status: 404 });
    }
    if (collection.projectId.toString() !== projectId) {
      console.log("❌ Collection project mismatch:", collection.projectId.toString(), "!=", projectId);
      return NextResponse.json({
        success: false,
        error: "Document collection not found"
      }, { status: 404 });
    }
    console.log("✅ Document collection found:", collection.name);

    // Get column configuration from project
    console.log("🔍 Getting column configuration...");
    const columnDef = project.gridConfiguration?.columnDefs?.get ? 
      project.gridConfiguration.columnDefs.get(columnId) : 
      project.gridConfiguration?.columnDefs?.[columnId];
    
    if (!columnDef) {
      console.log("❌ Column not found in project configuration:", columnId);
      console.log("Available columns:", Object.keys(project.gridConfiguration?.columnDefs || {}));
      return NextResponse.json({
        success: false,
        error: `Column '${columnId}' not found in project configuration`
      }, { status: 404 });
    }
    console.log("✅ Column found:", columnDef.headerName);

    // Get current extracted data for this cell from the collection
    console.log("🔍 Getting extracted data from collection...");
    const currentExtractedData = collection.extractedData?.get ? 
      collection.extractedData.get(columnId) : 
      collection.extractedData?.[columnId];
    
    console.log("📊 Current collection extracted data:", currentExtractedData);
    
    // For collections, we don't have cell-level customization like individual documents
    // Instead, we work with the aggregated data from the collection
    const isCustomized = false; // Collections don't have cell-level customization yet
    const cellCustomization = null;

    console.log("🎨 Collection data:", { isCustomized, sourceDocuments: currentExtractedData?.sourceDocuments?.length || 0 });

    // No extraction history for collections yet (could be implemented later)
    const extractionHistory: any[] = [];

    // Build response data
    const cellInfo: CellCustomizationData = {
      columnName: columnDef.customProperties?.name || columnDef.headerName,
      defaultPrompt: columnDef.customProperties?.prompt || `Extract ${columnDef.headerName} from the document`,
      effectivePrompt: isCustomized ? 
        cellCustomization.customPrompt : 
        (columnDef.customProperties?.prompt || `Extract ${columnDef.headerName} from the document`),
      isCustomized,
      cellCustomization: cellCustomization ? {
        isCustomized: true,
        customPrompt: cellCustomization.customPrompt,
        notes: cellCustomization.notes,
        customizedAt: cellCustomization.customizedAt,
        customizedBy: cellCustomization.customizedBy
      } : null,
      currentValue: currentExtractedData?.value || "",
      confidence: currentExtractedData?.confidence || 0,
      lastExtracted: currentExtractedData?.extractedAt || null,
      extractionHistory
    };

    console.log("✅ Returning collection cell info:", {
      columnName: cellInfo.columnName,
      defaultPrompt: cellInfo.defaultPrompt.substring(0, 50) + '...',
      currentValue: cellInfo.currentValue,
      confidence: cellInfo.confidence,
      isCustomized: cellInfo.isCustomized,
      collectionName: collection.name,
      sourceDocsCount: currentExtractedData?.sourceDocuments?.length || 0
    });

    return NextResponse.json({
      success: true,
      data: cellInfo
    });

  } catch (error: any) {
    console.error("❌ Cell customization GET error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error"
    }, { status: 500 });
  }
}

// POST /api/cell-customization - Create new cell customization
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    return NextResponse.json({
      success: false,
      error: "Cell-level customization is not available for document collections",
      message: "This feature works with individual documents, but you're viewing aggregated data from document collections. Collection-level customization will be available in a future update."
    }, { status: 400 });

  } catch (error: any) {
    console.error("❌ Cell customization POST error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error"
    }, { status: 500 });
  }
}

// PUT /api/cell-customization - Update existing cell customization
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    return NextResponse.json({
      success: false,
      error: "Cell-level customization is not available for document collections",
      message: "This feature works with individual documents, but you're viewing aggregated data from document collections. Collection-level customization will be available in a future update."
    }, { status: 400 });

  } catch (error: any) {
    console.error("❌ Cell customization PUT error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error"
    }, { status: 500 });
  }
}

// DELETE /api/cell-customization - Remove cell customization
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    return NextResponse.json({
      success: false,
      error: "Cell-level customization is not available for document collections",
      message: "This feature works with individual documents, but you're viewing aggregated data from document collections. Collection-level customization will be available in a future update."
    }, { status: 400 });

  } catch (error: any) {
    console.error("❌ Cell customization DELETE error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error"
    }, { status: 500 });
  }
}
