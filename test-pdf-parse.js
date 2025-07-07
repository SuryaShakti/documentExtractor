// Test pdf-parse functionality
const pdfParse = require('pdf-parse');

async function testPdfParse() {
  try {
    console.log('Testing pdf-parse with a simple buffer...');
    
    // Create a simple test to see if pdf-parse is working
    console.log('pdf-parse type:', typeof pdfParse);
    console.log('pdf-parse function:', pdfParse.toString().substring(0, 200));
    
    // Test with a URL (your actual document)
    const testUrl = 'https://res.cloudinary.com/dyjd0hssi/image/upload/v1735990335/documents/rgnqyb8bqatkcl1jy6fq.pdf';
    
    console.log('Fetching PDF from:', testUrl);
    const response = await fetch(testUrl);
    console.log('Response status:', response.status);
    console.log('Response content-type:', response.headers.get('content-type'));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('Buffer created, size:', buffer.length);
    console.log('Is Buffer:', Buffer.isBuffer(buffer));
    console.log('Buffer first 10 bytes:', Array.from(buffer.slice(0, 10)));
    
    // Test pdf-parse
    console.log('Calling pdf-parse...');
    const data = await pdfParse(buffer);
    
    console.log('Success! Extracted text length:', data.text.length);
    console.log('Pages:', data.numpages);
    console.log('First 200 chars:', data.text.substring(0, 200));
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPdfParse();
