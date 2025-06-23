import { NextResponse } from 'next/server';
import User from '@/lib/models/User';
import { withProjectAccess, withPermission, combineMiddlewares, withErrorHandling, AuthenticatedRequest, getRequestBody } from '@/lib/middleware/auth';
import { validateRequestBody, addCollaboratorSchema } from '@/lib/utils/validation';

// POST /api/projects/[projectId]/collaborators - Add collaborator to project
async function addCollaboratorHandler(req: AuthenticatedRequest) {
  const body = await getRequestBody(req);
  
  // Validate request body
  const validation = validateRequestBody(addCollaboratorSchema, body);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      details: validation.details
    }, { status: 400 });
  }

  const { email, role, permissions } = validation.data;

  // Find user by email
  const collaboratorUser = await User.findOne({ email });
  if (!collaboratorUser) {
    return NextResponse.json({
      success: false,
      error: 'User not found with this email address'
    }, { status: 404 });
  }

  // Check if user is already a collaborator or owner
  if (req.project!.ownerId.toString() === collaboratorUser._id.toString()) {
    return NextResponse.json({
      success: false,
      error: 'Cannot add project owner as collaborator'
    }, { status: 400 });
  }

  const existingCollaborator = req.project!.collaborators.find(
    collab => collab.userId.toString() === collaboratorUser._id.toString()
  );

  if (existingCollaborator) {
    return NextResponse.json({
      success: false,
      error: 'User is already a collaborator on this project'
    }, { status: 400 });
  }

  // Add collaborator
  await req.project!.addCollaborator(collaboratorUser._id, role, permissions);
  await req.project!.populate('collaborators.userId', 'firstName lastName email');

  return NextResponse.json({
    success: true,
    message: 'Collaborator added successfully',
    data: {
      collaborator: req.project!.collaborators[req.project!.collaborators.length - 1]
    }
  });
}

export const POST = combineMiddlewares(withErrorHandling, withProjectAccess, withPermission('canShare'))(addCollaboratorHandler);
