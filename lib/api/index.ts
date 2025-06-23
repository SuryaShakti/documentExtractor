// API Client
export { default as apiClient } from './client';
export type { ApiResponse, PaginationParams, PaginatedResponse } from './client';

// Auth Service
export { default as authService } from './auth';
export type { 
  User, 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  UpdateProfileData, 
  ChangePasswordData 
} from './auth';

// Projects Service
export { default as projectService } from './projects';
export type {
  Project,
  ProjectCollaborator,
  ProjectPermissions,
  ColumnDefinition,
  CreateProjectData,
  UpdateProjectData,
  AddCollaboratorData,
  AddColumnData,
  UpdateColumnData,
  ProjectQueryParams
} from './projects';

// Documents Service
export { default as documentService } from './documents';
export type {
  Document,
  ExtractedData,
  DocumentQueryParams,
  UpdateDocumentData,
  UpdateExtractedDataParams,
  UploadProgress
} from './documents';

// Admin Service
export { default as adminService } from './admin';
export type {
  AdminDashboardData,
  UserWithStats,
  UserDetails,
  UsageAnalytics,
  SystemHealth,
  UpdateUserByAdminData,
  AdminUserQueryParams
} from './admin';

// Re-export commonly used types
export type {
  User as ApiUser,
  Project as ApiProject,
  Document as ApiDocument
} from './auth';
