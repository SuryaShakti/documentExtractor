import { NextResponse } from 'next/server';
import { withAuth, combineMiddlewares, withErrorHandling, AuthenticatedRequest } from '@/lib/middleware/auth';

async function logoutHandler(req: AuthenticatedRequest) {
  // In a JWT implementation, logout is typically handled client-side
  // We can log this event for audit purposes
  
  return NextResponse.json({
    success: true,
    message: 'Logged out successfully'
  });
}

export const POST = combineMiddlewares(withErrorHandling, withAuth)(logoutHandler);
