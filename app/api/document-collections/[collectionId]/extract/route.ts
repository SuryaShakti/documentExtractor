import { NextRequest, NextResponse } from 'next/server';
import DocumentCollection from '@/lib/models/DocumentCollection';
import Document from '@/lib/models/Document';
import Project from '@/lib/models/Project';
import User from '@/lib/models/User';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/database/mongodb';
import OpenAI from 'openai';
import { z } from 'zod';

// Initialize OpenAI with your existing configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
});

// Validation schemas
const extractDataSchema = z.object({
  columnId: z.string().min(1).optional(),
  columns: z.array(z.string()).optional(),
  forceReextract: z.boolean().default(false)
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

// ✅ REAL OpenAI Integration - Using your existing extraction logic!

interface ExtractionColumn {
  id: string;
  name: string;
  prompt: string;
  type: string;
  aiModel?: string;
}

interface ExtractionResult {
  columnId: string;
  value: string;
  confidence: number;
  extractedBy: {
    method: string;
    model: string;
    version: string;
  };
}

// IMAGE PROCESSING - Using your existing OpenAI Vision API implementation
async function extractFromImage(
  documentUrl: string,
  columns: ExtractionColumn[]
): Promise<ExtractionResult[]> {
  console.log("🖼️ Processing IMAGE with OpenAI Vision API...");
  
  try {
    const extractionPrompt = `Analyze this image document and extract the following information. Return ONLY valid JSON with no additional text.

EXTRACTION TASKS:
${columns.map((col, index) => `${index + 1}. ${col.name}: ${col.prompt} (Type: ${col.type})`).join('\\n')}

INSTRUCTIONS:
- Examine the image carefully for each piece of information
- If information is clearly visible, provide it with high confidence (0.8-0.95)
- If information is partially visible or unclear, provide it with medium confidence (0.3-0.7)
- If information is not found or not visible, return empty string with confidence 0
- Be precise and accurate
- For dates, use YYYY-MM-DD format when possible
- For numbers, return only the numeric value
- For text, return the exact text as it appears

REQUIRED JSON FORMAT:
{
  "extractions": [
    ${columns.map(col => `{"columnId": "${col.id}", "value": "", "confidence": 0}`).join(',\\n    ')}
  ]
}`;

    console.log("📤 Sending image to OpenAI Vision API...");
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: extractionPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: documentUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0].message.content;
    console.log("📥 Vision API response received");

    if (!response) {
      throw new Error("No response from OpenAI Vision API");
    }

    const parsedResponse = JSON.parse(response);
    
    if (!parsedResponse.extractions || !Array.isArray(parsedResponse.extractions)) {
      throw new Error("Invalid response format from Vision API");
    }

    const results: ExtractionResult[] = parsedResponse.extractions.map((extraction: any) => ({
      columnId: extraction.columnId,
      value: extraction.value || "",
      confidence: Math.min(Math.max(extraction.confidence || 0, 0), 1),
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "vision-api-v1"
      }
    }));

    console.log("✅ Image extraction completed successfully");
    return results;

  } catch (error: any) {
    console.error("❌ Image extraction failed:", error.message);
    
    return columns.map(column => ({
      columnId: column.id,
      value: "",
      confidence: 0,
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "vision-api-v1-failed"
      }
    }));
  }
}

// PDF PROCESSING - Using your existing clean text extraction + OpenAI processing
async function extractFromPDF(
  documentUrl: string,
  columns: ExtractionColumn[]
): Promise<ExtractionResult[]> {
  console.log("📄 Processing PDF with clean text extraction...");
  
  try {
    // Step 1: Download PDF
    const pdfBuffer = await downloadPDFBuffer(documentUrl);
    
    // Step 2: Extract text using pdf-parse only
    const extractedText = await extractTextWithPDFParse(pdfBuffer);
    
    // Step 3: Process extracted text with OpenAI
    return await extractDataFromText(extractedText, columns);
    
  } catch (error: any) {
    console.error("❌ PDF extraction failed:", error.message);
    
    return columns.map(column => ({
      columnId: column.id,
      value: `PDF extraction failed: ${error.message}`,
      confidence: 0,
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "pdf-extraction-failed"
      }
    }));
  }
}

