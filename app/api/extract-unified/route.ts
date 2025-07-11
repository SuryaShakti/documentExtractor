// app/api/extract-unified/route.ts
// UNIFIED EXTRACTION ROUTE - Automatically handles both images and PDFs
// This replaces your current extraction routes with smart file type detection

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

// IMAGE PROCESSING - Using OpenAI Vision API (your existing working method)
async function extractFromImage(
  documentUrl: string,
  columns: ExtractionColumn[]
): Promise<ExtractionResult[]> {
  console.log("🖼️ Processing IMAGE with Vision API...");
  
  try {
    const extractionPrompt = `Analyze this image document and extract the following information. Return ONLY valid JSON with no additional text.

EXTRACTION TASKS:
${columns.map((col, index) => `${index + 1}. ${col.name}: ${col.prompt} (Type: ${col.type})`).join('\n')}

INSTRUCTIONS:
- Examine the image carefully for each piece of information
- If information is clearly visible, provide it with high confidence (0.8-0.95)
- If information is partially visible or unclear, provide it with medium confidence (0.3-0.7)
- If information is not found or not visible, return empty string with confidence 0
- Be precise and accurate
- For dates, use YYYY-MM-DD format when possible
- For numbers, return only the numeric value
- For text, return the exact text as it appears

REQUIRED JSON FORMAT:
{
  "extractions": [
    ${columns.map(col => `{"columnId": "${col.id}", "value": "", "confidence": 0}`).join(',\n    ')}
  ]
}`;

    console.log("📤 Sending image to OpenAI Vision API...");
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: extractionPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: documentUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0].message.content;
    console.log("📥 Vision API response received");

    if (!response) {
      throw new Error("No response from OpenAI Vision API");
    }

    const parsedResponse = JSON.parse(response);
    
    if (!parsedResponse.extractions || !Array.isArray(parsedResponse.extractions)) {
      throw new Error("Invalid response format from Vision API");
    }

    const results: ExtractionResult[] = parsedResponse.extractions.map((extraction: any) => ({
      columnId: extraction.columnId,
      value: extraction.value || "",
      confidence: Math.min(Math.max(extraction.confidence || 0, 0), 1),
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "vision-api-v1"
      }
    }));

    console.log("✅ Image extraction completed successfully");
    return results;

  } catch (error: any) {
    console.error("❌ Image extraction failed:", error.message);
    
    return columns.map(column => ({
      columnId: column.id,
      value: "",
      confidence: 0,
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "vision-api-v1-failed"
      }
    }));
  }
}

// PDF PROCESSING - Multi-method text extraction + OpenAI text processing
async function extractFromPDF(
  documentUrl: string,
  columns: ExtractionColumn[]
): Promise<ExtractionResult[]> {
  console.log("📄 Processing PDF with text extraction...");
  
  try {
    // Download PDF
    const pdfBuffer = await downloadPDFBuffer(documentUrl);
    
    // Try multiple text extraction methods
    let extractedText = '';
    const methods = [
      { name: 'PDF.js', fn: extractWithPDFJS },
      { name: 'pdf-parse', fn: extractWithPDFParse },
      { name: 'OCR', fn: extractWithOCR }
    ];
    
    for (const method of methods) {
      try {
        console.log(`🔄 Trying ${method.name}...`);
        extractedText = await method.fn(pdfBuffer);
        console.log(`✅ ${method.name} succeeded!`);
        break;
      } catch (error: any) {
        console.log(`❌ ${method.name} failed: ${error.message}`);
        continue;
      }
    }
    
    if (!extractedText || extractedText.length < 50) {
      throw new Error('All PDF text extraction methods failed');
    }
    
    // Process extracted text with OpenAI
    return await extractDataFromText(extractedText, columns);
    
  } catch (error: any) {
    console.error("❌ PDF extraction failed:", error.message);
    
    return columns.map(column => ({
      columnId: column.id,
      value: `PDF extraction failed: ${error.message}`,
      confidence: 0,
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "pdf-extraction-failed"
      }
    }));
  }
}

// Helper: Download PDF buffer
async function downloadPDFBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Helper: PDF.js text extraction
async function extractWithPDFJS(pdfBuffer: Buffer): Promise<string> {
  // Try multiple import paths for different pdfjs-dist versions
  let pdfjsLib;
  try {
    // For pdfjs-dist v4.x and newer
    pdfjsLib = await import('pdfjs-dist');
  } catch (e1) {
    try {
      // For pdfjs-dist v3.x
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
    } catch (e2) {
      try {
        // Alternative path
        pdfjsLib = await import('pdfjs-dist/build/pdf');
      } catch (e3) {
        throw new Error('Could not import pdfjs-dist. Please ensure it is installed correctly.');
      }
    }
  }
  
  // Configure PDF.js for server environment
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = null;
  }
  
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  
  const textContent = [];
  const maxPages = Math.min(pdf.numPages, 20);
  
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str || '')
        .filter(text => text.trim().length > 0)
        .join(' ');
      
      if (pageText.trim()) {
        textContent.push(pageText);
      }
    } catch (pageError: any) {
      console.warn(`Page ${pageNum} failed:`, pageError.message);
    }
  }
  
  const fullText = textContent.join('\n\n');
  if (fullText.length < 100) {
    throw new Error('Insufficient text extracted');
  }
  
  return fullText;
}

