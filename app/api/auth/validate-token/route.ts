import { NextResponse } from 'next/server';
import { withAuth, combineMiddlewares, withErrorHandling, AuthenticatedRequest } from '@/lib/middleware/auth';

async function validateTokenHandler(req: AuthenticatedRequest) {
  return NextResponse.json({
    success: true,
    valid: true,
    user: {
      id: req.user!._id,
      email: req.user!.email,
      role: req.user!.role
    }
  });
}

export const GET = combineMiddlewares(withErrorHandling, withAuth)(validateTokenHandler);
