import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import Project, { IProject } from '../models/Project';
import connectDB from '../database/mongodb';

export interface AuthenticatedRequest extends NextRequest {
  user?: IUser;
  project?: IProject;
  userPermissions?: any;
}

// Types for our middleware functions
export type ApiHandler = (req: AuthenticatedRequest) => Promise<NextResponse>;
export type Middleware = (handler: ApiHandler) => ApiHandler;

// Authentication middleware
export const withAuth: Middleware = (handler) => {
  return async (req: AuthenticatedRequest) => {
    try {
      await connectDB();
      
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      if (!token) {
        return NextResponse.json({ 
          success: false, 
          error: 'Access denied. No token provided.' 
        }, { status: 401 });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid token. User not found.' 
        }, { status: 401 });
      }

      if (user.status !== 'active') {
        return NextResponse.json({ 
          success: false, 
          error: 'Account is inactive. Please contact support.' 
        }, { status: 401 });
      }

      // Check subscription expiry
      if (user.subscription.expiryDate && new Date() > user.subscription.expiryDate) {
        return NextResponse.json({ 
          success: false, 
          error: 'Subscription has expired. Please renew your plan.' 
        }, { status: 401 });
      }

      req.user = user;
      return handler(req);
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid token.' 
        }, { status: 401 });
      }
      
      if (error.name === 'TokenExpiredError') {
        return NextResponse.json({ 
          success: false, 
          error: 'Token has expired. Please login again.' 
        }, { status: 401 });
      }

      console.error('Auth middleware error:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Internal server error during authentication.' 
      }, { status: 500 });
    }
  };
};

// Admin middleware (requires authentication first)
export const withAdmin: Middleware = (handler) => {
  return withAuth(async (req: AuthenticatedRequest) => {
    if (!req.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required.' 
      }, { status: 401 });
    }

    if (req.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        error: 'Admin access required. Insufficient permissions.' 
      }, { status: 403 });
    }

    return handler(req);
  });
};

// Project access middleware
export const withProjectAccess: Middleware = (handler) => {
  return withAuth(async (req: AuthenticatedRequest) => {
    try {
      const url = new URL(req.url);
      const pathSegments = url.pathname.split('/');
      const projectIdIndex = pathSegments.findIndex(segment => segment === 'projects') + 1;
      const projectId = pathSegments[projectIdIndex];
      
      if (!projectId) {
        return NextResponse.json({ 
          success: false, 
          error: 'Project ID is required.' 
        }, { status: 400 });
      }

      const project = await Project.findById(projectId);
      
      if (!project) {
        return NextResponse.json({ 
          success: false, 
          error: 'Project not found.' 
        }, { status: 404 });
      }

      if (project.status === 'deleted') {
        return NextResponse.json({ 
          success: false, 
          error: 'Project has been deleted.' 
        }, { status: 404 });
      }

      // Check if user has access to this project
      const hasAccess = project.ownerId.toString() === req.user!._id.toString() ||
                       project.collaborators.some(collab => 
                         collab.userId.toString() === req.user!._id.toString()
                       );

      if (!hasAccess) {
        return NextResponse.json({ 
          success: false, 
          error: 'Access denied. You do not have permission to access this project.' 
        }, { status: 403 });
      }

      req.project = project;
      req.userPermissions = project.getUserPermissions(req.user!._id);
      return handler(req);
    } catch (error) {
      console.error('Project access middleware error:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Error checking project access.' 
      }, { status: 500 });
    }
  });
};

// Permission middleware factory
export const withPermission = (permission: string): Middleware => {
  return (handler) => {
    return async (req: AuthenticatedRequest) => {
      if (!req.userPermissions) {
        return NextResponse.json({ 
          success: false, 
          error: 'User permissions not found.' 
        }, { status: 403 });
      }

      if (!req.userPermissions[permission]) {
        return NextResponse.json({ 
          success: false, 
          error: `Permission denied. Required permission: ${permission}` 
        }, { status: 403 });
      }

      return handler(req);
    };
  };
};

// Rate limiting middleware for file uploads
export const withUploadRateLimit: Middleware = (handler) => {
  return async (req: AuthenticatedRequest) => {
    if (!req.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required.' 
      }, { status: 401 });
    }

    // Check user's subscription limits
    const user = req.user;
    const limits = {
      free: { maxFiles: 5, maxSize: 100 * 1024 * 1024 }, // 5 files, 100MB
      basic: { maxFiles: 20, maxSize: 1024 * 1024 * 1024 }, // 20 files, 1GB
      premium: { maxFiles: 100, maxSize: 10 * 1024 * 1024 * 1024 } // 100 files, 10GB
    };

    const userLimits = limits[user.subscription.plan] || limits.free;
    
    // Additional checks would be implemented here based on the specific upload requirements
    // For now, just pass through
    
    return handler(req);
  };
};

// Error handling wrapper
export const withErrorHandling: Middleware = (handler) => {
  return async (req: AuthenticatedRequest) => {
    try {
      return await handler(req);
    } catch (error: any) {
      console.error('API Error:', error);
      
      // Handle specific error types
      if (error.name === 'ValidationError') {
        return NextResponse.json({
          success: false,
          error: 'Validation error',
          details: Object.values(error.errors).map((err: any) => err.message)
        }, { status: 400 });
      }

      if (error.name === 'CastError') {
        return NextResponse.json({
          success: false,
          error: 'Invalid ID format'
        }, { status: 400 });
      }

      if (error.code === 11000) {
        return NextResponse.json({
          success: false,
          error: 'Duplicate entry detected'
        }, { status: 409 });
      }

      return NextResponse.json({
        success: false,
        error: 'Internal server error'
      }, { status: 500 });
    }
  };
};

// Combine multiple middlewares
export function combineMiddlewares(...middlewares: Middleware[]): Middleware {
  return (handler) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

// Helper function to get client IP
export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

// Helper function to validate request body
export async function getRequestBody(req: NextRequest) {
  try {
    return await req.json();
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

// Helper function to get query parameters
export function getQueryParams(req: NextRequest) {
  const url = new URL(req.url);
  const params: Record<string, any> = {};
  
  url.searchParams.forEach((value, key) => {
    // Handle arrays (multiple values with same key)
    if (params[key]) {
      if (Array.isArray(params[key])) {
        params[key].push(value);
      } else {
        params[key] = [params[key], value];
      }
    } else {
      params[key] = value;
    }
  });
  
  return params;
}