// Helper: pdf-parse extraction
async function extractWithPDFParse(pdfBuffer: Buffer): Promise<string> {
  const pdfParse = await import('pdf-parse');
  const data = await pdfParse.default(pdfBuffer);
  
  if (!data.text || data.text.length < 100) {
    throw new Error('pdf-parse extracted insufficient text');
  }
  
  return data.text;
}

// Helper: OCR extraction
async function extractWithOCR(pdfBuffer: Buffer): Promise<string> {
  const pdf2pic = await import('pdf2pic');
  const Tesseract = await import('tesseract.js');
  
  const convert = pdf2pic.default.fromBuffer(pdfBuffer, {
    density: 200,
    format: 'png',
    width: 2000,
    height: 2000
  });
  
  const ocrTexts = [];
  const maxPages = 3;
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      const result = await convert(page, { responseType: 'buffer' });
      const { data: { text } } = await Tesseract.default.recognize(result.buffer, 'eng');
      
      if (text.trim().length > 20) {
        ocrTexts.push(text.trim());
      }
    } catch (pageError: any) {
      console.warn(`OCR page ${page} failed:`, pageError.message);
      break;
    }
  }
  
  const fullText = ocrTexts.join('\n\n');
  if (fullText.length < 50) {
    throw new Error('OCR produced insufficient text');
  }
  
  return fullText;
}

// Helper: Extract data from text using OpenAI
async function extractDataFromText(
  text: string,
  columns: ExtractionColumn[]
): Promise<ExtractionResult[]> {
  const extractionPrompt = `Analyze this document text and extract the following information. Return ONLY valid JSON.

DOCUMENT TEXT:
${text.substring(0, 15000)}${text.length > 15000 ? '\n...(truncated)' : ''}

EXTRACTION TASKS:
${columns.map((col, index) => `${index + 1}. ${col.name}: ${col.prompt} (Type: ${col.type})`).join('\n')}

INSTRUCTIONS:
- Extract exact information requested for each field
- High confidence (0.8-0.95) if clearly found
- Medium confidence (0.3-0.7) if partially found
- Zero confidence if not found
- Use YYYY-MM-DD for dates, numeric values for numbers

REQUIRED JSON FORMAT:
{
  "extractions": [
    ${columns.map(col => `{"columnId": "${col.id}", "value": "", "confidence": 0}`).join(',\n    ')}
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a professional document analysis AI. Extract precise data from text and return valid JSON only."
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
  if (!response) {
    throw new Error("No response from OpenAI");
  }

  const parsedResponse = JSON.parse(response);
  
  if (!parsedResponse.extractions || !Array.isArray(parsedResponse.extractions)) {
    throw new Error("Invalid response format");
  }

  return parsedResponse.extractions.map((extraction: any) => ({
    columnId: extraction.columnId,
    value: extraction.value || "",
    confidence: Math.min(Math.max(extraction.confidence || 0, 0), 1),
    extractedBy: {
      method: "ai",
      model: "gpt-4o",
      version: "text-extraction-v1"
    }
  }));
}

// SMART FILE TYPE DETECTION
function getFileType(document: any): 'image' | 'pdf' | 'unknown' {
  const mimeType = document.fileMetadata?.mimeType?.toLowerCase() || '';
  const extension = document.fileMetadata?.extension?.toLowerCase() || '';
  
  // Check for PDF
  if (mimeType.includes('pdf') || extension === 'pdf') {
    return 'pdf';
  }
  
  // Check for images
  if (mimeType.startsWith('image/') || 
      ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
    return 'image';
  }
  
  return 'unknown';
}

// MAIN API ROUTE HANDLER
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log("🚀 Unified Extraction API called");
    
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

      // SMART FILE TYPE DETECTION & ROUTING
      const fileType = getFileType(document);
      console.log(`📁 Detected file type: ${fileType}`);
      console.log("📄 Processing document:", documentUrl);
      console.log("📋 Extracting", extractionColumns.length, "columns");

      let extractionResults: ExtractionResult[];
      let extractionMethod = '';

      // Route to appropriate extraction method
      switch (fileType) {
        case 'image':
          console.log("🖼️ Routing to IMAGE extraction (Vision API)");
          extractionResults = await extractFromImage(documentUrl, extractionColumns);
          extractionMethod = 'image-vision-api';
          break;
          
        case 'pdf':
          console.log("📄 Routing to PDF extraction (Text + OpenAI)");
          extractionResults = await extractFromPDF(documentUrl, extractionColumns);
          extractionMethod = 'pdf-text-extraction';
          break;
          
        default:
          console.log("❓ Unknown file type, trying image extraction as fallback");
          extractionResults = await extractFromImage(documentUrl, extractionColumns);
          extractionMethod = 'unknown-fallback-image';
          break;
      }
      
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
        extractionMethod,
        fileType,
        columnsProcessed: extractionColumns.length,
        successfulExtractions: successCount,
        processingTimeMs: Date.now() - startTime,
      });

      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Unified extraction completed in ${processingTime}ms`);
      console.log(`📊 Success rate: ${successCount}/${extractionColumns.length} columns`);

      return NextResponse.json({
        success: true,
        message: `Successfully extracted data from ${fileType.toUpperCase()} for ${successCount} out of ${extractionColumns.length} columns`,
        fileType,
        extractionMethod,
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
        code: "UNIFIED_EXTRACTION_FAILED",
        processingTimeMs: Date.now() - startTime,
      });

      console.error("❌ Unified extraction failed:", extractionError);
      
      return NextResponse.json(
        {
          success: false,
          error: "Data extraction failed",
          details: extractionError.message,
          processingTimeMs: Date.now() - startTime,
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error("❌ Unified API error:", error);
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