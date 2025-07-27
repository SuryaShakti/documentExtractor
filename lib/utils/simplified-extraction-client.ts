import {
  SimplifiedExtractionPayload,
  SimplifiedExtractionResponse,
  ExtractionRequest,
  ColumnConfig,
  GlobalExtractionOptions,
  ValidationRules,
  AggregationStrategy
} from '@/lib/types/simplified-extraction';

/**
 * Simplified Extraction API Client
 * 
 * Makes it easy to call the new unified extraction API with your preferred payload format.
 * Supports all 4 scenarios: document, collection, row re-extraction, and cell customization.
 */
export class SimplifiedExtractionClient {
  private baseUrl: string;
  private getAuthToken: () => string | null;

  constructor(baseUrl: string = '', getAuthToken?: () => string | null) {
    this.baseUrl = baseUrl;
    this.getAuthToken = getAuthToken || (() => {
      // Try to get token from cookie as fallback
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        return cookies.access_token || null;
      }
      return null;
    });
  }

  /**
   * Scenario 1: Extract data from a single document
   */
  async extractSingleDocument(
    projectId: string,
    documentId: string,
    columns: Array<{
      columnId: string;
      customPrompt?: string;
      forceReextract?: boolean;
    }>,
    options?: {
      forceReextract?: boolean;
      globalOptions?: GlobalExtractionOptions;
    }
  ): Promise<SimplifiedExtractionResponse> {
    const payload: SimplifiedExtractionPayload = {
      projectId,
      extractions: [
        {
          document: {
            id: documentId,
            columns: columns.map(col => ({
              columnId: col.columnId,
              customPrompt: col.customPrompt,
              forceReextract: col.forceReextract
            })),
            forceReextract: options?.forceReextract
          }
        }
      ],
      globalOptions: options?.globalOptions
    };

    return this.makeRequest(payload);
  }

  /**
   * Scenario 2: Extract data from document collection (your main use case)
   */
  async extractDocumentCollection(
    projectId: string,
    collectionId: string,
    columns: Array<{
      columnId: string;
      customPrompt?: string;
      forceReextract?: boolean;
    }>,
    options?: {
      docIds?: string[];
      aggregationStrategy?: AggregationStrategy;
      forceReextract?: boolean;
      globalOptions?: GlobalExtractionOptions;
    }
  ): Promise<SimplifiedExtractionResponse> {
    const payload: SimplifiedExtractionPayload = {
      projectId,
      extractions: [
        {
          documentCollection: {
            id: collectionId,
            docIds: options?.docIds,
            columns: columns.map(col => ({
              columnId: col.columnId,
              customPrompt: col.customPrompt,
              forceReextract: col.forceReextract
            })),
            aggregationStrategy: options?.aggregationStrategy || 'concatenate',
            forceReextract: options?.forceReextract
          }
        }
      ],
      globalOptions: options?.globalOptions
    };

    return this.makeRequest(payload);
  }

  /**
   * Scenario 3: Re-extract entire row (all or specified columns for a document)
   */
  async reextractRow(
    projectId: string,
    documentId: string,
    options?: {
      columns?: Array<{
        columnId: string;
        customPrompt?: string;
      }>;
      globalOptions?: GlobalExtractionOptions;
    }
  ): Promise<SimplifiedExtractionResponse> {
    const payload: SimplifiedExtractionPayload = {
      projectId,
      extractions: [
        {
          rowReextraction: {
            documentId,
            columns: options?.columns?.map(col => ({
              columnId: col.columnId,
              customPrompt: col.customPrompt,
              forceReextract: true
            })),
            forceReextract: true
          }
        }
      ],
      globalOptions: options?.globalOptions
    };

    return this.makeRequest(payload);
  }

  /**
   * Scenario 4: Customize single cell with custom prompt
   */
  async customizeCell(
    projectId: string,
    documentId: string,
    columnId: string,
    customPrompt: string,
    options?: {
      notes?: string;
      validationRules?: ValidationRules;
      aiModel?: string;
      globalOptions?: GlobalExtractionOptions;
    }
  ): Promise<SimplifiedExtractionResponse> {
    const payload: SimplifiedExtractionPayload = {
      projectId,
      extractions: [
        {
          cellCustomization: {
            documentId,
            columnId,
            customPrompt,
            notes: options?.notes,
            validationRules: options?.validationRules,
            aiModel: options?.aiModel
          }
        }
      ],
      globalOptions: options?.globalOptions
    };

    return this.makeRequest(payload);
  }

  /**
   * Advanced: Submit multiple extraction requests in one call
   */
  async extractMultiple(
    projectId: string,
    extractions: ExtractionRequest[],
    globalOptions?: GlobalExtractionOptions
  ): Promise<SimplifiedExtractionResponse> {
    const payload: SimplifiedExtractionPayload = {
      projectId,
      extractions,
      globalOptions
    };

    return this.makeRequest(payload);
  }

  /**
   * Utility: Re-create your current collection extraction call
   */
  async extractCollectionLikeCurrent(
    projectId: string,
    collectionId: string,
    forceReextract: boolean = false
  ): Promise<SimplifiedExtractionResponse> {
    // This replicates your current curl call format
    return this.extractDocumentCollection(
      projectId,
      collectionId,
      [], // Empty columns means use all project columns
      {
        forceReextract,
        aggregationStrategy: 'concatenate',
        globalOptions: {
          aiModel: 'gpt-4o',
          includeConfidence: true,
          includeMetadata: true
        }
      }
    );
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest(payload: SimplifiedExtractionPayload): Promise<SimplifiedExtractionResponse> {
    const token = this.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    console.log('🚀 Making simplified extraction request:', {
      projectId: payload.projectId,
      extractionsCount: payload.extractions.length,
      scenarios: payload.extractions.map(e => Object.keys(e)[0])
    });

    const response = await fetch(`${this.baseUrl}/api/extract/simplified`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Extraction request failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`);
    }

    const result: SimplifiedExtractionResponse = await response.json();
    
    console.log('✅ Extraction completed:', {
      success: result.success,
      totalExtractions: result.stats.totalExtractions,
      successfulExtractions: result.stats.successfulExtractions,
      processingTimeMs: result.stats.processingTimeMs
    });

    return result;
  }
}

// ========================================
// CONVENIENCE FUNCTIONS
// ========================================

/**
 * Quick helper to extract from document collection (your main use case)
 */
export async function extractFromCollection(
  projectId: string,
  collectionId: string,
  options?: {
    columns?: string[]; // Just column IDs
    docIds?: string[];
    forceReextract?: boolean;
    aggregationStrategy?: AggregationStrategy;
  }
): Promise<SimplifiedExtractionResponse> {
  const client = new SimplifiedExtractionClient();
  
  const columns = options?.columns?.map(columnId => ({ columnId })) || [];
  
  return client.extractDocumentCollection(projectId, collectionId, columns, {
    docIds: options?.docIds,
    forceReextract: options?.forceReextract,
    aggregationStrategy: options?.aggregationStrategy,
    globalOptions: {
      aiModel: 'gpt-4o',
      includeConfidence: true
    }
  });
}

/**
 * Quick helper to customize a single cell
 */
export async function customizeCell(
  projectId: string,
  documentId: string,
  columnId: string,
  customPrompt: string
): Promise<SimplifiedExtractionResponse> {
  const client = new SimplifiedExtractionClient();
  
  return client.customizeCell(projectId, documentId, columnId, customPrompt, {
    globalOptions: {
      aiModel: 'gpt-4o',
      includeConfidence: true,
      includeMetadata: true
    }
  });
}

/**
 * Quick helper to re-extract entire document row
 */
export async function reextractDocument(
  projectId: string,
  documentId: string,
  columns?: string[]
): Promise<SimplifiedExtractionResponse> {
  const client = new SimplifiedExtractionClient();
  
  const columnConfigs = columns?.map(columnId => ({ columnId }));
  
  return client.reextractRow(projectId, documentId, {
    columns: columnConfigs,
    globalOptions: {
      aiModel: 'gpt-4o',
      includeConfidence: true
    }
  });
}

// ========================================
// USAGE EXAMPLES IN YOUR COMPONENTS
// ========================================

/*
// In your React component:

import { SimplifiedExtractionClient, extractFromCollection } from '@/lib/utils/simplified-extraction-client';

// Option 1: Use the client directly
const client = new SimplifiedExtractionClient();

const handleExtractCollection = async () => {
  try {
    const result = await client.extractDocumentCollection(
      '687653a8395848229071d69a', // your project ID
      '687b64b495afe5e7304c3b1b', // your collection ID  
      [
        { columnId: 'document_title' },
        { columnId: 'amount', customPrompt: 'Extract any price or monetary value' }
      ],
      {
        forceReextract: false,
        aggregationStrategy: 'concatenate'
      }
    );
    
    console.log('Extraction results:', result);
  } catch (error) {
    console.error('Extraction failed:', error);
  }
};

// Option 2: Use convenience function
const handleQuickExtract = async () => {
  try {
    const result = await extractFromCollection(
      '687653a8395848229071d69a',
      '687b64b495afe5e7304c3b1b',
      {
        columns: ['document_title', 'amount'],
        forceReextract: false
      }
    );
    
    console.log('Quick extraction results:', result);
  } catch (error) {
    console.error('Quick extraction failed:', error);
  }
};

// Option 3: Cell customization
const handleCustomizeCell = async () => {
  try {
    const result = await customizeCell(
      '687653a8395848229071d69a',
      'document-id-here',
      'document_title',
      'Extract only the main heading, ignore any subtitles or watermarks'
    );
    
    console.log('Cell customization results:', result);
  } catch (error) {
    console.error('Cell customization failed:', error);
  }
};
*/

export default SimplifiedExtractionClient;
