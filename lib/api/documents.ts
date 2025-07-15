import { apiClient, ApiResponse, PaginationParams, PaginatedResponse } from './client';
import { User } from './auth';

export interface Document {
  _id: string;
  filename: string;
  originalName: string;
  projectId: string;
  uploaderId: string | User;
  cloudinary: {
    publicId: string;
    url: string;
    secureUrl: string;
    format: string;
    resourceType: 'image' | 'video' | 'raw' | 'auto';
  };
  fileMetadata: {
    size: number;
    mimeType: string;
    extension: string;
    encoding?: string;
    pages?: number;
    dimensions?: {
      width: number;
      height: number;
    };
  };
  processing: {
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    startedAt?: string;
    completedAt?: string;
    progress: number;
    error?: {
      message: string;
      code: string;
      details?: any;
    };
    retryCount: number;
  };
  extractedData: {
    [columnId: string]: ExtractedData;
  };
  ocrResults?: {
    fullText: string;
    confidence: number;
    language: string;
    blocks: Array<{
      text: string;
      confidence: number;
      coordinates: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
  };
  tags: string[];
  category?: string;
  version: number;
  status: 'active' | 'archived' | 'deleted';
  flags: {
    isConfidential: boolean;
    needsReview: boolean;
    isProcessed: boolean;
    hasErrors: boolean;
  };
  analytics: {
    viewCount: number;
    downloadCount: number;
    shareCount: number;
    lastViewed?: string;
    lastDownloaded?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedData {
  value: string;
  type: 'text' | 'date' | 'price' | 'location' | 'person' | 'organization' | 'status' | 'collection';
  status: 'yes' | 'no' | 'pending' | null;
  confidence: number;
  extractedAt: string;
  extractedBy: {
    method: 'ai' | 'manual' | 'ocr';
    model?: string;
    version?: string;
    userId?: string;
  };
  metadata?: {
    coordinates?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    pageNumber?: number;
    rawText?: string;
  };
}

export interface DocumentQueryParams extends PaginationParams {
  status?: 'active' | 'archived' | 'deleted';
  category?: string;
  tags?: string[];
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface UpdateDocumentData {
  tags?: string[];
  category?: string;
  flags?: Partial<Document['flags']>;
}

export interface UpdateExtractedDataParams {
  value?: string;
  type?: ExtractedData['type'];
  status?: ExtractedData['status'];
  confidence?: number;
  metadata?: ExtractedData['metadata'];
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  file: File;
}

class DocumentService {
  // Updated to call the collections API instead of documents API
  async getDocuments(projectId: string, params?: DocumentQueryParams): Promise<ApiResponse<any>> {
    // Call the collections API to get collections
    const queryParams = new URLSearchParams();
    queryParams.append('projectId', projectId);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    const response = await fetch(`/api/document-collections?${queryParams}`);
    const result = await response.json();
    
    if (result.success) {
      // Transform collections to look like documents for backward compatibility
      const rowData = result.data.collections.map((collection: any) => {
        const primaryDoc = collection.documents[0];
        
        // Safely handle MongoDB Map for extractedData
        let extractedDataObj = {};
        if (collection.extractedData) {
          try {
            // Handle different Map formats from MongoDB
            if (collection.extractedData instanceof Map) {
              extractedDataObj = Object.fromEntries(collection.extractedData);
            } else if (typeof collection.extractedData === 'object' && collection.extractedData !== null) {
              // If it's already a plain object, use it directly
              extractedDataObj = collection.extractedData;
            }
          } catch (error) {
            console.warn('Failed to process extractedData:', error);
            extractedDataObj = {};
          }
        }
        
        return {
          id: collection._id,
          filename: collection.name,
          originalName: collection.name,
          uploadDate: new Date(collection.createdAt).toISOString().split('T')[0],
          fileType: primaryDoc?.fileMetadata?.mimeType || 'collection',
          fileUrl: primaryDoc?.cloudinary?.secureUrl || '#',
          size: collection.stats.totalSize,
          status: primaryDoc?.processing?.status || 'completed',
          uploader: primaryDoc?.uploaderId,
          documents: collection.documents, // Include full documents array
          documentCount: collection.stats.documentCount,
          hiddenDocuments: collection.settings.hiddenDocuments || [],
          settings: collection.settings,
          stats: collection.stats,
          // Include extracted data from collection (safely converted)
          ...extractedDataObj
        };
      });
      
      return {
        success: true,
        data: {
          rowData,
          pagination: result.data.pagination
        }
      };
    }
    
    return result;
  }

  async getDocument(projectId: string, documentId: string): Promise<ApiResponse<Document>> {
    return apiClient.get<Document>(`/projects/${projectId}/documents/${documentId}`);
  }

  async uploadDocuments(
    projectId: string, 
    files: File[], 
    onProgress?: (progress: UploadProgress[]) => void
  ): Promise<ApiResponse<{ documents: Document[] }>> {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('documents', file);
    });

    let progressData: UploadProgress[] = files.map(file => ({
      loaded: 0,
      total: file.size,
      percentage: 0,
      file
    }));

    return apiClient.upload<{ documents: Document[] }>(
      `/projects/${projectId}/documents/upload`,
      formData,
      (totalProgress) => {
        // Update progress for all files (simplified)
        progressData = progressData.map(item => ({
          ...item,
          loaded: (item.total * totalProgress) / 100,
          percentage: totalProgress
        }));
        
        onProgress?.(progressData);
      }
    );
  }

  async updateDocument(
    projectId: string, 
    documentId: string, 
    data: UpdateDocumentData
  ): Promise<ApiResponse<Document>> {
    return apiClient.put<Document>(`/projects/${projectId}/documents/${documentId}`, data);
  }

  async deleteDocument(projectId: string, documentId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/projects/${projectId}/documents/${documentId}`);
  }

  async updateExtractedData(
    projectId: string,
    documentId: string,
    columnId: string,
    data: UpdateExtractedDataParams
  ): Promise<ApiResponse<{ extractedData: ExtractedData }>> {
    return apiClient.put(
      `/projects/${projectId}/documents/${documentId}/extracted-data/${columnId}`,
      data
    );
  }

  async downloadDocument(
    projectId: string, 
    documentId: string, 
    redirect = false
  ): Promise<ApiResponse<{ downloadUrl: string; filename: string }> | void> {
    if (redirect) {
      // Open download URL in new tab
      window.open(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/documents/${documentId}/download`,
        '_blank'
      );
      return;
    }
    
    return apiClient.get(
      `/projects/${projectId}/documents/${documentId}/download?redirect=false`
    );
  }

