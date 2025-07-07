// lib/config/openai.ts - Optional configuration for fine-tuning
export const openaiConfig = {
  timeout: 60000, // 60 seconds
  maxRetries: 3,
  models: {
    vision: 'gpt-4o',      // Best for document processing
    text: 'gpt-3.5-turbo', // Faster for text-only tasks
  },
  maxTokens: {
    extraction: 2000,
    textProcessing: 1500,
  },
  temperature: 0.1, // Low for consistent extraction
};

// Helper to validate API key
export function validateOpenAIKey(): boolean {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    return false;
  }
  if (!key.startsWith('sk-')) {
    console.error('❌ Invalid OpenAI API key format');
    return false;
  }
  return true;
}