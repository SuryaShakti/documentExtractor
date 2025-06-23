import { NextResponse } from 'next/server';
import User from '@/lib/models/User';
import { withAuth, combineMiddlewares, withErrorHandling, AuthenticatedRequest, getRequestBody } from '@/lib/middleware/auth';

async function changePasswordHandler(req: AuthenticatedRequest) {
  const body = await getRequestBody(req);
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({
      success: false,
      error: 'Current password and new password are required'
    }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({
      success: false,
      error: 'New password must be at least 6 characters long'
    }, { status: 400 });
  }

  const user = await User.findById(req.user!._id).select('+password');

  // Check current password
  const isCurrentPasswordValid = await user!.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return NextResponse.json({
      success: false,
      error: 'Current password is incorrect'
    }, { status: 400 });
  }

  // Update password
  user!.password = newPassword; // Will be hashed by pre-save middleware
  await user!.save();

  return NextResponse.json({
    success: true,
    message: 'Password changed successfully'
  });
}

export const POST = combineMiddlewares(withErrorHandling, withAuth)(changePasswordHandler);
