// app/api/test-pdf/route.ts
// Simple test route to verify PDF downloading and parsing works

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Testing PDF download and parsing...");
    
    // Test with your specific PDF URL
    const pdfUrl = "https://res.cloudinary.com/dyjd0hssi/raw/upload/v1752260075/documents/6856d09bb57f725417a0fac8/1752260072094-838470457-Paris-Resume-Template-Modern.pdf";
    
    console.log(`📥 Downloading PDF from: ${pdfUrl}`);
    
    // Step 1: Download PDF
    const response = await fetch(pdfUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'DocumentExtractor/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    console.log(`📄 Content-Type: ${contentType}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`✅ PDF downloaded: ${buffer.length} bytes`);
    
    // Verify it's a PDF by checking the header
    const header = buffer.toString('ascii', 0, 10);
    console.log(`📋 PDF header: ${header}`);
    
    if (!header.startsWith('%PDF')) {
      return NextResponse.json({
        success: false,
        error: `Invalid PDF file: header is '${header}', expected '%PDF'`,
        downloadInfo: {
          size: buffer.length,
          contentType,
          header
        }
      });
    }
    
    // Step 2: Test pdf-parse
    console.log(`📚 Testing pdf-parse with buffer...`);
    
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buffer, {
      normalizeWhitespace: false,
      disableCombineTextItems: false
    });
    
    console.log(`📊 PDF parse results:`);
    console.log(`   - Pages: ${data.numpages}`);
    console.log(`   - Text length: ${data.text.length} characters`);
    console.log(`   - Text preview: ${data.text.substring(0, 200)}...`);
    
    return NextResponse.json({
      success: true,
      message: "PDF test completed successfully",
      data: {
        downloadInfo: {
          size: buffer.length,
          contentType,
          header: header.substring(0, 10)
        },
        parseResults: {
          pages: data.numpages,
          textLength: data.text.length,
          textPreview: data.text.substring(0, 500),
          hasText: data.text.length > 0
        }
      }
    });
    
  } catch (error: any) {
    console.error("❌ PDF test failed:", error.message);
    console.error("❌ Full error:", error.stack || error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack || error.toString()
    }, { status: 500 });
  }
}