import { NextResponse } from 'next/server';
import User from '@/lib/models/User';
import Project from '@/lib/models/Project';
import Document from '@/lib/models/Document';
import { withAdmin, combineMiddlewares, withErrorHandling, AuthenticatedRequest, getRequestBody } from '@/lib/middleware/auth';
import { validateRequestBody, updateUserAdminSchema } from '@/lib/utils/validation';

// GET /api/admin/users/[userId] - Get a specific user details
async function getUserHandler(req: AuthenticatedRequest) {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  const userId = pathSegments[pathSegments.length - 1];

  const user = await User.findById(userId).select('-password');
  
  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'User not found'
    }, { status: 404 });
  }

  // Get user's projects and documents counts
  const [projects, documents] = await Promise.all([
    Project.find({ ownerId: userId, status: { $ne: 'deleted' } })
      .select('name createdAt stats')
      .sort({ createdAt: -1 })
      .limit(10),
    Document.countDocuments({ uploaderId: userId, status: { $ne: 'deleted' } })
  ]);

  return NextResponse.json({
    success: true,
    data: {
      user,
      projects,
      documentsCount: documents,
      activity: {
        recentProjects: projects.length,
        totalDocuments: documents
      }
    }
  });
}

// PUT /api/admin/users/[userId] - Update user details (admin only)
async function updateUserHandler(req: AuthenticatedRequest) {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  const userId = pathSegments[pathSegments.length - 1];

  const body = await getRequestBody(req);
  
  // Validate request body
  const validation = validateRequestBody(updateUserAdminSchema, body);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      details: validation.details
    }, { status: 400 });
  }

  const updates = validation.data;

  const user = await User.findById(userId);
  
  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'User not found'
    }, { status: 404 });
  }

  // Don't allow updating admin user's role/status by other admins
  if (user.role === 'admin' && user._id.toString() !== req.user!._id.toString()) {
    return NextResponse.json({
      success: false,
      error: 'Cannot modify other admin accounts'
    }, { status: 403 });
  }

  // Update fields
  if (updates.firstName) user.firstName = updates.firstName;
  if (updates.lastName) user.lastName = updates.lastName;
  if (updates.status) user.status = updates.status;
  if (updates.subscription) {
    user.subscription = { ...user.subscription, ...updates.subscription };
  }

  await user.save();

  return NextResponse.json({
    success: true,
    message: 'User updated successfully',
    data: { user }
  });
}

// DELETE /api/admin/users/[userId] - Suspend/Deactivate a user account
async function deleteUserHandler(req: AuthenticatedRequest) {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  const userId = pathSegments[pathSegments.length - 1];

  const user = await User.findById(userId);
  
  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'User not found'
    }, { status: 404 });
  }

  // Don't allow deleting admin users
  if (user.role === 'admin') {
    return NextResponse.json({
      success: false,
      error: 'Cannot deactivate admin accounts'
    }, { status: 403 });
  }

  // Don't allow self-deletion
  if (user._id.toString() === req.user!._id.toString()) {
    return NextResponse.json({
      success: false,
      error: 'Cannot deactivate your own account'
    }, { status: 403 });
  }

  // Suspend the user
  user.status = 'suspended';
  await user.save();

  return NextResponse.json({
    success: true,
    message: 'User account suspended successfully'
  });
}

export const GET = combineMiddlewares(withErrorHandling, withAdmin)(getUserHandler);
export const PUT = combineMiddlewares(withErrorHandling, withAdmin)(updateUserHandler);
export const DELETE = combineMiddlewares(withErrorHandling, withAdmin)(deleteUserHandler);