// Helper: Download PDF buffer with proper error handling
async function downloadPDFBuffer(url: string): Promise<Buffer> {
  console.log(`📥 Downloading PDF from: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'DocumentExtractor/1.0',
        'Accept': 'application/pdf,*/*'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type') || '';
    console.log(`📄 Content-Type: ${contentType}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`✅ PDF downloaded: ${buffer.length} bytes`);
    
    // Verify it's a PDF by checking the header
    const header = buffer.toString('ascii', 0, 5);
    if (!header.startsWith('%PDF')) {
      throw new Error(`Invalid PDF file: header is '${header}', expected '%PDF'`);
    }
    
    console.log(`✅ PDF header verified: ${header}`);
    return buffer;
    
  } catch (error: any) {
    console.error('❌ PDF download failed:', error.message);
    throw new Error(`Failed to download PDF: ${error.message}`);
  }
}

// Helper: Clean pdf-parse text extraction
async function extractTextWithPDFParse(pdfBuffer: Buffer): Promise<string> {
  console.log(`📚 Processing PDF buffer: ${pdfBuffer.length} bytes with pdf-parse...`);
  
  try {
    // Simple dynamic import for pdf-parse
    const { default: pdfParse } = await import('pdf-parse');
    
    const data = await pdfParse(pdfBuffer, {
      // normalizeWhitespace: false,
      // disableCombineTextItems: false
    });
    
    console.log(`📊 PDF parse results: ${data.numpages} pages, ${data.text.length} characters`);
    
    if (!data.text || data.text.length < 50) {
      throw new Error(`PDF contains insufficient text: ${data.text.length} characters`);
    }
    
    console.log(`✅ pdf-parse SUCCESS! Text: ${data.text.length} characters`);
    console.log(`📄 Text preview: ${data.text.substring(0, 300)}...`);
    
    return data.text;
    
  } catch (error: any) {
    console.error('❌ pdf-parse failed:', error.message);
    throw new Error(`pdf-parse extraction failed: ${error.message}`);
  }
}

// Helper: Extract data from text using OpenAI
async function extractDataFromText(
  text: string,
  columns: ExtractionColumn[]
): Promise<ExtractionResult[]> {
  console.log("🤖 Processing extracted text with OpenAI...");
  
  try {
    const extractionPrompt = `Analyze this document text and extract the following information. Return ONLY valid JSON.

DOCUMENT TEXT:
${text.substring(0, 15000)}${text.length > 15000 ? '\\n...(truncated)' : ''}

EXTRACTION TASKS:
${columns.map((col, index) => `${index + 1}. ${col.name}: ${col.prompt} (Type: ${col.type})`).join('\\n')}

INSTRUCTIONS:
- Extract exact information requested for each field
- High confidence (0.8-0.95) if clearly found
- Medium confidence (0.3-0.7) if partially found
- Zero confidence if not found
- Use YYYY-MM-DD for dates, numeric values for numbers

REQUIRED JSON FORMAT:
{
  "extractions": [
    ${columns.map(col => `{"columnId": "${col.id}", "value": "", "confidence": 0}`).join(',\\n    ')}
  ]
}`;

    console.log("📤 Sending text to OpenAI...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional document analysis AI. Extract precise data from text and return valid JSON only."
        },
        {
          role: "user",
          content: extractionPrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0].message.content;
    console.log("📥 OpenAI response received");
    
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    const parsedResponse = JSON.parse(response);
    
    if (!parsedResponse.extractions || !Array.isArray(parsedResponse.extractions)) {
      throw new Error("Invalid response format");
    }

    const results: ExtractionResult[] = parsedResponse.extractions.map((extraction: any) => ({
      columnId: extraction.columnId,
      value: extraction.value || "",
      confidence: Math.min(Math.max(extraction.confidence || 0, 0), 1),
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "text-extraction-v1"
      }
    }));

    const successCount = results.filter(r => r.value && r.confidence > 0).length;
    console.log(`✅ OpenAI extraction completed: ${successCount}/${results.length} successful`);

    return results;

  } catch (error: any) {
    console.error("❌ OpenAI text extraction failed:", error.message);
    
    return columns.map(column => ({
      columnId: column.id,
      value: `OpenAI extraction failed: ${error.message}`,
      confidence: 0,
      extractedBy: {
        method: "ai",
        model: "gpt-4o",
        version: "text-extraction-v1-failed"
      }
    }));
  }
}

// SMART FILE TYPE DETECTION - Using your existing logic
function getFileType(document: any): 'image' | 'pdf' | 'unknown' {
  const mimeType = document.fileMetadata?.mimeType?.toLowerCase() || '';
  const extension = document.fileMetadata?.extension?.toLowerCase() || '';
  
  // Check for PDF
  if (mimeType.includes('pdf') || extension === 'pdf') {
    return 'pdf';
  }
  
  // Check for images
  if (mimeType.startsWith('image/') || 
      ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
    return 'image';
  }
  
  return 'unknown';
}

