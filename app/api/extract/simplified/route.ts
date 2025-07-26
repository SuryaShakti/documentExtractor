import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/database/mongodb";
import Project from "@/lib/models/Project";
import Document from "@/lib/models/Document";
import DocumentCollection from "@/lib/models/DocumentCollection";
import User from "@/lib/models/User";
import jwt from "jsonwebtoken";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
});

// ========================================
// SIMPLIFIED PAYLOAD TYPES (Your Preferred Format)
// ========================================

interface SimplifiedExtractionPayload {
  projectId: string;
  extractions: ExtractionRequest[];
  globalOptions?: GlobalExtractionOptions;
}

interface ExtractionRequest {
  // Scenario 1: Single document extraction
  document?: {
    id: string;
    columns: ColumnConfig[];
    forceReextract?: boolean;
  };
  
  // Scenario 2: Document collection extraction  
  documentCollection?: {
    id: string;
    docIds?: string[];  // Optional: specific docs, if empty uses all docs
    columns: ColumnConfig[];
    aggregationStrategy?: 'concatenate' | 'summary' | 'list' | 'smart';
    forceReextract?: boolean;
  };
  
  // Scenario 3: Row re-extraction (document with all columns)
  rowReextraction?: {
    documentId: string;
    columns?: ColumnConfig[]; // Optional: specific columns, if empty uses all enabled columns
    forceReextract: true; // Always true for row re-extraction
  };
  
  // Scenario 4: Cell customization (single cell with custom prompt)
  cellCustomization?: {
    documentId: string;
    columnId: string;
    customPrompt: string;
    notes?: string;
    validationRules?: ValidationRules;
    aiModel?: string;
  };
}

interface ColumnConfig {
  columnId: string;
  customPrompt?: string;
  aiModel?: string;
  confidenceThreshold?: number;
  outputFormat?: 'text' | 'json' | 'structured';
  forceReextract?: boolean;
}

interface ValidationRules {
  required?: boolean;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
}

interface GlobalExtractionOptions {
  aiModel?: 'gpt-4o' | 'gpt-4' | 'claude-3';
  maxRetries?: number;
  timeout?: number;
  parallelProcessing?: boolean;
  includeConfidence?: boolean;
  includeMetadata?: boolean;
  includeDebugInfo?: boolean;
}

interface SimplifiedExtractionResponse {
  success: boolean;
  requestId: string;
  results: ExtractionScenarioResult[];
  stats: {
    totalExtractions: number;
    successfulExtractions: number;
    failedExtractions: number;
    processingTimeMs: number;
  };
  errors?: string[];
  warnings?: string[];
}

interface ExtractionScenarioResult {
  scenarioType: 'document' | 'documentCollection' | 'rowReextraction' | 'cellCustomization';
  targetId: string;
  success: boolean;
  data: Record<string, ExtractedCellData>;
  metadata: {
    documentCount?: number;
    sourceDocuments?: string[];
    aggregationUsed?: string;
    processingTimeMs: number;
  };
  error?: string;
}

interface ExtractedCellData {
  value: string;
  confidence: number;
  extractedBy: {
    method: 'ai' | 'manual' | 'cached';
    model: string;
    promptUsed: string;
    customPrompt?: boolean;
  };
  extractedAt: string;
  sourceDocuments?: string[];
  cellId?: string;
  validation?: {
    passed: boolean;
    errors?: string[];
  };
}

// ========================================
// AUTHENTICATION & VALIDATION
// ========================================

async function authenticateRequest(request: NextRequest) {
  let token: string | undefined = undefined;
  const authHeader = request.headers.get("authorization");
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "");
  }

  // If not in header, try cookies
  if (!token) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      token = cookies.access_token;
    }
  }

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

function validatePayload(payload: SimplifiedExtractionPayload): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (!payload.projectId) {
    errors.push("projectId is required");
  }

  if (!payload.extractions || payload.extractions.length === 0) {
    errors.push("At least one extraction request is required");
  }

  // Validate each extraction request has exactly one scenario
  payload.extractions?.forEach((extraction, index) => {
    const scenarios = [
      extraction.document,
      extraction.documentCollection,
      extraction.rowReextraction,
      extraction.cellCustomization
    ].filter(Boolean);

    if (scenarios.length === 0) {
      errors.push(`Extraction ${index}: Must specify one extraction scenario`);
    }
    
    if (scenarios.length > 1) {
      errors.push(`Extraction ${index}: Can only specify one extraction scenario per request`);
    }
  });

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

