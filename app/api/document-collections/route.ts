import { NextResponse } from 'next/server';
import DocumentCollection from '@/lib/models/DocumentCollection';
import Document from '@/lib/models/Document';
import Project from '@/lib/models/Project';
import { withAuth, combineMiddlewares, withErrorHandling, AuthenticatedRequest, getRequestBody, getQueryParams } from '@/lib/middleware/auth';
import { validateRequestBody, validateQuery } from '@/lib/utils/validation';
import { z } from 'zod';

// Validation schemas
const createCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  projectId: z.string().min(1),
  documentIds: z.array(z.string()).optional().default([])
});

const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  documentIds: z.array(z.string()).optional(),
  settings: z.object({
    autoAggregate: z.boolean().optional(),
    aggregationOrder: z.array(z.string()).optional(),
    hiddenDocuments: z.array(z.string()).optional()
  }).optional()
});

const collectionQuerySchema = z.object({
  projectId: z.string().min(1),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  sortBy: z.enum(['order', 'name', 'createdAt', 'lastModified']).default('order'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  status: z.enum(['active', 'archived', 'deleted']).default('active')
});

// GET /api/document-collections - Get all collections for a project
async function getCollectionsHandler(req: AuthenticatedRequest) {
  const queryParams = getQueryParams(req);
  
  // Validate query parameters
  const validation = validateQuery(collectionQuerySchema, queryParams);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      details: validation.details
    }, { status: 400 });
  }

  const { projectId, page, limit, sortBy, sortOrder, status } = validation.data;

  // Check if user has access to the project
  const project = await Project.findById(projectId);
  if (!project) {
    return NextResponse.json({
      success: false,
      error: 'Project not found'
    }, { status: 404 });
  }

  const userPermissions = project.getUserPermissions(req.user!._id);
  if (!userPermissions) {
    return NextResponse.json({
      success: false,
      error: 'Access denied'
    }, { status: 403 });
  }

  // Build query
  const query: any = { projectId, status };

  // Build sort object
  const sort: any = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const [collections, totalCount] = await Promise.all([
    DocumentCollection.find(query)
      .sort(sort)
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('documents', 'filename originalName fileMetadata processing')
      .lean(),
    DocumentCollection.countDocuments(query)
  ]);

  return NextResponse.json({
    success: true,
    data: {
      collections,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    }
  });
}

// POST /api/document-collections - Create a new collection
async function createCollectionHandler(req: AuthenticatedRequest) {
  const body = await getRequestBody(req);
  
  // Validate request body
  const validation = validateRequestBody(createCollectionSchema, body);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      details: validation.details
    }, { status: 400 });
  }

  const { name, projectId, documentIds } = validation.data;

  // Check if user has access to the project
  const project = await Project.findById(projectId);
  if (!project) {
    return NextResponse.json({
      success: false,
      error: 'Project not found'
    }, { status: 404 });
  }

  const userPermissions = project.getUserPermissions(req.user!._id);
  if (!userPermissions || !userPermissions.canEdit) {
    return NextResponse.json({
      success: false,
      error: 'Permission denied'
    }, { status: 403 });
  }

  // Validate document IDs if provided
  if (documentIds.length > 0) {
    const existingDocs = await Document.find({
      _id: { $in: documentIds },
      projectId,
      status: { $ne: 'deleted' }
    });

    if (existingDocs.length !== documentIds.length) {
      return NextResponse.json({
        success: false,
        error: 'Some documents not found or do not belong to this project'
      }, { status: 400 });
    }
  }

  // Get the next order number
  const lastCollection = await DocumentCollection.findOne({ projectId }).sort({ order: -1 });
  const nextOrder = lastCollection ? lastCollection.order + 1 : 1;

  // Create collection
  const collection = await DocumentCollection.create({
    name: name || `Collection ${nextOrder}`,
    projectId,
    documents: documentIds,
    order: nextOrder,
    settings: {
      autoAggregate: true,
      aggregationOrder: documentIds,
      hiddenDocuments: []
    }
  });

  // Update collection stats
  await collection.updateStats();

  await collection.populate('documents', 'filename originalName fileMetadata processing');

  return NextResponse.json({
    success: true,
    message: 'Collection created successfully',
    data: { collection }
  }, { status: 201 });
}

export const GET = combineMiddlewares(withErrorHandling, withAuth)(getCollectionsHandler);
export const POST = combineMiddlewares(withErrorHandling, withAuth)(createCollectionHandler);
