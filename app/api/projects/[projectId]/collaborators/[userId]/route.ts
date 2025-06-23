import { NextResponse } from 'next/server';
import { withProjectAccess, withPermission, combineMiddlewares, withErrorHandling, AuthenticatedRequest } from '@/lib/middleware/auth';

// DELETE /api/projects/[projectId]/collaborators/[userId] - Remove collaborator from project
async function removeCollaboratorHandler(req: AuthenticatedRequest) {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  const userId = pathSegments[pathSegments.length - 1];

  await req.project!.removeCollaborator(userId);

  return NextResponse.json({
    success: true,
    message: 'Collaborator removed successfully'
  });
}

export const DELETE = combineMiddlewares(withErrorHandling, withProjectAccess, withPermission('canShare'))(removeCollaboratorHandler);
