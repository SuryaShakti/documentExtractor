// app/api/extract-pdf/route.ts
// CLEAN PDF EXTRACTION - No complex imports, TypeScript compliant

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/database/mongodb";
import Document from "@/lib/models/Document";
import Project from "@/lib/models/Project";
import User from "@/lib/models/User";
import OpenAI from "openai";
import jwt from "jsonwebtoken";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
});

interface ExtractionColumn {
  id: string;
  name: string;
  prompt: string;
  type: string;
  aiModel?: string;
}

interface ExtractionResult {
  columnId: string;
  value: string;
  confidence: number;
  extractedBy: {
    method: string;
    model: string;
    version: string;
  };
}

// Simple PDF text extraction using only pdf-parse (no complex imports)
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  console.log("📚 Extracting text from PDF using pdf-parse...");
  
  try {
    // Simple dynamic import for pdf-parse
    const { default: pdfParse } = await import('pdf-parse');
    
    console.log(`📄 Processing PDF buffer: ${pdfBuffer.length} bytes`);
    
    // Parse PDF with options
    const data = await pdfParse(pdfBuffer, {
      // Options to ensure proper parsing
      // normalizeWhitespace: false,
      // disableCombineTextItems: false
    });
    
    console.log(`📊 PDF parsing complete:`);
    console.log(`   - Pages: ${data.numpages}`);
    console.log(`   - Text length: ${data.text.length} characters`);
    
    if (!data.text || data.text.length < 50) {
      throw new Error(`PDF contains insufficient text (${data.text.length} characters). This might be a scanned PDF or image-based document.`);
    }
    
    console.log(`✅ Text extraction successful!`);
    console.log(`📝 Text preview: ${data.text.substring(0, 200)}...`);
    
    return data.text;
    
  } catch (error: any) {
    console.error("❌ PDF text extraction failed:", error.message);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

// Download PDF from URL with proper error handling
async function downloadPDFFromURL(url: string): Promise<Buffer> {
  console.log(`📥 Downloading PDF from URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'DocumentExtractor/1.0',
        'Accept': 'application/pdf,*/*'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }
    
    // Check content type
    const contentType = response.headers.get('content-type') || '';
    console.log(`📄 Response content-type: ${contentType}`);
    
    if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
      console.warn(`⚠️ Warning: Content-type is '${contentType}', expected PDF`);
    }
    
    // Get the PDF data
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`✅ PDF downloaded: ${buffer.length} bytes`);
    
    // Verify it's actually a PDF by checking the header
    const header = buffer.toString('ascii', 0, 5);
    if (!header.startsWith('%PDF')) {
      throw new Error(`Invalid PDF file: header is '${header}', expected '%PDF'`);
    }
    
    console.log(`✅ PDF header verified: ${header}`);
    return buffer;
    
  } catch (error: any) {
    console.error("❌ PDF download failed:", error.message);
    throw new Error(`Cannot download PDF: ${error.message}`);
  }
}

// Extract structured data from PDF text using OpenAI
async function extractDataWithOpenAI(
  pdfText: string,
  columns: ExtractionColumn[]
): Promise<ExtractionResult[]> {
  console.log("🤖 Processing extracted text with OpenAI...");
  
  try {
    // Create extraction prompt
    const extractionPrompt = `Please analyze this PDF document text and extract the requested information. Return ONLY valid JSON.

DOCUMENT TEXT:
${pdfText.substring(0, 15000)}${pdfText.length > 15000 ? '\n...(text truncated for processing)' : ''}

EXTRACTION TASKS:
${columns.map((col, index) => `${index + 1}. ${col.name}: ${col.prompt} (Type: ${col.type})`).join('\n')}

INSTRUCTIONS:
- Read the document text carefully
- Extract the exact information requested for each field
- If information is clearly found, provide high confidence (0.8-0.95)
- If information is partially found or unclear, provide medium confidence (0.3-0.7)
- If information is not found, return empty string with confidence 0
- Be precise and accurate
- For dates, use YYYY-MM-DD format when possible
- For numbers, return only numeric values
- For text, return the exact text as it appears

REQUIRED JSON FORMAT:
{
  "extractions": [
    ${columns.map(col => `{"columnId": "${col.id}", "value": "", "confidence": 0}`).join(',\n    ')}
  ]
}`;

    console.log("📤 Sending request to OpenAI...");
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional document analysis AI specializing in data extraction from PDF text. Always respond with valid JSON in the exact format requested."
        },
        {
          role: "user",
          content: extractionPrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0].message.content;
    console.log("📥 OpenAI response received");

    if (!response) {
      throw new Error("No response received from OpenAI");
    }

    // Parse the JSON response
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      throw new Error(`Failed to parse OpenAI response as JSON: ${parseError}`);
    }
    
    if (!parsedResponse.extractions || !Array.isArray(parsedResponse.extractions)) {
      throw new Error("Invalid response format: missing or invalid 'extractions' array");
    }

    // Convert to our result format with proper typing
    const results: ExtractionResult[] = parsedResponse.extractions.map((extraction: any) => ({
      columnId: extraction.columnId,
      value: extraction.value || "",
      confidence: Math.min(Math.max(Number(extraction.confidence) || 0, 0), 1),
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "pdf-simple-v1"
      }
    }));

    const successCount = results.filter(r => r.value && r.confidence > 0).length;
    console.log(`✅ OpenAI extraction completed: ${successCount}/${results.length} successful`);

    return results;

  } catch (error: any) {
    console.error("❌ OpenAI extraction failed:", error.message);
    
    // Return fallback results for all columns
    return columns.map(column => ({
      columnId: column.id,
      value: `OpenAI extraction failed: ${error.message}`,
      confidence: 0,
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "pdf-simple-v1-failed"
      }
    }));
  }
}

// Main PDF processing function
async function processPDFDocument(
  documentUrl: string,
  columns: ExtractionColumn[]
): Promise<ExtractionResult[]> {
  console.log("🚀 Starting PDF document processing...");
  
  try {
    // Step 1: Download the PDF
    const pdfBuffer = await downloadPDFFromURL(documentUrl);
    
    // Step 2: Extract text from PDF
    const extractedText = await extractTextFromPDF(pdfBuffer);
    
    // Step 3: Extract structured data using OpenAI
    const extractionResults = await extractDataWithOpenAI(extractedText, columns);
    
    console.log("✅ PDF processing completed successfully");
    return extractionResults;
    
  } catch (error: any) {
    console.error("💔 PDF processing failed:", error.message);
    
    // Return error results for all columns
    return columns.map(column => ({
      columnId: column.id,
      value: `Processing failed: ${error.message}`,
      confidence: 0,
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "pdf-processing-failed"
      }
    }));
  }
}

// Main API route handler
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log("🚀 Clean PDF Extraction API called");
    
    await connectDB();

    // Authentication
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Access denied. No token provided." },
        { status: 401 }
      );
    }

    let user: any;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      user = await User.findById(decoded.id).select("-password");

      if (!user || user.status !== "active") {
        return NextResponse.json(
          { success: false, error: "Invalid or inactive user." },
          { status: 401 }
        );
      }
    } catch (error: any) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.name === "TokenExpiredError" ? "Token expired" : "Invalid token" 
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, documentId } = body;

    if (!projectId || !documentId) {
      return NextResponse.json(
        { success: false, error: "Project ID and Document ID are required" },
        { status: 400 }
      );
    }

    // Verify project access
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const hasAccess = project.ownerId.toString() === user._id.toString() ||
      project.collaborators.some((collab: any) => collab.userId.toString() === user._id.toString());

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied to project" },
        { status: 403 }
      );
    }

    // Find document
    const document = await Document.findById(documentId);
    if (!document || document.projectId.toString() !== projectId) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Verify it's a PDF
    if (!document.fileMetadata.mimeType?.includes("pdf")) {
      return NextResponse.json(
        { success: false, error: "This endpoint is for PDF files only" },
        { status: 400 }
      );
    }

    // Get extraction columns
    const columnDefs = project.gridConfiguration.columnDefs;
    const extractionColumns: ExtractionColumn[] = [];

    for (const [columnId, columnDef] of columnDefs) {
      if (columnId === "index" || columnId === "filename") continue;
      
      if (columnDef.customProperties?.extraction?.enabled && 
          columnDef.customProperties?.extraction?.status === "active") {
        extractionColumns.push({
          id: columnId,
          name: columnDef.customProperties.name,
          prompt: columnDef.customProperties.prompt,
          type: columnDef.customProperties.type,
          aiModel: columnDef.customProperties.aiModel,
        });
      }
    }

    if (extractionColumns.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No extraction columns configured",
          message: "Please configure columns with extraction rules first."
        },
        { status: 400 }
      );
    }

    // Update document status
    await document.updateProcessingStatus("processing", 0);

    try {
      const documentUrl = document.cloudinary.secureUrl;
      
      if (!documentUrl) {
        throw new Error("Document URL not available");
      }

      console.log("📄 Processing PDF:", documentUrl);
      console.log("📋 Extracting", extractionColumns.length, "columns");

      // Process the PDF document
      const extractionResults = await processPDFDocument(documentUrl, extractionColumns);
      
      // Save results to database
      let successCount = 0;
      for (const result of extractionResults) {
        if (result.value && result.confidence > 0) {
          await document.setExtractedData(result.columnId, {
            value: result.value,
            type: extractionColumns.find(col => col.id === result.columnId)?.type || "text",
            confidence: result.confidence,
            extractedBy: result.extractedBy,
            extractedAt: new Date(),
          });
          successCount++;
        }
      }

      // Update processing status
      await document.updateProcessingStatus("completed", 100);

      // Add audit log
      await document.addAuditLog("processed", user._id, {
        extractionMethod: "clean-pdf-extraction",
        columnsProcessed: extractionColumns.length,
        successfulExtractions: successCount,
        processingTimeMs: Date.now() - startTime,
      });

      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Clean PDF extraction completed in ${processingTime}ms`);
      console.log(`📊 Success rate: ${successCount}/${extractionColumns.length} columns`);

      return NextResponse.json({
        success: true,
        message: `Successfully extracted data from PDF for ${successCount} out of ${extractionColumns.length} columns`,
        processingTimeMs: processingTime,
        data: {
          extractionResults,
          successCount,
          totalColumns: extractionColumns.length,
          successRate: Math.round((successCount / extractionColumns.length) * 100),
          document: {
            id: document._id,
            status: document.processing.status,
            extractedData: Object.fromEntries(document.extractedData),
          },
        },
      });

    } catch (extractionError: any) {
      await document.updateProcessingStatus("failed", null, {
        message: extractionError.message,
        code: "CLEAN_PDF_EXTRACTION_FAILED",
        processingTimeMs: Date.now() - startTime,
      });

      console.error("❌ Clean PDF extraction failed:", extractionError);
      
      return NextResponse.json(
        {
          success: false,
          error: "PDF data extraction failed",
          details: extractionError.message,
          processingTimeMs: Date.now() - startTime,
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error("❌ PDF API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
        processingTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}