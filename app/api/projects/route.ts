import { NextResponse } from 'next/server';
import Project from '@/lib/models/Project';
import { withAuth, combineMiddlewares, withErrorHandling, AuthenticatedRequest, getRequestBody, getQueryParams } from '@/lib/middleware/auth';
import { validateRequestBody, validateQuery, createProjectSchema, projectQuerySchema } from '@/lib/utils/validation';

// GET /api/projects - Get all projects for the authenticated user
async function getProjectsHandler(req: AuthenticatedRequest) {
  const queryParams = getQueryParams(req);
  
  // Validate query parameters
  const validation = validateQuery(projectQuerySchema, queryParams);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      details: validation.details
    }, { status: 400 });
  }

  const { page, limit, sortBy, sortOrder, status, search, tags } = validation.data;

  // Build query
  const query: any = {
    $or: [
      { ownerId: req.user!._id },
      { 'collaborators.userId': req.user!._id }
    ],
    status
  };

  if (search) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    });
  }

  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  // Build sort object
  const sort: any = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const [projects, totalCount] = await Promise.all([
    Project.find(query)
      .sort(sort)
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('ownerId', 'firstName lastName email')
      .populate('collaborators.userId', 'firstName lastName email')
      .lean(),
    Project.countDocuments(query)
  ]);

  // Add user permissions to each project
  const projectsWithPermissions = projects.map(project => ({
    ...project,
    userRole: project.ownerId._id.toString() === req.user!._id.toString() ? 'owner' : 
             project.collaborators.find((c: any) => c.userId._id.toString() === req.user!._id.toString())?.role || 'viewer',
    userPermissions: project.ownerId._id.toString() === req.user!._id.toString() ? 
      { canEdit: true, canDelete: true, canShare: true, canDownload: true } :
      project.collaborators.find((c: any) => c.userId._id.toString() === req.user!._id.toString())?.permissions
  }));

  return NextResponse.json({
    success: true,
    data: {
      projects: projectsWithPermissions,
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

// POST /api/projects - Create a new project
async function createProjectHandler(req: AuthenticatedRequest) {
  const body = await getRequestBody(req);
  
  // Validate request body
  const validation = validateRequestBody(createProjectSchema, body);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      details: validation.details
    }, { status: 400 });
  }

  const { name, description, tags } = validation.data;

  // Check if user can create more projects
  if (!req.user!.canCreateProject()) {
    return NextResponse.json({
      success: false,
      error: `Project limit reached for ${req.user!.subscription.plan} plan. Please upgrade to create more projects.`
    }, { status: 400 });
  }

  // Check for duplicate project name for this user
  const existingProject = await Project.findOne({
    ownerId: req.user!._id,
    name: { $regex: new RegExp(`^${name}$`, 'i') },
    status: { $ne: 'deleted' }
  });

  if (existingProject) {
    return NextResponse.json({
      success: false,
      error: 'A project with this name already exists'
    }, { status: 400 });
  }

  // Create project
  const project = await Project.create({
    name,
    description,
    ownerId: req.user!._id,
    tags: tags || [],
    stats: {
      lastActivity: new Date()
    }
  });

  await project.populate('ownerId', 'firstName lastName email');

  // Update user stats
  await req.user!.updateStats();

  return NextResponse.json({
    success: true,
    message: 'Project created successfully',
    data: {
      project: {
        ...project.toObject(),
        userRole: 'owner',
        userPermissions: { canEdit: true, canDelete: true, canShare: true, canDownload: true }
      }
    }
  }, { status: 201 });
}

export const GET = combineMiddlewares(withErrorHandling, withAuth)(getProjectsHandler);
export const POST = combineMiddlewares(withErrorHandling, withAuth)(createProjectHandler);
