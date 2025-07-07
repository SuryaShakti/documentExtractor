// Test if OpenAI can process PDF URLs directly
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: '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'
});

async function testDirectPDFProcessing() {
  // Test URLs - you can replace with your actual document URL
  const testUrls = [
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/sample.pdf', // Replace with your actual URL
  ];

  for (const pdfUrl of testUrls) {
    console.log(`\\n🔍 Testing direct PDF processing with: ${pdfUrl}`);
    
    try {
      // Method 1: Try with current vision model (gpt-4o)
      console.log('\\n📋 Method 1: Direct PDF URL with gpt-4o...');
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all text from this PDF document and then find the main title or heading. Return a JSON response with: {\\\"full_text\\\": \\\"all extracted text here\\\", \\\"title\\\": \\\"main title here\\\", \\\"confidence\\\": 0.95}"
              },
              {
                type: "image_url", // Note: we're using image_url even for PDF
                image_url: {
                  url: pdfUrl
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const result = completion.choices[0].message.content;
      console.log('✅ SUCCESS with gpt-4o!');
      console.log('Response:', result);
      
      // Parse the JSON response
      try {
        const parsed = JSON.parse(result);
        console.log('📄 Extracted Title:', parsed.title);
        console.log('📝 Text Length:', parsed.full_text?.length || 0);
        console.log('🎯 Confidence:', parsed.confidence);
      } catch (e) {
        console.log('Raw response:', result);
      }
      
    } catch (error) {
      console.log('❌ Method 1 failed:', error.message);
      
      try {
        // Method 2: Try with different approach
        console.log('\\n📋 Method 2: Simplified text extraction...');
        
        const simpleCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: `Please analyze this PDF document: ${pdfUrl}
              
Extract the following information and return as JSON:
{
  "title": "main document title",
  "summary": "brief summary of content", 
  "key_data": "any important data points",
  "confidence": 0.95
}`
            }
          ],
          max_tokens: 1000,
          temperature: 0.1,
          response_format: { type: "json_object" }
        });

        const simpleResult = simpleCompletion.choices[0].message.content;
        console.log('✅ SUCCESS with simplified approach!');
        console.log('Response:', simpleResult);
        
      } catch (error2) {
        console.log('❌ Method 2 also failed:', error2.message);
      }
    }
  }
  
  // Method 3: Test with a custom extraction prompt
  console.log('\\n🎯 Method 3: Custom extraction prompt...');
  
  try {
    const customPrompt = `
    I need you to extract specific data from a PDF document. Here's what I need:

    Document URL: https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf

    Please extract:
    1. Document title/heading
    2. Any dates mentioned
    3. Any names or organizations
    4. Key summary points

    Return the results in this JSON format:
    {
      "document_title": "extracted title",
      "dates": ["date1", "date2"],
      "names_organizations": ["name1", "org1"],
      "summary": "key points summary",
      "extraction_confidence": 0.95
    }

    If you cannot access or process the PDF directly, please let me know what format would work better.
    `;

    const customCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: customPrompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const customResult = customCompletion.choices[0].message.content;
    console.log('✅ Custom prompt result:');
    console.log(customResult);
    
  } catch (error) {
    console.log('❌ Custom prompt failed:', error.message);
  }
}

testDirectPDFProcessing();