// ✅ REAL AI extraction function - using your existing OpenAI implementation!
async function extractDataWithRealAI(document: any, columnDef: any): Promise<string> {
  try {
    console.log(`🤖 REAL OpenAI extraction for: ${document.originalName}`);
    console.log(`📝 Prompt: ${columnDef.customProperties.prompt}`);
    
    const documentUrl = document.cloudinary.secureUrl;
    const fileType = getFileType(document);
    
    console.log(`📁 File type detected: ${fileType}`);
    console.log(`🔗 Document URL: ${documentUrl}`);
    
    // Create extraction column from column definition
    const extractionColumn: ExtractionColumn = {
      id: columnDef.id || columnDef.field,
      name: columnDef.customProperties.name,
      prompt: columnDef.customProperties.prompt,
      type: columnDef.customProperties.type,
      aiModel: columnDef.customProperties.aiModel
    };
    
    let extractionResults: ExtractionResult[];
    
    // Route to appropriate extraction method using your existing logic
    switch (fileType) {
      case 'image':
        console.log("🖼️ Routing to IMAGE extraction (OpenAI Vision API)");
        extractionResults = await extractFromImage(documentUrl, [extractionColumn]);
        break;
        
      case 'pdf':
        console.log("📄 Routing to PDF extraction (Clean Text + OpenAI)");
        extractionResults = await extractFromPDF(documentUrl, [extractionColumn]);
        break;
        
      default:
        console.log("❓ Unknown file type, trying image extraction as fallback");
        extractionResults = await extractFromImage(documentUrl, [extractionColumn]);
        break;
    }
    
    // Return the extracted value
    const result = extractionResults.find(r => r.columnId === extractionColumn.id);
    const extractedValue = result?.value || '';
    
    console.log(`✅ Real AI extraction result: "${extractedValue}" (confidence: ${result?.confidence})`);
    
    return extractedValue;
    
  } catch (error: any) {
    console.error('❌ Real AI extraction error:', error);
    return `AI extraction failed: ${error.message}`;
  }
}

