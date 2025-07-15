import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { v2 as cloudinary } from "cloudinary";
import Document from "@/lib/models/Document";
import DocumentCollection from "@/lib/models/DocumentCollection";
import Project from "@/lib/models/Project";
import User from "@/lib/models/User";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/database/mongodb";
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

// Helper function to get client IP
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIP = req.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0].trim();
  if (realIP) return realIP;
  return "unknown";
}

// Helper function to trigger document processing
async function triggerDocumentProcessing(document: any, project: any) {
  try {
    console.log(`Auto-triggering processing for document: ${document.originalName}`);
    await document.updateProcessingStatus('processing', 0);
    
    // Process in background
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
    }, 1000);
  } catch (error) {
    console.error('Failed to trigger document processing:', error);
    throw error;
  }
}

// Helper function to process document data
async function processDocumentData(document: any, project: any) {
  console.log(`Processing document: ${document.originalName}`);
  const columns = project.gridConfiguration?.columnDefs || new Map();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  for (const [columnId, columnDef] of columns) {
    if (columnId === 'index' || columnId === 'filename') continue;
    const customProps = columnDef.customProperties;
    if (!customProps?.extraction?.enabled) continue;
    
    try {
      const extractedValue = await simulateDataExtraction(document, customProps.prompt, customProps.type);
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

// Simulate AI data extraction
async function simulateDataExtraction(document: any, prompt: string, dataType: string) {
  await new Promise(resolve => setTimeout(resolve, 500));
  
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
  
  return {
    value: randomValue,
    status: 'yes' as const,
    confidence: Math.random() * 0.3 + 0.7,
  };
}

// POST /api/document-collections/[collectionId]/upload
export async function POST(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    console.log('🚀 Collection upload API called');
    console.log('Collection ID from params:', params.collectionId);
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);
    console.log('Content-Type:', request.headers.get('content-type'));
    
    await connectDB();
    console.log('✅ Database connected');

    // Authentication
    let token: string | undefined = undefined;
    const authHeader = request.headers.get("authorization");
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    }

    // If not in header, try cookies
    if (!token) {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split("=");
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        token = cookies.access_token;
      }
    }

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Access denied. No token provided.",
        },
        { status: 401 }
      );
    }

    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await User.findById(decoded.id).select("-password");

    if (!user || user.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or inactive user.",
        },
        { status: 401 }
      );
    }

    const { collectionId } = params;

    // Find the collection
    const collection = await DocumentCollection.findById(collectionId);
    if (!collection) {
      return NextResponse.json(
        {
          success: false,
          error: "Collection not found",
        },
        { status: 404 }
      );
    }

    // Find the project and verify access
    const project = await Project.findById(collection.projectId);
    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: "Project not found",
        },
        { status: 404 }
      );
    }

    // Check user permissions
    const userPermissions = project.getUserPermissions(user._id);
    if (!userPermissions || !userPermissions.canEdit) {
      return NextResponse.json(
        {
          success: false,
          error: "Permission denied. You don't have edit access to this project.",
        },
        { status: 403 }
      );
    }

    // Parse form data
    const { files } = await parseFormData(request);

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
    const fileArray = Array.isArray(files.documents) ? files.documents : [files.documents];

    console.log(`Processing ${fileArray.length} files for collection: ${collection.name}`);

    for (const file of fileArray) {
      if (!file) continue;

      console.log(`Processing file: ${file.originalFilename} (${file.size} bytes)`);

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

      // Check file size limit
      if (!user.canUploadDocument(file.size || 0)) {
        return NextResponse.json(
          {
            success: false,
            error: `Storage limit exceeded for ${user.subscription.plan} plan. Cannot upload ${file.originalFilename}.`,
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
        user._id.toString()
      );

      // Determine resource type
      const getResourceType = (mimeType: string) => {
        if (mimeType === 'application/pdf') return 'raw';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        return 'raw';
      };

      console.log(`Uploading to Cloudinary: ${uniqueFilename}`);

      const uploadResult = await cloudinary.uploader.upload(dataURI, {
        folder: "documents",
        public_id: uniqueFilename.replace(/\.[^/.]+$/, ""),
        resource_type: getResourceType(file.mimetype || ""),
        format: file.mimetype === 'application/pdf' ? 'pdf' : undefined,
      });

      console.log(`Cloudinary upload successful: ${uploadResult.secure_url}`);

      // Create document record
      const document = await Document.create({
        filename: uniqueFilename,
        originalName: file.originalFilename || "unknown",
        projectId: project._id,
        uploaderId: user._id,
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
          extension: file.originalFilename?.split(".").pop()?.toLowerCase() || "",
          dimensions: uploadResult.width && uploadResult.height ? {
            width: uploadResult.width,
            height: uploadResult.height,
          } : undefined,
        },
        processing: {
          status: "pending",
          progress: 0,
        },
        auditLog: [{
          action: "created",
          userId: user._id,
          details: {
            uploadMethod: "collection",
            collectionId: collection._id,
            fileSize: file.size || 0,
            fileType: file.mimetype || "unknown",
          },
          ipAddress: getClientIP(request),
          userAgent: request.headers.get("User-Agent") || "unknown",
          timestamp: new Date(),
        }],
      });

      // Initialize extracted data for existing columns
      const columnDefs = project.gridConfiguration.columnDefs;
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

      console.log(`Document created with ID: ${document._id}`);

      // ✅ ADD DOCUMENT TO THE EXISTING COLLECTION
      await collection.addDocument(document._id);
      console.log(`Document added to collection: ${collection.name}`);

      await document.populate("uploaderId", "firstName lastName email");
      uploadedDocuments.push(document);

      // Trigger processing
      try {
        await triggerDocumentProcessing(document, project);
      } catch (processingError) {
        console.warn(`Failed to auto-process document ${document._id}:`, processingError);
      }

      // Clean up temp file
      try {
        await fs.unlink(file.filepath);
      } catch (error) {
        console.warn("Failed to clean up temp file:", error);
      }
    }

    // Update collection stats
    await collection.updateStats();
    await project.updateStats();
    await user.updateStats();

    // Return updated collection with populated documents
    await collection.populate('documents', 'filename originalName fileMetadata processing cloudinary uploaderId tags createdAt');

    console.log(`✅ Successfully uploaded ${uploadedDocuments.length} documents to collection`);

    return NextResponse.json(
      {
        success: true,
        message: `${uploadedDocuments.length} document(s) uploaded to collection successfully`,
        data: {
          documents: uploadedDocuments,
          collection: collection,
        },
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("❌ Collection upload error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload documents to collection: " + error.message,
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
