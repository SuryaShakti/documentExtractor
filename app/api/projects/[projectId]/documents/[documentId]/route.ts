import { NextResponse } from 'next/server';
import Document from '@/lib/models/Document';
import { withProjectAccess, withPermission, combineMiddlewares, withErrorHandling, AuthenticatedRequest, getRequestBody, getClientIP } from '@/lib/middleware/auth';
import { validateRequestBody, updateDocumentSchema } from '@/lib/utils/validation';

// GET /api/projects/[projectId]/documents/[documentId] - Get a specific document
async function getDocumentHandler(req: AuthenticatedRequest) {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  const documentId = pathSegments[pathSegments.length - 1];

  const document = await Document.findOne({
    _id: documentId,
    projectId: req.project!._id,
    status: { $ne: 'deleted' }
  }).populate('uploaderId', 'firstName lastName email');

  if (!document) {
    return NextResponse.json({
      success: false,
      error: 'Document not found'
    }, { status: 404 });
  }

  // Increment view count
  await document.incrementAnalytics('view');

  // Convert extractedData Map to Object for JSON response
  const documentData = document.toObject();
  documentData.extractedData = Object.fromEntries(document.extractedData);

  return NextResponse.json({
    success: true,
    data: { document: documentData }
  });
}

// PUT /api/projects/[projectId]/documents/[documentId] - Update document metadata
async function updateDocumentHandler(req: AuthenticatedRequest) {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  const documentId = pathSegments[pathSegments.length - 1];

  const body = await getRequestBody(req);
  
  // Validate request body
  const validation = validateRequestBody(updateDocumentSchema, body);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      details: validation.details
    }, { status: 400 });
  }

  const { tags, category, flags } = validation.data;

  const document = await Document.findOne({
    _id: documentId,
    projectId: req.project!._id,
    status: { $ne: 'deleted' }
  });

  if (!document) {
    return NextResponse.json({
      success: false,
      error: 'Document not found'
    }, { status: 404 });
  }

  // Update fields
  if (tags !== undefined) document.tags = tags;
  if (category !== undefined) document.category = category;
  if (flags) {
    document.flags = { ...document.flags, ...flags };
  }

  // Add audit log
  await document.addAuditLog('updated', req.user!._id, {
    updatedFields: Object.keys(body),
    oldValues: { tags: document.tags, category: document.category, flags: document.flags }
  }, req);

  await document.save();

  return NextResponse.json({
    success: true,
    message: 'Document updated successfully',
    data: { document }
  });
}

// DELETE /api/projects/[projectId]/documents/[documentId] - Delete a document
async function deleteDocumentHandler(req: AuthenticatedRequest) {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');
  const documentId = pathSegments[pathSegments.length - 1];

  const document = await Document.findOne({
    _id: documentId,
    projectId: req.project!._id,
    status: { $ne: 'deleted' }
  });

  if (!document) {
    return NextResponse.json({
      success: false,
      error: 'Document not found'
    }, { status: 404 });
  }

  // Soft delete - change status to deleted
  document.status = 'deleted';
  
  // Add audit log
  await document.addAuditLog('deleted', req.user!._id, {
    deleteMethod: 'soft'
  }, req);

  await document.save();

  // Update project and user stats
  await Promise.all([
    req.project!.updateStats(),
    req.user!.updateStats()
  ]);

  return NextResponse.json({
    success: true,
    message: 'Document deleted successfully'
  });
}

export const GET = combineMiddlewares(withErrorHandling, withProjectAccess)(getDocumentHandler);
export const PUT = combineMiddlewares(withErrorHandling, withProjectAccess, withPermission('canEdit'))(updateDocumentHandler);
export const DELETE = combineMiddlewares(withErrorHandling, withProjectAccess, withPermission('canEdit'))(deleteDocumentHandler);