// ========================================
// SCENARIO PROCESSORS
// ========================================

async function processExtractionRequest(
  extraction: ExtractionRequest, 
  payload: SimplifiedExtractionPayload,
  project: any,
  user: any,
  index: number
): Promise<ExtractionScenarioResult> {
  const startTime = Date.now();

  console.log(`🎯 Processing extraction request ${index + 1}`);

  try {
    if (extraction.document) {
      return await processDocumentScenario(extraction.document, payload, project, user, startTime);
    }
    
    if (extraction.documentCollection) {
      return await processDocumentCollectionScenario(extraction.documentCollection, payload, project, user, startTime);
    }
    
    if (extraction.rowReextraction) {
      return await processRowReextractionScenario(extraction.rowReextraction, payload, project, user, startTime);
    }
    
    if (extraction.cellCustomization) {
      return await processCellCustomizationScenario(extraction.cellCustomization, payload, project, user, startTime);
    }

    throw new Error("No valid extraction scenario specified");

  } catch (error: any) {
    console.error(`❌ Extraction request ${index + 1} failed:`, error.message);
    return {
      scenarioType: 'document', // fallback
      targetId: `extraction_${index}`,
      success: false,
      data: {},
      metadata: { processingTimeMs: Date.now() - startTime },
      error: error.message
    };
  }
}

// Scenario 1: Single Document Extraction
async function processDocumentScenario(
  documentRequest: NonNullable<ExtractionRequest['document']>,
  payload: SimplifiedExtractionPayload,
  project: any,
  user: any,
  startTime: number
): Promise<ExtractionScenarioResult> {
  console.log(`📄 Processing single document: ${documentRequest.id}`);

  const document = await Document.findById(documentRequest.id);
  if (!document) {
    throw new Error(`Document ${documentRequest.id} not found`);
  }

  const extractedData: Record<string, ExtractedCellData> = {};

  for (const column of documentRequest.columns) {
    console.log(`🔄 Extracting column ${column.columnId} from document ${document.filename}`);
    
    // Check if we need to re-extract
    const existingData = document.extractedData.get(column.columnId);
    const shouldExtract = column.forceReextract || 
                         documentRequest.forceReextract || 
                         payload.globalOptions?.includeConfidence || 
                         !existingData?.value;

    if (shouldExtract) {
      const result = await extractFromDocument(document, column, project, payload.globalOptions);
      extractedData[column.columnId] = result;
      
      // Save to document
      await document.setExtractedData(column.columnId, {
        value: result.value,
        confidence: result.confidence,
        extractedBy: result.extractedBy,
      });
    } else {
      // Use cached data
      console.log(`📋 Using cached data for column ${column.columnId}`);
      extractedData[column.columnId] = {
        value: existingData.value,
        confidence: existingData.confidence,
        extractedBy: {
          method: 'cached',
          model: existingData.extractedBy?.model || 'unknown',
          promptUsed: getColumnPrompt(column, project),
        },
        extractedAt: existingData.extractedAt?.toISOString() || new Date().toISOString(),
      };
    }
  }

  return {
    scenarioType: 'document',
    targetId: documentRequest.id,
    success: true,
    data: extractedData,
    metadata: {
      documentCount: 1,
      sourceDocuments: [documentRequest.id],
      processingTimeMs: Date.now() - startTime,
    }
  };
}

