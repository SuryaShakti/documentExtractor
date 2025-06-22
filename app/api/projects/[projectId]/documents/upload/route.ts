import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { v2 as cloudinary } from 'cloudinary';
import Document from '@/lib/models/Document';
import { withProjectAccess, withPermission, withUploadRateLimit, combineMiddlewares, withErrorHandling, AuthenticatedRequest, getClientIP } from '@/lib/middleware/auth';
import { parseFormData, validateFileType, generateUniqueFilename } from '@/lib/utils/fileUpload';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/projects/[projectId]/documents/upload - Upload documents to a project
async function uploadDocumentsHandler(req: AuthenticatedRequest) {
  try {
    // Parse the form data
    const { files } = await parseFormData(req);
    
    if (!files || Object.keys(files).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No files uploaded'
      }, { status: 400 });
    }

    const uploadedDocuments = [];
    const fileArray = Array.isArray(files.documents) ? files.documents : [files.documents];
    
    for (const file of fileArray) {
      if (!file) continue;

      // Validate file type
      if (!validateFileType(file)) {
        return NextResponse.json({
          success: false,
          error: `Invalid file type: ${file.mimetype}. Only PDF, DOC, DOCX, TXT, CSV, JPG, JPEG, PNG files are allowed.`
        }, { status: 400 });
      }

      // Check if user can upload this file size
      if (!req.user!.canUploadDocument(file.size || 0)) {
        return NextResponse.json({
          success: false,
          error: `Storage limit exceeded for ${req.user!.subscription.plan} plan. Cannot upload ${file.originalFilename}.`
        }, { status: 400 });
      }

      // Upload to Cloudinary
      const fileBuffer = await fs.readFile(file.filepath);
      const base64File = fileBuffer.toString('base64');
      const dataURI = `data:${file.mimetype};base64,${base64File}`;

      const uniqueFilename = generateUniqueFilename(file.originalFilename || 'unknown', req.user!._id.toString());
      
      const uploadResult = await cloudinary.uploader.upload(dataURI, {
        folder: 'document-extractor',
        public_id: uniqueFilename.replace(/\.[^/.]+$/, ''), // Remove extension as Cloudinary adds it
        resource_type: 'auto'
      });

      // Create document record
      const document = await Document.create({
        filename: uniqueFilename,
        originalName: file.originalFilename || 'unknown',
        projectId: req.project!._id,
        uploaderId: req.user!._id,
        cloudinary: {
          publicId: uploadResult.public_id,
          url: uploadResult.url,
          secureUrl: uploadResult.secure_url,
          format: uploadResult.format,
          resourceType: uploadResult.resource_type
        },
        fileMetadata: {
          size: file.size || 0,
          mimeType: file.mimetype || 'application/octet-stream',
          extension: file.originalFilename?.split('.').pop()?.toLowerCase() || '',
          dimensions: uploadResult.width && uploadResult.height ? {
            width: uploadResult.width,
            height: uploadResult.height
          } : undefined
        },
        processing: {
          status: 'pending',
          progress: 0
        },
        auditLog: [{
          action: 'created',
          userId: req.user!._id,
          details: {
            uploadMethod: 'web',
            fileSize: file.size || 0,
            fileType: file.mimetype || 'unknown'
          },
          ipAddress: getClientIP(req),
          userAgent: req.headers.get('User-Agent') || 'unknown',
          timestamp: new Date()
        }]
      });

      // Initialize extracted data with empty values for existing columns
      const columnDefs = req.project!.gridConfiguration.columnDefs;
      columnDefs.forEach((column, columnId) => {
        if (columnId !== 'index' && columnId !== 'filename') {
          document.extractedData.set(columnId, {
            value: '',
            type: column.customProperties?.type || 'text',
            status: null,
            confidence: 0,
            extractedAt: new Date(),
            extractedBy: { method: 'ai' }
          });
        }
      });

      await document.save();
      
      await document.populate('uploaderId', 'firstName lastName email');
      uploadedDocuments.push(document);

      // Clean up temp file
      try {
        await fs.unlink(file.filepath);
      } catch (error) {
        console.warn('Failed to clean up temp file:', error);
      }
    }

    // Update project stats
    await req.project!.updateStats();
    
    // Update user stats
    await req.user!.updateStats();

    return NextResponse.json({
      success: true,
      message: `${uploadedDocuments.length} document(s) uploaded successfully`,
      data: {
        documents: uploadedDocuments
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Document upload error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to upload documents: ' + error.message
    }, { status: 500 });
  }
}

export const POST = combineMiddlewares(
  withErrorHandling, 
  withProjectAccess, 
  withPermission('canEdit'),
  withUploadRateLimit
)(uploadDocumentsHandler);

// Disable Next.js body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
