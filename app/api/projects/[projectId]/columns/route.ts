import { NextResponse } from 'next/server';
import { withProjectAccess, withPermission, combineMiddlewares, withErrorHandling, AuthenticatedRequest, getRequestBody } from '@/lib/middleware/auth';
import { validateRequestBody, addColumnSchema } from '@/lib/utils/validation';

// POST /api/projects/[projectId]/columns - Add a new column to project
async function addColumnHandler(req: AuthenticatedRequest) {
  const body = await getRequestBody(req);
  
  // Validate request body
  const validation = validateRequestBody(addColumnSchema, body);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      details: validation.details
    }, { status: 400 });
  }

  const columnData = validation.data;

  const columnId = req.project!.addColumn(columnData);
  await req.project!.save();

  const addedColumn = req.project!.gridConfiguration.columnDefs.get(columnId);

  return NextResponse.json({
    success: true,
    message: 'Column added successfully',
    data: {
      columnId,
      column: addedColumn
    }
  }, { status: 201 });
}

export const POST = combineMiddlewares(withErrorHandling, withProjectAccess, withPermission('canEdit'))(addColumnHandler);
