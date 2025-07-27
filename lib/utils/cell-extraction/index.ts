// lib/utils/cell-extraction/index.ts
// NEW: Utility functions for cell-level extraction (additive enhancement)

import { IDocument } from "@/lib/models/Document";

export interface CellExtractionOptions {
  projectId: string;
  documentId: string;
  columnId: string;
  customPrompt?: string;
  saveCustomPrompt?: boolean;
}

export interface CellCustomizationInfo {
  isCustomized: boolean;
  customPrompt?: string;
  originalPrompt?: string;
  confidence: number;
  lastExtracted?: Date;
  extractionHistory?: Array<{
    prompt: string;
    result: string;
    confidence: number;
    timestamp: Date;
    model?: string;
  }>;
}

/**
 * Check if a cell has a custom prompt
 */
export function isCellCustomized(document: any, columnId: string): boolean {
  const extractedData = document.extractedData?.[columnId];
  return extractedData?.cellCustomization?.isCustomized || false;
}

/**
 * Get the effective prompt for a cell (custom or default)
 */
export function getEffectivePrompt(
  document: any,
  columnId: string,
  defaultPrompt: string
): string {
  const extractedData = document.extractedData?.[columnId];
  
  if (extractedData?.cellCustomization?.isCustomized && 
      extractedData.cellCustomization.customPrompt) {
    return extractedData.cellCustomization.customPrompt;
  }
  
  return defaultPrompt;
}

/**
 * Get cell customization information
 */
export function getCellCustomizationInfo(
  document: any,
  columnId: string,
  defaultPrompt: string
): CellCustomizationInfo {
  const extractedData = document.extractedData?.[columnId];
  const customization = extractedData?.cellCustomization;
  
  return {
    isCustomized: customization?.isCustomized || false,
    customPrompt: customization?.customPrompt,
    originalPrompt: customization?.originalPrompt || defaultPrompt,
    confidence: extractedData?.confidence || 0,
    lastExtracted: extractedData?.extractedAt ? new Date(extractedData.extractedAt) : undefined,
    extractionHistory: customization?.extractionHistory || [],
  };
}

/**
 * Get all customized cells for a document
 */
export function getCustomizedCells(document: any): { [columnId: string]: CellCustomizationInfo } {
  const customizedCells: { [columnId: string]: CellCustomizationInfo } = {};
  
  if (!document.extractedData) return customizedCells;
  
  for (const [columnId, data] of Object.entries(document.extractedData)) {
    const extractedData = data as any;
    if (extractedData.cellCustomization?.isCustomized) {
      customizedCells[columnId] = {
        isCustomized: true,
        customPrompt: extractedData.cellCustomization.customPrompt,
        originalPrompt: extractedData.cellCustomization.originalPrompt,
        confidence: extractedData.confidence || 0,
        lastExtracted: extractedData.extractedAt ? new Date(extractedData.extractedAt) : undefined,
        extractionHistory: extractedData.cellCustomization.extractionHistory || [],
      };
    }
  }
  
  return customizedCells;
}

/**
 * Count customized cells in a project
 */
export function countCustomizedCells(documents: any[]): {
  totalCustomizations: number;
  documentsWithCustomizations: number;
  customizationsByColumn: { [columnId: string]: number };
} {
  const customizationsByColumn: { [columnId: string]: number } = {};
  let totalCustomizations = 0;
  let documentsWithCustomizations = 0;
  
  documents.forEach(document => {
    const customizedCells = getCustomizedCells(document);
    const hasCustomizations = Object.keys(customizedCells).length > 0;
    
    if (hasCustomizations) {
      documentsWithCustomizations++;
    }
    
    Object.keys(customizedCells).forEach(columnId => {
      customizationsByColumn[columnId] = (customizationsByColumn[columnId] || 0) + 1;
      totalCustomizations++;
    });
  });
  
  return {
    totalCustomizations,
    documentsWithCustomizations,
    customizationsByColumn,
  };
}

/**
 * Generate cell extraction statistics
 */
