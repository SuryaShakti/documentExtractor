import { NextResponse } from 'next/server';

export async function GET() {
  const apiDocumentation = {
    success: true,
    message: 'Document Extractor API v2.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: {
        'GET /api/health': 'API health check'
      },
      authentication: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'User login',
        'GET /api/auth/me': 'Get current user info',
        'PUT /api/auth/profile': 'Update user profile',
        'POST /api/auth/change-password': 'Change password',
        'POST /api/auth/logout': 'User logout',
        'GET /api/auth/validate-token': 'Validate JWT token'
      },
      projects: {
        'GET /api/projects': 'List user projects',
        'POST /api/projects': 'Create new project',
        'GET /api/projects/[id]': 'Get specific project',
        'PUT /api/projects/[id]': 'Update project',
        'DELETE /api/projects/[id]': 'Delete project',
        'GET /api/projects/[id]/grid-config': 'Get project grid configuration'
      },
      collaborators: {
        'POST /api/projects/[id]/collaborators': 'Add project collaborator',
        'DELETE /api/projects/[id]/collaborators/[userId]': 'Remove collaborator'
      },
      columns: {
        'POST /api/projects/[id]/columns': 'Add new column to project',
        'PUT /api/projects/[id]/columns/[columnId]': 'Update column',
        'DELETE /api/projects/[id]/columns/[columnId]': 'Delete column'
      },
      documents: {
        'GET /api/projects/[id]/documents': 'List project documents',
        'POST /api/projects/[id]/documents/upload': 'Upload documents',
        'GET /api/projects/[id]/documents/[docId]': 'Get specific document',
        'PUT /api/projects/[id]/documents/[docId]': 'Update document',
        'DELETE /api/projects/[id]/documents/[docId]': 'Delete document'
      },
      admin: {
        'GET /api/admin/dashboard': 'Admin dashboard analytics',
        'GET /api/admin/users': 'List all users',
        'GET /api/admin/users/[userId]': 'Get user details',
        'PUT /api/admin/users/[userId]': 'Update user (admin)',
        'DELETE /api/admin/users/[userId]': 'Suspend user account'
      },
      legacy: {
        'GET /api/documents': 'Legacy documents endpoint (backward compatibility)',
        'POST /api/documents': 'Legacy document operations',
        'DELETE /api/documents': 'Legacy document deletion'
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <jwt_token>',
      note: 'Most endpoints require authentication except registration, login, and health check'
    },
    migration: {
      status: 'Complete',
      from: 'Express.js + Next.js',
      to: 'Next.js Full Stack',
      benefits: [
        'Single server application',
        'No CORS issues',
        'Better TypeScript integration',
        'Simplified deployment',
        'Improved performance'
      ]
    }
  };

  return NextResponse.json(apiDocumentation);
}
