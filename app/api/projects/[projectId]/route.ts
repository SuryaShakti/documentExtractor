import { NextResponse } from 'next/server';
import { withProjectAccess, withPermission, combineMiddlewares, withErrorHandling, AuthenticatedRequest, getRequestBody } from '@/lib/middleware/auth';
import { validateRequestBody, updateProjectSchema } from '@/lib/utils/validation';

// GET /api/projects/[projectId] - Get a specific project
async function getProjectHandler(req: AuthenticatedRequest) {
  await req.project!.populate('ownerId', 'firstName lastName email');
  await req.project!.populate('collaborators.userId', 'firstName lastName email');

  // Convert Map to Object for JSON serialization
  const projectData = req.project!.toObject();
  if (projectData.gridConfiguration && projectData.gridConfiguration.columnDefs) {
    projectData.gridConfiguration.columnDefs = Object.fromEntries(projectData.gridConfiguration.columnDefs);
  }

  return NextResponse.json({
    success: true,
    data: {
      project: {
        ...projectData,
        userPermissions: req.userPermissions
      }
    }
  });
}

// PUT /api/projects/[projectId] - Update a project
async function updateProjectHandler(req: AuthenticatedRequest) {
  const body = await getRequestBody(req);
  
  // Validate request body
  const validation = validateRequestBody(updateProjectSchema, body);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      details: validation.details
    }, { status: 400 });
  }

  const { name, description, tags, settings } = validation.data;

  const project = req.project!;

  if (name) project.name = name;
  if (description !== undefined) project.description = description;
  if (tags) project.tags = tags;
  if (settings) {
    project.settings = { ...project.settings, ...settings };
  }

  project.stats.lastActivity = new Date();
  await project.save();

  await project.populate('ownerId', 'firstName lastName email');
  await project.populate('collaborators.userId', 'firstName lastName email');

  return NextResponse.json({
    success: true,
    message: 'Project updated successfully',
    data: { project }
  });
}

// DELETE /api/projects/[projectId] - Delete a project
async function deleteProjectHandler(req: AuthenticatedRequest) {
  const project = req.project!;

  // Soft delete - change status to deleted
  project.status = 'deleted';
  await project.save();

  // Update user stats
  await req.user!.updateStats();

  return NextResponse.json({
    success: true,
    message: 'Project deleted successfully'
  });
}

export const GET = combineMiddlewares(withErrorHandling, withProjectAccess)(getProjectHandler);
export const PUT = combineMiddlewares(withErrorHandling, withProjectAccess, withPermission('canEdit'))(updateProjectHandler);
export const DELETE = combineMiddlewares(withErrorHandling, withProjectAccess, withPermission('canDelete'))(deleteProjectHandler);
