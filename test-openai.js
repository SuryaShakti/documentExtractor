// Quick test script to verify OpenAI integration
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: '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'
});

async function testOpenAI() {
  try {
    console.log('Testing OpenAI connection...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant. Always respond with valid JSON." },
        { role: "user", content: "Extract the title from this text: 'Important Business Document - Annual Report 2023'. Return as JSON with format: {\"value\": \"extracted_title\", \"confidence\": 0.95}" }
      ],
      temperature: 0.1,
      max_tokens: 100,
      response_format: { type: "json_object" }
    });

    console.log('OpenAI Response:', completion.choices[0].message.content);
    console.log('✅ OpenAI integration working!');
    
  } catch (error) {
    console.error('❌ OpenAI test failed:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
  }
}

testOpenAI();
