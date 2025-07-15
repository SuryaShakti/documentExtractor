import { apiClient, ApiResponse, PaginationParams } from './client';

// Collection API service - should be used instead of documents API for collections
export interface DocumentCollection {
  _id: string;
  name: string;
  projectId: string;
  documents: Array<{
    _id: string;
    filename: string;
    originalName: string;
    fileMetadata: {
      size: number;
      mimeType: string;
    };
    processing: {
      status: 'pending' | 'processing' | 'completed' | 'failed';
    };
    cloudinary: {
      secureUrl: string;
    };
    uploaderId: {
      firstName: string;
      lastName: string;
    };
    createdAt: string;
  }>;
  extractedData: Map<string, any>;
  settings: {
    autoAggregate: boolean;
    aggregationOrder: string[];
    hiddenDocuments: string[];
  };
  stats: {
    documentCount: number;
    totalSize: number;
    lastModified: string;
  };
  status: 'active' | 'archived' | 'deleted';
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionQueryParams extends PaginationParams {
  projectId: string;
  status?: 'active' | 'archived' | 'deleted';
}

export interface CreateCollectionData {
  name?: string;
  projectId: string;
  documentIds?: string[];
}

export interface UpdateCollectionData {
  name?: string;
  settings?: {
    autoAggregate?: boolean;
    aggregationOrder?: string[];
    hiddenDocuments?: string[];
  };
}

class CollectionService {
  async getCollections(projectId: string, params?: CollectionQueryParams): Promise<ApiResponse<{ collections: DocumentCollection[] }>> {
    const queryParams = new URLSearchParams();
    queryParams.append('projectId', projectId);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const response = await fetch(`/api/document-collections?${queryParams}`);
    return response.json();
  }

  async getCollection(collectionId: string): Promise<ApiResponse<{ collection: DocumentCollection }>> {
    const response = await fetch(`/api/document-collections/${collectionId}`);
    return response.json();
  }

  async createCollection(data: CreateCollectionData): Promise<ApiResponse<{ collection: DocumentCollection }>> {
    return apiClient.post('/document-collections', data);
  }

  async updateCollection(collectionId: string, data: UpdateCollectionData): Promise<ApiResponse<{ collection: DocumentCollection }>> {
    return apiClient.put(`/document-collections/${collectionId}`, data);
  }

  async deleteCollection(collectionId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/document-collections/${collectionId}`);
  }

  async addDocumentToCollection(collectionId: string, documentId: string): Promise<ApiResponse<{ collection: DocumentCollection }>> {
    return apiClient.post(`/document-collections/${collectionId}/documents`, { documentId });
  }

  async removeDocumentFromCollection(collectionId: string, documentId: string): Promise<ApiResponse<{ collection: DocumentCollection }>> {
    return apiClient.delete(`/document-collections/${collectionId}/documents`, { documentId });
  }

  async reorderDocuments(collectionId: string, documentIds: string[]): Promise<ApiResponse<{ collection: DocumentCollection }>> {
    const response = await fetch(`/api/document-collections/${collectionId}/documents?action=reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentIds })
    });
    return response.json();
  }

  async toggleDocumentVisibility(collectionId: string, documentId: string, hidden: boolean): Promise<ApiResponse<{ collection: DocumentCollection }>> {
    const response = await fetch(`/api/document-collections/${collectionId}/documents?action=visibility`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, hidden })
    });
    return response.json();
  }

  async extractData(collectionId: string, columnId?: string, columns?: string[], forceReextract = false): Promise<ApiResponse<{
    collectionId: string;
    extractedData: any;
    visibleDocumentCount: number;
    columnsProcessed: number;
  }>> {
    return apiClient.post(`/document-collections/${collectionId}/extract`, {
      columnId,
      columns,
      forceReextract
    });
  }

  // ✅ NEW: Upload documents directly to a specific collection
  async uploadToCollection(
    collectionId: string, 
    files: File[], 
    onProgress?: (progress: { loaded: number; total: number; percentage: number }[]) => void
  ): Promise<ApiResponse<{ documents: any[]; collection: DocumentCollection }>> {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('documents', file);
    });

    let progressData: { loaded: number; total: number; percentage: number; file: File }[] = files.map(file => ({
      loaded: 0,
      total: file.size,
      percentage: 0,
      file
    }));

    return apiClient.upload<{ documents: any[]; collection: DocumentCollection }>(
      `/document-collections/${collectionId}/upload`,
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
}

export const collectionService = new CollectionService();
export default collectionService;
