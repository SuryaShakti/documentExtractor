#!/usr/bin/env node

/**
 * Test script for the Simplified Extraction API
 * 
 * Run with: node test-simplified-extraction.js
 * 
 * Make sure to:
 * 1. Start your development server: npm run dev
 * 2. Have valid project/collection/document IDs
 * 3. Have a valid JWT token
 */

const BASE_URL = 'http://localhost:3000';

// Replace these with your actual IDs from the database
const TEST_DATA = {
  projectId: '687653a8395848229071d69a',        // Your project ID
  collectionId: '687b64b495afe5e7304c3b1b',     // Your collection ID  
  documentId: '67d123456789abcdef012345',       // A document ID in your project
  jwtToken: 'YOUR_JWT_TOKEN_HERE'               // Get from browser cookies or login
};

// Test scenarios
const TESTS = {
  // Test 1: Document Collection Extraction (your main use case)
  documentCollection: {
    name: 'Document Collection Extraction',
    payload: {
      projectId: TEST_DATA.projectId,
      extractions: [
        {
          documentCollection: {
            id: TEST_DATA.collectionId,
            columns: [
              {
                columnId: 'document_title',
                customPrompt: 'Extract the main title or heading from this document'
              },
              {
                columnId: 'amount',
                customPrompt: 'Find any monetary amounts, prices, or currency values'
              }
            ],
            aggregationStrategy: 'concatenate',
            forceReextract: false
          }
        }
      ],
      globalOptions: {
        aiModel: 'gpt-4o',
        includeConfidence: true,
        includeMetadata: true
      }
    }
  },

  // Test 2: Single Document Extraction
  singleDocument: {
    name: 'Single Document Extraction',
    payload: {
      projectId: TEST_DATA.projectId,
      extractions: [
        {
          document: {
            id: TEST_DATA.documentId,
            columns: [
              {
                columnId: 'document_title',
                customPrompt: 'Extract the main title from this document'
              }
            ],
            forceReextract: false
          }
        }
      ]
    }
  },

  // Test 3: Row Re-extraction
  rowReextraction: {
    name: 'Row Re-extraction',
    payload: {
      projectId: TEST_DATA.projectId,
      extractions: [
        {
          rowReextraction: {
            documentId: TEST_DATA.documentId,
            forceReextract: true
          }
        }
      ]
    }
  },

  // Test 4: Cell Customization
  cellCustomization: {
    name: 'Cell Customization',
    payload: {
      projectId: TEST_DATA.projectId,
      extractions: [
        {
          cellCustomization: {
            documentId: TEST_DATA.documentId,
            columnId: 'document_title',
            customPrompt: 'Extract only the main heading, ignore subtitles and any decorative text',
            notes: 'Testing cell-level customization',
            validationRules: {
              required: true,
              minLength: 3,
              maxLength: 200
            }
          }
        }
      ]
    }
  },

  // Test 5: Multiple Scenarios in One Request
  multipleScenarios: {
    name: 'Multiple Scenarios',
    payload: {
      projectId: TEST_DATA.projectId,
      extractions: [
        {
          document: {
            id: TEST_DATA.documentId,
            columns: [{ columnId: 'document_title' }]
          }
        },
        {
          documentCollection: {
            id: TEST_DATA.collectionId,
            columns: [{ columnId: 'amount' }],
            aggregationStrategy: 'concatenate'
          }
        }
      ],
      globalOptions: {
        parallelProcessing: true,
        aiModel: 'gpt-4o'
      }
    }
  }
};

/**
 * Make API request to the simplified extraction endpoint
 */
