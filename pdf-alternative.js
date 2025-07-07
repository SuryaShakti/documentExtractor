// Alternative PDF extraction using require (if dynamic import fails)
export async function extractTextFromPDFAlternative(documentUrl: string): Promise<string> {
  console.log("Extracting text from PDF using require approach");

  try {
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log("PDF buffer size:", buffer.length);
    
    // Use require for pdf-parse (CommonJS style)
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    
    console.log("Extracted PDF text length:", data.text.length);
    console.log("PDF pages:", data.numpages);
    console.log("First 500 characters:", data.text.substring(0, 500));
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error("No text content could be extracted from the PDF");
    }
    
    return data.text;
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}