// Scenario 2: Document Collection Extraction
async function processDocumentCollectionScenario(
  collectionRequest: NonNullable<ExtractionRequest['documentCollection']>,
  payload: SimplifiedExtractionPayload,
  project: any,
  user: any,
  startTime: number
): Promise<ExtractionScenarioResult> {
  console.log(`📁 Processing document collection: ${collectionRequest.id}`);

  const collection = await DocumentCollection.findById(collectionRequest.id).populate('documents');
  if (!collection) {
    throw new Error(`Document collection ${collectionRequest.id} not found`);
  }

  // Use specified documents or all documents in collection
  const targetDocumentIds = collectionRequest.docIds || collection.documents.map((doc: any) => doc._id.toString());
  const documents = await Document.find({ _id: { $in: targetDocumentIds } });

  console.log(`📊 Processing ${documents.length} documents in collection`);

  const extractedData: Record<string, ExtractedCellData> = {};

  for (const column of collectionRequest.columns) {
    console.log(`🔄 Processing column ${column.columnId} for collection`);
    
    // Extract from all documents if needed
    let needsExtraction = collectionRequest.forceReextract;
    
    if (!needsExtraction) {
      // Check if any document needs extraction
      for (const document of documents) {
        const existingData = document.extractedData.get(column.columnId);
        if (!existingData?.value) {
          needsExtraction = true;
          break;
        }
      }
    }

    if (needsExtraction) {
      // Extract from individual documents first
      for (const document of documents) {
        try {
          const result = await extractFromDocument(document, column, project, payload.globalOptions);
          await document.setExtractedData(column.columnId, {
            value: result.value,
            confidence: result.confidence,
            extractedBy: result.extractedBy,
          });
        } catch (error: any) {
          console.warn(`⚠️ Failed to extract from document ${document._id}:`, error.message);
        }
      }
    }

    // Aggregate results
    const aggregatedResult = await collection.aggregateExtractedData(column.columnId);
    extractedData[column.columnId] = {
      value: aggregatedResult.value,
      confidence: aggregatedResult.confidence,
      extractedBy: {
        method: 'ai',
        model: payload.globalOptions?.aiModel || 'gpt-4o',
        promptUsed: getColumnPrompt(column, project),
      },
      extractedAt: new Date().toISOString(),
      sourceDocuments: targetDocumentIds,
    };
  }

  return {
    scenarioType: 'documentCollection',
    targetId: collectionRequest.id,
    success: true,
    data: extractedData,
    metadata: {
      documentCount: documents.length,
      sourceDocuments: targetDocumentIds,
      aggregationUsed: collectionRequest.aggregationStrategy || 'concatenate',
      processingTimeMs: Date.now() - startTime,
    }
  };
}

// Scenario 3: Row Re-extraction (Document with all/specified columns)
async function processRowReextractionScenario(
  rowRequest: NonNullable<ExtractionRequest['rowReextraction']>,
  payload: SimplifiedExtractionPayload,
  project: any,
  user: any,
  startTime: number
): Promise<ExtractionScenarioResult> {
  console.log(`📊 Processing row re-extraction for document: ${rowRequest.documentId}`);

  const document = await Document.findById(rowRequest.documentId);
  if (!document) {
    throw new Error(`Document ${rowRequest.documentId} not found`);
  }

  // Determine columns to extract
  let columnsToExtract: ColumnConfig[];
  
  if (rowRequest.columns && rowRequest.columns.length > 0) {
    columnsToExtract = rowRequest.columns;
  } else {
    // Get all enabled columns from project configuration
    const projectColumnDefs = project.gridConfiguration?.columnDefs || new Map();
    columnsToExtract = [];
    
    for (const [colId, columnDef] of projectColumnDefs.entries()) {
      if (colId !== 'index' && colId !== 'filename' && 
          columnDef.customProperties?.extraction?.enabled) {
        columnsToExtract.push({
          columnId: colId,
          forceReextract: true // Always force for row re-extraction
        });
      }
    }
  }

  console.log(`🔄 Re-extracting ${columnsToExtract.length} columns`);

  const extractedData: Record<string, ExtractedCellData> = {};

  for (const column of columnsToExtract) {
    console.log(`🔄 Re-extracting column ${column.columnId}`);
    
    const result = await extractFromDocument(document, column, project, payload.globalOptions);
    extractedData[column.columnId] = result;
    
    // Save to document
    await document.setExtractedData(column.columnId, {
      value: result.value,
      confidence: result.confidence,
      extractedBy: result.extractedBy,
    });
  }

  return {
    scenarioType: 'rowReextraction',
    targetId: rowRequest.documentId,
    success: true,
    data: extractedData,
    metadata: {
      documentCount: 1,
      sourceDocuments: [rowRequest.documentId],
      processingTimeMs: Date.now() - startTime,
    }
  };
}

