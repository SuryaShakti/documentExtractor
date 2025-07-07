// Test script to verify OpenAI integration
require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 second timeout
});

async function testOpenAIConnection() {
  console.log('🧪 Testing OpenAI Connection...');
  console.log('API Key:', process.env.OPENAI_API_KEY ? 'Found ✅' : 'Missing ❌');
  
  try {
    // Test basic chat completion
    console.log('\n📝 Testing basic chat completion...');
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "user", content: "Return only the text: 'OpenAI connection working'" }
      ],
      max_tokens: 50,
      temperature: 0
    });
    
    console.log('Chat Response:', chatResponse.choices[0].message.content);
    
    // Test JSON response format
    console.log('\n🔧 Testing JSON response format...');
    const jsonResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "user", 
          content: 'Return this exact JSON: {"status": "success", "test": "json_format_working"}' 
        }
      ],
      max_tokens: 100,
      temperature: 0,
      response_format: { type: "json_object" }
    });
    
    const jsonResult = JSON.parse(jsonResponse.choices[0].message.content);
    console.log('JSON Response:', jsonResult);
    
    // Test Vision API with a simple test image
    console.log('\n👁️ Testing Vision API...');
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What do you see in this image? Respond with a brief description."
            },
            {
              type: "image_url",
              image_url: {
                url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
              }
            }
          ]
        }
      ],
      max_tokens: 100,
      temperature: 0
    });
    
    console.log('Vision Response:', visionResponse.choices[0].message.content);
    
    console.log('\n✅ All OpenAI tests passed! Integration is working correctly.');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ OpenAI test failed:', error.message);
    
    if (error.code === 'invalid_api_key') {
      console.error('🔑 Invalid API key. Please check your OPENAI_API_KEY in .env.local');
    } else if (error.code === 'insufficient_quota') {
      console.error('💳 Insufficient quota. Please check your OpenAI billing.');
    } else if (error.message.includes('timeout')) {
      console.error('⏱️ Request timed out. Check your internet connection.');
    } else if (error.response) {
      console.error('📊 API Error Response:', error.response.data);
    }
    
    return false;
  }
}

async function testDocumentExtraction() {
  console.log('\n\n🧪 Testing Document Extraction...');
  
  try {
    // Test with a simple test document URL
    const testUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    console.log('📄 Test document:', testUrl);
    
    // Test columns configuration
    const testColumns = [
      {
        id: 'title',
        name: 'Document Title',
        prompt: 'Extract the main title or heading of this document',
        type: 'text'
      },
      {
        id: 'content',
        name: 'Main Content',
        prompt: 'Extract the main body text or content from this document',
        type: 'text'
      }
    ];
    
    console.log('📋 Test columns:', testColumns.length);
    
    // Create extraction prompt
    const extractionPrompt = `Analyze this document and extract the following information. Return ONLY valid JSON with no additional text.

EXTRACTION TASKS:
${testColumns.map((col, index) => `${index + 1}. ${col.name}: ${col.prompt} (Type: ${col.type})`).join('\n')}

REQUIRED JSON FORMAT:
{
  "extractions": [
    ${testColumns.map(col => `{"columnId": "${col.id}", "value": "", "confidence": 0}`).join(',\n    ')}
  ]
}`;

    console.log('\n📤 Sending extraction request...');
    
    const extractionResponse = await openai.chat.completions.create({
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
                url: testUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const response = extractionResponse.choices[0].message.content;
    console.log('\n📥 Raw response:', response);
    
    const parsedResponse = JSON.parse(response);
    console.log('\n📊 Parsed extractions:');
    
    parsedResponse.extractions?.forEach(extraction => {
      console.log(`  📌 ${extraction.columnId}: "${extraction.value}" (confidence: ${extraction.confidence})`);
    });
    
    console.log('\n✅ Document extraction test passed!');
    return true;
    
  } catch (error) {
    console.error('\n❌ Document extraction test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting OpenAI Integration Tests\n');
  console.log('=' .repeat(50));
  
  const connectionTest = await testOpenAIConnection();
  const extractionTest = await testDocumentExtraction();
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results:');
  console.log(`  🔌 Connection Test: ${connectionTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  📄 Extraction Test: ${extractionTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (connectionTest && extractionTest) {
    console.log('\n🎉 All tests passed! Your OpenAI integration is ready to use.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above and fix them before proceeding.');
  }
}

// Run the tests
runAllTests().catch(console.error);