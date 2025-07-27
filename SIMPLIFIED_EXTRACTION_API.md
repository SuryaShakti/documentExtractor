# Simplified Unified Extraction API

## Overview

This API provides a simplified, unified interface for all document extraction scenarios in your application. It accepts your preferred payload format and supports all 4 extraction scenarios you mentioned.

## Endpoint

```
POST /api/extract/simplified
```

## Authentication

Use JWT token in Authorization header or cookie:
```bash
# Option 1: Authorization header
-H 'Authorization: Bearer YOUR_JWT_TOKEN'

# Option 2: Cookie (your current method)
-b 'access_token=YOUR_JWT_TOKEN'
```

## 4 Extraction Scenarios

### 1. Single Document Extraction

Extract data from one document:

```bash
curl 'http://localhost:3000/api/extract/simplified' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  --data-raw '{
    "projectId": "687653a8395848229071d69a",
    "extractions": [
      {
        "document": {
          "id": "67d123456789abcdef012345",
          "columns": [
            {
              "columnId": "document_title",
              "customPrompt": "Extract the main title from this document"
            }
          ],
          "forceReextract": false
        }
      }
    ]
  }'
```

### 2. Document Collection Extraction (Your Main Use Case)

Extract from document collection (replaces your current API call):

```bash
curl 'http://localhost:3000/api/extract/simplified' \
  -H 'Content-Type: application/json' \
  -b 'access_token=YOUR_JWT_TOKEN' \
  --data-raw '{
    "projectId": "687653a8395848229071d69a",
    "extractions": [
      {
        "documentCollection": {
          "id": "687b64b495afe5e7304c3b1b",
          "docIds": [],
          "columns": [
            {
              "columnId": "document_title",
              "forceReextract": false
            },
            {
              "columnId": "amount",
              "customPrompt": "Extract any monetary value or price",
              "forceReextract": true
            }
          ],
          "aggregationStrategy": "concatenate",
          "forceReextract": false
        }
      }
    ],
    "globalOptions": {
      "aiModel": "gpt-4o",
      "includeConfidence": true
    }
  }'
```

### 3. Row Re-extraction

Re-extract all columns for a document:

```bash
curl 'http://localhost:3000/api/extract/simplified' \
  -H 'Content-Type: application/json' \
  -b 'access_token=YOUR_JWT_TOKEN' \
  --data-raw '{
    "projectId": "687653a8395848229071d69a",
    "extractions": [
      {
        "rowReextraction": {
          "documentId": "67d123456789abcdef012345",
          "columns": [],
          "forceReextract": true
        }
      }
    ]
  }'
```

### 4. Cell Customization

Customize single cell with custom prompt:

```bash
curl 'http://localhost:3000/api/extract/simplified' \
  -H 'Content-Type: application/json' \
  -b 'access_token=YOUR_JWT_TOKEN' \
  --data-raw '{
    "projectId": "687653a8395848229071d69a",
    "extractions": [
      {
        "cellCustomization": {
          "documentId": "67d123456789abcdef012345",
          "columnId": "document_title",
          "customPrompt": "Extract only the main heading, ignore subtitles",
          "notes": "User wants more specific title extraction",
          "validationRules": {
            "required": true,
            "minLength": 5,
            "maxLength": 200
          }
        }
      }
    ]
  }'
```

## Response Format

```typescript
{
  "success": boolean,
  "requestId": string,
  "results": [
    {
      "scenarioType": "document" | "documentCollection" | "rowReextraction" | "cellCustomization",
      "targetId": string,
      "success": boolean,
      "data": {
        "columnId": {
          "value": string,
          "confidence": number,
          "extractedBy": {
            "method": "ai" | "cached",
            "model": string,
            "promptUsed": string,
            "customPrompt": boolean
          },
          "extractedAt": string,
          "sourceDocuments": string[]
        }
      },
      "metadata": {
        "documentCount": number,
        "sourceDocuments": string[],
        "aggregationUsed": string,
        "processingTimeMs": number
      },
      "error": string
    }
  ],
  "stats": {
    "totalExtractions": number,
    "successfulExtractions": number,
    "failedExtractions": number,
    "processingTimeMs": number
  }
}
```

