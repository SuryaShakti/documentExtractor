// ========================================
// UNIFIED EXTRACTION API TYPES
// ========================================

export interface UnifiedExtractionPayload {
  projectId: string;
  targets: ExtractionTarget[];
  options?: ExtractionOptions;
  requestId?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface ExtractionTarget {
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

export interface ColumnExtraction {
  columnId: string;
  customPrompt?: string;
  forceReextract?: boolean;
  aiModel?: string;
  confidenceThreshold?: number;
  outputFormat?: 'text' | 'json' | 'structured';
  maxLength?: number;
}

export interface CellCustomization {
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

export interface ExtractionOptions {
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

export interface UnifiedExtractionResponse {
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

export interface ExtractionResult {
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

export interface ExtractedCellData {
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
  cellId?: string; // For cell-level tracking
  validation?: {
    passed: boolean;
    errors?: string[];
  };
}

export interface ExtractionError {
  targetId: string;
  code: string;
  message: string;
  details?: any;
}

// ========================================
// UTILITY FUNCTIONS FOR CREATING PAYLOADS
// ========================================

/**
 * Create payload for single document extraction (Scenario 1)
 */
export function createDocumentExtractionPayload(
  projectId: string,
  documentId: string,
  columns: { columnId: string; customPrompt?: string; forceReextract?: boolean }[],
  options?: Partial<ExtractionOptions>
): UnifiedExtractionPayload {
  return {
    projectId,
    targets: [{
      type: 'document',
      documentId,
      columns: columns.map(col => ({
        columnId: col.columnId,
        customPrompt: col.customPrompt,
        forceReextract: col.forceReextract || false
      }))
    }],
    options: {
      includeConfidence: true,
      includeMetadata: true,
      ...options
    }
  };
}

/**
 * Create payload for collection extraction (Scenario 2)
 */
export function createCollectionExtractionPayload(
  projectId: string,
  collectionId: string,
  documentIds: string[],
  columns: { columnId: string; customPrompt?: string }[],
  aggregationStrategy: 'concatenate' | 'summary' | 'smart' = 'smart',
  options?: Partial<ExtractionOptions>
): UnifiedExtractionPayload {
  return {
    projectId,
    targets: [{
      type: 'collection',
      collectionId,
      documentIds,
      columns: columns.map(col => ({
        columnId: col.columnId,
        customPrompt: col.customPrompt
      })),
      targetOptions: {
        aggregationStrategy,
        preserveOrder: true,
        includeMetadata: true
      }
    }],
    options: {
      parallelProcessing: true,
      batchSize: 5,
      includeConfidence: true,
      ...options
    }
  };
}

/**
 * Create payload for row re-extraction (Scenario 3)
 */
export function createRowExtractionPayload(
  projectId: string,
  documentId: string,
  columns: { columnId: string; customPrompt?: string; aiModel?: string }[],
  options?: Partial<ExtractionOptions>
): UnifiedExtractionPayload {
  return {
    projectId,
    targets: [{
      type: 'row',
      documentId,
      columns: columns.map(col => ({
        columnId: col.columnId,
        customPrompt: col.customPrompt,
        aiModel: col.aiModel,
        forceReextract: true // Always force re-extract for rows
      }))
    }],
    options: {
      forceReextract: true,
      includeConfidence: true,
      includeDebugInfo: true,
      ...options
    },
    priority: 'high'
  };
}

/**
 * Create payload for cell customization (Scenario 4)
 */
export function createCellExtractionPayload(
  projectId: string,
  documentId: string,
  columnId: string,
  customPrompt: string,
  notes?: string,
  validationRules?: CellCustomization['validationRules'],
  options?: Partial<ExtractionOptions>
): UnifiedExtractionPayload {
  return {
    projectId,
    targets: [{
      type: 'cell',
      documentId,
      columnId,
      cellCustomizations: [{
        documentId,
        columnId,
        customPrompt,
        notes,
        validationRules,
        aiModel: options?.aiModel || 'gpt-4o'
      }]
    }],
    options: {
      forceReextract: true,
      includeConfidence: true,
      includeMetadata: true,
      ...options
    }
  };
}

/**
 * Create batch payload for mixed extraction scenarios
 */
export function createBatchExtractionPayload(
  projectId: string,
  targets: ExtractionTarget[],
  options?: Partial<ExtractionOptions>
): UnifiedExtractionPayload {
  return {
    projectId,
    targets,
    options: {
      parallelProcessing: true,
      batchSize: 10,
      includeConfidence: true,
      includeMetadata: true,
      ...options
    },
    requestId: `batch_${Date.now()}`
  };
}
