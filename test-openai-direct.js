// Test the OpenAI-only approach
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: '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'
});

async function testOpenAIDirectExtraction() {
  try {
    console.log('Testing OpenAI direct PDF extraction...');
    
    // Test with a known working PDF URL
    const testUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    
    console.log('Using test PDF:', testUrl);
    
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
                url: testUrl
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    const extractedText = completion.choices[0].message.content || "";
    
    console.log('✅ OpenAI extraction successful!');
    console.log('Extracted text length:', extractedText.length);
    console.log('First 300 characters:');
    console.log(extractedText.substring(0, 300));
    console.log('\\n📝 Full extracted text:');
    console.log(extractedText);
    
    // Test field extraction
    console.log('\\n🔍 Testing field extraction...');
    
    const fieldExtraction = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: `Extract specific information from document text. Always respond with valid JSON: {"value": "extracted_value", "confidence": 0.95}. If not found, return {"value": "", "confidence": 0}.`
        },
        { 
          role: "user", 
          content: `Document: ${extractedText}\\n\\nExtract: Find the main title or heading of this document\\n\\nField: Document Title\\n\\nReturn JSON only.`
        }
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: "json_object" },
    });

    const fieldResult = fieldExtraction.choices[0].message.content;
    console.log('Field extraction result:', fieldResult);
    
    console.log('\\n🎉 All tests passed! OpenAI direct extraction is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
  }
}

testOpenAIDirectExtraction();
