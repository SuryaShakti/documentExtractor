import { NextRequest, NextResponse } from 'next/server';
import DocumentCollection from '@/lib/models/DocumentCollection';
import Document from '@/lib/models/Document';
import Project from '@/lib/models/Project';
import User from '@/lib/models/User';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/database/mongodb';
import { z } from 'zod';

// Validation schemas
const addDocumentSchema = z.object({
  documentId: z.string().min(1)
});

const removeDocumentSchema = z.object({
  documentId: z.string().min(1)
});

const reorderDocumentsSchema = z.object({
  documentIds: z.array(z.string())
});

const toggleDocumentVisibilitySchema = z.object({
  documentId: z.string().min(1),
  hidden: z.boolean()
});

// Helper function to validate request body
function validateRequestBody(schema: z.ZodSchema, data: any) {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error: any) {
    return {
      success: false,
      error: 'Validation failed',
      details: error.errors?.map((err: any) => err.message) || [error.message]
    };
  }
}

// Helper function to authenticate user
async function authenticateUser(request: NextRequest) {
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
    throw new Error("No token provided");
  }

  // Verify token and get user
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
  const user = await User.findById(decoded.id).select("-password");

  if (!user || user.status !== "active") {
    throw new Error("Invalid or inactive user");
  }

  return user;
}

