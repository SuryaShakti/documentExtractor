import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
} from "docx";
import { saveAs } from "file-saver";
import { Document as DocumentModel, Project as ProjectModel } from "../models";

export interface ExportOptions {
  format: "pdf" | "excel" | "doc";
  includeMetadata?: boolean;
  includeConfidence?: boolean;
  includeTimestamps?: boolean;
  filename?: string;
}

export interface DocumentExportData {
  id: string;
  filename: string;
  originalName: string;
  uploadDate: string;
  fileType: string;
  fileSize: string;
  status: string;
  extractedData: Record<string, any>;
  metadata?: {
    confidence: number;
    extractedAt: string;
    extractedBy: string;
  };
}

export interface ProjectExportData {
  project: {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
  columns: Array<{
    id: string;
    name: string;
    type: string;
    prompt: string;
    aiModel: string;
  }>;
  documents: DocumentExportData[];
  stats: {
    totalDocuments: number;
    completedDocuments: number;
    processingDocuments: number;
    completionRate: number;
  };
}

export class ExportService {
  private static instance: ExportService;

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  /**
   * Export a single document's extracted data
   */
  async exportDocument(
    document: DocumentExportData,
    project: ProjectExportData,
    options: ExportOptions
  ): Promise<void> {
    const filename = options.filename || `${document.filename}_extracted_data`;

    switch (options.format) {
      case "pdf":
        await this.exportDocumentToPDF(document, project, options, filename);
        break;
      case "excel":
        await this.exportDocumentToExcel(document, project, options, filename);
        break;
      case "doc":
        await this.exportDocumentToDOC(document, project, options, filename);
        break;
    }
  }

  /**
   * Export entire project data
   */
  async exportProject(
    projectData: ProjectExportData,
    options: ExportOptions
  ): Promise<void> {
    const filename =
      options.filename || `${projectData.project.name}_project_data`;

    switch (options.format) {
      case "pdf":
        await this.exportProjectToPDF(projectData, options, filename);
        break;
      case "excel":
        await this.exportProjectToExcel(projectData, options, filename);
        break;
      case "doc":
        await this.exportProjectToDOC(projectData, options, filename);
        break;
    }
  }

  /**
   * Export document to PDF
   */
  private async exportDocumentToPDF(
    document: DocumentExportData,
    project: ProjectExportData,
    options: ExportOptions,
    filename: string
  ): Promise<void> {
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Document Extraction Report", 20, yPosition);
    yPosition += 20;

    // Document Info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Document Information:", 20, yPosition);
    yPosition += 10;

    doc.setFont("helvetica", "normal");
    doc.text(`Filename: ${document.filename}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Original Name: ${document.originalName}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Upload Date: ${document.uploadDate}`, 20, yPosition);
    yPosition += 7;
    doc.text(`File Type: ${document.fileType}`, 20, yPosition);
    yPosition += 7;
    doc.text(`File Size: ${document.fileSize}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Status: ${document.status}`, 20, yPosition);
    yPosition += 15;

    // Extracted Data
    doc.setFont("helvetica", "bold");
    doc.text("Extracted Data:", 20, yPosition);
    yPosition += 10;

    const columns = project.columns.filter(
      (col) => col.id !== "index" && col.id !== "filename"
    );

    // Create table headers
    const headers = ["Column", "Value", "Type"];
    if (options.includeConfidence) headers.push("Confidence");
    if (options.includeTimestamps) headers.push("Extracted At");

    const tableData = columns.map((col) => {
      const extractedData = document.extractedData[col.id];
      const row = [col.name, extractedData?.value || "N/A", col.type];

      if (options.includeConfidence) {
        row.push(
          extractedData?.confidence
            ? `${(extractedData.confidence * 100).toFixed(1)}%`
            : "N/A"
        );
      }
      if (options.includeTimestamps) {
        row.push(
          extractedData?.extractedAt
            ? new Date(extractedData.extractedAt).toLocaleString()
            : "N/A"
        );
      }

      return row;
    });

    // Simple table drawing
    const startX = 20;
    const colWidths = [50, 80, 30];
    if (options.includeConfidence) colWidths.push(30);
    if (options.includeTimestamps) colWidths.push(40);

    // Draw headers
    doc.setFont("helvetica", "bold");
    let x = startX;
    headers.forEach((header, i) => {
      doc.rect(x, yPosition - 5, colWidths[i], 8);
      doc.text(header, x + 2, yPosition);
      x += colWidths[i];
    });
    yPosition += 10;

    // Draw data rows
    doc.setFont("helvetica", "normal");
    tableData.forEach((row) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      x = startX;
      row.forEach((cell, i) => {
        doc.rect(x, yPosition - 5, colWidths[i], 8);
        doc.text(cell.toString(), x + 2, yPosition);
        x += colWidths[i];
      });
      yPosition += 10;
    });

