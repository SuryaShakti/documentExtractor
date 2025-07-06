import { NextResponse } from "next/server";
import Document from "@/lib/models/Document";
import Project from "@/lib/models/Project";
import {
  withProjectAccess,
  withPermission,
  combineMiddlewares,
  withErrorHandling,
  AuthenticatedRequest,
  getClientIP,
} from "@/lib/middleware/auth";

// POST /api/projects/[projectId]/documents/[documentId]/process - Process a document
async function processDocumentHandler(req: AuthenticatedRequest) {
  try {
    const documentId = req.params?.documentId;
    
    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Find the document
    const document = await Document.findOne({
      _id: documentId,
      projectId: req.project!._id,
      status: { $ne: 'deleted' }
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // Check if document is already being processed or completed
    if (document.processing.status === 'processing') {
      return NextResponse.json(
        { success: false, error: "Document is already being processed" },
        { status: 400 }
      );
    }

    if (document.processing.status === 'completed') {
      return NextResponse.json(
        { success: true, message: "Document is already processed", data: { status: 'completed' } },
        { status: 200 }
      );
    }

    // Start processing
    await document.updateProcessingStatus('processing', 0);

    // Add audit log
    await document.addAuditLog('processed', req.user!._id, {
      trigger: 'manual',
      previousStatus: document.processing.status
    }, req);

    // Simulate processing (in a real app, this would be async/background job)
    try {
      await processDocumentData(document, req.project!);
      
      // Mark as completed
      await document.updateProcessingStatus('completed', 100);
      
      // Update flags
      document.flags.isProcessed = true;
      document.flags.hasErrors = false;
      await document.save();

    } catch (processingError: any) {
      console.error('Document processing error:', processingError);
      
      // Mark as failed
      await document.updateProcessingStatus('failed', null, {
        message: processingError.message || 'Processing failed',
        code: 'PROCESSING_ERROR',
        details: processingError
      });
      
      document.flags.hasErrors = true;
      await document.save();
      
      return NextResponse.json(
        { 
          success: false, 
          error: "Document processing failed: " + processingError.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document processed successfully",
      data: {
        status: document.processing.status,
        progress: document.processing.progress,
        completedAt: document.processing.completedAt
      }
    });

  } catch (error: any) {
    console.error("Process document error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process document: " + error.message },
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
  
  console.log(`Document processing completed: ${document.originalName}`);
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
)(processDocumentHandler);
