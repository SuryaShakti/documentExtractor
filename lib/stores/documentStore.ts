import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  documentService, 
  Document, 
  DocumentQueryParams, 
  UpdateDocumentData, 
  UpdateExtractedDataParams, 
  UploadProgress 
} from '../api/documents';

interface DocumentState {
  // State
  documents: any[]; // Grid row data format
  currentDocument: Document | null;
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: UploadProgress[];
  error: string | null;
  
  // Actions
  getDocuments: (projectId: string, params?: DocumentQueryParams) => Promise<void>;
  getDocument: (projectId: string, documentId: string) => Promise<void>;
  uploadDocuments: (projectId: string, files: File[]) => Promise<void>;
  updateDocument: (projectId: string, documentId: string, data: UpdateDocumentData) => Promise<void>;
  deleteDocument: (projectId: string, documentId: string) => Promise<void>;
  updateExtractedData: (projectId: string, documentId: string, columnId: string, data: UpdateExtractedDataParams) => Promise<void>;
  downloadDocument: (projectId: string, documentId: string, redirect?: boolean) => Promise<void>;
  processDocument: (projectId: string, documentId: string) => Promise<void>;
  extractDataWithAI: (projectId: string, documentId: string) => Promise<void>;
  
  // Utilities
  clearError: () => void;
  setCurrentDocument: (document: Document | null) => void;
  clearUploadProgress: () => void;
}

