import { NextResponse } from "next/server";
import Document from "@/lib/models/Document";
import {
  withProjectAccess,
  withPermission,
  combineMiddlewares,
  withErrorHandling,
  AuthenticatedRequest,
} from "@/lib/middleware/auth";

// POST /api/projects/[projectId]/documents/process-pending - Process all pending documents in a project
async function processPendingDocumentsHandler(req: AuthenticatedRequest) {
  try {
    // Find all pending documents in the project
    const pendingDocuments = await Document.find({
      projectId: req.project!._id,
      'processing.status': 'pending',
      status: { $ne: 'deleted' }
    });

    if (pendingDocuments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending documents found",
        data: { processedCount: 0 }
      });
    }

    let processedCount = 0;
    let failedCount = 0;
    const results = [];

    // Process each pending document
    for (const document of pendingDocuments) {
      try {
        console.log(`Processing pending document: ${document.originalName}`);
        
        // Start processing
        await document.updateProcessingStatus('processing', 0);
        
        // Add audit log
        await document.addAuditLog('processed', req.user!._id, {
          trigger: 'bulk_pending',
          previousStatus: 'pending'
        });

        // Process the document (simulate async processing)
        setTimeout(async () => {
          try {
            await processDocumentData(document, req.project!);
            await document.updateProcessingStatus('completed', 100);
            
            document.flags.isProcessed = true;
            document.flags.hasErrors = false;
            await document.save();
            
            console.log(`Bulk processing completed: ${document.originalName}`);
          } catch (error: any) {
            console.error('Bulk background processing error:', error);
            await document.updateProcessingStatus('failed', null, {
              message: error.message || 'Processing failed',
              code: 'BULK_PROCESSING_ERROR'
            });
            
            document.flags.hasErrors = true;
            await document.save();
          }
        }, 1000 + (processedCount * 500)); // Stagger processing to avoid overwhelming the system
        
        processedCount++;
        results.push({
          documentId: document._id,
          filename: document.originalName,
          status: 'processing_started'
        });
        
      } catch (error: any) {
        console.error(`Failed to process document ${document._id}:`, error);
        failedCount++;
        results.push({
          documentId: document._id,
          filename: document.originalName,
          status: 'failed',
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Started processing ${processedCount} pending documents`,
      data: {
        totalPending: pendingDocuments.length,
        processedCount,
        failedCount,
        results
      }
    });

  } catch (error: any) {
    console.error("Process pending documents error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process pending documents: " + error.message },
      { status: 500 }
    );
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

export const POST = combineMiddlewares(
  withErrorHandling,
  withProjectAccess,
  withPermission("canEdit")
)(processPendingDocumentsHandler);