// POST /api/document-collections/[collectionId]/extract
export async function POST(
  request: NextRequest,
  { params }: { params: { collectionId: string } }
) {
  try {
    console.log('🧠 Collection extract API called with REAL OpenAI integration!');
    console.log('Collection ID from params:', params.collectionId);
    console.log('Request URL:', request.url);
    
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

    // Get request body
    const body = await request.json();
    console.log('Request body:', body);
    
    // Validate request body
    const validation = validateRequestBody(extractDataSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        details: validation.details
      }, { status: 400 });
    }

    const { columnId, columns, forceReextract } = validation.data;

    // Find collection with populated documents
    const collection = await DocumentCollection.findById(collectionId)
      .populate('documents');

    if (!collection) {
      return NextResponse.json({
        success: false,
        error: 'Collection not found'
      }, { status: 404 });
    }

    console.log(`Found collection: ${collection.name} with ${collection.documents.length} documents`);

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

    // Determine which columns to extract
    let columnsToExtract: string[];
    
    if (columnId) {
      columnsToExtract = [columnId];
    } else if (columns && columns.length > 0) {
      columnsToExtract = columns;
    } else {
      // If no specific columns requested, extract all enabled columns
      const projectColumnDefs = project.gridConfiguration?.columnDefs || new Map();
      columnsToExtract = [];
      
      for (const [colId, columnDef] of projectColumnDefs.entries()) {
        if (colId !== 'index' && colId !== 'filename' && 
            columnDef.customProperties?.extraction?.enabled) {
          columnsToExtract.push(colId);
        }
      }
    }

    console.log('Columns to extract:', columnsToExtract);

    if (columnsToExtract.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No columns specified for extraction or no extractable columns found'
      }, { status: 400 });
    }
    
    // Validate columns exist in project configuration
    const projectColumnDefs = project.gridConfiguration?.columnDefs || new Map();
    const invalidColumns = columnsToExtract.filter(colId => 
      !projectColumnDefs.has(colId) || colId === 'index' || colId === 'filename'
    );

    if (invalidColumns.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Invalid columns: ${invalidColumns.join(', ')}`
      }, { status: 400 });
    }

    // Get visible documents (not hidden)
    const visibleDocuments = collection.documents.filter((doc: any) => 
      !collection.settings.hiddenDocuments.some((hiddenId: any) => hiddenId.equals(doc._id))
    );

    console.log(`Processing ${visibleDocuments.length} visible documents`);

    if (visibleDocuments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No visible documents in collection for extraction'
      }, { status: 400 });
    }

    // Extract data for each column
    const extractionResults: any = {};
    
    for (const colId of columnsToExtract) {
      console.log(`Processing column: ${colId}`);
      
      const columnDef = projectColumnDefs.get(colId);
      if (!columnDef?.customProperties) {
        console.log(`Skipping column ${colId} - no custom properties`);
        continue;
      }

      // Check if we need to extract data for individual documents first
      const documentsNeedingExtraction = visibleDocuments.filter((doc: any) => {
        const existingData = doc.extractedData?.get(colId);
        
        // Define demo/mock values that indicate fake data
        const demoValues = [
          'Important Document', 'Contract Agreement', 'Report Summary',
          '2024-01-15', '2023-12-01', '2024-03-22', 
          '$1,250.00', '$899.99', '$15,000.00',
          'New York, NY', 'Los Angeles, CA', 'Chicago, IL',
          'John Smith', 'Sarah Johnson', 'Michael Brown',
          'Acme Corp', 'TechStart Inc', 'Global Solutions LLC',
          'Active', 'Pending', 'Completed',
          'Set A', 'Category B', 'Group 1'
        ];
        
        // Force extraction if:
        // 1. forceReextract is true
        // 2. No existing data
        // 3. Empty value
        // 4. Value is a known demo/mock value
        const isDemoData = existingData?.value && demoValues.includes(existingData.value);
        const needsExtraction = forceReextract || !existingData || !existingData.value || isDemoData;
        
        if (isDemoData) {
          console.log(`🚨 DEMO DATA DETECTED in ${doc.filename} for column ${colId}: "${existingData.value}" - forcing re-extraction with OpenAI`);
        }
        console.log(`Document ${doc.filename}: needs extraction = ${needsExtraction}${isDemoData ? ' (demo data detected)' : ''}`);
        return needsExtraction;
      });

      console.log(`${documentsNeedingExtraction.length} documents need extraction for column ${colId}`);

      // Extract data for individual documents if needed
      if (documentsNeedingExtraction.length > 0) {
        for (const doc of documentsNeedingExtraction) {
          try {
            console.log(`🚀 REAL AI extraction for document: ${doc.originalName}`);
            
            // ✅ Use REAL OpenAI extraction with your existing logic!
            const extractedValue = await extractDataWithRealAI(doc, columnDef);
            
            console.log(`✅ REAL AI extracted value: ${extractedValue}`);
            
            // Update document's extracted data
            await doc.setExtractedData(colId, {
              value: extractedValue,
              type: columnDef.customProperties.type,
              confidence: 0.85,
              extractedBy: {
                method: 'ai',
                model: columnDef.customProperties.aiModel || 'gpt-4o',
                userId: user._id
              }
            });
            
            console.log(`Updated extracted data for document ${doc._id}`);
          } catch (docError: any) {
            console.error(`Failed to extract data for document ${doc._id}:`, docError);
            // Continue with other documents
          }
        }
      }

      try {
        // Aggregate data from all visible documents
        console.log(`Aggregating data for column ${colId}`);
        const aggregatedData = await collection.aggregateExtractedData(colId);
        extractionResults[colId] = aggregatedData;
        console.log(`Aggregated data for column ${colId}:`, aggregatedData.value);
      } catch (aggError: any) {
        console.error(`Failed to aggregate data for column ${colId}:`, aggError);
        extractionResults[colId] = {
          value: '',
          type: columnDef.customProperties.type,
          confidence: 0,
          error: aggError.message
        };
      }
    }

    // Update collection stats
    await collection.updateStats();

    console.log('✅ REAL OpenAI extraction completed successfully');

    return NextResponse.json({
      success: true,
      message: 'REAL AI data extraction completed successfully',
      data: {
        collectionId,
        extractedData: extractionResults,
        visibleDocumentCount: visibleDocuments.length,
        columnsProcessed: columnsToExtract.length,
        aiProvider: 'OpenAI GPT-4o',
        extractionMethod: 'real-ai-vision-and-text'
      }
    });

  } catch (error: any) {
    console.error('❌ Collection extraction error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during extraction',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
