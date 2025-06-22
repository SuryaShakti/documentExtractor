import { NextResponse } from 'next/server';
import { withAuth, combineMiddlewares, withErrorHandling, AuthenticatedRequest, getRequestBody } from '@/lib/middleware/auth';
import { validateRequestBody, updateUserSchema } from '@/lib/utils/validation';

async function profileHandler(req: AuthenticatedRequest) {
  const body = await getRequestBody(req);
  
  // Validate request body
  const validation = validateRequestBody(updateUserSchema, body);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      details: validation.details
    }, { status: 400 });
  }

  const { firstName, lastName, preferences } = validation.data;

  const user = req.user!;

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (preferences) {
    user.preferences = { ...user.preferences, ...preferences };
  }

  await user.save();

  return NextResponse.json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      preferences: user.preferences
    }
  });
}

export const PUT = combineMiddlewares(withErrorHandling, withAuth)(profileHandler);
