// lib/utils/extraction-client.ts
// Client-side utilities for unified extraction API calls

interface ExtractionColumn {
  columnId: string;
  customPrompt?: string;
  forceReextract?: boolean;
  aiModel?: string;
}

interface CellCustomization {
  documentId: string;
  columnId: string;
  customPrompt: string;
  notes?: string;
  aiModel?: string;
}

interface ExtractionOptions {
  forceReextract?: boolean;
  aiModel?: 'gpt-4o' | 'gpt-4' | 'claude-3';
  parallelProcessing?: boolean;
  includeConfidence?: boolean;
  includeMetadata?: boolean;
}

// Base extraction client class
export class ExtractionClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string = '', token: string = '') {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async makeRequest(payload: any) {
    const response = await fetch(`${this.baseUrl}/api/extract/unified`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ========================================
  // SCENARIO 1: INDEPENDENT DOCUMENT UPLOAD
  // ========================================
  async extractFromDocument(
    projectId: string,
    documentId: string,
    columns: ExtractionColumn[],
    options?: ExtractionOptions
  ) {
    const payload = {
      projectId,
      targets: [{
        type: 'document' as const,
        documentId,
        columns
      }],
      options,
      requestId: `doc_${documentId}_${Date.now()}`
    };

    console.log('📄 Extracting from independent document:', { documentId, columns: columns.length });
    return this.makeRequest(payload);
  }

  // ========================================
  // SCENARIO 2: COLLECTION DOCUMENT UPLOAD
  // ========================================
  async extractFromCollection(
    projectId: string,
    collectionId: string,
    documentIds: string[],
    columns: ExtractionColumn[],
    options?: ExtractionOptions & {
      aggregationStrategy?: 'concatenate' | 'summary' | 'smart';
    }
  ) {
    const payload = {
      projectId,
      targets: [{
        type: 'collection' as const,
        collectionId,
        documentIds,
        columns,
        targetOptions: {
          aggregationStrategy: options?.aggregationStrategy || 'smart',
          includeMetadata: true,
          preserveOrder: true
        }
      }],
      options,
      requestId: `collection_${collectionId}_${Date.now()}`
    };

    console.log('📁 Extracting from collection:', { collectionId, documents: documentIds.length, columns: columns.length });
    return this.makeRequest(payload);
  }

  // ========================================
  // SCENARIO 3: ROW RE-EXTRACTION
  // ========================================
  async reextractRow(
    projectId: string,
    documentId: string,
    columns: ExtractionColumn[],
    options?: ExtractionOptions
  ) {
    // Force re-extraction for all columns
    const forceColumns = columns.map(col => ({
      ...col,
      forceReextract: true
    }));

    const payload = {
      projectId,
      targets: [{
        type: 'row' as const,
        documentId,
        columns: forceColumns
      }],
      options: {
        ...options,
        forceReextract: true
      },
      requestId: `row_${documentId}_${Date.now()}`
    };

    console.log('🔄 Re-extracting row data:', { documentId, columns: columns.length });
    return this.makeRequest(payload);
  }

  // ========================================
  // SCENARIO 4: CELL CUSTOMIZATION
  // ========================================
  async customizeCell(
    projectId: string,
    cellCustomization: CellCustomization,
    options?: ExtractionOptions
  ) {
    const payload = {
      projectId,
      targets: [{
        type: 'cell' as const,
        documentId: cellCustomization.documentId,
        columnId: cellCustomization.columnId,
        cellCustomizations: [cellCustomization]
      }],
      options,
      requestId: `cell_${cellCustomization.documentId}_${cellCustomization.columnId}_${Date.now()}`
    };

    console.log('🎯 Customizing cell:', { 
      documentId: cellCustomization.documentId, 
      columnId: cellCustomization.columnId,
      customPrompt: cellCustomization.customPrompt.substring(0, 50) + '...'
    });
    return this.makeRequest(payload);
  }

  // ========================================
  // BATCH OPERATIONS
  // ========================================
  async batchExtract(
    projectId: string,
    targets: Array<{
      type: 'document' | 'collection' | 'row' | 'cell';
      documentId?: string;
      collectionId?: string;
      documentIds?: string[];
      columns?: ExtractionColumn[];
      columnId?: string;
      cellCustomizations?: CellCustomization[];
    }>,
    options?: ExtractionOptions
  ) {
    const payload = {
      projectId,
      targets,
      options: {
        ...options,
        parallelProcessing: true,
        batchSize: 5
      },
      requestId: `batch_${Date.now()}`
    };

    console.log('📦 Batch extraction:', { targets: targets.length });
    return this.makeRequest(payload);
  }
}

// ========================================
// CONVENIENCE FUNCTIONS
// ========================================

// Initialize client with current token
export function createExtractionClient(): ExtractionClient {
  // Get token from cookie or localStorage
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('access_token='))
    ?.split('=')[1] || '';

