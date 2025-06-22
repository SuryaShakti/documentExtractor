import { NextResponse } from 'next/server';
import User from '@/lib/models/User';
import { withAdmin, combineMiddlewares, withErrorHandling, AuthenticatedRequest, getQueryParams } from '@/lib/middleware/auth';
import { validateQuery, adminQuerySchema } from '@/lib/utils/validation';

// GET /api/admin/users - Get all users with pagination and filtering
async function getUsersHandler(req: AuthenticatedRequest) {
  const queryParams = getQueryParams(req);
  
  // Validate query parameters
  const validation = validateQuery(adminQuerySchema, queryParams);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      details: validation.details
    }, { status: 400 });
  }

  const { page, limit, sortBy, sortOrder, status, role, plan, search } = validation.data;

  // Build query
  const query: any = {};
  
  if (status) query.status = status;
  if (role) query.role = role;
  if (plan) query['subscription.plan'] = plan;
  
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  // Build sort object
  const sort: any = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const [users, totalCount] = await Promise.all([
    User.find(query)
      .sort(sort)
      .limit(limit)
      .skip((page - 1) * limit)
      .select('-password')
      .lean(),
    User.countDocuments(query)
  ]);

  return NextResponse.json({
    success: true,
    data: {
      users,
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

export const GET = combineMiddlewares(withErrorHandling, withAdmin)(getUsersHandler);