    // Save the PDF
    doc.save(`${filename}.pdf`);
  }

  /**
   * Export document to Excel
   */
  private async exportDocumentToExcel(
    document: DocumentExportData,
    project: ProjectExportData,
    options: ExportOptions,
    filename: string
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Extracted Data");

    // Document Info
    worksheet.addRow(["Document Information"]);
    worksheet.addRow(["Filename", document.filename]);
    worksheet.addRow(["Original Name", document.originalName]);
    worksheet.addRow(["Upload Date", document.uploadDate]);
    worksheet.addRow(["File Type", document.fileType]);
    worksheet.addRow(["File Size", document.fileSize]);
    worksheet.addRow(["Status", document.status]);
    worksheet.addRow([]); // Empty row

    // Extracted Data Table
    const columns = project.columns.filter(
      (col) => col.id !== "index" && col.id !== "filename"
    );

    const headers = ["Column Name", "Value", "Data Type"];
    if (options.includeConfidence) headers.push("Confidence");
    if (options.includeTimestamps) headers.push("Extracted At");
    if (options.includeMetadata) headers.push("Extraction Method");

    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(worksheet.rowCount);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add data rows
    columns.forEach((col) => {
      const extractedData = document.extractedData[col.id];
      const row = [col.name, extractedData?.value || "N/A", col.type];

      if (options.includeConfidence) {
        row.push(extractedData?.confidence ? extractedData.confidence : "N/A");
      }
      if (options.includeTimestamps) {
        row.push(
          extractedData?.extractedAt
            ? new Date(extractedData.extractedAt)
            : "N/A"
        );
      }
      if (options.includeMetadata) {
        row.push(extractedData?.extractedBy?.method || "N/A");
      }

      worksheet.addRow(row);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = Math.max(
        column.width || 10,
        Math.max(
          ...(column.values as string[]).map((v) => v?.toString().length || 0)
        ) + 2
      );
    });

    // Generate and save
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${filename}.xlsx`);
  }

  /**
   * Export document to DOC
   */
  private async exportDocumentToDOC(
    document: DocumentExportData,
    project: ProjectExportData,
    options: ExportOptions,
    filename: string
  ): Promise<void> {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "Document Extraction Report",
              heading: "Heading1",
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: "",
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: "Document Information",
              heading: "Heading2",
            }),
            new Paragraph({
              text: `Filename: ${document.filename}`,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `Original Name: ${document.originalName}`,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `Upload Date: ${document.uploadDate}`,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `File Type: ${document.fileType}`,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `File Size: ${document.fileSize}`,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `Status: ${document.status}`,
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: "Extracted Data",
              heading: "Heading2",
              spacing: { after: 400 },
            }),
          ],
        },
      ],
    });

    // Add extracted data table
    const columns = project.columns.filter(
      (col) => col.id !== "index" && col.id !== "filename"
    );

    const tableRows = [
      new TableRow({
        children: [
          new TableCell({ text: "Column Name" }),
          new TableCell({ text: "Value" }),
          new TableCell({ text: "Data Type" }),
          ...(options.includeConfidence
            ? [new TableCell({ text: "Confidence" })]
            : []),
          ...(options.includeTimestamps
            ? [new TableCell({ text: "Extracted At" })]
            : []),
        ],
      }),
    ];

    columns.forEach((col) => {
      const extractedData = document.extractedData[col.id];
      const cells = [
        new TableCell({ text: col.name }),
        new TableCell({ text: extractedData?.value || "N/A" }),
        new TableCell({ text: col.type }),
      ];

      if (options.includeConfidence) {
        cells.push(
          new TableCell({
            text: extractedData?.confidence
              ? `${(extractedData.confidence * 100).toFixed(1)}%`
              : "N/A",
          })
        );
      }
      if (options.includeTimestamps) {
        cells.push(
          new TableCell({
            text: extractedData?.extractedAt
              ? new Date(extractedData.extractedAt).toLocaleString()
              : "N/A",
          })
        );
      }

      tableRows.push(new TableRow({ children: cells }));
    });

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows,
    });

    doc.addSection({
      children: [table],
    });

    // Generate and save
    const buffer = await Packer.toBuffer(doc);
    saveAs(new Blob([buffer]), `${filename}.docx`);
  }

  /**
   * Export project to PDF
   */
  private async exportProjectToPDF(
    projectData: ProjectExportData,
    options: ExportOptions,
    filename: string
  ): Promise<void> {
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Project Extraction Report", 20, yPosition);
    yPosition += 20;

    // Project Info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Project Information:", 20, yPosition);
    yPosition += 10;

    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${projectData.project.name}`, 20, yPosition);
    yPosition += 7;
    if (projectData.project.description) {
      doc.text(
        `Description: ${projectData.project.description}`,
        20,
        yPosition
      );
      yPosition += 7;
    }
    doc.text(`Created: ${projectData.project.createdAt}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Updated: ${projectData.project.updatedAt}`, 20, yPosition);
    yPosition += 15;