// POST /api/document-collections/[collectionId]/documents - Add document to collection
export async function POST(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    console.log('➕ Add document to collection API called');
    console.log('Collection ID from params:', params.collectionId);
    
    await connectDB();
    console.log('✅ Database connected');

    // Authentication
    const user = await authenticateUser(request);
    console.log('✅ User authenticated:', user.email);

    const { collectionId } = params;

    // Get request body
    const body = await request.json();
    console.log('Request body:', body);
    
    // Validate request body
    const validation = validateRequestBody(addDocumentSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        details: validation.details
      }, { status: 400 });
    }

    const { documentId } = validation.data;

    const collection = await DocumentCollection.findById(collectionId);
    if (!collection) {
      return NextResponse.json({
        success: false,
        error: 'Collection not found'
      }, { status: 404 });
    }

    console.log(`Found collection: ${collection.name}`);

    // Check if user has access to the project
    const project = await Project.findById(collection.projectId);
    if (!project) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 });
    }

    const userPermissions = project.getUserPermissions(user._id);
    if (!userPermissions || !userPermissions.canEdit) {
      return NextResponse.json({
        success: false,
        error: 'Permission denied'
      }, { status: 403 });
    }

    // Validate document exists and belongs to the project
    const document = await Document.findOne({
      _id: documentId,
      projectId: collection.projectId,
      status: { $ne: 'deleted' }
    });

    if (!document) {
      return NextResponse.json({
        success: false,
        error: 'Document not found or does not belong to this project'
      }, { status: 400 });
    }

    console.log(`Adding document: ${document.originalName} to collection: ${collection.name}`);

    // Add document to collection
    await collection.addDocument(documentId as any);
    await collection.updateStats();

    await collection.populate('documents', 'filename originalName fileMetadata processing cloudinary tags');

    console.log('✅ Document added to collection successfully');

    return NextResponse.json({
      success: true,
      message: 'Document added to collection successfully',
      data: { collection }
    });

  } catch (error: any) {
    console.error('❌ Add document to collection error:', error);
    
    if (error.message === "No token provided" || error.message === "Invalid or inactive user") {
      return NextResponse.json({
        success: false,
        error: "Access denied. " + error.message
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

// DELETE /api/document-collections/[collectionId]/documents - Remove document from collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    console.log('➖ Remove document from collection API called');
    console.log('Collection ID from params:', params.collectionId);
    
    await connectDB();
    console.log('✅ Database connected');

    // Authentication
    const user = await authenticateUser(request);
    console.log('✅ User authenticated:', user.email);

    const { collectionId } = params;

    // Get request body
    const body = await request.json();
    console.log('Request body:', body);
    
    // Validate request body
    const validation = validateRequestBody(removeDocumentSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        details: validation.details
      }, { status: 400 });
    }

    const { documentId } = validation.data;

    const collection = await DocumentCollection.findById(collectionId);
    if (!collection) {
      return NextResponse.json({
        success: false,
        error: 'Collection not found'
      }, { status: 404 });
    }

    console.log(`Found collection: ${collection.name}`);

    // Check if user has access to the project
    const project = await Project.findById(collection.projectId);
    if (!project) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 });
    }

    const userPermissions = project.getUserPermissions(user._id);
    if (!userPermissions || !userPermissions.canEdit) {
      return NextResponse.json({
        success: false,
        error: 'Permission denied'
      }, { status: 403 });
    }

    console.log(`Removing document ${documentId} from collection: ${collection.name}`);

    // Remove document from collection
    await collection.removeDocument(documentId as any);
    await collection.updateStats();

    await collection.populate('documents', 'filename originalName fileMetadata processing cloudinary tags');

    console.log('✅ Document removed from collection successfully');

    return NextResponse.json({
      success: true,
      message: 'Document removed from collection successfully',
      data: { collection }
    });

  } catch (error: any) {
    console.error('❌ Remove document from collection error:', error);
    
    if (error.message === "No token provided" || error.message === "Invalid or inactive user") {
      return NextResponse.json({
        success: false,
        error: "Access denied. " + error.message
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

// PUT /api/document-collections/[collectionId]/documents - Handle reorder or visibility actions
export async function PUT(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    console.log('🔄 Document action API called (reorder/visibility)');
    console.log('Collection ID from params:', params.collectionId);
    
    await connectDB();
    console.log('✅ Database connected');

    // Authentication
    const user = await authenticateUser(request);
    console.log('✅ User authenticated:', user.email);

    const { collectionId } = params;

    // Check the action type in the query params
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    console.log('Action type:', action);

    const collection = await DocumentCollection.findById(collectionId);
    if (!collection) {
      return NextResponse.json({
        success: false,
        error: 'Collection not found'
      }, { status: 404 });
    }

    console.log(`Found collection: ${collection.name}`);

    // Check if user has access to the project
    const project = await Project.findById(collection.projectId);
    if (!project) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 });
    }

    const userPermissions = project.getUserPermissions(user._id);
    if (!userPermissions || !userPermissions.canEdit) {
      return NextResponse.json({
        success: false,
        error: 'Permission denied'
      }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    console.log('Request body:', body);

    if (action === 'reorder') {
      // Handle document reordering
      const validation = validateRequestBody(reorderDocumentsSchema, body);
      if (!validation.success) {
        return NextResponse.json({
          success: false,
          error: validation.error,
          details: validation.details
        }, { status: 400 });
      }

      const { documentIds } = validation.data;
      console.log(`Reordering ${documentIds.length} documents`);

      // Reorder documents
      await collection.reorderDocuments(documentIds as any);

      await collection.populate('documents', 'filename originalName fileMetadata processing cloudinary tags');

      console.log('✅ Documents reordered successfully');

      return NextResponse.json({
        success: true,
        message: 'Documents reordered successfully',
        data: { collection }
      });

    } else if (action === 'visibility') {
      // Handle document visibility toggle
      const validation = validateRequestBody(toggleDocumentVisibilitySchema, body);
      if (!validation.success) {
        return NextResponse.json({
          success: false,
          error: validation.error,
          details: validation.details
        }, { status: 400 });
      }

      const { documentId, hidden } = validation.data;
      console.log(`Setting document ${documentId} visibility: hidden=${hidden}`);

      // Toggle document visibility
      if (hidden) {
        await collection.hideDocument(documentId as any);
      } else {
        await collection.showDocument(documentId as any);
      }

      await collection.populate('documents', 'filename originalName fileMetadata processing cloudinary tags');

      console.log('✅ Document visibility updated successfully');

      return NextResponse.json({
        success: true,
        message: `Document ${hidden ? 'hidden from' : 'included in'} extraction successfully`,
        data: { collection }
      });

    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use action=reorder or action=visibility'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Document action error:', error);
    
    if (error.message === "No token provided" || error.message === "Invalid or inactive user") {
      return NextResponse.json({
        success: false,
        error: "Access denied. " + error.message
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
