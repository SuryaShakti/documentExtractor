import { useState, useCallback } from 'react';
import { SimplifiedExtractionClient } from '@/lib/utils/simplified-extraction-client';
import { useToast } from '@/hooks/use-toast';

/**
 * React hook for using the simplified extraction API
 * 
 * This hook provides easy access to all 4 extraction scenarios with proper loading states and error handling.
 */
export function useSimplifiedExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();

  const client = new SimplifiedExtractionClient();

  /**
   * Extract from document collection (your main use case)
   */
  const extractFromCollection = useCallback(async (
    projectId: string,
    collectionId: string,
    options?: {
      columns?: string[];
      docIds?: string[];
      forceReextract?: boolean;
      aggregationStrategy?: 'concatenate' | 'summary' | 'list' | 'smart';
    }
  ) => {
    if (isExtracting) {
      toast({
        title: "Extraction in progress",
        description: "Please wait for the current extraction to complete.",
        variant: "default"
      });
      return null;
    }

    setIsExtracting(true);
    setExtractionProgress(0);
    setLastResult(null);

    try {
      // Start progress simulation
      const progressInterval = setInterval(() => {
        setExtractionProgress(prev => {
          if (prev === null) return 10;
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 1000);

      console.log('🚀 Starting collection extraction with simplified API', {
        projectId,
        collectionId,
        options
      });

      const columns = options?.columns?.map(columnId => ({ columnId })) || [];
      
      const result = await client.extractDocumentCollection(
        projectId,
        collectionId,
        columns,
        {
          docIds: options?.docIds,
          forceReextract: options?.forceReextract,
          aggregationStrategy: options?.aggregationStrategy,
          globalOptions: {
            aiModel: 'gpt-4o',
            includeConfidence: true,
            includeMetadata: true
          }
        }
      );

      clearInterval(progressInterval);
      setExtractionProgress(100);
      setLastResult(result);

      if (result.success) {
        toast({
          title: "Extraction completed!",
          description: `Successfully extracted data from ${result.stats.successfulExtractions}/${result.stats.totalExtractions} targets in ${result.stats.processingTimeMs}ms`,
          variant: "default"
        });
      } else {
        toast({
          title: "Extraction failed",
          description: result.errors?.[0] || "Unknown error occurred",
          variant: "destructive"
        });
      }

      // Reset progress after delay
      setTimeout(() => {
        setExtractionProgress(null);
      }, 2000);

      return result;

    } catch (error: any) {
      console.error('❌ Collection extraction failed:', error);
      
      toast({
        title: "Extraction failed",
        description: error.message || "Failed to extract data from collection",
        variant: "destructive"
      });

      setLastResult({
        success: false,
        error: error.message
      });

      return null;

    } finally {
      setIsExtracting(false);
    }
  }, [isExtracting, client, toast]);

  /**
   * Extract from single document
   */
  const extractFromDocument = useCallback(async (
    projectId: string,
    documentId: string,
    columns: Array<{ columnId: string; customPrompt?: string }>,
    options?: {
      forceReextract?: boolean;
    }
  ) => {
    if (isExtracting) return null;

    setIsExtracting(true);
    setExtractionProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setExtractionProgress(prev => {
          if (prev === null) return 10;
          if (prev >= 90) return prev;
          return prev + Math.random() * 20;
        });
      }, 800);

      console.log('🚀 Starting document extraction with simplified API', {
        projectId,
        documentId,
        columns: columns.length
      });

      const result = await client.extractSingleDocument(
        projectId,
        documentId,
        columns,
        {
          forceReextract: options?.forceReextract,
          globalOptions: {
            aiModel: 'gpt-4o',
            includeConfidence: true,
            includeMetadata: true
          }
        }
      );

      clearInterval(progressInterval);
      setExtractionProgress(100);
      setLastResult(result);

      if (result.success) {
        toast({
          title: "Document extraction completed!",
          description: `Successfully extracted ${columns.length} columns`,
          variant: "default"
        });
      } else {
        toast({
          title: "Document extraction failed",
          description: result.errors?.[0] || "Unknown error occurred",
          variant: "destructive"
        });
      }

      setTimeout(() => setExtractionProgress(null), 2000);
      return result;

    } catch (error: any) {
      console.error('❌ Document extraction failed:', error);
      
      toast({
        title: "Extraction failed",
        description: error.message || "Failed to extract data from document",
        variant: "destructive"
      });

      return null;
    } finally {
      setIsExtracting(false);
    }
  }, [isExtracting, client, toast]);

  /**
   * Re-extract entire row (all columns for a document)
   */
  const reextractRow = useCallback(async (
    projectId: string,
    documentId: string,
    columns?: string[]
  ) => {
    if (isExtracting) return null;

    setIsExtracting(true);
    setExtractionProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setExtractionProgress(prev => {
          if (prev === null) return 15;
          if (prev >= 85) return prev;
          return prev + Math.random() * 25;
        });
      }, 600);

      console.log('🚀 Starting row re-extraction with simplified API', {
        projectId,
        documentId,
        columns: columns?.length || 'all'
      });

      const columnConfigs = columns?.map(columnId => ({ columnId }));

      const result = await client.reextractRow(
        projectId,
        documentId,
        {
          columns: columnConfigs,
          globalOptions: {
            aiModel: 'gpt-4o',
            includeConfidence: true,
            includeDebugInfo: true
          }
        }
      );

      clearInterval(progressInterval);
      setExtractionProgress(100);
      setLastResult(result);

      if (result.success) {
        const extractedColumns = Object.keys(result.results[0]?.data || {}).length;
        toast({
          title: "Row re-extraction completed!",
          description: `Successfully re-extracted ${extractedColumns} columns`,
          variant: "default"
        });
      } else {
        toast({
          title: "Row re-extraction failed",
          description: result.errors?.[0] || "Unknown error occurred",
          variant: "destructive"
        });
      }

      setTimeout(() => setExtractionProgress(null), 2000);
      return result;

    } catch (error: any) {
      console.error('❌ Row re-extraction failed:', error);
      
      toast({
        title: "Re-extraction failed",
        description: error.message || "Failed to re-extract document row",
        variant: "destructive"
      });

      return null;
    } finally {
      setIsExtracting(false);
    }
  }, [isExtracting, client, toast]);

  /**
   * Customize single cell with custom prompt
   */
  const customizeCell = useCallback(async (
    projectId: string,
    documentId: string,
    columnId: string,
    customPrompt: string,
    options?: {
      notes?: string;
      validationRules?: any;
      aiModel?: string;
    }
  ) => {
    if (isExtracting) return null;

    setIsExtracting(true);
    setExtractionProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setExtractionProgress(prev => {
          if (prev === null) return 20;
          if (prev >= 80) return prev;
          return prev + Math.random() * 30;
        });
      }, 500);

      console.log('🚀 Starting cell customization with simplified API', {
        projectId,
        documentId,
        columnId,
        customPrompt: customPrompt.substring(0, 50) + '...'
      });

      const result = await client.customizeCell(
        projectId,
        documentId,
        columnId,
        customPrompt,
        {
          notes: options?.notes,
          validationRules: options?.validationRules,
          aiModel: options?.aiModel,
          globalOptions: {
            aiModel: 'gpt-4o',
            includeConfidence: true,
            includeMetadata: true
          }
        }
      );

      clearInterval(progressInterval);
      setExtractionProgress(100);
      setLastResult(result);

      if (result.success) {
        const cellData = result.results[0]?.data?.[columnId];
        toast({
          title: "Cell customization completed!",
          description: `Extracted: "${cellData?.value || 'No value'}" (confidence: ${Math.round((cellData?.confidence || 0) * 100)}%)`,
          variant: "default"
        });
      } else {
        toast({
          title: "Cell customization failed",
          description: result.errors?.[0] || "Unknown error occurred",
          variant: "destructive"
        });
      }

      setTimeout(() => setExtractionProgress(null), 2000);
      return result;

    } catch (error: any) {
      console.error('❌ Cell customization failed:', error);
      
      toast({
        title: "Customization failed",
        description: error.message || "Failed to customize cell",
        variant: "destructive"
      });

      return null;
    } finally {
      setIsExtracting(false);
    }
  }, [isExtracting, client, toast]);

  return {
    // Actions
    extractFromCollection,
    extractFromDocument,
    reextractRow,
    customizeCell,
    
    // State
    isExtracting,
    extractionProgress,
    lastResult,
    
    // Utils
    clearLastResult: () => setLastResult(null)
  };
}

export default useSimplifiedExtraction;
