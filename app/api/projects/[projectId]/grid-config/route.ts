import { NextResponse } from 'next/server';
import { withProjectAccess, combineMiddlewares, withErrorHandling, AuthenticatedRequest } from '@/lib/middleware/auth';

// GET /api/projects/[projectId]/grid-config - Get project grid configuration
async function getGridConfigHandler(req: AuthenticatedRequest) {
  const gridConfig = req.project!.gridConfiguration;
  
  // Convert Map to Object for JSON response
  const response = {
    meta: gridConfig.meta,
    gridOptions: gridConfig.gridOptions,
    columnDefs: Object.fromEntries(gridConfig.columnDefs)
  };

  return NextResponse.json({
    success: true,
    data: response
  });
}

export const GET = combineMiddlewares(withErrorHandling, withProjectAccess)(getGridConfigHandler);
