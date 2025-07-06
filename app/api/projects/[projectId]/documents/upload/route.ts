import { NextResponse } from "next/server";
import fs from "fs/promises";
import { v2 as cloudinary } from "cloudinary";
import Document from "@/lib/models/Document";
import {
  withProjectAccess,
  withPermission,
  withUploadRateLimit,
  combineMiddlewares,
  withErrorHandling,
  AuthenticatedRequest,
  getClientIP,
} from "@/lib/middleware/auth";
import {
  parseFormData,
  validateFileType,
  generateUniqueFilename,
} from "@/lib/utils/fileUpload";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to trigger document processing
async function triggerDocumentProcessing(document: any, project: any) {
  try {
    console.log(`Auto-triggering processing for document: ${document.originalName}`);
    
    // Start processing
    await document.updateProcessingStatus('processing', 0);
    
    // Process in background (simulate async processing)
    // In a real production app, you'd use a queue system like Bull/BullMQ, AWS SQS, etc.
    setTimeout(async () => {
      try {
        await processDocumentData(document, project);
        await document.updateProcessingStatus('completed', 100);
        
        document.flags.isProcessed = true;
        document.flags.hasErrors = false;
        await document.save();
        
        console.log(`Document processing completed: ${document.originalName}`);
      } catch (error: any) {
        console.error('Background processing error:', error);
        await document.updateProcessingStatus('failed', null, {
          message: error.message || 'Processing failed',
          code: 'PROCESSING_ERROR'
        });
        
        document.flags.hasErrors = true;
        await document.save();
      }
    }, 1000); // Start processing after 1 second
    
  } catch (error) {
    console.error('Failed to trigger document processing:', error);
    throw error;
  }
}

// Helper function to process document data
async function processDocumentData(document: any, project: any) {
  console.log(`Processing document: ${document.originalName}`);
  
  // Get project columns that need data extraction
  const columns = project.gridConfiguration?.columnDefs || new Map();
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Process each column that has extraction enabled
  for (const [columnId, columnDef] of columns) {
    if (columnId === 'index' || columnId === 'filename') continue;
    
    const customProps = columnDef.customProperties;
    if (!customProps?.extraction?.enabled) continue;
    
    try {
      // Simulate AI extraction (in real app, call OpenAI/other AI service)
      const extractedValue = await simulateDataExtraction(
        document, 
        customProps.prompt, 
        customProps.type
      );
      
      // Save extracted data
      await document.setExtractedData(columnId, {
        value: extractedValue.value,
        type: customProps.type,
        status: extractedValue.status,
        confidence: extractedValue.confidence,
        extractedBy: {
          method: 'ai',
          model: customProps.aiModel || 'gpt-4',
          version: '1.0'
        }
      });
      
      console.log(`Extracted data for column ${columnId}: ${extractedValue.value}`);
      
    } catch (extractionError: any) {
      console.error(`Failed to extract data for column ${columnId}:`, extractionError);
      
      // Set empty data with error status
      await document.setExtractedData(columnId, {
        value: '',
        type: customProps.type,
        status: null,
        confidence: 0,
        extractedBy: {
          method: 'ai',
          model: customProps.aiModel || 'gpt-4',
          version: '1.0'
        }
      });
    }
  }
}

// Simulate AI data extraction (replace with real AI service)
async function simulateDataExtraction(document: any, prompt: string, dataType: string) {
  // This is a simulation - in a real app, you'd call OpenAI or another AI service
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Generate mock data based on document and prompt
  const mockData = generateMockExtractedData(document.originalName, dataType);
  
  return {
    value: mockData.value,
    status: 'yes' as const,
    confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7-1.0
  };
}

// Generate realistic mock data for testing
function generateMockExtractedData(filename: string, dataType: string) {
  const mockValues: Record<string, string[]> = {
    text: ['Important Document', 'Contract Agreement', 'Report Summary'],
    date: ['2024-01-15', '2023-12-01', '2024-03-22'],
    price: ['$1,250.00', '$899.99', '$15,000.00'],
    location: ['New York, NY', 'Los Angeles, CA', 'Chicago, IL'],
    person: ['John Smith', 'Sarah Johnson', 'Michael Brown'],
    organization: ['Acme Corp', 'TechStart Inc', 'Global Solutions LLC'],
    status: ['Active', 'Pending', 'Completed'],
    collection: ['Set A', 'Category B', 'Group 1']
  };
  
  const values = mockValues[dataType] || mockValues.text;
  const randomValue = values[Math.floor(Math.random() * values.length)];
  
  return { value: randomValue };
}

