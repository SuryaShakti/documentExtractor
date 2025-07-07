import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/database/mongodb";
import Document from "@/lib/models/Document";
import Project from "@/lib/models/Project";
import User from "@/lib/models/User";
import OpenAI from "openai";
import jwt from "jsonwebtoken";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 second timeout
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

// Optimized document extraction using OpenAI Vision API
async function extractDataFromDocument(
  documentUrl: string,
  columns: ExtractionColumn[]
): Promise<ExtractionResult[]> {
  console.log("🚀 Starting optimized document extraction");
  console.log("📄 Document URL:", documentUrl);
  console.log("📋 Columns to extract:", columns.length);

  try {
    // Create a comprehensive extraction prompt for all columns at once
    const extractionPrompt = `Analyze this document and extract the following information. Return ONLY valid JSON with no additional text.

EXTRACTION TASKS:
${columns.map((col, index) => `${index + 1}. ${col.name}: ${col.prompt} (Type: ${col.type})`).join('\n')}

INSTRUCTIONS:
- Examine the document carefully for each piece of information
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

    console.log("📤 Sending request to OpenAI Vision API...");
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Use the latest vision model
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
                detail: "high" // High detail for better extraction
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1, // Low temperature for consistency
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0].message.content;
    console.log("📥 OpenAI response received");
    console.log("📊 Response preview:", response?.substring(0, 200) + "...");

    if (!response) {
      throw new Error("No response from OpenAI");
    }

    // Parse the response
    const parsedResponse = JSON.parse(response);
    
    if (!parsedResponse.extractions || !Array.isArray(parsedResponse.extractions)) {
      throw new Error("Invalid response format from OpenAI");
    }

    // Convert to our result format
    const results: ExtractionResult[] = parsedResponse.extractions.map((extraction: any) => ({
      columnId: extraction.columnId,
      value: extraction.value || "",
      confidence: Math.min(Math.max(extraction.confidence || 0, 0), 1),
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "vision-optimized-v1"
      }
    }));

    console.log("✅ Extraction completed successfully");
    console.log("📊 Results:", results.map(r => ({ 
      column: r.columnId, 
      hasValue: !!r.value, 
      confidence: r.confidence 
    })));

    return results;

  } catch (error: any) {
    console.error("❌ Extraction failed:", error.message);
    
    // Return fallback results for all columns
    return columns.map(column => ({
      columnId: column.id,
      value: "",
      confidence: 0,
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "vision-optimized-v1-failed"
      }
    }));
  }
}

// Fallback text-based extraction for when Vision API fails
async function extractFromTextFallback(
  documentUrl: string,
  columns: ExtractionColumn[]
): Promise<ExtractionResult[]> {
  console.log("🔄 Attempting text fallback extraction...");
  
  try {
    // Try to get text content first
    const textCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL readable text from this document. Return the complete text content, maintaining structure and formatting."
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
      max_tokens: 4000,
      temperature: 0.1
    });

    const extractedText = textCompletion.choices[0].message.content || "";
    
    if (!extractedText || extractedText.length < 10) {
      throw new Error("No readable text found in document");
    }

    console.log("📝 Text extracted successfully, length:", extractedText.length);

    // Now extract fields from the text
    const extractionPrompt = `Based on the following document text, extract the requested information:

DOCUMENT TEXT:
${extractedText.substring(0, 8000)} ${extractedText.length > 8000 ? '...(truncated)' : ''}

EXTRACTION TASKS:
${columns.map((col, index) => `${index + 1}. ${col.name}: ${col.prompt} (Type: ${col.type})`).join('\n')}

Return ONLY valid JSON:
{
  "extractions": [
    ${columns.map(col => `{"columnId": "${col.id}", "value": "", "confidence": 0}`).join(',\n    ')}
  ]
}`;

    const fieldCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a precise data extraction AI. Extract specific information from document text and return valid JSON only."
        },
        {
          role: "user",
          content: extractionPrompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const response = fieldCompletion.choices[0].message.content;
    
    if (!response) {
      throw new Error("No response from field extraction");
    }

    const parsedResponse = JSON.parse(response);
    
    return parsedResponse.extractions.map((extraction: any) => ({
      columnId: extraction.columnId,
      value: extraction.value || "",
      confidence: Math.min(Math.max(extraction.confidence || 0, 0), 1),
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "text-fallback-v1"
      }
    }));

  } catch (error: any) {
    console.error("❌ Text fallback also failed:", error.message);
    
    return columns.map(column => ({
      columnId: column.id,
      value: `Extraction failed: ${error.message}`,
      confidence: 0,
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "text-fallback-v1-failed"
      }
    }));
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log("🚀 Starting optimized extraction API");
    
    // Connect to MongoDB
    await connectDB();

    // Verify authentication
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

    // Find and validate project access
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

      console.log("📄 Processing document:", documentUrl);
      console.log("📋 Extracting", extractionColumns.length, "columns");

      // Primary extraction attempt
      let extractionResults = await extractDataFromDocument(documentUrl, extractionColumns);
      
      // Check if primary extraction was successful
      const successfulExtractions = extractionResults.filter(r => r.value && r.confidence > 0);
      const needsFallback = successfulExtractions.length < extractionColumns.length * 0.5; // If less than 50% success
      
      if (needsFallback) {
        console.log("🔄 Primary extraction had limited success, trying text fallback...");
        const fallbackResults = await extractFromTextFallback(documentUrl, extractionColumns);
        
        // Merge results: use fallback for failed primary extractions
        extractionResults = extractionResults.map(primary => {
          if (!primary.value || primary.confidence === 0) {
            const fallback = fallbackResults.find(f => f.columnId === primary.columnId);
            return fallback || primary;
          }
          return primary;
        });
      }

      // Update document with results
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
        extractionMethod: "optimized-openai-vision",
        columnsProcessed: extractionColumns.length,
        successfulExtractions: successCount,
        processingTimeMs: Date.now() - startTime,
      });

      const processingTime = Date.now() - startTime;
      
      console.log(`✅ Extraction completed in ${processingTime}ms`);
      console.log(`📊 Success rate: ${successCount}/${extractionColumns.length} columns`);

      return NextResponse.json({
        success: true,
        message: `Successfully extracted data for ${successCount} out of ${extractionColumns.length} columns`,
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
        code: "OPTIMIZED_EXTRACTION_FAILED",
        processingTimeMs: Date.now() - startTime,
      });

      console.error("❌ Extraction failed:", extractionError);
      
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
    console.error("❌ API error:", error);
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