// Project Store
export { default as useProjectStore } from './projectStore';
export { 
  useProjects, 
  useActiveProject, 
  useProjectLoading, 
  useProjectError, 
  useProjectActions 
} from './projectStore';

// Document Store
export { default as useDocumentStore } from './documentStore';
export { 
  useDocuments, 
  useCurrentDocument, 
  useDocumentLoading, 
  useDocumentUploading, 
  useUploadProgress, 
  useDocumentError, 
  useDocumentActions 
} from './documentStore';

// Collection Store
export { default as useCollectionStore } from './collectionStore';
export { 
  useCollections, 
  useCurrentCollection, 
  useCollectionLoading, 
  useCollectionError, 
  useCollectionActions,
  useExtractionStates 
} from './collectionStore';

// Combined selectors for common use cases
export const useAppState = () => ({
  projects: useProjects(),
  activeProject: useActiveProject(),
  documents: useDocuments(),
  collections: useCollections()
});

// Combined loading states
export const useAppLoading = () => ({
  projects: useProjectLoading(),
  documents: useDocumentLoading(),
  collections: useCollectionLoading(),
  uploading: useDocumentUploading()
});

// Combined error states
export const useAppErrors = () => ({
  projects: useProjectError(),
  documents: useDocumentError(),
  collections: useCollectionError()
});
