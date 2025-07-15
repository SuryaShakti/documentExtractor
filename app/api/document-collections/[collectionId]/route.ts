import { NextRequest, NextResponse } from 'next/server';
import DocumentCollection from '@/lib/models/DocumentCollection';
import Document from '@/lib/models/Document';
import Project from '@/lib/models/Project';
import User from '@/lib/models/User';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/database/mongodb';
import { z } from 'zod';

// Validation schemas
const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  settings: z.object({
    autoAggregate: z.boolean().optional(),
    aggregationOrder: z.array(z.string()).optional(),
    hiddenDocuments: z.array(z.string()).optional()
  }).optional()
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

// GET /api/document-collections/[collectionId] - Get a specific collection
export async function GET(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    console.log('📁 Get collection API called');
    console.log('Collection ID from params:', params.collectionId);
    
    await connectDB();
    console.log('✅ Database connected');

    // Authentication
    const user = await authenticateUser(request);
    console.log('✅ User authenticated:', user.email);

    const { collectionId } = params;

    const collection = await DocumentCollection.findById(collectionId)
      .populate('documents', 'filename originalName fileMetadata processing cloudinary tags')
      .lean();

    if (!collection) {
      return NextResponse.json({
        success: false,
        error: 'Collection not found'
      }, { status: 404 });
    }

    console.log(`Found collection: ${collection.name} with ${collection.documents?.length || 0} documents`);

    // Check if user has access to the project
    const project = await Project.findById(collection.projectId);
    if (!project) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 });
    }

    const userPermissions = project.getUserPermissions(user._id);
    if (!userPermissions) {
      return NextResponse.json({
        success: false,
        error: 'Access denied'
      }, { status: 403 });
    }

    console.log('✅ Collection retrieved successfully');

    return NextResponse.json({
      success: true,
      data: { collection }
    });

  } catch (error: any) {
    console.error('❌ Get collection error:', error);
    
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

// PUT /api/document-collections/[collectionId] - Update a collection
export async function PUT(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    console.log('✏️ Update collection API called');
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
    const validation = validateRequestBody(updateCollectionSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        details: validation.details
      }, { status: 400 });
    }

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

    const { name, settings } = validation.data;

    // Update collection
    if (name) {
      console.log(`Updating collection name: ${collection.name} → ${name}`);
      collection.name = name;
    }
    
    if (settings) {
      if (settings.autoAggregate !== undefined) {
        console.log(`Updating autoAggregate: ${collection.settings.autoAggregate} → ${settings.autoAggregate}`);
        collection.settings.autoAggregate = settings.autoAggregate;
      }
      
      if (settings.aggregationOrder) {
        // Validate that all document IDs exist in the collection
        const validOrder = settings.aggregationOrder.filter(id => 
          collection.documents.some(docId => docId.toString() === id)
        );
        console.log(`Updating aggregation order: ${validOrder.length} documents`);
        collection.settings.aggregationOrder = validOrder as any;
      }
      
      if (settings.hiddenDocuments) {
        // Validate that all document IDs exist in the collection
        const validHidden = settings.hiddenDocuments.filter(id => 
          collection.documents.some(docId => docId.toString() === id)
        );
        console.log(`Updating hidden documents: ${validHidden.length} documents`);
        collection.settings.hiddenDocuments = validHidden as any;
      }
    }

    collection.stats.lastModified = new Date();
    await collection.save();

    await collection.populate('documents', 'filename originalName fileMetadata processing cloudinary tags');

    console.log('✅ Collection updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Collection updated successfully',
      data: { collection }
    });

  } catch (error: any) {
    console.error('❌ Update collection error:', error);
    
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

// DELETE /api/document-collections/[collectionId] - Delete a collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    console.log('🗑️ Delete collection API called');
    console.log('Collection ID from params:', params.collectionId);
    
    await connectDB();
    console.log('✅ Database connected');

    // Authentication
    const user = await authenticateUser(request);
    console.log('✅ User authenticated:', user.email);

    const { collectionId } = params;

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
    if (!userPermissions || !userPermissions.canDelete) {
      return NextResponse.json({
        success: false,
        error: 'Permission denied. You need delete permissions for this project.'
      }, { status: 403 });
    }

    // Soft delete the collection
    console.log('Soft deleting collection...');
    collection.status = 'deleted';
    await collection.save();

    console.log('✅ Collection deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Collection deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Delete collection error:', error);
    
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