// Scenario 4: Cell Customization (Single cell with custom prompt)
async function processCellCustomizationScenario(
  cellRequest: NonNullable<ExtractionRequest['cellCustomization']>,
  payload: SimplifiedExtractionPayload,
  project: any,
  user: any,
  startTime: number
): Promise<ExtractionScenarioResult> {
  console.log(`🎯 Processing cell customization: ${cellRequest.documentId}/${cellRequest.columnId}`);

  const document = await Document.findById(cellRequest.documentId);
  if (!document) {
    throw new Error(`Document ${cellRequest.documentId} not found`);
  }

  // Create column config with custom prompt
  const columnConfig: ColumnConfig = {
    columnId: cellRequest.columnId,
    customPrompt: cellRequest.customPrompt,
    aiModel: cellRequest.aiModel || payload.globalOptions?.aiModel,
    forceReextract: true // Always force for cell customization
  };

  // Extract with custom prompt
  const result = await extractFromDocument(document, columnConfig, project, payload.globalOptions);

  // Add cell ID for tracking
  result.cellId = `${cellRequest.documentId}_${cellRequest.columnId}`;

  // Validate result if rules provided
  if (cellRequest.validationRules) {
    const validation = validateExtractedData(result.value, cellRequest.validationRules);
    result.validation = validation;
  }

  // Save cell customization to document
  const originalPrompt = getColumnPrompt({ columnId: cellRequest.columnId }, project);
  await document.setCellCustomPrompt(
    cellRequest.columnId,
    cellRequest.customPrompt,
    user._id,
    originalPrompt
  );

  // Save extracted data
  await document.setExtractedData(cellRequest.columnId, {
    value: result.value,
    confidence: result.confidence,
    extractedBy: result.extractedBy,
  });

  // Add to extraction history
  await document.addExtractionHistory(
    cellRequest.columnId,
    cellRequest.customPrompt,
    result.value,
    result.confidence,
    result.extractedBy.model
  );

  return {
    scenarioType: 'cellCustomization',
    targetId: `${cellRequest.documentId}_${cellRequest.columnId}`,
    success: true,
    data: { [cellRequest.columnId]: result },
    metadata: {
      documentCount: 1,
      sourceDocuments: [cellRequest.documentId],
      processingTimeMs: Date.now() - startTime,
    }
  };
}

// ========================================
// EXTRACTION LOGIC (Using existing OpenAI integration)
// ========================================

async function extractFromDocument(
  document: any,
  column: ColumnConfig,
  project: any,
  globalOptions?: GlobalExtractionOptions
): Promise<ExtractedCellData> {
  const prompt = getColumnPrompt(column, project);
  const model = column.aiModel || globalOptions?.aiModel || 'gpt-4o';

  try {
    // Determine if document is image or PDF
    const mimeType = document.fileMetadata?.mimeType?.toLowerCase() || '';
    const isImage = mimeType.startsWith('image/') || 
                   ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(document.fileMetadata?.extension?.toLowerCase());

    let extractedValue: string;
    let confidence: number;

    if (isImage) {
      const result = await extractFromImage(document.cloudinary.secureUrl, prompt, model);
      extractedValue = result.value;
      confidence = result.confidence;
    } else {
      const result = await extractFromPDF(document.cloudinary.secureUrl, prompt, model);
      extractedValue = result.value;
      confidence = result.confidence;
    }

    return {
      value: extractedValue,
      confidence,
      extractedBy: {
        method: 'ai',
        model,
        promptUsed: prompt,
        customPrompt: !!column.customPrompt
      },
      extractedAt: new Date().toISOString(),
    };

  } catch (error: any) {
    console.error(`❌ Extraction failed for ${document.filename}:`, error.message);
    return {
      value: '',
      confidence: 0,
      extractedBy: {
        method: 'ai',
        model,
        promptUsed: prompt,
        customPrompt: !!column.customPrompt
      },
      extractedAt: new Date().toISOString(),
    };
  }
}

async function extractFromImage(url: string, prompt: string, model: string): Promise<{value: string, confidence: number}> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url, detail: "high" } }
        ]
      }
    ],
    max_tokens: 2000,
    temperature: 0.1,
  });

  const response = completion.choices[0].message.content || '';
  return {
    value: response.trim(),
    confidence: 0.85 // Default confidence for image extraction
  };
}

