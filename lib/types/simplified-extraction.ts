// ========================================
// SIMPLIFIED EXTRACTION API TYPES
// ========================================

export interface SimplifiedExtractionPayload {
  projectId: string;
  extractions: ExtractionRequest[];
  globalOptions?: GlobalExtractionOptions;
}

export interface ExtractionRequest {
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

export interface ColumnConfig {
  columnId: string;
  customPrompt?: string;
  aiModel?: string;
  confidenceThreshold?: number;
  outputFormat?: 'text' | 'json' | 'structured';
  forceReextract?: boolean;
}

export interface ValidationRules {
  required?: boolean;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
}

export interface GlobalExtractionOptions {
  aiModel?: 'gpt-4o' | 'gpt-4' | 'claude-3';
  maxRetries?: number;
  timeout?: number;
  parallelProcessing?: boolean;
  includeConfidence?: boolean;
  includeMetadata?: boolean;
  includeDebugInfo?: boolean;
}

export interface SimplifiedExtractionResponse {
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

export interface ExtractionScenarioResult {
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
  cellId?: string;
  validation?: {
    passed: boolean;
    errors?: string[];
  };
}

// ========================================
// CLIENT HELPER TYPES
// ========================================

export interface SingleDocumentExtractionOptions {
  columns: Array<{
    columnId: string;
    customPrompt?: string;
    forceReextract?: boolean;
  }>;
  forceReextract?: boolean;
}

export interface DocumentCollectionExtractionOptions {
  columns: Array<{
    columnId: string;
    customPrompt?: string;
    forceReextract?: boolean;
  }>;
  docIds?: string[];
  aggregationStrategy?: 'concatenate' | 'summary' | 'list' | 'smart';
  forceReextract?: boolean;
}

export interface RowReextractionOptions {
  columns?: Array<{
    columnId: string;
    customPrompt?: string;
  }>;
}

export interface CellCustomizationOptions {
  customPrompt: string;
  notes?: string;
  validationRules?: ValidationRules;
  aiModel?: string;
}

// ========================================
// ERROR TYPES
// ========================================

export interface ExtractionError {
  code: string;
  message: string;
  targetId?: string;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// ========================================
// UTILITY TYPES
// ========================================

export type ExtractionScenarioType = 'document' | 'documentCollection' | 'rowReextraction' | 'cellCustomization';
export type AggregationStrategy = 'concatenate' | 'summary' | 'list' | 'smart';
export type AIModel = 'gpt-4o' | 'gpt-4' | 'claude-3';
export type OutputFormat = 'text' | 'json' | 'structured';
export type ExtractionMethod = 'ai' | 'manual' | 'cached';

// ========================================
// BUILDER PATTERN HELPERS
// ========================================

export class ExtractionRequestBuilder {
  private request: ExtractionRequest = {};

  document(id: string, columns: ColumnConfig[], forceReextract?: boolean): this {
    this.request.document = { id, columns, forceReextract };
    return this;
  }

  documentCollection(
    id: string, 
    columns: ColumnConfig[], 
    options?: {
      docIds?: string[];
      aggregationStrategy?: AggregationStrategy;
      forceReextract?: boolean;
    }
  ): this {
    this.request.documentCollection = { id, columns, ...options };
    return this;
  }

  rowReextraction(documentId: string, columns?: ColumnConfig[]): this {
    this.request.rowReextraction = { documentId, columns, forceReextract: true };
    return this;
  }

  cellCustomization(
    documentId: string,
    columnId: string,
    customPrompt: string,
    options?: {
      notes?: string;
      validationRules?: ValidationRules;
      aiModel?: string;
    }
  ): this {
    this.request.cellCustomization = { documentId, columnId, customPrompt, ...options };
    return this;
  }

  build(): ExtractionRequest {
    return this.request;
  }
}

export class PayloadBuilder {
  private payload: SimplifiedExtractionPayload;

  constructor(projectId: string) {
    this.payload = {
      projectId,
      extractions: []
    };
  }

  addExtraction(extraction: ExtractionRequest): this {
    this.payload.extractions.push(extraction);
    return this;
  }

  setGlobalOptions(options: GlobalExtractionOptions): this {
    this.payload.globalOptions = options;
    return this;
  }

  build(): SimplifiedExtractionPayload {
    return this.payload;
  }
}

// Usage example:
// const payload = new PayloadBuilder('project-id')
//   .addExtraction(
//     new ExtractionRequestBuilder()
//       .documentCollection('collection-id', [{ columnId: 'title' }])
//       .build()
//   )
//   .setGlobalOptions({ aiModel: 'gpt-4o', parallelProcessing: true })
//   .build();
