// Alternative approach - Simple URL-based extraction
// This bypasses pdf-parse entirely and uses OpenAI directly

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

// Simple extraction that bypasses pdf-parse entirely
async function extractWithOpenAIOnly(documentUrl: string): Promise<string> {
  console.log("Using OpenAI-only extraction method");
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user", 
          content: [
            {
              type: "text",
              text: "Please extract ALL text content from this document. Return every piece of text exactly as it appears, maintaining structure and formatting. Be thorough and include everything readable."
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
      max_tokens: 4000,
      temperature: 0.1
    });

    const extractedText = completion.choices[0].message.content || "";
    
    if (extractedText.trim().length === 0) {
      throw new Error("OpenAI returned empty text");
    }
    
    console.log("OpenAI extraction successful, text length:", extractedText.length);
    console.log("First 200 chars:", extractedText.substring(0, 200));
    
    return extractedText;
    
  } catch (error) {
    throw new Error(`OpenAI extraction failed: ${error.message}`);
  }
}

// Direct field extraction
async function extractSingleFieldDirect(documentText: string, column: any) {
  const model = column.aiModel?.toLowerCase() === 'gpt-4' ? 'gpt-4-turbo' : 'gpt-3.5-turbo';
  
  const completion = await openai.chat.completions.create({
    model: model,
    messages: [
      { 
        role: "system", 
        content: `Extract specific information from document text. Always respond with valid JSON: {"value": "extracted_value", "confidence": 0.95}. If not found, return {"value": "", "confidence": 0}.`
      },
      { 
        role: "user", 
        content: `Document: ${documentText.substring(0, 12000)}\n\nExtract: ${column.prompt}\n\nField: ${column.name}\n\nReturn JSON only.`
      }
    ],
    temperature: 0.1,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const response = completion.choices[0].message.content;
  const parsedResponse = JSON.parse(response || '{"value":"","confidence":0}');

  return {
    columnId: column.id,
    value: parsedResponse.value || "",
    confidence: Math.min(Math.max(parsedResponse.confidence || 0, 0), 1),
    extractedBy: {
      method: "ai",
      model: model,
      version: "1.0",
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Authentication
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
    const { projectId, documentId, documentUrl } = body; // Accept optional documentUrl

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
      console.log('Using document URL:', urlToUse);

      // Extract text using OpenAI only (bypass pdf-parse)
      const documentText = await extractWithOpenAIOnly(urlToUse);
      
      console.log('Document text extracted, length:', documentText.length);

      // Extract data for each column
      const extractionResults = [];
      let successCount = 0;

      for (const column of extractionColumns) {
        try {
          const result = await extractSingleFieldDirect(documentText, column);
          extractionResults.push(result);
          
          if (result.value && result.confidence > 0) {
            await document.setExtractedData(result.columnId, {
              value: result.value,
              type: column.type,
              confidence: result.confidence,
              extractedBy: result.extractedBy,
              extractedAt: new Date()
            });
            successCount++;
          }
        } catch (error) {
          console.error(`Failed to extract ${column.name}:`, error);
          extractionResults.push({
            columnId: column.id,
            value: "",
            confidence: 0,
            extractedBy: {
              method: "ai",
              model: column.aiModel,
              version: "1.0",
            },
          });
        }
      }

      await document.updateProcessingStatus('completed', 100);

      return NextResponse.json({
        success: true,
        message: `Successfully extracted data for ${successCount} out of ${extractionColumns.length} columns`,
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
        code: 'EXTRACTION_FAILED'
      });

      console.error('Extraction failed:', extractionError);
      return NextResponse.json({
        success: false,
        error: 'Data extraction failed',
        details: extractionError.message
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Extract API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