async function extractFromPDF(url: string, prompt: string, model: string): Promise<{value: string, confidence: number}> {
  // Download and extract text from PDF
  const pdfBuffer = await downloadPDFBuffer(url);
  const extractedText = await extractTextWithPDFParse(pdfBuffer);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a professional document analysis AI. Extract precise data from text."
      },
      {
        role: "user",
        content: `${prompt}\n\nDocument text:\n${extractedText.substring(0, 15000)}`
      }
    ],
    max_tokens: 2000,
    temperature: 0.1,
  });

  const response = completion.choices[0].message.content || '';
  return {
    value: response.trim(),
    confidence: 0.88 // Default confidence for PDF extraction
  };
}

async function downloadPDFBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function extractTextWithPDFParse(pdfBuffer: Buffer): Promise<string> {
  const { default: pdfParse } = await import('pdf-parse');
  const data = await pdfParse(pdfBuffer);
  return data.text;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function getColumnPrompt(column: ColumnConfig, project: any): string {
  if (column.customPrompt) {
    return column.customPrompt;
  }

  const columnDef = project.gridConfiguration?.columnDefs?.get ? 
    project.gridConfiguration.columnDefs.get(column.columnId) : 
    project.gridConfiguration?.columnDefs?.[column.columnId];

  return columnDef?.customProperties?.prompt || `Extract ${column.columnId} from the document`;
}

function validateExtractedData(value: string, rules: ValidationRules): { passed: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (rules.required && !value) {
    errors.push('Value is required');
  }

  if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
    errors.push(`Value does not match required pattern: ${rules.pattern}`);
  }

  if (rules.minLength && value.length < rules.minLength) {
    errors.push(`Value is too short (minimum ${rules.minLength} characters)`);
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    errors.push(`Value is too long (maximum ${rules.maxLength} characters)`);
  }

  return {
    passed: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ========================================
// MAIN API HANDLER
// ========================================

export async function POST(request: NextRequest) {
  const overallStartTime = Date.now();
  
  try {
    console.log("🚀 Simplified Unified Extraction API called");
    await connectDB();

    // Authenticate user
    const user = await authenticateRequest(request);
    console.log("✅ User authenticated:", user.email);

    // Parse and validate payload
    const payload: SimplifiedExtractionPayload = await request.json();
    console.log("📋 Processing", payload.extractions.length, "extraction requests");

    const validation = validatePayload(payload);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: "Invalid payload",
        details: validation.errors
      }, { status: 400 });
    }

    // Verify project access
    const project = await Project.findById(payload.projectId);
    if (!project) {
      return NextResponse.json({
        success: false,
        error: "Project not found"
      }, { status: 404 });
    }

    const hasAccess = project.ownerId.toString() === user._id.toString() ||
      project.collaborators.some((collab: any) => collab.userId.toString() === user._id.toString());

    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        error: "Access denied to project"
      }, { status: 403 });
    }

    // Process all extraction requests
    const results: ExtractionScenarioResult[] = [];
    
    if (payload.globalOptions?.parallelProcessing) {
      // Process in parallel
      const promises = payload.extractions.map((extraction, index) => 
        processExtractionRequest(extraction, payload, project, user, index)
      );
      const parallelResults = await Promise.all(promises);
      results.push(...parallelResults);
    } else {
      // Process sequentially
      for (let i = 0; i < payload.extractions.length; i++) {
        const result = await processExtractionRequest(payload.extractions[i], payload, project, user, i);
        results.push(result);
      }
    }

    // Calculate final stats
    const successfulExtractions = results.filter(r => r.success).length;
    const processingTimeMs = Date.now() - overallStartTime;

    const response: SimplifiedExtractionResponse = {
      success: successfulExtractions > 0,
      requestId: generateRequestId(),
      results,
      stats: {
        totalExtractions: payload.extractions.length,
        successfulExtractions,
        failedExtractions: payload.extractions.length - successfulExtractions,
        processingTimeMs,
      }
    };

    console.log(`✅ Simplified extraction completed: ${successfulExtractions}/${payload.extractions.length} successful in ${processingTimeMs}ms`);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error("❌ Simplified extraction API error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error.message,
      processingTimeMs: Date.now() - overallStartTime
    }, { status: 500 });
  }
}