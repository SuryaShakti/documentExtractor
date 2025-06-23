import { apiClient, ApiResponse, PaginationParams, PaginatedResponse } from './client';
import { User } from './auth';

export interface Project {
  _id: string;
  name: string;
  description?: string;
  ownerId: string | User;
  collaborators: ProjectCollaborator[];
  gridConfiguration: {
    meta: {
      totalRows: number;
      totalCols: number;
      lastUpdated: string;
      version: string;
    };
    gridOptions: {
      domLayout: 'normal' | 'autoHeight' | 'print';
      rowSelection: {
        enableClickSelection: boolean;
      };
      suppressCellFocus: boolean;
      enableCellTextSelection: boolean;
      rowHeight: number;
      headerHeight: number;
      defaultColDef: {
        resizable: boolean;
        sortable: boolean;
        filter: boolean;
      };
    };
    columnDefs: {
      [key: string]: ColumnDefinition;
    };
  };
  settings: {
    extractionConfig: {
      ocrEnabled: boolean;
      language: string;
      confidenceThreshold: number;
      autoProcess: boolean;
    };
    permissions: {
      allowDownload: boolean;
      allowShare: boolean;
      requireApproval: boolean;
    };
    notifications: {
      onUpload: boolean;
      onProcessing: boolean;
      onCompletion: boolean;
    };
  };
  stats: {
    documentCount: number;
    totalSize: number;
    processingCount: number;
    completedCount: number;
    lastActivity?: string;
  };
  status: 'active' | 'archived' | 'deleted';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  userRole?: 'owner' | 'editor' | 'viewer';
  userPermissions?: ProjectPermissions;
}

export interface ProjectCollaborator {
  userId: string | User;
  role: 'owner' | 'editor' | 'viewer';
  permissions: ProjectPermissions;
  addedAt: string;
}

export interface ProjectPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canDownload: boolean;
}

export interface ColumnDefinition {
  id: string;
  field: string;
  headerName: string;
  width: number;
  resizable: boolean;
  sortable: boolean;
  filter: boolean;
  pinned?: 'left' | 'right';
  cellRenderer?: string;
  headerComponent?: string;
  cellStyle?: Record<string, any>;
  customProperties?: {
    id: string;
    name: string;
    prompt: string;
    aiModel: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'claude-2';
    type: 'text' | 'date' | 'price' | 'location' | 'person' | 'organization' | 'status' | 'collection';
    color: string;
    extraction: {
      enabled: boolean;
      status: 'active' | 'inactive' | 'pending';
    };
    styling: {
      backgroundColor: string;
      textColor: string;
      fontFamily: string;
      fontSize: number;
      fontWeight: string;
      alignment: 'left' | 'center' | 'right';
    };
  };
}

export interface CreateProjectData {
  name: string;
  description?: string;
  tags?: string[];
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  tags?: string[];
  settings?: Partial<Project['settings']>;
}

export interface AddCollaboratorData {
  email: string;
  role: 'editor' | 'viewer';
  permissions?: Partial<ProjectPermissions>;
}

export interface AddColumnData {
  name: string;
  prompt: string;
  aiModel: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'claude-2';
  type: 'text' | 'date' | 'price' | 'location' | 'person' | 'organization' | 'status' | 'collection';
  width?: number;
  color?: string;
}

export interface UpdateColumnData {
  name?: string;
  prompt?: string;
  aiModel?: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'claude-2';
  type?: 'text' | 'date' | 'price' | 'location' | 'person' | 'organization' | 'status' | 'collection';
  width?: number;
  color?: string;
}

export interface ProjectQueryParams extends PaginationParams {
  status?: 'active' | 'archived' | 'deleted';
  tags?: string[];
}

class ProjectService {
  async getProjects(params?: ProjectQueryParams): Promise<ApiResponse<PaginatedResponse<Project>>> {
    return apiClient.get<PaginatedResponse<Project>>('/projects', params);
  }

  async getProject(projectId: string): Promise<ApiResponse<Project>> {
    return apiClient.get<Project>(`/projects/${projectId}`);
  }

  async createProject(data: CreateProjectData): Promise<ApiResponse<Project>> {
    return apiClient.post<Project>('/projects', data);
  }

  async updateProject(projectId: string, data: UpdateProjectData): Promise<ApiResponse<Project>> {
    return apiClient.put<Project>(`/projects/${projectId}`, data);
  }

  async deleteProject(projectId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/projects/${projectId}`);
  }

  async addCollaborator(projectId: string, data: AddCollaboratorData): Promise<ApiResponse<ProjectCollaborator>> {
    return apiClient.post<ProjectCollaborator>(`/projects/${projectId}/collaborators`, data);
  }

  async removeCollaborator(projectId: string, userId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/projects/${projectId}/collaborators/${userId}`);
  }

  async addColumn(projectId: string, data: AddColumnData): Promise<ApiResponse<{ columnId: string; column: ColumnDefinition }>> {
    return apiClient.post(`/projects/${projectId}/columns`, data);
  }

  async updateColumn(projectId: string, columnId: string, data: UpdateColumnData): Promise<ApiResponse<ColumnDefinition>> {
    return apiClient.put(`/projects/${projectId}/columns/${columnId}`, data);
  }

  async deleteColumn(projectId: string, columnId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/projects/${projectId}/columns/${columnId}`);
  }

  async getGridConfig(projectId: string): Promise<ApiResponse<Project['gridConfiguration']>> {
    return apiClient.get(`/projects/${projectId}/grid-config`);
  }

  // Helper methods
  getUserRole(project: Project, userId: string): 'owner' | 'editor' | 'viewer' | null {
    if (typeof project.ownerId === 'string' ? project.ownerId === userId : project.ownerId.id === userId) {
      return 'owner';
    }
    
    const collaborator = project.collaborators.find(collab => 
      typeof collab.userId === 'string' ? collab.userId === userId : collab.userId.id === userId
    );
    
    return collaborator?.role || null;
  }

  getUserPermissions(project: Project, userId: string): ProjectPermissions | null {
    if (typeof project.ownerId === 'string' ? project.ownerId === userId : project.ownerId.id === userId) {
      return {
        canEdit: true,
        canDelete: true,
        canShare: true,
        canDownload: true
      };
    }
    
    const collaborator = project.collaborators.find(collab => 
      typeof collab.userId === 'string' ? collab.userId === userId : collab.userId.id === userId
    );
    
    return collaborator?.permissions || null;
  }

  canUserAccess(project: Project, userId: string): boolean {
    return this.getUserRole(project, userId) !== null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getProjectProgress(project: Project): number {
    if (project.stats.documentCount === 0) return 0;
    return Math.round((project.stats.completedCount / project.stats.documentCount) * 100);
  }

  getColumnTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      text: '📝',
      date: '📅',
      price: '💰',
      location: '📍',
      person: '👤',
      organization: '🏢',
      status: '✅',
      collection: '📊'
    };
    
    return icons[type] || '📝';
  }

  getColumnTypeColor(type: string): string {
    const colors: Record<string, string> = {
      text: '#3b82f6',
      date: '#10b981',
      price: '#f59e0b',
      location: '#ef4444',
      person: '#8b5cf6',
      organization: '#06b6d4',
      status: '#22c55e',
      collection: '#f97316'
    };
    
    return colors[type] || '#3b82f6';
  }
}

export const projectService = new ProjectService();
export default projectService;