export const useDocumentStore = create<DocumentState>()(
  devtools(
    (set, get) => ({
      // Initial state
      documents: [],
      currentDocument: null,
      isLoading: false,
      isUploading: false,
      uploadProgress: [],
      error: null,

      // Get documents for a project
      getDocuments: async (projectId: string, params?: DocumentQueryParams) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await documentService.getDocuments(projectId, params);
          
          if (response.success && response.data) {
            set({
              documents: response.data.rowData,
              isLoading: false
            });
          } else {
            throw new Error(response.error || 'Failed to fetch documents');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch documents'
          });
          throw error;
        }
      },

      // Get specific document
      getDocument: async (projectId: string, documentId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await documentService.getDocument(projectId, documentId);
          
          if (response.success && response.data) {
            set({
              currentDocument: response.data.document,
              isLoading: false
            });
          } else {
            throw new Error(response.error || 'Failed to fetch document');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch document'
          });
          throw error;
        }
      },

      // Upload documents
      uploadDocuments: async (projectId: string, files: File[]) => {
        try {
          set({ 
            isUploading: true, 
            error: null,
            uploadProgress: files.map(file => ({
              loaded: 0,
              total: file.size,
              percentage: 0,
              file
            }))
          });
          
          const response = await documentService.uploadDocuments(
            projectId, 
            files, 
            (progress) => {
              set({ uploadProgress: progress });
            }
          );
          
          if (response.success) {
            set({ isUploading: false });
            
            // Refresh documents list
            await get().getDocuments(projectId);
          } else {
            throw new Error(response.error || 'Upload failed');
          }
        } catch (error: any) {
          set({
            isUploading: false,
            error: error.message || 'Upload failed'
          });
          throw error;
        }
      },

      // Update document
      updateDocument: async (projectId: string, documentId: string, data: UpdateDocumentData) => {
        try {
          set({ error: null });
          
          const response = await documentService.updateDocument(projectId, documentId, data);
          
          if (response.success && response.data) {
            // Update current document if it's the one being updated
            set((state) => ({
              currentDocument: state.currentDocument?._id === documentId 
                ? response.data!.document 
                : state.currentDocument
            }));
            
            // Refresh documents list
            await get().getDocuments(projectId);
          } else {
            throw new Error(response.error || 'Failed to update document');
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to update document' });
          throw error;
        }
      },

      // Delete document
      deleteDocument: async (projectId: string, documentId: string) => {
        try {
          set({ error: null });
          
          const response = await documentService.deleteDocument(projectId, documentId);
          
          if (response.success) {
            // Clear current document if it's the one being deleted
            set((state) => ({
              currentDocument: state.currentDocument?._id === documentId 
                ? null 
                : state.currentDocument,
              documents: state.documents.filter(doc => doc.id !== documentId)
            }));
          } else {
            throw new Error(response.error || 'Failed to delete document');
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to delete document' });
          throw error;
        }
      },

      // Update extracted data
      updateExtractedData: async (
        projectId: string, 
        documentId: string, 
        columnId: string, 
        data: UpdateExtractedDataParams
      ) => {
        try {
          set({ error: null });
          
          const response = await documentService.updateExtractedData(
            projectId, 
            documentId, 
            columnId, 
            data
          );
          
          if (response.success) {
            // Refresh documents to get updated data
            await get().getDocuments(projectId);
            
            // Update current document if needed
            if (get().currentDocument?._id === documentId) {
              await get().getDocument(projectId, documentId);
            }
          } else {
            throw new Error(response.error || 'Failed to update extracted data');
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to update extracted data' });
          throw error;
        }
      },

      // Download document
      downloadDocument: async (projectId: string, documentId: string, redirect = true) => {
        try {
          set({ error: null });
          
          await documentService.downloadDocument(projectId, documentId, redirect);
          
          if (!redirect) {
            // If not redirecting, the response should contain download URL
            // This is handled by the service method
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to download document' });
          throw error;
        }
      },

      // Process document with AI
      processDocument: async (projectId: string, documentId: string) => {
        try {
          set({ error: null });
          
          const response = await documentService.processDocument(projectId, documentId);
          
          if (response.success) {
            // Refresh documents to get updated processing status
            await get().getDocuments(projectId);
            
            // Update current document if needed
            if (get().currentDocument?._id === documentId) {
              await get().getDocument(projectId, documentId);
            }
          } else {
            throw new Error(response.error || 'Failed to start document processing');
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to start document processing' });
          throw error;
        }
      },

      // Extract data with AI
      extractDataWithAI: async (projectId: string, documentId: string) => {
        try {
          set({ error: null });
          
          const response = await documentService.extractDataWithAI(projectId, documentId);
          
          if (response.success) {
            // Refresh documents to get updated extracted data
            await get().getDocuments(projectId);
            
            // Update current document if needed
            if (get().currentDocument?._id === documentId) {
              await get().getDocument(projectId, documentId);
            }
          } else {
            throw new Error(response.error || 'Failed to extract data with AI');
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to extract data with AI' });
          throw error;
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Set current document
      setCurrentDocument: (document: Document | null) => {
        set({ currentDocument: document });
      },

      // Clear upload progress
      clearUploadProgress: () => {
        set({ uploadProgress: [] });
      }
    }),
    {
      name: 'document-store'
    }
  )
);

// Selectors
export const useDocuments = () => useDocumentStore((state) => state.documents);
export const useCurrentDocument = () => useDocumentStore((state) => state.currentDocument);
export const useDocumentLoading = () => useDocumentStore((state) => state.isLoading);
export const useDocumentUploading = () => useDocumentStore((state) => state.isUploading);
export const useUploadProgress = () => useDocumentStore((state) => state.uploadProgress);
export const useDocumentError = () => useDocumentStore((state) => state.error);

// Actions
export const useDocumentActions = () => useDocumentStore((state) => ({
  getDocuments: state.getDocuments,
  getDocument: state.getDocument,
  uploadDocuments: state.uploadDocuments,
  updateDocument: state.updateDocument,
  deleteDocument: state.deleteDocument,
  updateExtractedData: state.updateExtractedData,
  downloadDocument: state.downloadDocument,
  processDocument: state.processDocument,
  extractDataWithAI: state.extractDataWithAI,
  clearError: state.clearError,
  setCurrentDocument: state.setCurrentDocument,
  clearUploadProgress: state.clearUploadProgress
}));

export default useDocumentStore;