    // Stats
    doc.setFont("helvetica", "bold");
    doc.text("Project Statistics:", 20, yPosition);
    yPosition += 10;

    doc.setFont("helvetica", "normal");
    doc.text(
      `Total Documents: ${projectData.stats.totalDocuments}`,
      20,
      yPosition
    );
    yPosition += 7;
    doc.text(
      `Completed: ${projectData.stats.completedDocuments}`,
      20,
      yPosition
    );
    yPosition += 7;
    doc.text(
      `Processing: ${projectData.stats.processingDocuments}`,
      20,
      yPosition
    );
    yPosition += 7;
    doc.text(
      `Completion Rate: ${projectData.stats.completionRate}%`,
      20,
      yPosition
    );
    yPosition += 15;

    // Columns
    doc.setFont("helvetica", "bold");
    doc.text("Extraction Columns:", 20, yPosition);
    yPosition += 10;

    const columnHeaders = ["Name", "Type", "AI Model"];
    const startX = 20;
    const colWidths = [60, 40, 50];

    // Draw column headers
    doc.setFont("helvetica", "bold");
    let x = startX;
    columnHeaders.forEach((header, i) => {
      doc.rect(x, yPosition - 5, colWidths[i], 8);
      doc.text(header, x + 2, yPosition);
      x += colWidths[i];
    });
    yPosition += 10;

