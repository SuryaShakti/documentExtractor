import { 
  UnifiedExtractionPayload, 
  UnifiedExtractionResponse,
  createDocumentExtractionPayload,
  createCollectionExtractionPayload,
  createRowExtractionPayload,
  createCellExtractionPayload,
  ExtractionOptions
} from '@/lib/types/extraction';

/**
 * Unified Extraction Service
 * Handles all 4 extraction scenarios with a single API
 */
export class UnifiedExtractionService {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = '/api/extract/unified') {
    this.baseUrl = baseUrl;
  }

  /**
   * Set authentication token
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * Generic method to call the unified extraction API
   */
  private async callUnifiedAPI(payload: UnifiedExtractionPayload): Promise<UnifiedExtractionResponse> {
    console.log('🚀 Calling Unified Extraction API:', payload);

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token || localStorage.getItem('token')}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || errorData.error || 'Extraction failed');
    }

    const result = await response.json();
    console.log('✅ Unified Extraction Result:', result);
    
    return result;
  }

  // ========================================
  // SCENARIO 1: Single Document Extraction
  // ========================================

  /**
   * Extract data from a single document (independent upload)
   */
  async extractFromDocument(
    projectId: string,
    documentId: string,
    columns: { columnId: string; customPrompt?: string; forceReextract?: boolean }[],
    options?: Partial<ExtractionOptions>
  ): Promise<UnifiedExtractionResponse> {
    const payload = createDocumentExtractionPayload(projectId, documentId, columns, options);
    return this.callUnifiedAPI(payload);
  }

  // ========================================
  // SCENARIO 2: Collection Extraction  
  // ========================================

  /**
   * Extract data from a document collection with aggregation
   */
  async extractFromCollection(
    projectId: string,
    collectionId: string,
    documentIds?: string[],
    columns?: { columnId: string; customPrompt?: string }[],
    aggregationStrategy: 'concatenate' | 'summary' | 'smart' = 'smart',
    options?: Partial<ExtractionOptions>
  ): Promise<UnifiedExtractionResponse> {
    // If no columns specified, extract all available columns from project
    const finalColumns = columns || await this.getProjectColumns(projectId);
    
    const payload = createCollectionExtractionPayload(
      projectId, 
      collectionId, 
      documentIds || [], 
      finalColumns, 
      aggregationStrategy, 
      options
    );
    
    return this.callUnifiedAPI(payload);
  }

  // ========================================
  // SCENARIO 3: Row Re-extraction
  // ========================================

  /**
   * Re-extract all data for a specific document (row)
   */
  async reExtractRow(
    projectId: string,
    documentId: string,
    columns?: { columnId: string; customPrompt?: string; aiModel?: string }[],
    options?: Partial<ExtractionOptions>
  ): Promise<UnifiedExtractionResponse> {
    // If no columns specified, extract all available columns from project
    const finalColumns = columns || await this.getProjectColumns(projectId);
    
    const payload = createRowExtractionPayload(projectId, documentId, finalColumns, options);
    return this.callUnifiedAPI(payload);
  }

  // ========================================
  // SCENARIO 4: Cell Customization
  // ========================================

  /**
   * Extract data from a specific cell with custom prompt
   */
  async extractCell(
    projectId: string,
    documentId: string,
    columnId: string,
    customPrompt: string,
    notes?: string,
    validationRules?: {
      required?: boolean;
      pattern?: string;
      minLength?: number;
      maxLength?: number;
    },
    options?: Partial<ExtractionOptions>
  ): Promise<UnifiedExtractionResponse> {
    const payload = createCellExtractionPayload(
      projectId, 
      documentId, 
      columnId, 
      customPrompt, 
      notes, 
      validationRules, 
      options
    );
    
    return this.callUnifiedAPI(payload);
  }

  // ========================================
  // ADVANCED: Batch Operations
  // ========================================

  /**
   * Process multiple extraction targets in a single API call
   */
  async batchExtract(payload: UnifiedExtractionPayload): Promise<UnifiedExtractionResponse> {
    return this.callUnifiedAPI(payload);
  }

  /**
   * Process multiple documents independently
   */
  async extractMultipleDocuments(
    projectId: string,
    documentsData: Array<{
      documentId: string;
      columns: { columnId: string; customPrompt?: string; forceReextract?: boolean }[];
    }>,
    options?: Partial<ExtractionOptions>
  ): Promise<UnifiedExtractionResponse> {
    const targets = documentsData.map(doc => ({
      type: 'document' as const,
      documentId: doc.documentId,
      columns: doc.columns
    }));

    const payload: UnifiedExtractionPayload = {
      projectId,
      targets,
      options: {
        parallelProcessing: true,
        batchSize: 5,
        includeConfidence: true,
        ...options
      }
    };

    return this.callUnifiedAPI(payload);
  }

  /**
   * Mixed extraction: documents + collections + cells in one call
   */
  async mixedExtraction(
    projectId: string,
    config: {
      documents?: Array<{ documentId: string; columns?: { columnId: string; customPrompt?: string }[] }>;
      collections?: Array<{ collectionId: string; documentIds?: string[]; columns?: { columnId: string }[] }>;
      cells?: Array<{ documentId: string; columnId: string; customPrompt: string; notes?: string }>;
      rows?: Array<{ documentId: string; columns?: { columnId: string; customPrompt?: string }[] }>;
    },
    options?: Partial<ExtractionOptions>
  ): Promise<UnifiedExtractionResponse> {
    const targets = [];

    // Add document targets
    if (config.documents) {
      for (const doc of config.documents) {
        const columns = doc.columns || await this.getProjectColumns(projectId);
        targets.push({
          type: 'document' as const,
          documentId: doc.documentId,
          columns
        });
      }
    }

    // Add collection targets
    if (config.collections) {
      for (const coll of config.collections) {
        const columns = coll.columns || await this.getProjectColumns(projectId);
        targets.push({
          type: 'collection' as const,
          collectionId: coll.collectionId,
          documentIds: coll.documentIds,
          columns
        });
      }
    }

    // Add cell targets
    if (config.cells) {
      for (const cell of config.cells) {
        targets.push({
          type: 'cell' as const,
          documentId: cell.documentId,
          columnId: cell.columnId,
          cellCustomizations: [{
            documentId: cell.documentId,
            columnId: cell.columnId,
            customPrompt: cell.customPrompt,
            notes: cell.notes
          }]
        });
      }
    }

    // Add row targets
    if (config.rows) {
      for (const row of config.rows) {
        const columns = row.columns || await this.getProjectColumns(projectId);
        targets.push({
          type: 'row' as const,
          documentId: row.documentId,
          columns: columns.map(col => ({ ...col, forceReextract: true }))
        });
      }
    }

    const payload: UnifiedExtractionPayload = {
      projectId,
      targets,
      options: {
        parallelProcessing: true,
        batchSize: 10,
        includeConfidence: true,
        includeMetadata: true,
        ...options
      },
      requestId: `mixed_${Date.now()}`
    };

    return this.callUnifiedAPI(payload);
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Get all extractable columns from a project
   */
  private async getProjectColumns(projectId: string): Promise<{ columnId: string; customPrompt?: string }[]> {
    try {
      // This would typically fetch from your project API
      // For now, return empty array to avoid breaking
      // You can implement this based on your existing project API
      return [];
    } catch (error) {
      console.warn('Could not fetch project columns:', error);
      return [];
    }
  }

  /**
   * Monitor extraction progress (for long-running operations)
   */
  async monitorExtraction(requestId: string): Promise<{ status: string; progress?: number }> {
    // This could be implemented with polling or WebSocket
    // For now, just return completed status
    return { status: 'completed', progress: 100 };
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

export const unifiedExtractionService = new UnifiedExtractionService();

// ========================================
// CONVENIENCE FUNCTIONS
// ========================================

/**
 * Quick function for single document extraction
 */
export async function extractDocument(
  projectId: string,
  documentId: string,
  columns: { columnId: string; customPrompt?: string; forceReextract?: boolean }[]
) {
  return unifiedExtractionService.extractFromDocument(projectId, documentId, columns);
}

/**
 * Quick function for collection extraction
 */
export async function extractCollection(
  projectId: string,
  collectionId: string,
  documentIds?: string[],
  aggregationStrategy: 'concatenate' | 'summary' | 'smart' = 'smart'
) {
  return unifiedExtractionService.extractFromCollection(
    projectId, 
    collectionId, 
    documentIds, 
    undefined, 
    aggregationStrategy
  );
}

/**
 * Quick function for row re-extraction
 */
export async function reExtractRow(
  projectId: string,
  documentId: string
) {
  return unifiedExtractionService.reExtractRow(projectId, documentId);
}

/**
 * Quick function for cell extraction
 */
export async function extractCell(
  projectId: string,
  documentId: string,
  columnId: string,
  customPrompt: string,
  notes?: string
) {
  return unifiedExtractionService.extractCell(
    projectId, 
    documentId, 
    columnId, 
    customPrompt, 
    notes
  );
}