export function getCellExtractionStats(documents: any[], columnId?: string) {
  const stats = {
    totalCells: 0,
    extractedCells: 0,
    customizedCells: 0,
    highConfidenceCells: 0,
    mediumConfidenceCells: 0,
    lowConfidenceCells: 0,
    averageConfidence: 0,
  };
  
  let totalConfidence = 0;
  let confidenceCount = 0;
  
  documents.forEach(document => {
    if (!document.extractedData) return;
    
    const columnsToCheck = columnId ? [columnId] : Object.keys(document.extractedData);
    
    columnsToCheck.forEach(colId => {
      const extractedData = document.extractedData[colId];
      if (!extractedData) return;
      
      stats.totalCells++;
      
      if (extractedData.value) {
        stats.extractedCells++;
      }
      
      if (extractedData.cellCustomization?.isCustomized) {
        stats.customizedCells++;
      }
      
      const confidence = extractedData.confidence || 0;
      totalConfidence += confidence;
      confidenceCount++;
      
      if (confidence >= 0.8) {
        stats.highConfidenceCells++;
      } else if (confidence >= 0.5) {
        stats.mediumConfidenceCells++;
      } else {
        stats.lowConfidenceCells++;
      }
    });
  });
  
  stats.averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
  
  return stats;
}

/**
 * Validate custom prompt
 */
export function validateCustomPrompt(prompt: string): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  if (!prompt.trim()) {
    errors.push("Prompt cannot be empty");
    return { isValid: false, errors, suggestions };
  }
  
  if (prompt.length < 10) {
    errors.push("Prompt is too short (minimum 10 characters)");
  }
  
  if (prompt.length > 1000) {
    errors.push("Prompt is too long (maximum 1000 characters)");
  }
  
  // Check for common issues
  if (!prompt.toLowerCase().includes("extract")) {
    suggestions.push("Consider including the word 'extract' to be more specific");
  }
  
  if (prompt.split(" ").length < 5) {
    suggestions.push("More detailed prompts typically yield better results");
  }
  
  // Check for good prompt patterns
  const goodPatterns = [
    /find|locate|identify|extract/i,
    /document|text|image|page/i,
    /from|in|at|near/i,
  ];
  
  const hasGoodPatterns = goodPatterns.some(pattern => pattern.test(prompt));
  if (!hasGoodPatterns) {
    suggestions.push("Consider being more specific about what to extract and where to look");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    suggestions,
  };
}

/**
 * Generate prompt suggestions based on column type
 */
export function generatePromptSuggestions(columnType: string, columnName: string): string[] {
  const basePrompts: { [key: string]: string[] } = {
    text: [
      `Extract the ${columnName.toLowerCase()} from this document`,
      `Find and return the ${columnName.toLowerCase()} field`,
      `Locate the ${columnName.toLowerCase()} value in the text`,
    ],
    date: [
      `Extract the ${columnName.toLowerCase()} in YYYY-MM-DD format`,
      `Find the ${columnName.toLowerCase()} and format as a date`,
      `Locate the ${columnName.toLowerCase()} date field`,
    ],
    price: [
      `Extract the ${columnName.toLowerCase()} as a numeric value`,
      `Find the ${columnName.toLowerCase()} amount without currency symbols`,
      `Locate the ${columnName.toLowerCase()} price value`,
    ],
    person: [
      `Extract the full name for ${columnName.toLowerCase()}`,
      `Find the person's name for ${columnName.toLowerCase()}`,
      `Locate and return the ${columnName.toLowerCase()} name`,
    ],
    organization: [
      `Extract the company or organization name for ${columnName.toLowerCase()}`,
      `Find the organization mentioned as ${columnName.toLowerCase()}`,
      `Locate the business name for ${columnName.toLowerCase()}`,
    ],
    location: [
      `Extract the address or location for ${columnName.toLowerCase()}`,
      `Find the geographic location for ${columnName.toLowerCase()}`,
      `Locate the place or address mentioned as ${columnName.toLowerCase()}`,
    ],
  };
  
  return basePrompts[columnType] || basePrompts.text;
}

/**
 * Format extraction history for display
 */
export function formatExtractionHistory(history: any[]) {
  return history.map(entry => ({
    ...entry,
    formattedTimestamp: new Date(entry.timestamp).toLocaleString(),
    confidencePercent: Math.round(entry.confidence * 100),
    promptPreview: entry.prompt.length > 100 ? 
      entry.prompt.substring(0, 100) + "..." : 
      entry.prompt,
  }));
}

/**
 * Export cell customizations for backup/restore
 */
export function exportCellCustomizations(documents: any[]) {
  const customizations: any = {};
  
  documents.forEach(document => {
    const customizedCells = getCustomizedCells(document);
    if (Object.keys(customizedCells).length > 0) {
      customizations[document._id] = customizedCells;
    }
  });
  
  return {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    totalDocuments: documents.length,
    documentsWithCustomizations: Object.keys(customizations).length,
    customizations,
  };
}
