// lib/api/cell-extraction.ts
// NEW: API client functions for cell-level extraction (additive enhancement)

export interface CellExtractionRequest {
  projectId: string;
  documentId: string;
  columnId: string;
  customPrompt?: string;
  saveCustomPrompt?: boolean;
}

export interface CellCustomizationRequest {
  projectId: string;
  documentId: string;
  columnId: string;
  customPrompt?: string;
  notes?: string;
}

export interface CellExtractionResult {
  columnId: string;
  value: string;
  confidence: number;
  promptUsed: string;
  isCustomPrompt: boolean;
  extractedBy: {
    method: string;
    model: string;
    version: string;
  };
}

/**
 * Extract data from a specific cell with optional custom prompt
 */
export async function extractCell(
  request: CellExtractionRequest,
  token: string
): Promise<{
  success: boolean;
  data?: {
    result: CellExtractionResult;
    fileType: string;
    processingTimeMs: number;
  };
  error?: string;
}> {
  try {
    const response = await fetch("/api/extract-cell", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get cell customization information
 */
export async function getCellCustomization(
  projectId: string,
  documentId: string,
  columnId: string,
  token: string
): Promise<{
  success: boolean;
  data?: {
    columnId: string;
    columnName: string;
    defaultPrompt: string;
    effectivePrompt: string;
    isCustomized: boolean;
    cellCustomization: any;
    currentValue: string;
    confidence: number;
    lastExtracted: string | null;
  };
  error?: string;
}> {
  try {
    const params = new URLSearchParams({
      projectId,
      documentId,
      columnId,
    });

    const response = await fetch(`/api/cell-customization?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Set custom prompt for a cell
 */
export async function setCellCustomization(
  request: CellCustomizationRequest,
  token: string
): Promise<{
  success: boolean;
  data?: {
    columnId: string;
    customPrompt: string;
    isCustomized: boolean;
    customizedAt: string;
    customizedBy: string;
  };
  error?: string;
}> {
  try {
    const response = await fetch("/api/cell-customization", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update cell customization
 */
export async function updateCellCustomization(
  request: CellCustomizationRequest,
  token: string
): Promise<{
  success: boolean;
  data?: {
    columnId: string;
    updatedAt: string;
  };
  error?: string;
}> {
  try {
    const response = await fetch("/api/cell-customization", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Remove cell customization (revert to default)
 */
export async function removeCellCustomization(
  projectId: string,
  documentId: string,
  columnId: string,
  token: string
): Promise<{
  success: boolean;
  data?: {
    columnId: string;
    isCustomized: boolean;
    revertedAt: string;
  };
  error?: string;
}> {
  try {
    const params = new URLSearchParams({
      projectId,
      documentId,
      columnId,
    });

    const response = await fetch(`/api/cell-customization?${params}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Batch extract multiple cells
 */
export async function batchExtractCells(
  requests: CellExtractionRequest[],
  token: string
): Promise<{
  success: boolean;
  results: Array<{
    request: CellExtractionRequest;
    result?: CellExtractionResult;
    error?: string;
  }>;
}> {
  const results: Array<{
    request: CellExtractionRequest;
    result?: CellExtractionResult;
    error?: string;
  }> = [];

  // Process requests sequentially to avoid overwhelming the API
  for (const request of requests) {
    try {
      const response = await extractCell(request, token);
      
      if (response.success && response.data) {
        results.push({
          request,
          result: response.data.result,
        });
      } else {
        results.push({
          request,
          error: response.error || "Unknown error",
        });
      }
    } catch (error: any) {
      results.push({
        request,
        error: error.message,
      });
    }

    // Small delay between requests to be respectful to the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return {
    success: true,
    results,
  };
}

/**
 * Test custom prompt without saving
 */
export async function testCustomPrompt(
  request: CellExtractionRequest,
  token: string
): Promise<{
  success: boolean;
  data?: {
    result: CellExtractionResult;
    processingTimeMs: number;
  };
  error?: string;
}> {
  // Ensure we don't save the prompt when testing
  const testRequest = {
    ...request,
    saveCustomPrompt: false,
  };

  const response = await extractCell(testRequest, token);
  
  if (response.success && response.data) {
    return {
      success: true,
      data: {
        result: response.data.result,
        processingTimeMs: response.data.processingTimeMs,
      },
    };
  }

  return {
    success: false,
    error: response.error,
  };
}

/**
 * Get extraction statistics for a project with cell-level breakdown
 */
export async function getCellExtractionStats(
  projectId: string,
  token: string
): Promise<{
  success: boolean;
  data?: {
    totalCells: number;
    extractedCells: number;
    customizedCells: number;
    averageConfidence: number;
    customizationsByColumn: { [columnId: string]: number };
    documentsWithCustomizations: number;
  };
  error?: string;
}> {
  try {
    // This would typically be a dedicated endpoint, but for now we can
    // derive it from the documents endpoint
    const response = await fetch(`/api/projects/${projectId}/documents`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || "Failed to get documents");
    }

    // Calculate stats from documents
    const documents = data.data.documents;
    let totalCells = 0;
    let extractedCells = 0;
    let customizedCells = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;
    const customizationsByColumn: { [columnId: string]: number } = {};
    const documentsWithCustomizations = new Set();

    documents.forEach((document: any) => {
      if (!document.extractedData) return;

      Object.entries(document.extractedData).forEach(([columnId, extractedData]: [string, any]) => {
        totalCells++;

        if (extractedData.value) {
          extractedCells++;
        }

        if (extractedData.cellCustomization?.isCustomized) {
          customizedCells++;
          customizationsByColumn[columnId] = (customizationsByColumn[columnId] || 0) + 1;
          documentsWithCustomizations.add(document._id);
        }

        if (extractedData.confidence !== undefined) {
          totalConfidence += extractedData.confidence;
          confidenceCount++;
        }
      });
    });

    return {
      success: true,
      data: {
        totalCells,
        extractedCells,
        customizedCells,
        averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
        customizationsByColumn,
        documentsWithCustomizations: documentsWithCustomizations.size,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
