import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  projectService, 
  Project, 
  CreateProjectData, 
  UpdateProjectData, 
  AddCollaboratorData, 
  AddColumnData, 
  UpdateColumnData, 
  ProjectQueryParams 
} from '../api/projects';

interface ProjectState {
  // State
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  getProjects: (params?: ProjectQueryParams) => Promise<void>;
  getProject: (projectId: string) => Promise<void>;
  createProject: (data: CreateProjectData) => Promise<Project>;
  updateProject: (projectId: string, data: UpdateProjectData) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  setActiveProject: (project: Project | null) => void;
  
  // Collaborator actions
  addCollaborator: (projectId: string, data: AddCollaboratorData) => Promise<void>;
  removeCollaborator: (projectId: string, userId: string) => Promise<void>;
  
  // Column actions
  addColumn: (projectId: string, data: AddColumnData) => Promise<{ columnId: string }>;
  updateColumn: (projectId: string, columnId: string, data: UpdateColumnData) => Promise<void>;
  deleteColumn: (projectId: string, columnId: string) => Promise<void>;
  
  // Grid configuration
  getGridConfig: (projectId: string) => Promise<Project['gridConfiguration']>;
  
  // Utilities
  clearError: () => void;
  refreshActiveProject: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set, get) => ({
      // Initial state
      projects: [],
      activeProject: null,
      isLoading: false,
      error: null,

      // Get all projects
      getProjects: async (params?: ProjectQueryParams) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await projectService.getProjects(params);
          
          if (response.success && response.data) {
            set({
              projects: response.data.projects,
              isLoading: false
            });
          } else {
            throw new Error(response.error || 'Failed to fetch projects');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch projects'
          });
          throw error;
        }
      },

      // Get specific project
      getProject: async (projectId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await projectService.getProject(projectId);
          
          if (response.success && response.data) {
            set({
              activeProject: response.data.project,
              isLoading: false
            });
          } else {
            throw new Error(response.error || 'Failed to fetch project');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch project'
          });
          throw error;
        }
      },

      // Create project
      createProject: async (data: CreateProjectData) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await projectService.createProject(data);
          
          if (response.success && response.data) {
            const newProject = response.data.project;
            
            set((state) => ({
              projects: [newProject, ...state.projects],
              isLoading: false
            }));
            
            return newProject;
          } else {
            throw new Error(response.error || 'Failed to create project');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to create project'
          });
          throw error;
        }
      },

      // Update project
      updateProject: async (projectId: string, data: UpdateProjectData) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await projectService.updateProject(projectId, data);
          
          if (response.success && response.data) {
            const updatedProject = response.data.project;
            
            set((state) => ({
              projects: state.projects.map(p => 
                p._id === projectId ? updatedProject : p
              ),
              activeProject: state.activeProject?._id === projectId 
                ? updatedProject 
                : state.activeProject,
              isLoading: false
            }));
          } else {
            throw new Error(response.error || 'Failed to update project');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to update project'
          });
          throw error;
        }
      },

      // Delete project
      deleteProject: async (projectId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await projectService.deleteProject(projectId);
          
          if (response.success) {
            set((state) => ({
              projects: state.projects.filter(p => p._id !== projectId),
              activeProject: state.activeProject?._id === projectId 
                ? null 
                : state.activeProject,
              isLoading: false
            }));
          } else {
            throw new Error(response.error || 'Failed to delete project');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to delete project'
          });
          throw error;
        }
      },

      // Set active project
      setActiveProject: (project: Project | null) => {
        set({ activeProject: project });
      },

      // Add collaborator
      addCollaborator: async (projectId: string, data: AddCollaboratorData) => {
        try {
          set({ error: null });
          
          const response = await projectService.addCollaborator(projectId, data);
          
          if (response.success) {
            // Refresh the project to get updated collaborators
            await get().getProject(projectId);
          } else {
            throw new Error(response.error || 'Failed to add collaborator');
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to add collaborator' });
          throw error;
        }
      },

      // Remove collaborator
      removeCollaborator: async (projectId: string, userId: string) => {
        try {
          set({ error: null });
          
          const response = await projectService.removeCollaborator(projectId, userId);
          
          if (response.success) {
            // Refresh the project to get updated collaborators
            await get().getProject(projectId);
          } else {
            throw new Error(response.error || 'Failed to remove collaborator');
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to remove collaborator' });
          throw error;
        }
      },

      // Add column
      addColumn: async (projectId: string, data: AddColumnData) => {
        try {
          set({ error: null });
          
          const response = await projectService.addColumn(projectId, data);
          
          if (response.success && response.data) {
            // Refresh the project to get updated grid configuration
            await get().getProject(projectId);
            return { columnId: response.data.columnId };
          } else {
            throw new Error(response.error || 'Failed to add column');
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to add column' });
          throw error;
        }
      },

      // Update column
      updateColumn: async (projectId: string, columnId: string, data: UpdateColumnData) => {
        try {
          set({ error: null });
          
          const response = await projectService.updateColumn(projectId, columnId, data);
          
          if (response.success) {
            // Refresh the project to get updated grid configuration
            await get().getProject(projectId);
          } else {
            throw new Error(response.error || 'Failed to update column');
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to update column' });
          throw error;
        }
      },

      // Delete column
      deleteColumn: async (projectId: string, columnId: string) => {
        try {
          set({ error: null });
          
          const response = await projectService.deleteColumn(projectId, columnId);
          
          if (response.success) {
            // Refresh the project to get updated grid configuration
            await get().getProject(projectId);
          } else {
            throw new Error(response.error || 'Failed to delete column');
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to delete column' });
          throw error;
        }
      },

      // Get grid configuration
      getGridConfig: async (projectId: string) => {
        try {
          const response = await projectService.getGridConfig(projectId);
          
          if (response.success && response.data) {
            return response.data;
          } else {
            throw new Error(response.error || 'Failed to get grid configuration');
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to get grid configuration' });
          throw error;
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Refresh active project
      refreshActiveProject: async () => {
        const { activeProject } = get();
        if (activeProject) {
          await get().getProject(activeProject._id);
        }
      }
    }),
    {
      name: 'project-store'
    }
  )
);

// Selectors
export const useProjects = () => useProjectStore((state) => state.projects);
export const useActiveProject = () => useProjectStore((state) => state.activeProject);
export const useProjectLoading = () => useProjectStore((state) => state.isLoading);
export const useProjectError = () => useProjectStore((state) => state.error);

// Actions
export const useProjectActions = () => useProjectStore((state) => ({
  getProjects: state.getProjects,
  getProject: state.getProject,
  createProject: state.createProject,
  updateProject: state.updateProject,
  deleteProject: state.deleteProject,
  setActiveProject: state.setActiveProject,
  addCollaborator: state.addCollaborator,
  removeCollaborator: state.removeCollaborator,
  addColumn: state.addColumn,
  updateColumn: state.updateColumn,
  deleteColumn: state.deleteColumn,
  getGridConfig: state.getGridConfig,
  clearError: state.clearError,
  refreshActiveProject: state.refreshActiveProject
}));

export default useProjectStore;
