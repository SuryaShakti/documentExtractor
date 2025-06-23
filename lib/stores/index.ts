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

// Combined selectors for common use cases (projects and documents only)
export const useAppState = () => ({
  projects: useProjects(),
  activeProject: useActiveProject(),
  documents: useDocuments()
});

// Combined loading states (projects and documents only)
export const useAppLoading = () => ({
  projects: useProjectLoading(),
  documents: useDocumentLoading(),
  uploading: useDocumentUploading()
});

// Combined error states (projects and documents only)
export const useAppErrors = () => ({
  projects: useProjectError(),
  documents: useDocumentError()
});
