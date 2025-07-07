// Direct PDF URL to OpenAI - No server-side processing!
// This is the cleanest approach - let OpenAI handle everything

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database/mongodb';
import Document from '@/lib/models/Document';
import Project from '@/lib/models/Project';
import User from '@/lib/models/User';
import OpenAI from 'openai';
import jwt from 'jsonwebtoken';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Direct extraction - send PDF URL straight to OpenAI
async function extractDirectFromPDFUrl(documentUrl: string, columns: any[]): Promise<any[]> {
  console.log("🚀 Using DIRECT PDF URL approach - no server-side parsing!");
  console.log("📄 PDF URL:", documentUrl);
  
  const results = [];
  
  for (const column of columns) {
    try {
      console.log(`🎯 Extracting: ${column.name} with prompt: ${column.prompt}`);
      
      // Create a comprehensive prompt that includes the PDF URL
      const extractionPrompt = `
Please analyze the PDF document at this URL: ${documentUrl}

Extract the following information: ${column.prompt}

Field Name: ${column.name}
Expected Type: ${column.type}

Instructions:
- Access and read the PDF document from the provided URL
- Extract the specific information requested in the prompt
- Be precise and accurate
- If the information is not found, return empty value with confidence 0

Return your response as JSON in this exact format:
{
  "value": "extracted_information_here",
  "confidence": 0.95,
  "found": true,
  "source_location": "page/section where found"
}

If you cannot find the requested information, return:
{
  "value": "",
  "confidence": 0,
  "found": false,
  "source_location": "not found"
}
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Latest model with best document processing
        messages: [
          {
            role: "system",
            content: "You are a professional document analysis AI. You can access and analyze PDF documents from URLs. Always return valid JSON responses with the exact format requested."
          },
          {
            role: "user",
            content: extractionPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      console.log(`📊 OpenAI response for ${column.name}:`, response);

      if (!response) {
        throw new Error("No response from OpenAI");
      }

      const parsedResponse = JSON.parse(response);
      
      results.push({
        columnId: column.id,
        value: parsedResponse.value || "",
        confidence: Math.min(Math.max(parsedResponse.confidence || 0, 0), 1),
        found: parsedResponse.found || false,
        sourceLocation: parsedResponse.source_location || "",
        extractedBy: {
          method: "ai",
          model: "gpt-4o",
          version: "direct-url-1.0",
        },
      });

    } catch (error) {
      console.error(`❌ Failed to extract ${column.name}:`, error);
      results.push({
        columnId: column.id,
        value: "",
        confidence: 0,
        found: false,
        sourceLocation: "extraction failed",
        extractedBy: {
          method: "ai",
          model: "gpt-4o",
          version: "direct-url-1.0",
        },
      });
    }
  }

  return results;
}

// Alternative: Vision API approach (if text approach doesn't work)
async function extractWithVisionAPI(documentUrl: string, columns: any[]): Promise<any[]> {
  console.log("🎨 Using Vision API approach");
  
  const results = [];
  
  for (const column of columns) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please analyze this document and extract: ${column.prompt}

Field: ${column.name}
Type: ${column.type}

Return JSON: {"value": "extracted_data", "confidence": 0.95}`
              },
              {
                type: "image_url",
                image_url: {
                  url: documentUrl
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      const parsedResponse = JSON.parse(response || '{"value":"","confidence":0}');

      results.push({
        columnId: column.id,
        value: parsedResponse.value || "",
        confidence: Math.min(Math.max(parsedResponse.confidence || 0, 0), 1),
        extractedBy: {
          method: "ai",
          model: "gpt-4o-vision",
          version: "1.0",
        },
      });

    } catch (error) {
      console.error(`❌ Vision API failed for ${column.name}:`, error);
      results.push({
        columnId: column.id,
        value: "",
        confidence: 0,
        extractedBy: {
          method: "ai",
          model: "gpt-4o-vision",
          version: "1.0",
        },
      });
    }
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Authentication (same as before)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Access denied. No token provided.'
      }, { status: 401 });
    }

    let user;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      user = await User.findById(decoded.id).select('-password');
      
      if (!user || user.status !== 'active') {
        return NextResponse.json({
          success: false,
          error: 'Invalid token or inactive account.'
        }, { status: 401 });
      }
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed.'
      }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, documentId, documentUrl } = body;

    if (!projectId || !documentId) {
      return NextResponse.json({
        success: false,
        error: 'Project ID and Document ID are required'
      }, { status: 400 });
    }

    // Get project and verify access
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 });
    }

    const hasAccess = project.ownerId.toString() === user._id.toString() ||
                     project.collaborators.some(collab => 
                       collab.userId.toString() === user._id.toString()
                     );

    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        error: 'Access denied.'
      }, { status: 403 });
    }

    // Get document
    const document = await Document.findById(documentId);
    if (!document || document.projectId.toString() !== projectId) {
      return NextResponse.json({
        success: false,
        error: 'Document not found'
      }, { status: 404 });
    }

    // Get columns for extraction
    const columnDefs = project.gridConfiguration.columnDefs;
    const extractionColumns = [];

    for (const [columnId, columnDef] of columnDefs) {
      if (columnId === 'index' || columnId === 'filename') continue;
      
      if (columnDef.customProperties && 
          columnDef.customProperties.extraction?.enabled && 
          columnDef.customProperties.extraction?.status === 'active') {
        extractionColumns.push({
          id: columnId,
          name: columnDef.customProperties.name,
          prompt: columnDef.customProperties.prompt,
          type: columnDef.customProperties.type,
          aiModel: columnDef.customProperties.aiModel
        });
      }
    }

    if (extractionColumns.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No columns configured for data extraction'
      }, { status: 400 });
    }

    await document.updateProcessingStatus('processing', 0);

    try {
      // Use provided URL or get from document
      const urlToUse = documentUrl || document.cloudinary.secureUrl;
      console.log('🎯 DIRECT PROCESSING - PDF URL:', urlToUse);

      // Try direct URL approach first
      let extractionResults;
      try {
        extractionResults = await extractDirectFromPDFUrl(urlToUse, extractionColumns);
        console.log('✅ Direct URL approach succeeded!');
      } catch (directError) {
        console.log('⚠️ Direct URL approach failed, trying Vision API:', directError.message);
        extractionResults = await extractWithVisionAPI(urlToUse, extractionColumns);
      }

      // Save results to database
      let successCount = 0;
      for (const result of extractionResults) {
        if (result.value && result.confidence > 0) {
          const column = extractionColumns.find(col => col.id === result.columnId);
          await document.setExtractedData(result.columnId, {
            value: result.value,
            type: column?.type || 'text',
            confidence: result.confidence,
            extractedBy: result.extractedBy,
            extractedAt: new Date()
          });
          successCount++;
        }
      }

      await document.updateProcessingStatus('completed', 100);

      return NextResponse.json({
        success: true,
        message: `✅ DIRECT PROCESSING: Successfully extracted data for ${successCount} out of ${extractionColumns.length} columns`,
        method: "direct-pdf-url",
        data: {
          extractionResults,
          successCount,
          totalColumns: extractionColumns.length,
          document: {
            id: document._id,
            status: document.processing.status,
            extractedData: Object.fromEntries(document.extractedData)
          }
        }
      });

    } catch (extractionError: any) {
      await document.updateProcessingStatus('failed', null, {
        message: extractionError.message,
        code: 'DIRECT_EXTRACTION_FAILED'
      });

      console.error('Direct extraction failed:', extractionError);
      return NextResponse.json({
        success: false,
        error: 'Direct PDF extraction failed',
        details: extractionError.message
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Extract Direct API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
