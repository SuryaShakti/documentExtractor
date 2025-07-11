// app/api/extract-pdf-simple/route.ts
// SIMPLE PDF EXTRACTION - No canvas dependencies, pdf-parse only

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

// Simple PDF text extraction using only pdf-parse
async function extractPDFTextSimple(pdfBuffer: Buffer): Promise<string> {
  console.log("📚 Using pdf-parse for text extraction...");
  
  try {
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(pdfBuffer);
    
    if (data.text && data.text.length > 50) {
      console.log(`✅ pdf-parse SUCCESS! Text: ${data.text.length} characters`);
      console.log(`📄 Preview: ${data.text.substring(0, 200)}...`);
      return data.text;
    } else {
      throw new Error('PDF contains insufficient text content');
    }
    
  } catch (error: any) {
    console.error('❌ pdf-parse failed:', error.message);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

// Download PDF from URL
async function downloadPDFBuffer(url: string): Promise<Buffer> {
  console.log(`📥 Downloading PDF from: ${url}`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`✅ PDF downloaded: ${buffer.length} bytes`);
    return buffer;
    
  } catch (error: any) {
    console.error('❌ PDF download failed:', error.message);
    throw new Error(`Failed to download PDF: ${error.message}`);
  }
}

// Extract data from PDF text using OpenAI
async function extractDataFromPDFText(
  pdfText: string,
  columns: ExtractionColumn[]
): Promise<ExtractionResult[]> {
  console.log("🤖 Processing extracted text with OpenAI...");
  
  try {
    const extractionPrompt = `Analyze this PDF document text and extract the following information. Return ONLY valid JSON.

PDF DOCUMENT TEXT:
${pdfText.substring(0, 15000)}${pdfText.length > 15000 ? '\n...(text truncated for processing)' : ''}

EXTRACTION TASKS:
${columns.map((col, index) => `${index + 1}. ${col.name}: ${col.prompt} (Type: ${col.type})`).join('\n')}

INSTRUCTIONS:
- Carefully read through the document text
- Extract the exact information requested for each field
- If information is clearly found, provide high confidence (0.8-0.95)
- If information is partially found or unclear, provide medium confidence (0.3-0.7)
- If information is not found, return empty string with confidence 0
- Be precise and accurate
- For dates, use YYYY-MM-DD format when possible
- For numbers, return only numeric values
- For text, return exact text as it appears

REQUIRED JSON FORMAT:
{
  "extractions": [
    ${columns.map(col => `{"columnId": "${col.id}", "value": "", "confidence": 0}`).join(',\n    ')}
  ]
}`;

    console.log("📤 Sending text to OpenAI for data extraction...");
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional document analysis AI specializing in precise data extraction from PDF text. Always respond with valid JSON in the exact format requested."
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
      throw new Error("No response from OpenAI");
    }

    const parsedResponse = JSON.parse(response);
    
    if (!parsedResponse.extractions || !Array.isArray(parsedResponse.extractions)) {
      throw new Error("Invalid response format from OpenAI");
    }

    const results: ExtractionResult[] = parsedResponse.extractions.map((extraction: any) => ({
      columnId: extraction.columnId,
      value: extraction.value || "",
      confidence: Math.min(Math.max(extraction.confidence || 0, 0), 1),
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "pdf-simple-v1"
      }
    }));

    console.log("✅ Data extraction completed successfully");
    console.log(`📊 Results: ${results.filter(r => r.value && r.confidence > 0).length}/${results.length} successful extractions`);

    return results;

  } catch (error: any) {
    console.error("❌ OpenAI extraction failed:", error.message);
    
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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log("🚀 Simple PDF Extraction API called");
    
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

    let user;
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
      project.collaborators.some(collab => collab.userId.toString() === user._id.toString());

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

      // Step 1: Download PDF
      const pdfBuffer = await downloadPDFBuffer(documentUrl);
      
      // Step 2: Extract text
      const extractedText = await extractPDFTextSimple(pdfBuffer);
      
      // Step 3: Extract data using OpenAI
      const extractionResults = await extractDataFromPDFText(extractedText, extractionColumns);
      
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
        extractionMethod: "pdf-simple-extraction",
        columnsProcessed: extractionColumns.length,
        successfulExtractions: successCount,
        processingTimeMs: Date.now() - startTime,
      });

      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Simple PDF extraction completed in ${processingTime}ms`);
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
        code: "SIMPLE_PDF_EXTRACTION_FAILED",
        processingTimeMs: Date.now() - startTime,
      });

      console.error("❌ Simple PDF extraction failed:", extractionError);
      
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
    console.error("❌ Simple PDF API error:", error);
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