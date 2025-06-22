import { NextResponse } from 'next/server';
import Document from '@/lib/models/Document';
import { withProjectAccess, withPermission, combineMiddlewares, withErrorHandling, AuthenticatedRequest, getRequestBody } from '@/lib/middleware/auth';
import { validateRequestBody, updateColumnSchema } from '@/lib/utils/validation';

// PUT /api/projects/[projectId]/columns/[columnId] - Update a column in project
async function updateColumnHandler(req: AuthenticatedRequest) {
  const body = await getRequestBody(req);
  
  // Validate request body
  const validation = validateRequestBody(updateColumnSchema, body);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      details: validation.details
    }, { status: 400 });
  }

  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  const columnId = pathSegments[pathSegments.length - 1];
  const updates = validation.data;

  if (!req.project!.gridConfiguration.columnDefs.has(columnId)) {
    return NextResponse.json({
      success: false,
      error: 'Column not found'
    }, { status: 404 });
  }

  const column = req.project!.gridConfiguration.columnDefs.get(columnId);
  
  // Update column properties
  if (updates.name) {
    column!.headerName = updates.name;
    if (column!.customProperties) {
      column!.customProperties.name = updates.name;
    }
  }
  if (updates.width) column!.width = updates.width;
  
  if (column!.customProperties) {
    if (updates.prompt) column!.customProperties.prompt = updates.prompt;
    if (updates.aiModel) column!.customProperties.aiModel = updates.aiModel;
    if (updates.type) column!.customProperties.type = updates.type;
    if (updates.color) {
      column!.customProperties.color = updates.color;
      column!.customProperties.styling.backgroundColor = updates.color;
    }
  }

  req.project!.gridConfiguration.columnDefs.set(columnId, column!);
  req.project!.gridConfiguration.meta.lastUpdated = new Date();
  
  await req.project!.save();

  return NextResponse.json({
    success: true,
    message: 'Column updated successfully',
    data: { column }
  });
}

// DELETE /api/projects/[projectId]/columns/[columnId] - Delete a column from project
async function deleteColumnHandler(req: AuthenticatedRequest) {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  const columnId = pathSegments[pathSegments.length - 1];

  try {
    req.project!.removeColumn(columnId);
    await req.project!.save();

    // Also remove this column data from all documents in this project
    await Document.updateMany(
      { projectId: req.project!._id },
      { $unset: { [`extractedData.${columnId}`]: "" } }
    );

    return NextResponse.json({
      success: true,
      message: 'Column deleted successfully'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}

export const PUT = combineMiddlewares(withErrorHandling, withProjectAccess, withPermission('canEdit'))(updateColumnHandler);
export const DELETE = combineMiddlewares(withErrorHandling, withProjectAccess, withPermission('canEdit'))(deleteColumnHandler);