// POST /api/projects/[projectId]/documents/upload - Upload documents to a project
async function uploadDocumentsHandler(req: AuthenticatedRequest) {
  try {
    // Parse the form data
    const { files } = await parseFormData(req);

    if (!files || Object.keys(files).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No files uploaded",
        },
        { status: 400 }
      );
    }

    const uploadedDocuments = [];
    const fileArray = Array.isArray(files.documents)
      ? files.documents
      : [files.documents];

    for (const file of fileArray) {
      if (!file) continue;

      // Validate file type
      if (!validateFileType(file)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid file type: ${file.mimetype}. Only PDF, DOC, DOCX, TXT, CSV, JPG, JPEG, PNG files are allowed.`,
          },
          { status: 400 }
        );
      }

      // Check if user can upload this file size
      if (!req.user!.canUploadDocument(file.size || 0)) {
        return NextResponse.json(
          {
            success: false,
            error: `Storage limit exceeded for ${
              req.user!.subscription.plan
            } plan. Cannot upload ${file.originalFilename}.`,
          },
          { status: 400 }
        );
      }

      // Upload to Cloudinary
      const fileBuffer = await fs.readFile(file.filepath);
      const base64File = fileBuffer.toString("base64");
      const dataURI = `data:${file.mimetype};base64,${base64File}`;

      const uniqueFilename = generateUniqueFilename(
        file.originalFilename || "unknown",
        req.user!._id.toString()
      );

      const uploadResult = await cloudinary.uploader.upload(dataURI, {
        folder: "document-extractor",
        public_id: uniqueFilename.replace(/\.[^/.]+$/, ""), // Remove extension as Cloudinary adds it
        resource_type: "auto",
      });

      // Create document record
      const document = await Document.create({
        filename: uniqueFilename,
        originalName: file.originalFilename || "unknown",
        projectId: req.project!._id,
        uploaderId: req.user!._id,
        cloudinary: {
          publicId: uploadResult.public_id,
          url: uploadResult.url,
          secureUrl: uploadResult.secure_url,
          format: uploadResult.format,
          resourceType: uploadResult.resource_type,
        },
        fileMetadata: {
          size: file.size || 0,
          mimeType: file.mimetype || "application/octet-stream",
          extension:
            file.originalFilename?.split(".").pop()?.toLowerCase() || "",
          dimensions:
            uploadResult.width && uploadResult.height
              ? {
                  width: uploadResult.width,
                  height: uploadResult.height,
                }
              : undefined,
        },
        processing: {
          status: "pending",
          progress: 0,
        },
        auditLog: [
          {
            action: "created",
            userId: req.user!._id,
            details: {
              uploadMethod: "web",
              fileSize: file.size || 0,
              fileType: file.mimetype || "unknown",
            },
            ipAddress: getClientIP(req),
            userAgent: req.headers.get("User-Agent") || "unknown",
            timestamp: new Date(),
          },
        ],
      });

      // Initialize extracted data with empty values for existing columns
      const columnDefs = req.project!.gridConfiguration.columnDefs;
      columnDefs.forEach((column, columnId) => {
        if (columnId !== "index" && columnId !== "filename") {
          document.extractedData.set(columnId, {
            value: "",
            type: column.customProperties?.type || "text",
            status: null,
            confidence: 0,
            extractedAt: new Date(),
            extractedBy: { method: "ai" },
          });
        }
      });

      await document.save();

      await document.populate("uploaderId", "firstName lastName email");
      uploadedDocuments.push(document);

      // Auto-trigger document processing
      try {
        await triggerDocumentProcessing(document, req.project!);
      } catch (processingError) {
        console.warn(`Failed to auto-process document ${document._id}:`, processingError);
        // Don't fail the upload if processing fails - it can be retried later
      }

      // Clean up temp file
      try {
        await fs.unlink(file.filepath);
      } catch (error) {
        console.warn("Failed to clean up temp file:", error);
      }
    }

    // Update project stats
    await req.project!.updateStats();

    // Update user stats
    await req.user!.updateStats();

    return NextResponse.json(
      {
        success: true,
        message: `${uploadedDocuments.length} document(s) uploaded successfully`,
        data: {
          documents: uploadedDocuments,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Document upload error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload documents: " + error.message,
      },
      { status: 500 }
    );
  }
}

export const POST = combineMiddlewares(
  withErrorHandling,
  withProjectAccess,
  withPermission("canEdit"),
  withUploadRateLimit
)(uploadDocumentsHandler);

// Disable Next.js body parsing for file uploads
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };
