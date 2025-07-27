# Cell-Level Extraction - Implementation Guide

## 🎯 Overview

The cell-level extraction feature enhances your Document Extractor app with **granular control** over AI prompts for individual cells. This is a **complete additive enhancement** that maintains 100% backward compatibility while adding powerful new capabilities.

## ✨ What's New

### **Core Features**
- **Cell-Level Prompts**: Customize extraction prompts for any specific cell
- **Visual Indicators**: Clear UI showing which cells have custom prompts
- **Extraction History**: Track all extraction attempts with timestamps and confidence
- **Backward Compatibility**: All existing functionality works unchanged
- **Smart Integration**: Enhanced extract API automatically uses custom prompts

### **Key Benefits**
- **Precision Control**: Handle document variations and edge cases perfectly
- **Iterative Improvement**: Refine results cell by cell without affecting others
- **User Empowerment**: Mix automated and fine-tuned approaches seamlessly
- **Learning System**: Build library of successful prompt patterns

## 🛠 Implementation Details

### **Database Enhancements (Additive)**

The `IExtractedData` interface now includes optional cell customization:

```typescript
// NEW: Added to existing interface (100% backward compatible)
cellCustomization?: {
  isCustomized: boolean;
  customPrompt?: string;
  originalPrompt?: string;
  customizedAt?: Date;
  customizedBy?: ObjectId;
  extractionHistory?: Array<{
    prompt: string;
    result: string;
    confidence: number;
    timestamp: Date;
    model?: string;
  }>;
  notes?: string;
};
```

### **New API Endpoints**

#### **Cell-Level Extraction**
```bash
POST /api/extract-cell
```
**Body:**
```json
{
  "projectId": "string",
  "documentId": "string", 
  "columnId": "string",
  "customPrompt": "optional custom prompt",
  "saveCustomPrompt": false
}
```

#### **Cell Customization Management**
```bash
GET    /api/cell-customization?projectId=...&documentId=...&columnId=...
POST   /api/cell-customization
PUT    /api/cell-customization  
DELETE /api/cell-customization?projectId=...&documentId=...&columnId=...
```

### **Enhanced Existing API**

The existing `/api/extract` endpoint now automatically:
- Detects cells with custom prompts
- Uses effective prompts (custom or default) for each cell
- Tracks extraction history
- Maintains full backward compatibility

## 🎨 UI Components

### **1. Cell Customization Dialog**
**Location:** `components/dashboard/cell-customization/CellCustomizationDialog.tsx`

**Features:**
- Custom prompt editor with validation
- Test extraction without saving
- Extraction history viewer
- Notes and metadata management
- Revert to default functionality

### **2. Enhanced Document Grid**
**Location:** `components/dashboard/DocumentGrid.tsx` (Enhanced)

**New Features:**
- Right-click context menu for cell customization
- Visual indicators for customized cells (blue ring)
- Enhanced data chip renderer with customization status
- Custom header renderer showing customization counts

### **3. Cell Status Indicator**
**Location:** `components/dashboard/cell-customization/CellStatusIndicator.tsx`

**Variants:**
- **Minimal**: Just status icons
- **Chip**: Hover card with details (default)
- **Full**: Comprehensive status display

## 🔧 Utility Functions

### **Cell Extraction Utilities**
**Location:** `lib/utils/cell-extraction/index.ts`

**Key Functions:**
- `isCellCustomized(document, columnId)`: Check customization status
- `getEffectivePrompt(document, columnId, defaultPrompt)`: Get active prompt
- `getCellCustomizationInfo()`: Comprehensive cell info
- `countCustomizedCells()`: Project-wide statistics
- `validateCustomPrompt()`: Prompt validation and suggestions

### **API Client Functions**
**Location:** `lib/api/cell-extraction.ts`

**Available Functions:**
- `extractCell()`: Extract single cell with optional custom prompt
- `getCellCustomization()`: Get cell customization info
- `setCellCustomization()`: Save custom prompt
- `removeCellCustomization()`: Revert to default
- `batchExtractCells()`: Process multiple cells
- `testCustomPrompt()`: Test without saving

## 🚀 Usage Examples

### **Basic Cell Customization**

```typescript
// In your component
import { CellCustomizationDialog } from "@/components/dashboard/cell-customization/CellCustomizationDialog";

const [dialogState, setDialogState] = useState({
  open: false,
  projectId: "",
  documentId: "",
  columnId: "",
  columnName: "",
  documentName: "",
});

// Open customization dialog
const handleCellRightClick = (projectId, documentId, columnId, columnName, documentName) => {
  setDialogState({
    open: true,
    projectId,
    documentId,
    columnId,
    columnName,
    documentName,
  });
};

// Render dialog
<CellCustomizationDialog
  open={dialogState.open}
  onOpenChange={(open) => setDialogState(prev => ({ ...prev, open }))}
  projectId={dialogState.projectId}
  documentId={dialogState.documentId}
  columnId={dialogState.columnId}
  columnName={dialogState.columnName}
  documentName={dialogState.documentName}
  onCustomizationSaved={() => {
    // Refresh data
    getDocuments(projectId);
  }}
/>
```

### **Cell Status Display**

```typescript
import { CellStatusIndicator } from "@/components/dashboard/cell-customization/CellStatusIndicator";

// In your data renderer
<CellStatusIndicator
  value={extractedData.value}
  confidence={extractedData.confidence}
  isCustomized={extractedData.cellCustomization?.isCustomized || false}
  extractedAt={new Date(extractedData.extractedAt)}
  extractionHistory={extractedData.cellCustomization?.extractionHistory || []}
  onCustomizeClick={() => openCustomizationDialog()}
  onQuickExtractClick={() => quickExtractCell()}
  variant="chip" // or "minimal" or "full"
/>
```

### **Programmatic Cell Extraction**

```typescript
import { extractCell } from "@/lib/api/cell-extraction";

// Extract with custom prompt
const result = await extractCell({
  projectId: "project_id",
  documentId: "document_id", 
  columnId: "invoice_number",
  customPrompt: "Extract the invoice number from the top-right corner",
  saveCustomPrompt: true
}, token);

if (result.success) {
  console.log("Extracted:", result.data.result.value);
  console.log("Confidence:", result.data.result.confidence);
}
```

### **Check Cell Customization Status**

```typescript
import { isCellCustomized, getEffectivePrompt } from "@/lib/utils/cell-extraction";

// Check if cell has custom prompt
const isCustom = isCellCustomized(document, "invoice_number");

// Get active prompt (custom or default)
const activePrompt = getEffectivePrompt(document, "invoice_number", "Extract invoice number");

console.log(`Using ${isCustom ? 'custom' : 'default'} prompt: ${activePrompt}`);
```

## 📊 User Workflow

### **Default Experience (Unchanged)**
1. User creates columns with default prompts
2. System processes all documents with column prompts
3. Results appear in grid as before
4. **Everything works exactly as before**

### **Enhanced Experience (New)**
1. User notices poor extraction for specific document
2. User right-clicks on that cell
3. User customizes prompt for better extraction
4. System re-processes only that cell
5. Cell shows blue ring indicator for custom prompt
6. Future extractions use appropriate prompts automatically

### **Progressive Refinement**
1. Start with column default prompts
2. Identify problematic cells
3. Customize prompts cell by cell
4. Build library of effective prompts
5. Achieve perfect extraction accuracy

## 🔍 Monitoring & Analytics

### **Project Statistics**
```typescript
import { countCustomizedCells } from "@/lib/utils/cell-extraction";

const stats = countCustomizedCells(documents);
console.log(`${stats.totalCustomizations} cells customized across ${stats.documentsWithCustomizations} documents`);
console.log("Customizations by column:", stats.customizationsByColumn);
```

### **Extraction Quality Metrics**
```typescript
import { getCellExtractionStats } from "@/lib/utils/cell-extraction";

const stats = getCellExtractionStats(documents, "invoice_number");
console.log(`Extraction rate: ${stats.extractedCells}/${stats.totalCells}`);
console.log(`Average confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);
console.log(`Customized cells: ${stats.customizedCells}`);
```

## 🎯 Migration Path

### **For Existing Projects**
1. **No Action Required**: All existing projects work unchanged
2. **Gradual Enhancement**: Users can customize cells as needed
3. **No Data Loss**: All existing data remains intact
4. **Performance**: No impact on existing functionality

### **New Projects**
1. Start with column default prompts (existing workflow)
2. Customize cells as needed for better results
3. Build effective prompt patterns over time

## 🔒 Backward Compatibility Guarantee

- **Database**: New fields are optional, existing data unaffected
- **APIs**: Existing endpoints work unchanged
- **UI**: Original DocumentGrid backed up as `DocumentGrid-Original.tsx`
- **Functionality**: All existing features preserved
- **Performance**: No impact on existing extraction speed

## 🎉 Summary

This implementation provides **granular control** over document extraction while maintaining **100% backward compatibility**. Users can now:

- **Start with defaults** and **enhance selectively**
- **Handle edge cases** with **custom prompts**
- **Track extraction history** and **performance**
- **Mix automated and manual** approaches seamlessly

The feature is designed to **empower users** with **precision control** while keeping the **default experience simple** and **unchanged**.