  async processDocument(projectId: string, documentId: string): Promise<ApiResponse<{ processingStatus: string }>> {
    return apiClient.post(`/projects/${projectId}/documents/${documentId}/process`);
  }

  async extractDataWithAI(projectId: string, documentId: string): Promise<ApiResponse<{
    extractionResults: any[];
    successCount: number;
    totalColumns: number;
    document: {
      id: string;
      status: string;
      extractedData: Record<string, ExtractedData>;
    };
  }>> {
    return apiClient.post('/extract', { projectId, documentId });
  }

  // Helper methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileTypeIcon(mimeType: string): string {
    const iconMap: Record<string, string> = {
      'application/pdf': '📄',
      'application/msword': '📝',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
      'text/plain': '📄',
      'text/csv': '📊',
      'image/jpeg': '🖼️',
      'image/jpg': '🖼️',
      'image/png': '🖼️',
    };
    
    return iconMap[mimeType] || '📎';
  }

  getProcessingStatusColor(status: Document['processing']['status']): string {
    const colorMap: Record<string, string> = {
      pending: '#f59e0b',
      processing: '#3b82f6',
      completed: '#22c55e',
      failed: '#ef4444',
      cancelled: '#6b7280'
    };
    
    return colorMap[status] || '#6b7280';
  }

  getProcessingStatusText(status: Document['processing']['status']): string {
    const textMap: Record<string, string> = {
      pending: 'Pending',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      cancelled: 'Cancelled'
    };
    
    return textMap[status] || 'Unknown';
  }

  isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  isPdfFile(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  isDocumentFile(mimeType: string): boolean {
    return mimeType.includes('word') || mimeType === 'text/plain';
  }

  canPreview(mimeType: string): boolean {
    return this.isImageFile(mimeType) || this.isPdfFile(mimeType);
  }

  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return '#22c55e'; // Green
    if (confidence >= 0.6) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  }

  getConfidenceText(confidence: number): string {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  }

  // Validation helpers
  isValidFileType(file: File): boolean {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    return allowedTypes.includes(file.type);
  }

  isValidFileSize(file: File, maxSize = 50 * 1024 * 1024): boolean { // 50MB default
    return file.size <= maxSize;
  }

  validateFiles(files: File[]): { valid: File[]; invalid: Array<{ file: File; reason: string }> } {
    const valid: File[] = [];
    const invalid: Array<{ file: File; reason: string }> = [];
    
    files.forEach(file => {
      if (!this.isValidFileType(file)) {
        invalid.push({ file, reason: 'Invalid file type' });
      } else if (!this.isValidFileSize(file)) {
        invalid.push({ file, reason: 'File too large (max 50MB)' });
      } else {
        valid.push(file);
      }
    });
    
    return { valid, invalid };
  }

  // Generate thumbnail URL for images
  getThumbnailUrl(document: Document, width = 150, height = 150): string {
    if (!this.isImageFile(document.fileMetadata.mimeType)) {
      return '';
    }
    
    // Use Cloudinary transformation for thumbnails
    const baseUrl = document.cloudinary.secureUrl;
    const transformations = `c_fill,w_${width},h_${height},q_auto,f_auto`;
    
    return baseUrl.replace('/upload/', `/upload/${transformations}/`);
  }

  // Calculate processing duration
  getProcessingDuration(document: Document): string | null {
    if (!document.processing.startedAt || !document.processing.completedAt) {
      return null;
    }
    
    const start = new Date(document.processing.startedAt);
    const end = new Date(document.processing.completedAt);
    const duration = end.getTime() - start.getTime();
    
    if (duration < 1000) {
      return `${duration}ms`;
    } else if (duration < 60000) {
      return `${Math.round(duration / 1000)}s`;
    } else {
      return `${Math.round(duration / 60000)}m`;
    }
  }
}

export const documentService = new DocumentService();
export default documentService;