  return new ExtractionClient('', token);
}

// Scenario-specific helper functions
export const ExtractionHelpers = {
  // Scenario 1: Independent document
  document: (
    projectId: string,
    documentId: string,
    columns: ExtractionColumn[],
    options?: ExtractionOptions
  ) => createExtractionClient().extractFromDocument(projectId, documentId, columns, options),

  // Scenario 2: Collection
  collection: (
    projectId: string,
    collectionId: string,
    documentIds: string[],
    columns: ExtractionColumn[],
    options?: ExtractionOptions & { aggregationStrategy?: 'concatenate' | 'summary' | 'smart' }
  ) => createExtractionClient().extractFromCollection(projectId, collectionId, documentIds, columns, options),

  // Scenario 3: Row re-extraction
  row: (
    projectId: string,
    documentId: string,
    columns: ExtractionColumn[],
    options?: ExtractionOptions
  ) => createExtractionClient().reextractRow(projectId, documentId, columns, options),

  // Scenario 4: Cell customization
  cell: (
    projectId: string,
    cellCustomization: CellCustomization,
    options?: ExtractionOptions
  ) => createExtractionClient().customizeCell(projectId, cellCustomization, options),

  // Batch operations
  batch: (
    projectId: string,
    targets: any[],
    options?: ExtractionOptions
  ) => createExtractionClient().batchExtract(projectId, targets, options)
};

// ========================================
// PAYLOAD BUILDERS
// ========================================

export const PayloadBuilders = {
  // Build document extraction payload
  document: (projectId: string, documentId: string, columns: ExtractionColumn[]) => ({
    projectId,
    targets: [{
      type: 'document' as const,
      documentId,
      columns
    }],
    requestId: `doc_${documentId}_${Date.now()}`
  }),

  // Build collection extraction payload
  collection: (
    projectId: string, 
    collectionId: string, 
    documentIds: string[], 
    columns: ExtractionColumn[]
  ) => ({
    projectId,
    targets: [{
      type: 'collection' as const,
      collectionId,
      documentIds,
      columns,
      targetOptions: {
        aggregationStrategy: 'smart' as const,
        includeMetadata: true,
        preserveOrder: true
      }
    }],
    requestId: `collection_${collectionId}_${Date.now()}`
  }),

  // Build row re-extraction payload
  row: (projectId: string, documentId: string, columns: ExtractionColumn[]) => ({
    projectId,
    targets: [{
      type: 'row' as const,
      documentId,
      columns: columns.map(col => ({ ...col, forceReextract: true }))
    }],
    options: { forceReextract: true },
    requestId: `row_${documentId}_${Date.now()}`
  }),

  // Build cell customization payload
  cell: (projectId: string, cellCustomization: CellCustomization) => ({
    projectId,
    targets: [{
      type: 'cell' as const,
      documentId: cellCustomization.documentId,
      columnId: cellCustomization.columnId,
      cellCustomizations: [cellCustomization]
    }],
    requestId: `cell_${cellCustomization.documentId}_${cellCustomization.columnId}_${Date.now()}`
  })
};

// ========================================
// USAGE EXAMPLES
// ========================================

/*
// Example usage in your components:

import { ExtractionHelpers, PayloadBuilders } from '@/lib/utils/extraction-client';

// Scenario 1: Extract from independent document
const result1 = await ExtractionHelpers.document(
  "687653a8395848229071d69a",
  "doc123",
  [
    { columnId: "name", forceReextract: false },
    { columnId: "date", forceReextract: false }
  ]
);

// Scenario 2: Extract from collection
const result2 = await ExtractionHelpers.collection(
  "687653a8395848229071d69a",
  "687b64b495afe5e7304c3b1b",
  ["doc1", "doc2", "doc3"],
  [
    { columnId: "name", forceReextract: true },
    { columnId: "amount", forceReextract: false }
  ],
  { aggregationStrategy: 'smart' }
);

// Scenario 3: Re-extract row
const result3 = await ExtractionHelpers.row(
  "687653a8395848229071d69a",
  "doc123",
  [
    { columnId: "name" },
    { columnId: "date" }
  ]
);

// Scenario 4: Customize cell
const result4 = await ExtractionHelpers.cell(
  "687653a8395848229071d69a",
  {
    documentId: "doc123",
    columnId: "name",
    customPrompt: "Extract the full legal name including middle names and titles"
  }
);

// Or build payloads manually:
const payload = PayloadBuilders.document("projectId", "docId", columns);
const response = await fetch('/api/extract/unified', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
*/