async function makeExtractionRequest(testName, payload) {
  console.log(`\\n🧪 Testing: ${testName}`);
  console.log('📋 Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${BASE_URL}/api/extract/simplified`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_DATA.jwtToken}`, // Use Authorization header
        // Alternative: use cookie if you prefer
        // 'Cookie': `access_token=${TEST_DATA.jwtToken}`
      },
      body: JSON.stringify(payload)
    });

    const endTime = Date.now();
    const requestTime = endTime - startTime;

    console.log(`⏱️  Request took: ${requestTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      console.error('Error details:', errorText);
      return null;
    }

    const result = await response.json();
    
    console.log('✅ Success:', {
      requestId: result.requestId,
      totalExtractions: result.stats.totalExtractions,
      successfulExtractions: result.stats.successfulExtractions,
      processingTimeMs: result.stats.processingTimeMs
    });

    // Show extracted data summary
    result.results?.forEach((scenarioResult, index) => {
      console.log(`📊 Result ${index + 1} (${scenarioResult.scenarioType}):`, {
        targetId: scenarioResult.targetId,
        success: scenarioResult.success,
        dataKeys: Object.keys(scenarioResult.data),
        documentCount: scenarioResult.metadata.documentCount,
        error: scenarioResult.error
      });

      // Show actual extracted values
      Object.entries(scenarioResult.data).forEach(([columnId, data]) => {
        console.log(`   📝 ${columnId}: "${data.value}" (confidence: ${data.confidence})`);
      });
    });

    return result;

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Simplified Extraction API Tests');
  console.log(`🔗 Base URL: ${BASE_URL}`);
  console.log(`📁 Project ID: ${TEST_DATA.projectId}`);
  console.log(`📋 Collection ID: ${TEST_DATA.collectionId}`);
  
  if (TEST_DATA.jwtToken === 'YOUR_JWT_TOKEN_HERE') {
    console.error('\\n❌ Please update TEST_DATA.jwtToken with your actual JWT token');
    console.log('💡 You can get it from browser cookies or by logging in via API');
    return;
  }

  const results = [];

  // Run each test
  for (const [testKey, test] of Object.entries(TESTS)) {
    const result = await makeExtractionRequest(test.name, test.payload);
    results.push({ testKey, result, success: !!result });
    
    // Wait a bit between tests to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\\n📊 Test Summary:');
  const successful = results.filter(r => r.success).length;
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${results.length - successful}/${results.length}`);

  if (successful < results.length) {
    console.log('\\n🔍 Failed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.testKey}`);
    });
  }
}

/**
 * Run a specific test by name
 */
async function runSingleTest(testName) {
  const test = TESTS[testName];
  if (!test) {
    console.error(`❌ Test '${testName}' not found. Available tests:`, Object.keys(TESTS));
    return;
  }

  console.log(`🧪 Running single test: ${test.name}`);
  await makeExtractionRequest(test.name, test.payload);
}

/**
 * Test the current collection extraction (replicate your curl command)
 */
async function testCurrentCollectionExtraction() {
  console.log('🧪 Testing Current Collection Extraction (replicate your curl)');
  
  const payload = {
    projectId: TEST_DATA.projectId,
    extractions: [
      {
        documentCollection: {
          id: TEST_DATA.collectionId,
          columns: [], // Empty means use all project columns
          forceReextract: false
        }
      }
    ]
  };

  await makeExtractionRequest('Current Collection Style', payload);
}

// ========================================
// CLI Interface
// ========================================

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'all':
      await runAllTests();
      break;
    case 'collection':
      await testCurrentCollectionExtraction();
      break;
    case 'single':
      await runSingleTest(args[1] || 'documentCollection');
      break;
    case 'help':
    default:
      console.log(`
📖 Simplified Extraction API Test Script

Usage:
  node test-simplified-extraction.js [command]

Commands:
  all                    - Run all test scenarios
  collection             - Test collection extraction (your current use case)
  single [testName]      - Run specific test
  help                   - Show this help

Available test names:
  ${Object.keys(TESTS).map(name => `- ${name}`).join('\\n  ')}

Before running:
1. Update TEST_DATA with your actual IDs and JWT token
2. Make sure your dev server is running (npm run dev)
3. Ensure your database has the test data

Examples:
  node test-simplified-extraction.js collection
  node test-simplified-extraction.js single documentCollection
  node test-simplified-extraction.js all
      `);
      break;
  }
}

// Run the script
main().catch(console.error);

// ========================================
// HELPER: Get JWT Token from Login
// ========================================

/**
 * Helper function to get JWT token by logging in
 * Uncomment and modify if you need to get a fresh token
 */
/*
async function getJwtToken(email, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (response.ok) {
    const data = await response.json();
    return data.token;
  }
  
  throw new Error('Failed to login');
}
*/
