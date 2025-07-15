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

// POST /api/projects/[projectId]/export - Export project data
async function exportProjectHandler(req: AuthenticatedRequest) {
  const { projectId } = req.params;
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

    // Get project with documents
    const project = req.project!;
    const documents = await Document.find({
      projectId: project._id,
      status: { $ne: "deleted" },
    }).sort({ createdAt: -1 });

    // Prepare data for export
    const projectData = ExportService.prepareProjectData(project, documents);

    // Export the data
    await exportService.exportProject(projectData, {
      format,
      includeMetadata: includeMetadata || false,
      includeConfidence: includeConfidence || false,
      includeTimestamps: includeTimestamps || false,
      filename:
        filename ||
        `${project.name}_export_${new Date().toISOString().split("T")[0]}`,
    });

    // Add audit log entry
    await project.addAuditLog("exported", req.user!._id, {
      format,
      documentCount: documents.length,
      includeMetadata,
      includeConfidence,
      includeTimestamps,
    });

    return NextResponse.json({
      success: true,
      message: `Project exported successfully as ${format.toUpperCase()}`,
      data: {
        format,
        documentCount: documents.length,
        filename:
          filename ||
          `${project.name}_export_${new Date().toISOString().split("T")[0]}.${
            format === "excel" ? "xlsx" : format === "doc" ? "docx" : "pdf"
          }`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to export project data",
      },
      { status: 500 }
    );
  }
}

// GET /api/projects/[projectId]/export - Get export options and preview
async function getExportOptionsHandler(req: AuthenticatedRequest) {
  const { projectId } = req.params;

  try {
    await connectDB();

    const project = req.project!;
    const documents = await Document.find({
      projectId: project._id,
      status: { $ne: "deleted" },
    });

    const completedCount = documents.filter(
      (d) => d.processing?.status === "completed"
    ).length;
    const processingCount = documents.filter(
      (d) => d.processing?.status === "processing"
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        project: {
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
        stats: {
          totalDocuments: documents.length,
          completedDocuments: completedCount,
          processingDocuments: processingCount,
          completionRate:
            documents.length > 0
              ? Math.round((completedCount / documents.length) * 100)
              : 0,
        },
        columns: Object.entries(project.gridConfiguration?.columnDefs || {})
          .filter(([key]) => key !== "index" && key !== "filename")
          .map(([id, colDef]: [string, any]) => ({
            id,
            name: colDef.headerName,
            type: colDef.customProperties?.type || "text",
            prompt: colDef.customProperties?.prompt || "",
            aiModel: colDef.customProperties?.aiModel || "gpt-4",
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
            description:
              "Multi-sheet spreadsheet with data analysis capabilities",
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
    console.error("Get export options error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get export options",
      },
      { status: 500 }
    );
  }
}

export const POST = combineMiddlewares(
  withErrorHandling,
  withProjectAccess
)(exportProjectHandler);
export const GET = combineMiddlewares(
  withErrorHandling,
  withProjectAccess
)(getExportOptionsHandler);
