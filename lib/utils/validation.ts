import { z } from 'zod';

// User validation schemas
export const registerUserSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters long')
    .regex(/^(?=.*[a-zA-Z])(?=.*[0-9])/, 'Password must contain at least one letter and one number'),
  firstName: z.string()
    .trim()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters'),
  lastName: z.string()
    .trim()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters')
});

export const loginUserSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  password: z.string()
    .min(1, 'Password is required')
});

export const updateUserSchema = z.object({
  firstName: z.string()
    .trim()
    .min(1)
    .max(50)
    .optional(),
  lastName: z.string()
    .trim()
    .min(1)
    .max(50)
    .optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark']).optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      inApp: z.boolean().optional()
    }).optional(),
    language: z.string().optional()
  }).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided"
});

// Project validation schemas
export const createProjectSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Project name is required')
    .max(100, 'Project name cannot exceed 100 characters'),
  description: z.string()
    .trim()
    .max(500, 'Project description cannot exceed 500 characters')
    .optional(),
  tags: z.array(z.string().trim().max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional()
});

export const updateProjectSchema = z.object({
  name: z.string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
  description: z.string()
    .trim()
    .max(500)
    .optional(),
  tags: z.array(z.string().trim().max(50))
    .max(10)
    .optional(),
  settings: z.object({
    extractionConfig: z.object({
      ocrEnabled: z.boolean().optional(),
      language: z.string().optional(),
      confidenceThreshold: z.number().min(0).max(1).optional(),
      autoProcess: z.boolean().optional()
    }).optional(),
    permissions: z.object({
      allowDownload: z.boolean().optional(),
      allowShare: z.boolean().optional(),
      requireApproval: z.boolean().optional()
    }).optional(),
    notifications: z.object({
      onUpload: z.boolean().optional(),
      onProcessing: z.boolean().optional(),
      onCompletion: z.boolean().optional()
    }).optional()
  }).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided"
});

export const addCollaboratorSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  role: z.enum(['viewer', 'editor']).default('viewer'),
  permissions: z.object({
    canEdit: z.boolean().optional(),
    canDelete: z.boolean().optional(),
    canShare: z.boolean().optional(),
    canDownload: z.boolean().default(true)
  }).optional()
});

export const addColumnSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Column name is required')
    .max(100, 'Column name cannot exceed 100 characters'),
  prompt: z.string()
    .trim()
    .min(1, 'Prompt is required')
    .max(1000, 'Prompt cannot exceed 1000 characters'),
  aiModel: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'claude-2']).default('gpt-4'),
  type: z.enum(['text', 'date', 'price', 'location', 'person', 'organization', 'status', 'collection']).default('text'),
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color (e.g., #3b82f6)')
    .default('#3b82f6'),
  width: z.number()
    .min(50, 'Column width must be at least 50px')
    .max(500, 'Column width cannot exceed 500px')
    .default(150)
});

export const updateColumnSchema = z.object({
  name: z.string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
  prompt: z.string()
    .trim()
    .min(1)
    .max(1000)
    .optional(),
  aiModel: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'claude-2']).optional(),
  type: z.enum(['text', 'date', 'price', 'location', 'person', 'organization', 'status', 'collection']).optional(),
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  width: z.number()
    .min(50)
    .max(500)
    .optional()
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided"
});

// Document validation schemas
export const updateDocumentSchema = z.object({
  tags: z.array(z.string().trim().max(50))
    .max(10)
    .optional(),
  category: z.string()
    .trim()
    .max(100)
    .optional(),
  flags: z.object({
    isConfidential: z.boolean().optional(),
    needsReview: z.boolean().optional(),
    hasErrors: z.boolean().optional()
  }).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided"
});

export const extractedDataSchema = z.object({
  value: z.string()
    .max(1000, 'Extracted value cannot exceed 1000 characters'),
  type: z.enum(['text', 'date', 'price', 'location', 'person', 'organization', 'status', 'collection']).default('text'),
  status: z.enum(['yes', 'no', 'pending']).nullable().optional(),
  confidence: z.number()
    .min(0)
    .max(1)
    .default(0)
    .optional()
});

// Query validation schemas
export const projectQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'stats.lastActivity']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['active', 'archived', 'deleted']).default('active'),
  search: z.string().trim().max(100).optional(),
  tags: z.array(z.string().trim()).optional()
});

export const documentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['filename', 'originalName', 'createdAt', 'updatedAt', 'fileMetadata.size']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['active', 'archived', 'deleted']).default('active'),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  tags: z.array(z.string().trim()).optional(),
  processingStatus: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional()
});

// Admin validation schemas
export const updateUserAdminSchema = z.object({
  firstName: z.string()
    .trim()
    .min(1)
    .max(50)
    .optional(),
  lastName: z.string()
    .trim()
    .min(1)
    .max(50)
    .optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  subscription: z.object({
    plan: z.enum(['free', 'basic', 'premium']).optional(),
    expiryDate: z.string().datetime().nullable().optional(),
    autoRenew: z.boolean().optional()
  }).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided"
});

export const adminQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['firstName', 'lastName', 'email', 'createdAt', 'lastLogin', 'stats.projectsCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  role: z.enum(['user', 'admin']).optional(),
  plan: z.enum(['free', 'basic', 'premium']).optional(),
  search: z.string().trim().max(100).optional()
});

// Helper function to validate request body
export function validateRequestBody<T>(schema: z.ZodSchema<T>, body: any): { success: true; data: T } | { success: false; error: string; details: any[] } {
  try {
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation error',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    return {
      success: false,
      error: 'Unknown validation error',
      details: []
    };
  }
}

// Helper function to validate query parameters
export function validateQuery<T>(schema: z.ZodSchema<T>, query: any): { success: true; data: T } | { success: false; error: string; details: any[] } {
  try {
    const data = schema.parse(query);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid query parameters',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
    return {
      success: false,
      error: 'Unknown validation error',
      details: []
    };
  }
}
