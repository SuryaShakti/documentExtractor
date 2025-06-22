import { NextResponse } from 'next/server';
import { withAuth, combineMiddlewares, withErrorHandling, AuthenticatedRequest } from '@/lib/middleware/auth';

async function meHandler(req: AuthenticatedRequest) {
  // Update user stats
  await req.user!.updateStats();

  return NextResponse.json({
    success: true,
    user: {
      id: req.user!._id,
      email: req.user!.email,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName,
      fullName: req.user!.fullName,
      role: req.user!.role,
      status: req.user!.status,
      subscription: req.user!.subscription,
      preferences: req.user!.preferences,
      stats: req.user!.stats,
      lastLogin: req.user!.lastLogin,
      createdAt: req.user!.createdAt
    }
  });
}

export const GET = combineMiddlewares(withErrorHandling, withAuth)(meHandler);
