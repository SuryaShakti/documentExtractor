import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ------------------ Types ------------------

export interface DocumentCollection {
  _id: string;
  name: string;
  projectId: string;
  documents: Document[];
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
  status: "active" | "archived" | "deleted";
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  _id: string;
  filename: string;
  originalName: string;
  fileMetadata: {
    size: number;
    mimeType: string;
  };
  processing: {
    status: "pending" | "processing" | "completed" | "failed";
  };
  cloudinary: {
    secureUrl: string;
  };
  uploaderId: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export interface CollectionQueryParams {
  page?: number;
  limit?: number;
  sortBy?: "order" | "name" | "createdAt" | "lastModified";
  sortOrder?: "asc" | "desc";
  status?: "active" | "archived" | "deleted";
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

// ------------------ API Service ------------------

const collectionService = {
  async getCollections(projectId: string, params?: CollectionQueryParams) {
    const queryParams = new URLSearchParams();
    queryParams.append("projectId", projectId);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params?.sortOrder) queryParams.append("sortOrder", params.sortOrder);
    if (params?.status) queryParams.append("status", params.status);

    const response = await fetch(`/api/document-collections?${queryParams}`);
    return response.json();
  },

  async getCollection(collectionId: string) {
    const response = await fetch(`/api/document-collections/${collectionId}`);
    return response.json();
  },

  async createCollection(data: CreateCollectionData) {
    const response = await fetch("/api/document-collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async updateCollection(collectionId: string, data: UpdateCollectionData) {
    const response = await fetch(`/api/document-collections/${collectionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async deleteCollection(collectionId: string) {
    const response = await fetch(`/api/document-collections/${collectionId}`, {
      method: "DELETE",
    });
    return response.json();
  },

  async addDocumentToCollection(collectionId: string, documentId: string) {
    const response = await fetch(
      `/api/document-collections/${collectionId}/documents`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      }
    );
    return response.json();
  },

  async removeDocumentFromCollection(collectionId: string, documentId: string) {
    const response = await fetch(
      `/api/document-collections/${collectionId}/documents`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      }
    );
    return response.json();
  },

  async reorderDocuments(collectionId: string, documentIds: string[]) {
    const response = await fetch(
      `/api/document-collections/${collectionId}/documents?action=reorder`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds }),
      }
    );
    return response.json();
  },

  async toggleDocumentVisibility(
    collectionId: string,
    documentId: string,
    hidden: boolean
  ) {
    const response = await fetch(
      `/api/document-collections/${collectionId}/documents?action=visibility`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, hidden }),
      }
    );
    return response.json();
  },

  async extractData(
    collectionId: string,
    columnId?: string,
    columns?: string[],
    forceReextract = false
  ) {
    const response = await fetch(
      `/api/document-collections/${collectionId}/extract`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId, columns, forceReextract }),
      }
    );
    return response.json();
  },
};

// ------------------ Zustand Store ------------------

interface CollectionState {
  collections: DocumentCollection[];
  currentCollection: DocumentCollection | null;
  isLoading: boolean;
  error: string | null;

  getCollections: (
    projectId: string,
    params?: CollectionQueryParams
  ) => Promise<void>;
  getCollection: (collectionId: string) => Promise<void>;
  createCollection: (data: CreateCollectionData) => Promise<void>;
  updateCollection: (
    collectionId: string,
    data: UpdateCollectionData
  ) => Promise<void>;
  deleteCollection: (collectionId: string) => Promise<void>;
  addDocumentToCollection: (
    collectionId: string,
    documentId: string
  ) => Promise<void>;
  removeDocumentFromCollection: (
    collectionId: string,
    documentId: string
  ) => Promise<void>;
  reorderDocuments: (
    collectionId: string,
    documentIds: string[]
  ) => Promise<void>;
  toggleDocumentVisibility: (
    collectionId: string,
    documentId: string,
    hidden: boolean
  ) => Promise<void>;
  extractData: (
    collectionId: string,
    columnId?: string,
    columns?: string[],
    forceReextract?: boolean
  ) => Promise<void>;

  clearError: () => void;
  setCurrentCollection: (collection: DocumentCollection | null) => void;
}

export const useCollectionStore = create<CollectionState>()(
  devtools(
    (set, get) => ({
      collections: [],
      currentCollection: null,
      isLoading: false,
      error: null,

      getCollections: async (projectId, params) => {
        try {
          set({ isLoading: true, error: null });
          const response = await collectionService.getCollections(
            projectId,
            params
          );
          if (response.success && response.data) {
            set({ collections: response.data.collections, isLoading: false });
          } else {
            throw new Error(response.error || "Failed to fetch collections");
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || "Failed to fetch collections",
          });
          throw error;
        }
      },

      getCollection: async (collectionId) => {
        try {
          set({ isLoading: true, error: null });
          const response = await collectionService.getCollection(collectionId);
          if (response.success && response.data) {
            set({
              currentCollection: response.data.collection,
              isLoading: false,
            });
          } else {
            throw new Error(response.error || "Failed to fetch collection");
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || "Failed to fetch collection",
          });
          throw error;
        }
      },

      createCollection: async (data) => {
        try {
          set({ error: null });
          const response = await collectionService.createCollection(data);
          if (response.success && response.data) {
            await get().getCollections(data.projectId);
          } else {
            throw new Error(response.error || "Failed to create collection");
          }
        } catch (error: any) {
          set({ error: error.message || "Failed to create collection" });
          throw error;
        }
      },

      updateCollection: async (collectionId, data) => {
        try {
          set({ error: null });
          const response = await collectionService.updateCollection(
            collectionId,
            data
          );
          if (response.success && response.data) {
            set((state) => ({
              currentCollection:
                state.currentCollection?._id === collectionId
                  ? response.data.collection
                  : state.currentCollection,
              collections: state.collections.map((c) =>
                c._id === collectionId ? response.data.collection : c
              ),
            }));
          } else {
            throw new Error(response.error || "Failed to update collection");
          }
        } catch (error: any) {
          set({ error: error.message || "Failed to update collection" });
          throw error;
        }
      },

      deleteCollection: async (collectionId) => {
        try {
          set({ error: null });
          const response = await collectionService.deleteCollection(
            collectionId
          );
          if (response.success) {
            set((state) => ({
              currentCollection:
                state.currentCollection?._id === collectionId
                  ? null
                  : state.currentCollection,
              collections: state.collections.filter(
                (c) => c._id !== collectionId
              ),
            }));
          } else {
            throw new Error(response.error || "Failed to delete collection");
          }
        } catch (error: any) {
          set({ error: error.message || "Failed to delete collection" });
          throw error;
        }
      },

      addDocumentToCollection: async (collectionId, documentId) => {
        try {
          set({ error: null });
          const response = await collectionService.addDocumentToCollection(
            collectionId,
            documentId
          );
          if (response.success && response.data) {
            set((state) => ({
              currentCollection:
                state.currentCollection?._id === collectionId
                  ? response.data.collection
                  : state.currentCollection,
              collections: state.collections.map((c) =>
                c._id === collectionId ? response.data.collection : c
              ),
            }));
          } else {
            throw new Error(
              response.error || "Failed to add document to collection"
            );
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to add document to collection",
          });
          throw error;
        }
      },

      removeDocumentFromCollection: async (collectionId, documentId) => {
        try {
          set({ error: null });
          const response = await collectionService.removeDocumentFromCollection(
            collectionId,
            documentId
          );
          if (response.success && response.data) {
            set((state) => ({
              currentCollection:
                state.currentCollection?._id === collectionId
                  ? response.data.collection
                  : state.currentCollection,
              collections: state.collections.map((c) =>
                c._id === collectionId ? response.data.collection : c
              ),
            }));
          } else {
            throw new Error(
              response.error || "Failed to remove document from collection"
            );
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to remove document from collection",
          });
          throw error;
        }
      },

      reorderDocuments: async (collectionId, documentIds) => {
        try {
          set({ error: null });
          const response = await collectionService.reorderDocuments(
            collectionId,
            documentIds
          );
          if (response.success && response.data) {
            set((state) => ({
              currentCollection:
                state.currentCollection?._id === collectionId
                  ? response.data.collection
                  : state.currentCollection,
              collections: state.collections.map((c) =>
                c._id === collectionId ? response.data.collection : c
              ),
            }));
          } else {
            throw new Error(response.error || "Failed to reorder documents");
          }
        } catch (error: any) {
          set({ error: error.message || "Failed to reorder documents" });
          throw error;
        }
      },

      toggleDocumentVisibility: async (collectionId, documentId, hidden) => {
        try {
          set({ error: null });
          const response = await collectionService.toggleDocumentVisibility(
            collectionId,
            documentId,
            hidden
          );
          if (response.success && response.data) {
            set((state) => ({
              currentCollection:
                state.currentCollection?._id === collectionId
                  ? response.data.collection
                  : state.currentCollection,
              collections: state.collections.map((c) =>
                c._id === collectionId ? response.data.collection : c
              ),
            }));
          } else {
            throw new Error(
              response.error || "Failed to toggle document visibility"
            );
          }
        } catch (error: any) {
          set({
            error: error.message || "Failed to toggle document visibility",
          });
          throw error;
        }
      },

      extractData: async (
        collectionId,
        columnId,
        columns,
        forceReextract = false
      ) => {
        try {
          set({ error: null });
          const response = await collectionService.extractData(
            collectionId,
            columnId,
            columns,
            forceReextract
          );
          if (response.success) {
            await get().getCollection(collectionId);
          } else {
            throw new Error(response.error || "Failed to extract data");
          }
        } catch (error: any) {
          set({ error: error.message || "Failed to extract data" });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
      setCurrentCollection: (collection) =>
        set({ currentCollection: collection }),
    }),
    { name: "collection-store" }
  )
);

// ------------------ Selectors ------------------

export const useCollections = () =>
  useCollectionStore((state) => state.collections);
export const useCurrentCollection = () =>
  useCollectionStore((state) => state.currentCollection);
export const useCollectionLoading = () =>
  useCollectionStore((state) => state.isLoading);
export const useCollectionError = () =>
  useCollectionStore((state) => state.error);

// ------------------ Actions ------------------

export const useCollectionActions = () =>
  useCollectionStore((state) => ({
    getCollections: state.getCollections,
    getCollection: state.getCollection,
    createCollection: state.createCollection,
    updateCollection: state.updateCollection,
    deleteCollection: state.deleteCollection,
    addDocumentToCollection: state.addDocumentToCollection,
    removeDocumentFromCollection: state.removeDocumentFromCollection,
    reorderDocuments: state.reorderDocuments,
    toggleDocumentVisibility: state.toggleDocumentVisibility,
    extractData: state.extractData,
    clearError: state.clearError,
    setCurrentCollection: state.setCurrentCollection,
  }));

export default useCollectionStore;
