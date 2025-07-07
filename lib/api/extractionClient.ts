// lib/api/extractionClient.ts
export interface ExtractionRequest {
  projectId: string;
  documentId: string;
}

export interface ExtractionResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
  processingTimeMs?: number;
  data?: {
    extractionResults: Array<{
      columnId: string;
      value: string;
      confidence: number;
      extractedBy: {
        method: string;
        model: string;
        version: string;
      };
    }>;
    successCount: number;
    totalColumns: number;
    successRate: number;
    document: {
      id: string;
      status: string;
      extractedData: Record<string, any>;
    };
  };
}

export class ExtractionClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = '/api', timeout: number = 90000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout; // 90 seconds default
  }

  async extractDocument(request: ExtractionRequest): Promise<ExtractionResponse> {
    const startTime = Date.now();

    try {
      // Get auth token (assuming it's stored in localStorage)
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      console.log('🚀 Starting document extraction...');
      console.log('📄 Document ID:', request.documentId);
      console.log('📁 Project ID:', request.projectId);

      // Create abort controller for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.timeout);

      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result: ExtractionResponse = await response.json();
      const processingTime = Date.now() - startTime;

      if (!response.ok) {
        console.error('❌ Extraction failed:', result.error);
        return {
          ...result,
          processingTimeMs: processingTime,
        };
      }

      console.log(`✅ Extraction completed in ${processingTime}ms`);
      console.log(`📊 Success rate: ${result.data?.successRate}%`);

      return {
        ...result,
        processingTimeMs: processingTime,
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      console.error('❌ Extraction request failed:', error.message);

      // Handle different types of errors
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
          details: `Extraction took longer than ${this.timeout / 1000} seconds. This may happen with large or complex documents.`,
          processingTimeMs: processingTime,
        };
      }

      if (error.message.includes('Failed to fetch')) {
        return {
          success: false,
          error: 'Network error',
          details: 'Could not connect to the server. Please check your internet connection.',
          processingTimeMs: processingTime,
        };
      }

      return {
        success: false,
        error: 'Extraction failed',
        details: error.message,
        processingTimeMs: processingTime,
      };
    }
  }

  // Helper method for checking extraction status
  async checkExtractionStatus(documentId: string): Promise<{
    status: 'idle' | 'processing' | 'completed' | 'failed';
    progress?: number;
    error?: string;
  }> {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      const response = await fetch(`${this.baseUrl}/documents/${documentId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check status');
      }

      const result = await response.json();
      return result.data?.processing || { status: 'idle' };

    } catch (error) {
      console.error('❌ Failed to check extraction status:', error);
      return { status: 'idle' };
    }
  }

  // Helper method to validate request before sending
  validateRequest(request: ExtractionRequest): { valid: boolean; error?: string } {
    if (!request.projectId) {
      return { valid: false, error: 'Project ID is required' };
    }

    if (!request.documentId) {
      return { valid: false, error: 'Document ID is required' };
    }

    if (!/^[0-9a-fA-F]{24}$/.test(request.documentId)) {
      return { valid: false, error: 'Invalid document ID format' };
    }

    if (!/^[0-9a-fA-F]{24}$/.test(request.projectId)) {
      return { valid: false, error: 'Invalid project ID format' };
    }

    return { valid: true };
  }
}

// React hook for extraction
import { useState, useCallback } from 'react';

export function useDocumentExtraction() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<ExtractionResponse | null>(null);

  const client = new ExtractionClient();

  const extractDocument = useCallback(async (request: ExtractionRequest) => {
    // Validate request
    const validation = client.validateRequest(request);
    if (!validation.valid) {
      const errorResult: ExtractionResponse = {
        success: false,
        error: validation.error,
      };
      setLastResult(errorResult);
      return errorResult;
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

      const result = await client.extractDocument(request);
      
      clearInterval(progressInterval);
      setExtractionProgress(100);
      setLastResult(result);

      // Reset progress after a delay
      setTimeout(() => {
        setExtractionProgress(null);
      }, 2000);

      return result;

    } catch (error: any) {
      const errorResult: ExtractionResponse = {
        success: false,
        error: 'Unexpected error',
        details: error.message,
      };
      
      setLastResult(errorResult);
      return errorResult;

    } finally {
      setIsExtracting(false);
    }
  }, []);

  const checkStatus = useCallback(async (documentId: string) => {
    return await client.checkExtractionStatus(documentId);
  }, []);

  return {
    extractDocument,
    checkStatus,
    isExtracting,
    extractionProgress,
    lastResult,
  };
}

// Usage example for components:
/*
import { useDocumentExtraction } from '@/lib/api/extractionClient';

function DocumentRow({ document, projectId }) {
  const { extractDocument, isExtracting, extractionProgress, lastResult } = useDocumentExtraction();

  const handleExtract = async () => {
    const result = await extractDocument({
      projectId,
      documentId: document.id,
    });

    if (result.success) {
      toast.success(`Successfully extracted data with ${result.data?.successRate}% success rate`);
      // Refresh your data grid or document list
    } else {
      toast.error(`Extraction failed: ${result.error}`);
    }
  };

  return (
    <button 
      onClick={handleExtract} 
      disabled={isExtracting}
      className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
    >
      {isExtracting ? (
        <span>
          Extracting... {extractionProgress ? `${Math.round(extractionProgress)}%` : ''}
        </span>
      ) : (
        'Extract Data'
      )}
    </button>
  );
}
*/