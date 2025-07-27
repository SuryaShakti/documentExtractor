// lib/utils/extraction-payloads.ts
// Unified payload generator for all extraction scenarios based on PDF specification

export interface ColumnConfig {
  columnId: string;
  type?: 'text' | 'date' | 'price' | 'location' | 'person' | 'organization' | 'status' | 'collection';
  prompt?: string;
  aiModel?: string;
  customPrompt?: string;
  forceReextract?: boolean;
}

export interface SimplifiedExtractionPayload {
  projectId: string;
  extractions: ExtractionRequest[];
  globalOptions?: GlobalExtractionOptions;
}

export interface ExtractionRequest {
  documentCollection?: {
    id: string;
    docIds?: string[];
    columns: ColumnConfig[];
    aggregationStrategy?: 'concatenate' | 'summary' | 'list' | 'smart';
    forceReextract?: boolean;
  };
}

export interface GlobalExtractionOptions {
  aiModel?: 'gpt-4o' | 'gpt-4' | 'claude-3';
  parallelProcessing?: boolean;
  includeConfidence?: boolean;
  includeMetadata?: boolean;
  includeDebugInfo?: boolean;
}

/**
 * Scenario 1: Single Document Extraction
 * Extract data from one document in a collection
 */
export function generateSingleDocumentPayload(
  projectId: string,
  documentId: string,
  columns: ColumnConfig[],
  options?: {
    aggregationStrategy?: 'concatenate' | 'summary' | 'list' | 'smart';
    forceReextract?: boolean;
    aiModel?: string;
  }
): SimplifiedExtractionPayload {
  const payload: SimplifiedExtractionPayload = {
    projectId,
    extractions: [
      {
        documentCollection: {
          id: `coll_single_${documentId}`,
          docIds: [documentId],
          columns: columns.map(col => ({
            columnId: col.columnId,
            type: col.type || 'text',
            prompt: col.prompt || `Extract ${col.columnId} from the document`,
            aiModel: col.aiModel || options?.aiModel || 'gpt-4o'
          })),
          aggregationStrategy: options?.aggregationStrategy || 'smart',
          forceReextract: options?.forceReextract || false
        }
      }
    ],
    globalOptions: {
      aiModel: (options?.aiModel as any) || 'gpt-4o',
      includeConfidence: true,
      includeMetadata: true
    }
  };

  console.log('📄 SCENARIO 1: Single Document Extraction');
  console.log('🎯 Payload:', JSON.stringify(payload, null, 2));
  
  return payload;
}

/**
 * Scenario 2: Multiple Documents Collection Extraction
 * Extract data from multiple documents in a collection
 */
export function generateCollectionExtractionPayload(
  projectId: string,
  collectionId: string,
  documentIds: string[],
  columns: ColumnConfig[],
  options?: {
    aggregationStrategy?: 'concatenate' | 'summary' | 'list' | 'smart';
    forceReextract?: boolean;
    parallelProcessing?: boolean;
    aiModel?: string;
  }
): SimplifiedExtractionPayload {
  const payload: SimplifiedExtractionPayload = {
    projectId,
    extractions: [
      {
        documentCollection: {
          id: collectionId,
          docIds: documentIds,
          columns: columns.map(col => ({
            columnId: col.columnId,
            type: col.type || 'text',
            prompt: col.prompt || `Extract ${col.columnId} from the document`,
            aiModel: col.aiModel || options?.aiModel || 'gpt-4o'
          })),
          aggregationStrategy: options?.aggregationStrategy || 'list',
          forceReextract: options?.forceReextract || false
        }
      }
    ],
    globalOptions: {
      aiModel: (options?.aiModel as any) || 'gpt-4o',
      parallelProcessing: options?.parallelProcessing || true,
      includeConfidence: true,
      includeMetadata: true
    }
  };

  console.log('📁 SCENARIO 2: Multiple Documents Collection Extraction');
  console.log('🎯 Payload:', JSON.stringify(payload, null, 2));
  
  return payload;
}

/**
 * Scenario 3: Row Re-extraction (All columns for one document)
 * Re-extract all columns for a specific document
 */
export function generateRowReextractionPayload(
  projectId: string,
  documentId: string,
  columns: ColumnConfig[],
  options?: {
    aggregationStrategy?: 'concatenate' | 'summary' | 'list' | 'smart';
    aiModel?: string;
  }
): SimplifiedExtractionPayload {
  const payload: SimplifiedExtractionPayload = {
    projectId,
    extractions: [
      {
        documentCollection: {
          id: `coll_reextract_${documentId}`,
          docIds: [documentId],
          columns: columns.map(col => ({
            columnId: col.columnId,
            type: col.type || 'text',
            prompt: col.prompt || `Extract ${col.columnId} from the document`,
            aiModel: col.aiModel || options?.aiModel || 'gpt-4o'
          })),
          aggregationStrategy: options?.aggregationStrategy || 'smart',
          forceReextract: true // Always force for row re-extraction
        }
      }
    ],
    globalOptions: {
      aiModel: (options?.aiModel as any) || 'gpt-4o',
      includeConfidence: true,
      includeMetadata: true
    }
  };

  console.log('🔄 SCENARIO 3: Row Re-extraction (All columns for one document)');
  console.log('🎯 Payload:', JSON.stringify(payload, null, 2));
  
  return payload;
}

/**
 * Scenario 4: Cell Customization (Custom prompt for specific column)
 * Extract one specific cell with custom prompt
 */