    // Draw column data
    doc.setFont("helvetica", "normal");
    projectData.columns.forEach((col) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      x = startX;
      doc.rect(x, yPosition - 5, colWidths[0], 8);
      doc.text(col.name, x + 2, yPosition);
      x += colWidths[0];

      doc.rect(x, yPosition - 5, colWidths[1], 8);
      doc.text(col.type, x + 2, yPosition);
      x += colWidths[1];

      doc.rect(x, yPosition - 5, colWidths[2], 8);
      doc.text(col.aiModel, x + 2, yPosition);

      yPosition += 10;
    });

    // Documents summary
    yPosition += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Documents Summary:", 20, yPosition);
    yPosition += 10;

    const docHeaders = ["Filename", "Status", "Upload Date"];
    const docColWidths = [80, 40, 40];

    // Draw document headers
    x = startX;
    docHeaders.forEach((header, i) => {
      doc.rect(x, yPosition - 5, docColWidths[i], 8);
      doc.text(header, x + 2, yPosition);
      x += docColWidths[i];
    });
    yPosition += 10;

    // Draw document data (first 10 documents)
    doc.setFont("helvetica", "normal");
    projectData.documents.slice(0, 10).forEach((docItem) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      x = startX;
      doc.rect(x, yPosition - 5, docColWidths[0], 8);
      doc.text(docItem.filename.substring(0, 30), x + 2, yPosition);
      x += docColWidths[0];

      doc.rect(x, yPosition - 5, docColWidths[1], 8);
      doc.text(docItem.status, x + 2, yPosition);
      x += docColWidths[1];

      doc.rect(x, yPosition - 5, docColWidths[2], 8);
      doc.text(docItem.uploadDate, x + 2, yPosition);

      yPosition += 10;
    });

    if (projectData.documents.length > 10) {
      yPosition += 5;
      doc.text(
        `... and ${projectData.documents.length - 10} more documents`,
        20,
        yPosition
      );
    }

    // Save the PDF
    doc.save(`${filename}.pdf`);
  }

  /**
   * Export project to Excel
   */
  private async exportProjectToExcel(
    projectData: ProjectExportData,
    options: ExportOptions,
    filename: string
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();

    // Project Info Sheet
    const infoSheet = workbook.addWorksheet("Project Info");
    infoSheet.addRow(["Project Information"]);
    infoSheet.addRow(["Name", projectData.project.name]);
    if (projectData.project.description) {
      infoSheet.addRow(["Description", projectData.project.description]);
    }
    infoSheet.addRow(["Created", projectData.project.createdAt]);
    infoSheet.addRow(["Updated", projectData.project.updatedAt]);
    infoSheet.addRow([]);
    infoSheet.addRow(["Statistics"]);
    infoSheet.addRow(["Total Documents", projectData.stats.totalDocuments]);
    infoSheet.addRow(["Completed", projectData.stats.completedDocuments]);
    infoSheet.addRow(["Processing", projectData.stats.processingDocuments]);
    infoSheet.addRow([
      "Completion Rate",
      `${projectData.stats.completionRate}%`,
    ]);

    // Columns Sheet
    const columnsSheet = workbook.addWorksheet("Columns");
    const columnHeaders = ["Name", "Type", "AI Model", "Prompt"];
    columnsSheet.addRow(columnHeaders);

    projectData.columns.forEach((col) => {
      columnsSheet.addRow([col.name, col.type, col.aiModel, col.prompt]);
    });

    // Documents Sheet
    const documentsSheet = workbook.addWorksheet("Documents");
    const docHeaders = [
      "Filename",
      "Original Name",
      "Upload Date",
      "File Type",
      "File Size",
      "Status",
    ];
    if (options.includeMetadata)
      docHeaders.push("Confidence", "Extracted At", "Extraction Method");

    documentsSheet.addRow(docHeaders);

    projectData.documents.forEach((doc) => {
      const row = [
        doc.filename,
        doc.originalName,
        doc.uploadDate,
        doc.fileType,
        doc.fileSize,
        doc.status,
      ];

      if (options.includeMetadata && doc.metadata) {
        row.push(
          doc.metadata.confidence
            ? `${(doc.metadata.confidence * 100).toFixed(1)}%`
            : "N/A",
          doc.metadata.extractedAt || "N/A",
          doc.metadata.extractedBy || "N/A"
        );
      }

      documentsSheet.addRow(row);
    });

    // Extracted Data Sheet
    const dataSheet = workbook.addWorksheet("Extracted Data");
    const dataHeaders = ["Document", "Column", "Value", "Type"];
    if (options.includeConfidence) dataHeaders.push("Confidence");
    if (options.includeTimestamps) dataHeaders.push("Extracted At");

    dataSheet.addRow(dataHeaders);

    projectData.documents.forEach((doc) => {
      projectData.columns.forEach((col) => {
        const extractedData = doc.extractedData[col.id];
        if (extractedData) {
          const row = [doc.filename, col.name, extractedData.value, col.type];

          if (options.includeConfidence) {
            row.push(extractedData.confidence || "N/A");
          }
          if (options.includeTimestamps) {
            row.push(
              extractedData.extractedAt
                ? new Date(extractedData.extractedAt)
                : "N/A"
            );
          }

          dataSheet.addRow(row);
        }
      });
    });

    // Auto-fit all sheets
    [infoSheet, columnsSheet, documentsSheet, dataSheet].forEach((sheet) => {
      sheet.columns.forEach((column) => {
        column.width = Math.max(
          column.width || 10,
          Math.max(
            ...(column.values as string[]).map((v) => v?.toString().length || 0)
          ) + 2
        );
      });
    });

    // Generate and save
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${filename}.xlsx`);
  }

  /**
   * Export project to DOC
   */
  private async exportProjectToDOC(
    projectData: ProjectExportData,
    options: ExportOptions,
    filename: string
  ): Promise<void> {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: "Project Extraction Report",
              heading: "Heading1",
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: "",
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: "Project Information",
              heading: "Heading2",
            }),
            new Paragraph({
              text: `Name: ${projectData.project.name}`,
              spacing: { after: 200 },
            }),
            ...(projectData.project.description
              ? [
                  new Paragraph({
                    text: `Description: ${projectData.project.description}`,
                    spacing: { after: 200 },
                  }),
                ]
              : []),
            new Paragraph({
              text: `Created: ${projectData.project.createdAt}`,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `Updated: ${projectData.project.updatedAt}`,
              spacing: { after: 400 },
            }),
            new Paragraph({
              text: "Project Statistics",
              heading: "Heading2",
            }),
            new Paragraph({
              text: `Total Documents: ${projectData.stats.totalDocuments}`,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `Completed: ${projectData.stats.completedDocuments}`,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `Processing: ${projectData.stats.processingDocuments}`,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: `Completion Rate: ${projectData.stats.completionRate}%`,
              spacing: { after: 400 },
            }),
          ],
        },
      ],
    });

    // Add columns table
    const columnTableRows = [
      new TableRow({
        children: [
          new TableCell({ text: "Column Name" }),
          new TableCell({ text: "Type" }),
          new TableCell({ text: "AI Model" }),
          new TableCell({ text: "Prompt" }),
        ],
      }),
    ];

    projectData.columns.forEach((col) => {
      columnTableRows.push(
        new TableRow({
          children: [
            new TableCell({ text: col.name }),
            new TableCell({ text: col.type }),
            new TableCell({ text: col.aiModel }),
            new TableCell({ text: col.prompt }),
          ],
        })
      );
    });

    const columnTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: columnTableRows,
    });

    doc.addSection({
      children: [
        new Paragraph({
          text: "Extraction Columns",
          heading: "Heading2",
          spacing: { after: 400 },
        }),
        columnTable,
      ],
    });

    // Add documents summary
    const docTableRows = [
      new TableRow({
        children: [
          new TableCell({ text: "Filename" }),
          new TableCell({ text: "Status" }),
          new TableCell({ text: "Upload Date" }),
        ],
      }),
    ];

    projectData.documents.slice(0, 20).forEach((docItem) => {
      docTableRows.push(
        new TableRow({
          children: [
            new TableCell({ text: docItem.filename }),
            new TableCell({ text: docItem.status }),
            new TableCell({ text: docItem.uploadDate }),
          ],
        })
      );
    });

    const docTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: docTableRows,
    });

    doc.addSection({
      children: [
        new Paragraph({
          text: "Documents Summary",
          heading: "Heading2",
          spacing: { after: 400 },
        }),
        docTable,
        ...(projectData.documents.length > 20
          ? [
              new Paragraph({
                text: `... and ${
                  projectData.documents.length - 20
                } more documents`,
                spacing: { after: 400 },
              }),
            ]
          : []),
      ],
    });

    // Generate and save
    const buffer = await Packer.toBuffer(doc);
    saveAs(new Blob([buffer]), `${filename}.docx`);
  }

  /**
   * Prepare document data for export
   */
  static prepareDocumentData(document: any): DocumentExportData {
    return {
      id: document._id || document.id,
      filename: document.filename,
      originalName: document.originalName,
      uploadDate: document.createdAt
        ? new Date(document.createdAt).toLocaleDateString()
        : "N/A",
      fileType: document.fileMetadata?.mimeType || "N/A",
      fileSize: document.fileMetadata?.size
        ? this.formatFileSize(document.fileMetadata.size)
        : "N/A",
      status: document.processing?.status || "unknown",
      extractedData: document.extractedData || {},
      metadata: {
        confidence: document.extractedData
          ? Object.values(document.extractedData).reduce(
              (acc: number, data: any) => acc + (data.confidence || 0),
              0
            ) / Object.keys(document.extractedData).length
          : 0,
        extractedAt: document.processing?.completedAt
          ? new Date(document.processing.completedAt).toLocaleString()
          : "N/A",
        extractedBy: document.extractedData
          ? Object.values(document.extractedData)[0]?.extractedBy?.method ||
            "N/A"
          : "N/A",
      },
    };
  }

  /**
   * Prepare project data for export
   */
  static prepareProjectData(project: any, documents: any[]): ProjectExportData {
    const columns = Object.entries(project.gridConfiguration?.columnDefs || {})
      .filter(([key]) => key !== "index" && key !== "filename")
      .map(([id, colDef]: [string, any]) => ({
        id,
        name: colDef.headerName,
        type: colDef.customProperties?.type || "text",
        prompt: colDef.customProperties?.prompt || "",
        aiModel: colDef.customProperties?.aiModel || "gpt-4",
      }));

    const completedCount = documents.filter(
      (d) => d.processing?.status === "completed"
    ).length;
    const processingCount = documents.filter(
      (d) => d.processing?.status === "processing"
    ).length;

    return {
      project: {
        id: project._id || project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt
          ? new Date(project.createdAt).toLocaleDateString()
          : "N/A",
        updatedAt: project.updatedAt
          ? new Date(project.updatedAt).toLocaleDateString()
          : "N/A",
      },
      columns,
      documents: documents.map((doc) => this.prepareDocumentData(doc)),
      stats: {
        totalDocuments: documents.length,
        completedDocuments: completedCount,
        processingDocuments: processingCount,
        completionRate:
          documents.length > 0
            ? Math.round((completedCount / documents.length) * 100)
            : 0,
      },
    };
  }

  /**
   * Format file size
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

export const exportService = ExportService.getInstance();
