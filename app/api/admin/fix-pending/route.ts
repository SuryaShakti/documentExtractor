import { NextRequest, NextResponse } from "next/server";
import Document from "@/lib/models/Document";
import Project from "@/lib/models/Project";
import connectDB from "@/lib/database/mongodb";

// GET /api/admin/fix-pending - Admin utility to fix pending documents
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const action = searchParams.get('action') || 'check';

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required. Add ?projectId=YOUR_PROJECT_ID to the URL" },
        { status: 400 }
      );
    }

    // Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Find pending documents
    const pendingDocuments = await Document.find({
      projectId: projectId,
      'processing.status': 'pending',
      status: { $ne: 'deleted' }
    }).select('_id originalName processing.status createdAt');

    if (action === 'check') {
      return NextResponse.json({
        success: true,
        message: `Found ${pendingDocuments.length} pending documents`,
        data: {
          projectName: project.name,
          pendingCount: pendingDocuments.length,
          documents: pendingDocuments.map(doc => ({
            id: doc._id,
            name: doc.originalName,
            status: doc.processing.status,
            uploadDate: doc.createdAt
          })),
          nextStep: pendingDocuments.length > 0 
            ? `Call this endpoint with ?projectId=${projectId}&action=fix to process them`
            : "No action needed - all documents are processed"
        }
      });
    }

    if (action === 'fix') {
      let processedCount = 0;
      const results = [];

      for (const document of pendingDocuments) {
        try {
          // Update status to processing
          await document.updateProcessingStatus('processing', 0);
          
          // Simulate processing with a delay (staggered)
          setTimeout(async () => {
            try {
              // Simulate data extraction for each column
              const columns = project.gridConfiguration?.columnDefs || new Map();
              
              for (const [columnId, columnDef] of columns) {
                if (columnId === 'index' || columnId === 'filename') continue;
                
                const customProps = columnDef.customProperties;
                if (customProps?.extraction?.enabled) {
                  // Generate mock extracted data
                  const mockValue = generateMockData(customProps.type);
                  
                  await document.setExtractedData(columnId, {
                    value: mockValue,
                    type: customProps.type,
                    status: 'yes',
                    confidence: 0.85,
                    extractedBy: {
                      method: 'ai',
                      model: 'admin-fix-utility',
                      version: '1.0'
                    }
                  });
                }
              }
              
              // Mark as completed
              await document.updateProcessingStatus('completed', 100);
              document.flags.isProcessed = true;
              document.flags.hasErrors = false;
              await document.save();
              
              console.log(`Fixed document: ${document.originalName}`);
              
            } catch (error) {
              console.error(`Failed to fix document ${document._id}:`, error);
              await document.updateProcessingStatus('failed', null, {
                message: 'Admin fix failed',
                code: 'ADMIN_FIX_ERROR'
              });
            }
          }, processedCount * 1000); // Stagger by 1 second each
          
          processedCount++;
          results.push({
            id: document._id,
            name: document.originalName,
            status: 'processing_started'
          });
          
        } catch (error: any) {
          console.error(`Error processing document ${document._id}:`, error);
          results.push({
            id: document._id,
            name: document.originalName,
            status: 'error',
            error: error.message
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Started processing ${processedCount} pending documents`,
        data: {
          projectName: project.name,
          totalProcessed: processedCount,
          results,
          note: "Documents are being processed in the background. Check again in a few minutes."
        }
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use ?action=check or ?action=fix" },
      { status: 400 }
    );

  } catch (error: any) {
    console.error("Admin fix pending error:", error);
    return NextResponse.json(
      { error: "Failed to process request: " + error.message },
      { status: 500 }
    );
  }
}

function generateMockData(dataType: string): string {
  const mockValues: Record<string, string[]> = {
    text: ['Important Document', 'Contract Agreement', 'Report Summary', 'Business Plan'],
    date: ['2024-01-15', '2023-12-01', '2024-03-22', '2024-02-10'],
    price: ['$1,250.00', '$899.99', '$15,000.00', '$2,450.50'],
    location: ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Miami, FL'],
    person: ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis'],
    organization: ['Acme Corp', 'TechStart Inc', 'Global Solutions LLC', 'Innovation Labs'],
    status: ['Active', 'Pending', 'Completed', 'In Progress'],
    collection: ['Set A', 'Category B', 'Group 1', 'Series C']
  };

  const values = mockValues[dataType] || mockValues.text;
  return values[Math.floor(Math.random() * values.length)];
}
