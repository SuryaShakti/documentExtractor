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
// UNIFIED EXTRACTION TYPES
// ========================================

interface UnifiedExtractionPayload {
  projectId: string;
  targets: ExtractionTarget[];
  options?: ExtractionOptions;
  requestId?: string;
  priority?: 'low' | 'normal' | 'high';
}

interface ExtractionTarget {
  type: 'document' | 'collection' | 'row' | 'cell';
  documentId?: string;
  collectionId?: string;
  documentIds?: string[];
  columns?: ColumnExtraction[];
  columnId?: string;
  cellCustomizations?: CellCustomization[];
  targetOptions?: {
    aggregationStrategy?: 'concatenate' | 'summary' | 'average' | 'list' | 'smart';
    includeMetadata?: boolean;
    preserveOrder?: boolean;
  };
}

interface ColumnExtraction {
  columnId: string;
  customPrompt?: string;
  forceReextract?: boolean;
  aiModel?: string;
  confidenceThreshold?: number;
  outputFormat?: 'text' | 'json' | 'structured';
  maxLength?: number;
}

interface CellCustomization {
  documentId: string;
  columnId: string;
  customPrompt: string;
  notes?: string;
  aiModel?: string;
  temperature?: number;
  maxTokens?: number;
  validationRules?: {
    required?: boolean;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

interface ExtractionOptions {
  forceReextract?: boolean;
  aiModel?: 'gpt-4o' | 'gpt-4' | 'claude-3' | 'custom';
  maxRetries?: number;
  timeout?: number;
  parallelProcessing?: boolean;
  batchSize?: number;
  includeConfidence?: boolean;
  includeMetadata?: boolean;
  includeDebugInfo?: boolean;
}

interface UnifiedExtractionResponse {
  success: boolean;
  requestId: string;
  results: ExtractionResult[];
  stats: {
    totalTargets: number;
    successfulTargets: number;
    failedTargets: number;
    processingTimeMs: number;
    tokensUsed?: number;
  };
  errors?: ExtractionError[];
  warnings?: string[];
}

interface ExtractionResult {
  targetId: string;
  type: 'document' | 'collection' | 'row' | 'cell';
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
  cellId?: string; // NEW: For cell-level tracking
  validation?: {
    passed: boolean;
    errors?: string[];
  };
}

interface ExtractionError {
  targetId: string;
  code: string;
  message: string;
  details?: any;
}

// ========================================
// AUTHENTICATION & VALIDATION
// ========================================

async function authenticateRequest(request: NextRequest) {
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

function validatePayload(payload: UnifiedExtractionPayload): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  if (!payload.projectId) {
    errors.push("projectId is required");
  }

  if (!payload.targets || payload.targets.length === 0) {
    errors.push("At least one extraction target is required");
  }

  // Validate each target
  payload.targets?.forEach((target, index) => {
    if (!['document', 'collection', 'row', 'cell'].includes(target.type)) {
      errors.push(`Target ${index}: Invalid type '${target.type}'`);
    }

    if (target.type === 'document' || target.type === 'row' || target.type === 'cell') {
      if (!target.documentId) {
        errors.push(`Target ${index}: documentId is required for type '${target.type}'`);
      }
    }

    if (target.type === 'collection' && !target.collectionId) {
      errors.push(`Target ${index}: collectionId is required for type 'collection'`);
    }

    if (target.type === 'cell' && !target.columnId) {
      errors.push(`Target ${index}: columnId is required for type 'cell'`);
    }
  });

  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

// ========================================
// EXTRACTION PROCESSORS
// ========================================

async function processExtractionTarget(
  target: ExtractionTarget, 
  payload: UnifiedExtractionPayload,
  project: any,
  user: any
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const targetId = generateTargetId(target);

  console.log(`🎯 Processing ${target.type} extraction:`, targetId);

  try {
    switch (target.type) {
      case 'document':
        return await processDocumentExtraction(target, payload, project, user, targetId, startTime);
      
      case 'collection':
        return await processCollectionExtraction(target, payload, project, user, targetId, startTime);
      
      case 'row':
        return await processRowExtraction(target, payload, project, user, targetId, startTime);
      
      case 'cell':
        return await processCellExtraction(target, payload, project, user, targetId, startTime);
      
      default:
        throw new Error(`Unsupported extraction type: ${target.type}`);
    }
  } catch (error: any) {
    console.error(`❌ Target ${targetId} failed:`, error.message);
    return {
      targetId,
      type: target.type,
      success: false,
      data: {},
      metadata: { processingTimeMs: Date.now() - startTime },
      error: error.message
    };
  }
}

async function processDocumentExtraction(
  target: ExtractionTarget,
  payload: UnifiedExtractionPayload,
  project: any,
  user: any,
  targetId: string,
  startTime: number
): Promise<ExtractionResult> {
  console.log(`📄 Processing document extraction for: ${target.documentId}`);

  const document = await Document.findById(target.documentId);
  if (!document) {
    throw new Error(`Document ${target.documentId} not found`);
  }

  const extractedData: Record<string, ExtractedCellData> = {};
  const columns = target.columns || [];

  for (const column of columns) {
    // Check if we need to re-extract or if cached data is sufficient
    const existingData = document.extractedData.get(column.columnId);
    const shouldExtract = column.forceReextract || 
                         payload.options?.forceReextract || 
                         !existingData?.value;

    if (shouldExtract) {
      console.log(`🔄 Extracting column ${column.columnId} from document ${document.filename}`);
      const result = await extractFromDocument(document, column, project, payload.options);
      extractedData[column.columnId] = result;
      
      // Save to document
      await document.setExtractedData(column.columnId, {
        value: result.value,
        confidence: result.confidence,
        extractedBy: result.extractedBy,
        extractedAt: new Date(),
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
    targetId,
    type: 'document',
    success: true,
    data: extractedData,
    metadata: {
      documentCount: 1,
      sourceDocuments: [target.documentId!],
      processingTimeMs: Date.now() - startTime,
    }
  };
}

async function processCollectionExtraction(
  target: ExtractionTarget,
  payload: UnifiedExtractionPayload,
  project: any,
  user: any,
  targetId: string,
  startTime: number
): Promise<ExtractionResult> {
  console.log(`📁 Processing collection extraction for: ${target.collectionId}`);

  const collection = await DocumentCollection.findById(target.collectionId);
  if (!collection) {
    throw new Error(`Collection ${target.collectionId} not found`);
  }

  // Use specified documents or all documents in collection
  const documentIds = target.documentIds || collection.documents;
  const documents = await Document.find({ _id: { $in: documentIds } });

  const extractedData: Record<string, ExtractedCellData> = {};
  const columns = target.columns || [];

  for (const column of columns) {
    console.log(`🔄 Processing column ${column.columnId} for ${documents.length} documents`);
    
    // Extract from all documents
    const documentResults: ExtractedCellData[] = [];
    
    for (const document of documents) {
      try {
        const result = await extractFromDocument(document, column, project, payload.options);
        documentResults.push(result);
      } catch (error: any) {
        console.warn(`⚠️ Failed to extract from document ${document._id}:`, error.message);
      }
    }

    // Aggregate results based on strategy
    const aggregatedResult = aggregateResults(
      documentResults, 
      target.targetOptions?.aggregationStrategy || 'concatenate',
      documentIds.map(id => id.toString())
    );

    extractedData[column.columnId] = aggregatedResult;

    // Save aggregated data to collection
    collection.extractedData.set(column.columnId, {
      value: aggregatedResult.value,
      confidence: aggregatedResult.confidence,
      extractedAt: new Date(),
      extractedBy: aggregatedResult.extractedBy,
      sourceDocuments: documentIds,
      aggregationType: target.targetOptions?.aggregationStrategy || 'concatenate'
    });
  }

  await collection.save();

  return {
    targetId,
    type: 'collection',
    success: true,
    data: extractedData,
    metadata: {
      documentCount: documents.length,
      sourceDocuments: documentIds.map(id => id.toString()),
      aggregationUsed: target.targetOptions?.aggregationStrategy || 'concatenate',
      processingTimeMs: Date.now() - startTime,
    }
  };
}

async function processRowExtraction(
  target: ExtractionTarget,
  payload: UnifiedExtractionPayload,
  project: any,
  user: any,
  targetId: string,
  startTime: number
): Promise<ExtractionResult> {
  console.log(`📊 Processing row extraction for: ${target.documentId}`);

  // Row extraction is essentially document extraction with forceReextract = true
  const documentTarget: ExtractionTarget = {
    ...target,
    type: 'document',
    columns: target.columns?.map(col => ({ ...col, forceReextract: true }))
  };

  return await processDocumentExtraction(documentTarget, payload, project, user, targetId, startTime);
}

async function processCellExtraction(
  target: ExtractionTarget,
  payload: UnifiedExtractionPayload,
  project: any,
  user: any,
  targetId: string,
  startTime: number
): Promise<ExtractionResult> {
  console.log(`🎯 Processing cell extraction for: ${target.documentId}/${target.columnId}`);

  const document = await Document.findById(target.documentId);
  if (!document) {
    throw new Error(`Document ${target.documentId} not found`);
  }

  const cellCustomization = target.cellCustomizations?.[0];
  if (!cellCustomization) {
    throw new Error("Cell customization is required for cell extraction");
  }

  // Create column extraction with custom prompt
  const columnExtraction: ColumnExtraction = {
    columnId: target.columnId!,
    customPrompt: cellCustomization.customPrompt,
    forceReextract: true,
    aiModel: cellCustomization.aiModel || payload.options?.aiModel,
  };

  const result = await extractFromDocument(document, columnExtraction, project, payload.options);

  // Add cell ID for tracking
  result.cellId = `${target.documentId}_${target.columnId}`;

  // Validate result if rules provided
  if (cellCustomization.validationRules) {
    const validation = validateExtractedData(result.value, cellCustomization.validationRules);
    result.validation = validation;
  }

  // Save cell customization to document
  await document.setCellCustomPrompt(
    target.columnId!,
    cellCustomization.customPrompt,
    user._id,
    getColumnPrompt(columnExtraction, project)
  );

  // Save extracted data
  await document.setExtractedData(target.columnId!, {
    value: result.value,
    confidence: result.confidence,
    extractedBy: result.extractedBy,
    extractedAt: new Date(),
  });

  // Add to extraction history
  await document.addExtractionHistory(
    target.columnId!,
    cellCustomization.customPrompt,
    result.value,
    result.confidence,
    result.extractedBy.model
  );

  return {
    targetId,
    type: 'cell',
    success: true,
    data: { [target.columnId!]: result },
    metadata: {
      documentCount: 1,
      sourceDocuments: [target.documentId!],
      processingTimeMs: Date.now() - startTime,
    }
  };
}

// ========================================
// EXTRACTION LOGIC
// ========================================

async function extractFromDocument(
  document: any,
  column: ColumnExtraction,
  project: any,
  globalOptions?: ExtractionOptions
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

function getColumnPrompt(column: ColumnExtraction, project: any): string {
  if (column.customPrompt) {
    return column.customPrompt;
  }

  const columnDef = project.gridConfiguration?.columnDefs?.get ? 
    project.gridConfiguration.columnDefs.get(column.columnId) : 
    project.gridConfiguration?.columnDefs?.[column.columnId];

  return columnDef?.customProperties?.prompt || `Extract ${column.columnId} from the document`;
}

function aggregateResults(
  results: ExtractedCellData[], 
  strategy: string,
  sourceDocuments: string[]
): ExtractedCellData {
  if (results.length === 0) {
    return {
      value: '',
      confidence: 0,
      extractedBy: { method: 'ai', model: 'unknown', promptUsed: '' },
      extractedAt: new Date().toISOString(),
      sourceDocuments
    };
  }

  if (results.length === 1) {
    return { ...results[0], sourceDocuments };
  }

  const validResults = results.filter(r => r.value && r.confidence > 0);
  if (validResults.length === 0) {
    return results[0];
  }

  let aggregatedValue: string;
  const avgConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length;

  switch (strategy) {
    case 'concatenate':
      aggregatedValue = validResults.map(r => r.value).join(' | ');
      break;
    case 'summary':
      aggregatedValue = validResults.map(r => r.value).join('. ');
      break;
    case 'list':
      aggregatedValue = validResults.map(r => `• ${r.value}`).join('\n');
      break;
    case 'smart':
    default:
      // Smart aggregation: if all values are similar, take the best one
      if (validResults.every(r => r.value === validResults[0].value)) {
        aggregatedValue = validResults[0].value;
      } else {
        aggregatedValue = validResults.map(r => r.value).join(' | ');
      }
      break;
  }

  return {
    value: aggregatedValue,
    confidence: avgConfidence,
    extractedBy: {
      method: 'ai',
      model: validResults[0].extractedBy.model,
      promptUsed: validResults[0].extractedBy.promptUsed
    },
    extractedAt: new Date().toISOString(),
    sourceDocuments
  };
}

function validateExtractedData(value: string, rules: any): { passed: boolean; errors?: string[] } {
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

function generateTargetId(target: ExtractionTarget): string {
  const id = target.documentId || target.collectionId || 'unknown';
  return `${target.type}_${id}_${Date.now()}`;
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
    console.log("🚀 Unified Extraction API called");
    await connectDB();

    // Authenticate user
    const user = await authenticateRequest(request);
    console.log("✅ User authenticated:", user.email);

    // Parse and validate payload
    const payload: UnifiedExtractionPayload = await request.json();
    console.log("📋 Processing", payload.targets.length, "extraction targets");

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

    // Process all targets
    const results: ExtractionResult[] = [];
    const batchSize = payload.options?.batchSize || 5;
    
    if (payload.options?.parallelProcessing) {
      // Process in batches for parallel processing
      for (let i = 0; i < payload.targets.length; i += batchSize) {
        const batch = payload.targets.slice(i, i + batchSize);
        const batchPromises = batch.map(target => 
          processExtractionTarget(target, payload, project, user)
        );
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
    } else {
      // Process sequentially
      for (const target of payload.targets) {
        const result = await processExtractionTarget(target, payload, project, user);
        results.push(result);
      }
    }

    // Calculate final stats
    const successfulTargets = results.filter(r => r.success).length;
    const processingTimeMs = Date.now() - overallStartTime;

    const response: UnifiedExtractionResponse = {
      success: successfulTargets > 0,
      requestId: payload.requestId || generateRequestId(),
      results,
      stats: {
        totalTargets: payload.targets.length,
        successfulTargets,
        failedTargets: payload.targets.length - successfulTargets,
        processingTimeMs,
      }
    };

    console.log(`✅ Unified extraction completed: ${successfulTargets}/${payload.targets.length} successful in ${processingTimeMs}ms`);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error("❌ Unified extraction API error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error.message,
      processingTimeMs: Date.now() - overallStartTime
    }, { status: 500 });
  }
}
