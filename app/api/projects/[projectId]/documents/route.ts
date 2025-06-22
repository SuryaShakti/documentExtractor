import { NextResponse } from 'next/server';
import Document from '@/lib/models/Document';
import { withProjectAccess, combineMiddlewares, withErrorHandling, AuthenticatedRequest, getQueryParams } from '@/lib/middleware/auth';
import { validateQuery, documentQuerySchema } from '@/lib/utils/validation';

// GET /api/projects/[projectId]/documents - Get all documents for a project
async function getDocumentsHandler(req: AuthenticatedRequest) {
  const queryParams = getQueryParams(req);
  
  // Validate query parameters
  const validation = validateQuery(documentQuerySchema, queryParams);
  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: validation.error,
      details: validation.details
    }, { status: 400 });
  }

  const { page, limit, sortBy, sortOrder, status, search, category, tags, processingStatus } = validation.data;

  // Build query
  const query: any = {
    projectId: req.project!._id,
    status
  };

  if (search) {
    query.$or = [
      { filename: { $regex: search, $options: 'i' } },
      { originalName: { $regex: search, $options: 'i' } }
    ];
  }

  if (category) {
    query.category = category;
  }

  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  if (processingStatus) {
    query['processing.status'] = processingStatus;
  }

  // Build sort object
  const sort: any = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const [documents, totalCount] = await Promise.all([
    Document.find(query)
      .sort(sort)
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('uploaderId', 'firstName lastName email')
      .lean(),
    Document.countDocuments(query)
  ]);

  // Format response with grid data structure
  const rowData = documents.map(doc => {
    const formattedDoc: any = {
      id: doc._id,
      filename: doc.filename,
      originalName: doc.originalName,
      uploadDate: doc.createdAt.toISOString().split('T')[0],
      fileType: doc.fileMetadata.mimeType,
      fileUrl: doc.cloudinary.secureUrl,
      size: doc.fileMetadata.size,
      status: doc.processing.status,
      uploader: doc.uploaderId
    };

    // Add extracted data for each column
    if (doc.extractedData) {
      Object.entries(doc.extractedData).forEach(([columnId, data]) => {
        formattedDoc[columnId] = data;
      });
    }

    return formattedDoc;
  });

  return NextResponse.json({
    success: true,
    data: {
      rowData,
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

export const GET = combineMiddlewares(withErrorHandling, withProjectAccess)(getDocumentsHandler);
