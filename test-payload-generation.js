// test-payload-generation.js
// Simple test file to verify payload generation works correctly

const { 
  generateSingleDocumentPayload,
  generateCollectionExtractionPayload,
  generateRowReextractionPayload,
  generateCellCustomizationPayload,
  generateMixedCollectionsPayload 
} = require('./lib/utils/extraction-payloads.ts');

// Test data
const projectId = "proj_67c123456789abcdef012345";
const documentId = "doc_001_invoice";
const collectionId = "coll_financial_docs";
const documentIds = ["doc_001_invoice", "doc_002_receipt", "doc_003_contract"];
const columns = [
  {
    columnId: "document_title",
    type: "text",
    prompt: "Extract the main title or heading from the document",
    aiModel: "gpt-4o"
  },
  {
    columnId: "total_amount",
    type: "price", 
    prompt: "Find the total amount with currency symbol",
    aiModel: "gpt-4o"
  },
  {
    columnId: "vendor_name",
    type: "organization",
    prompt: "Extract the vendor or company name",
    aiModel: "gpt-4o"
  }
];

console.log("🧪 TESTING PAYLOAD GENERATION");
console.log("===============================");

// Test Scenario 1
console.log("\n📄 SCENARIO 1: Single Document");
generateSingleDocumentPayload(projectId, documentId, columns);

// Test Scenario 2  
console.log("\n📁 SCENARIO 2: Collection Extraction");
generateCollectionExtractionPayload(projectId, collectionId, documentIds, columns);

// Test Scenario 3
console.log("\n🔄 SCENARIO 3: Row Re-extraction"); 
generateRowReextractionPayload(projectId, documentId, columns);

// Test Scenario 4
console.log("\n🎯 SCENARIO 4: Cell Customization");
generateCellCustomizationPayload(
  projectId, 
  documentId, 
  "total_amount", 
  "Look specifically at the bottom right corner of the invoice for the total amount"
);

// Test Scenario 5
console.log("\n🔀 SCENARIO 5: Mixed Collections");
const collections = [
  {
    id: "coll_financial_q4",
    name: "Financial Q4",
    docIds: ["doc_001_invoice", "doc_002_receipt"],
    columns: columns.slice(0, 2),
    aggregationStrategy: "list",
    forceReextract: false
  },
  {
    id: "coll_legal_contracts", 
    name: "Legal Contracts",
    docIds: ["doc_003_contract"],
    columns: [
      {
        columnId: "contract_value",
        type: "price",
        prompt: "Extract contract value or compensation amount",
        aiModel: "gpt-4o"
      }
    ],
    aggregationStrategy: "smart",
    forceReextract: false
  }
];
generateMixedCollectionsPayload(projectId, collections);

console.log("\n✅ All payload generation tests completed!");
console.log("🎯 Check the console output in your DocumentGrid component!");
