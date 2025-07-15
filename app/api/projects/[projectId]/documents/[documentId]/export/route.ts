import { NextRequest, NextResponse } from "next/server";
import {
  withProjectAccess,
  combineMiddlewares,
  withErrorHandling,
  AuthenticatedRequest,
} from "@/lib/middleware/auth";
import { exportService, ExportService } from "@/lib/services/exportService";
import connectDB from "@/lib/database/mongodb";
import Document from "@/lib/models/Document";

// POST /api/projects/[projectId]/documents/[documentId]/export - Export document data
async function exportDocumentHandler(req: AuthenticatedRequest) {
  const { projectId, documentId } = req.params;
  const {
    format,
    includeMetadata,
    includeConfidence,
    includeTimestamps,
    filename,
  } = await req.json();

  if (!format || !["pdf", "excel", "doc"].includes(format)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid export format. Must be pdf, excel, or doc.",
      },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // Get document and project
    const document = await Document.findOne({
      _id: documentId,
      projectId: projectId,
      status: { $ne: "deleted" },
    });

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: "Document not found",
        },
        { status: 404 }
      );
    }

    const project = req.project!;

    // Prepare data for export
    const documentData = ExportService.prepareDocumentData(document);
    const projectData = ExportService.prepareProjectData(project, [document]);

    // Export the data
    await exportService.exportDocument(documentData, projectData, {
      format,
      includeMetadata: includeMetadata || false,
      includeConfidence: includeConfidence || false,
      includeTimestamps: includeTimestamps || false,
      filename:
        filename ||
        `${document.filename}_extracted_data_${
          new Date().toISOString().split("T")[0]
        }`,
    });

    // Add audit log entry
    await document.addAuditLog("exported", req.user!._id, {
      format,
      includeMetadata,
      includeConfidence,
      includeTimestamps,
    });

    return NextResponse.json({
      success: true,
      message: `Document exported successfully as ${format.toUpperCase()}`,
      data: {
        format,
        filename:
          filename ||
          `${document.filename}_extracted_data_${
            new Date().toISOString().split("T")[0]
          }.${format === "excel" ? "xlsx" : format === "doc" ? "docx" : "pdf"}`,
        document: {
          id: document._id,
          filename: document.filename,
          status: document.processing?.status,
          extractedColumns: Object.keys(document.extractedData || {}).length,
        },
      },
    });
  } catch (error: any) {
    console.error("Export document error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to export document data",
      },
      { status: 500 }
    );
  }
}

// GET /api/projects/[projectId]/documents/[documentId]/export - Get document export options
async function getDocumentExportOptionsHandler(req: AuthenticatedRequest) {
  const { projectId, documentId } = req.params;

  try {
    await connectDB();

    const document = await Document.findOne({
      _id: documentId,
      projectId: projectId,
      status: { $ne: "deleted" },
    });

    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: "Document not found",
        },
        { status: 404 }
      );
    }

    const project = req.project!;

    return NextResponse.json({
      success: true,
      data: {
        document: {
          id: document._id,
          filename: document.filename,
          originalName: document.originalName,
          uploadDate: document.createdAt,
          fileType: document.fileMetadata?.mimeType,
          fileSize: document.fileMetadata?.size,
          status: document.processing?.status,
          extractedColumns: Object.keys(document.extractedData || {}).length,
        },
        project: {
          name: project.name,
          description: project.description,
        },
        columns: Object.entries(project.gridConfiguration?.columnDefs || {})
          .filter(([key]) => key !== "index" && key !== "filename")
          .map(([id, colDef]: [string, any]) => ({
            id,
            name: colDef.headerName,
            type: colDef.customProperties?.type || "text",
            prompt: colDef.customProperties?.prompt || "",
            aiModel: colDef.customProperties?.aiModel || "gpt-4",
            hasData:
              document.extractedData && document.extractedData[id]
                ? true
                : false,
          })),
        exportFormats: [
          {
            value: "pdf",
            label: "PDF Document",
            description: "Portable document format with tables and formatting",
          },
          {
            value: "excel",
            label: "Excel Spreadsheet",
            description: "Spreadsheet with extracted data and metadata",
          },
          {
            value: "doc",
            label: "Word Document",
            description: "Formatted document with tables and styling",
          },
        ],
        exportOptions: [
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
        ],
      },
    });
  } catch (error: any) {
    console.error("Get document export options error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get document export options",
      },
      { status: 500 }
    );
  }
}

export const POST = combineMiddlewares(
  withErrorHandling,
  withProjectAccess
)(exportDocumentHandler);
export const GET = combineMiddlewares(
  withErrorHandling,
  withProjectAccess
)(getDocumentExportOptionsHandler);