export function generateCellCustomizationPayload(
  projectId: string,
  documentId: string,
  columnId: string,
  customPrompt: string,
  options?: {
    aiModel?: string;
    notes?: string;
  }
): SimplifiedExtractionPayload {
  const payload: SimplifiedExtractionPayload = {
    projectId,
    extractions: [
      {
        documentCollection: {
          id: `coll_cell_custom_${documentId}`,
          docIds: [documentId],
          columns: [
            {
              columnId,
              type: 'text', // Will be determined by column config
              prompt: customPrompt,
              aiModel: options?.aiModel || 'gpt-4o',
              customPrompt: true as any,
              forceReextract: true
            }
          ],
          aggregationStrategy: 'smart',
          forceReextract: true
        }
      }
    ],
    globalOptions: {
      aiModel: (options?.aiModel as any) || 'gpt-4o',
      includeConfidence: true,
      includeMetadata: true,
      includeDebugInfo: true
    }
  };

  console.log('🎯 SCENARIO 4: Cell Customization (Custom prompt for specific column)');
  console.log(`📝 Custom prompt: "${customPrompt}"`);
  console.log(`📄 Document: ${documentId}, Column: ${columnId}`);
  console.log('🎯 Payload:', JSON.stringify(payload, null, 2));
  
  return payload;
}

/**
 * Scenario 5: Mixed Multiple Collections
 * Extract from multiple collections with different strategies
 */
export function generateMixedCollectionsPayload(
  projectId: string,
  collections: Array<{
    id: string;
    name: string;
    docIds: string[];
    columns: ColumnConfig[];
    aggregationStrategy?: 'concatenate' | 'summary' | 'list' | 'smart';
    forceReextract?: boolean;
  }>,
  options?: {
    parallelProcessing?: boolean;
    aiModel?: string;
  }
): SimplifiedExtractionPayload {
  const payload: SimplifiedExtractionPayload = {
    projectId,
    extractions: collections.map(collection => ({
      documentCollection: {
        id: collection.id,
        docIds: collection.docIds,
        columns: collection.columns.map(col => ({
          columnId: col.columnId,
          type: col.type || 'text',
          prompt: col.prompt || `Extract ${col.columnId} from the document`,
          aiModel: col.aiModel || options?.aiModel || 'gpt-4o'
        })),
        aggregationStrategy: collection.aggregationStrategy || 'list',
        forceReextract: collection.forceReextract || false
      }
    })),
    globalOptions: {
      aiModel: (options?.aiModel as any) || 'gpt-4o',
      parallelProcessing: options?.parallelProcessing || true,
      includeConfidence: true,
      includeMetadata: true
    }
  };

  console.log('🔄 SCENARIO 5: Mixed Multiple Collections');
  console.log(`📊 Processing ${collections.length} collections`);
  collections.forEach((coll, index) => {
    console.log(`   ${index + 1}. ${coll.name}: ${coll.docIds.length} docs, ${coll.columns.length} columns`);
  });
  console.log('🎯 Payload:', JSON.stringify(payload, null, 2));
  
  return payload;
}

/**
 * Utility: Get columns configuration from project
 */
export function getProjectColumns(
  project: any,
  excludeSystemColumns = true
): ColumnConfig[] {
  if (!project?.gridConfiguration?.columnDefs) return [];

  const columnDefs = project.gridConfiguration.columnDefs;
  const columns: ColumnConfig[] = [];

  // Handle both Map and Object formats
  const entries = columnDefs instanceof Map 
    ? Array.from(columnDefs.entries())
    : Object.entries(columnDefs);

  for (const [columnId, columnDef] of entries) {
    // Skip system columns if requested
    if (excludeSystemColumns && (columnId === 'index' || columnId === 'filename')) {
      continue;
    }

    // Only include columns with extraction enabled
    const customProps = (columnDef as any).customProperties;
    if (customProps?.extraction?.enabled && customProps?.extraction?.status === 'active') {
      columns.push({
        columnId,
        type: customProps.type,
        prompt: customProps.prompt,
        aiModel: customProps.aiModel
      });
    }
  }

  return columns;
}

/**
 * Utility: Get document IDs from collection
 */
export function getDocumentIdsFromCollection(collection: any): string[] {
  if (!collection) return [];
  
  // Handle different collection formats
  if (collection.documents && Array.isArray(collection.documents)) {
    return collection.documents.map((doc: any) => doc._id || doc.id);
  }
  
  if (collection.docIds && Array.isArray(collection.docIds)) {
    return collection.docIds;
  }
  
  return [];
}

/**
 * Main function to generate payload based on scenario
 */
export function generateExtractionPayload(
  scenario: 'single-document' | 'collection' | 'row-reextraction' | 'cell-customization' | 'mixed-collections',
  params: any
): SimplifiedExtractionPayload {
  switch (scenario) {
    case 'single-document':
      return generateSingleDocumentPayload(
        params.projectId,
        params.documentId,
        params.columns,
        params.options
      );
      
    case 'collection':
      return generateCollectionExtractionPayload(
        params.projectId,
        params.collectionId,
        params.documentIds,
        params.columns,
        params.options
      );
      
    case 'row-reextraction':
      return generateRowReextractionPayload(
        params.projectId,
        params.documentId,
        params.columns,
        params.options
      );
      
    case 'cell-customization':
      return generateCellCustomizationPayload(
        params.projectId,
        params.documentId,
        params.columnId,
        params.customPrompt,
        params.options
      );
      
    case 'mixed-collections':
      return generateMixedCollectionsPayload(
        params.projectId,
        params.collections,
        params.options
      );
      
    default:
      throw new Error(`Unknown extraction scenario: ${scenario}`);
  }
}