## Frontend Usage

### Using the Client Class

```typescript
import { SimplifiedExtractionClient } from '@/lib/utils/simplified-extraction-client';

const client = new SimplifiedExtractionClient();

// Your main use case: extract from collection
const result = await client.extractDocumentCollection(
  '687653a8395848229071d69a', // projectId
  '687b64b495afe5e7304c3b1b', // collectionId
  [
    { columnId: 'document_title' },
    { columnId: 'amount', customPrompt: 'Extract any price or monetary value' }
  ],
  {
    forceReextract: false,
    aggregationStrategy: 'concatenate'
  }
);
```

### Using Convenience Functions

```typescript
import { extractFromCollection, customizeCell } from '@/lib/utils/simplified-extraction-client';

// Quick collection extraction
const result = await extractFromCollection(
  '687653a8395848229071d69a',
  '687b64b495afe5e7304c3b1b',
  {
    columns: ['document_title', 'amount'],
    forceReextract: false
  }
);

// Quick cell customization
const cellResult = await customizeCell(
  '687653a8395848229071d69a',
  'document-id',
  'document_title',
  'Extract only the main heading'
);
```

## Testing

Run the test script to verify the API works:

```bash
# Test your collection extraction
node test-simplified-extraction.js collection

# Test all scenarios
node test-simplified-extraction.js all

# Test specific scenario
node test-simplified-extraction.js single documentCollection
```

Remember to update the test file with your actual IDs and JWT token.

## Migration from Current API

### Before (Your Current Call)
```bash
curl 'http://localhost:3000/api/document-collections/687b64b495afe5e7304c3b1b/extract' \
  --data-raw '{"forceReextract":false}'
```

### After (New Simplified API)
```bash
curl 'http://localhost:3000/api/extract/simplified' \
  --data-raw '{
    "projectId": "687653a8395848229071d69a",
    "extractions": [
      {
        "documentCollection": {
          "id": "687b64b495afe5e7304c3b1b",
          "columns": [],
          "forceReextract": false
        }
      }
    ]
  }'
```

## Key Features

✅ **Unified Interface**: One API for all 4 extraction scenarios  
✅ **Your Preferred Format**: Uses the payload structure you requested  
✅ **Backward Compatible**: Integrates with existing extraction logic  
✅ **Multiple Scenarios**: Can process multiple extractions in one request  
✅ **Flexible Columns**: Specify columns or use all project columns  
✅ **Custom Prompts**: Cell-level and column-level prompt customization  
✅ **Validation**: Built-in validation for cell customization  
✅ **Parallel Processing**: Optional parallel processing for performance  
✅ **Rich Metadata**: Includes confidence, source documents, processing time  

## Files Created

1. **API Route**: `/app/api/extract/simplified/route.ts`
2. **Types**: `/lib/types/simplified-extraction.ts`
3. **Client**: `/lib/utils/simplified-extraction-client.ts`
4. **Test Script**: `/test-simplified-extraction.js`
5. **Documentation**: This file

## Next Steps

1. **Update Your Frontend**: Replace current extraction calls with the new client
2. **Test the API**: Run the test script with your actual data
3. **Migrate Gradually**: You can use both APIs during transition
4. **Add Features**: Extend with additional validation, caching, etc.

## Support for Your Requirements

✅ **Independent Payload**: Each extraction request is independent  
✅ **Scenario 1**: ✓ Document upload extraction  
✅ **Scenario 2**: ✓ Document collection extraction (your main use case)  
✅ **Scenario 3**: ✓ Row re-extraction  
✅ **Scenario 4**: ✓ Cell customization  
✅ **Flexible Structure**: Matches your requested payload format  
✅ **OpenAI Integration**: Uses your existing real AI extraction logic  

The API is ready to use! Update the test file with your actual IDs and JWT token, then run it to verify everything works.
