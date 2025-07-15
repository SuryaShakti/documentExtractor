# Export Functionality Documentation

## Overview

The Document Extractor application now includes comprehensive export functionality that allows users to export extracted data in multiple formats (PDF, Excel, Word) for both individual documents and entire projects.

## Features

### Export Formats

1. **PDF Export**

   - Professional document format with tables and formatting
   - Includes document information, extracted data, and metadata
   - Suitable for reports and presentations

2. **Excel Export**

   - Multi-sheet spreadsheet with data analysis capabilities
   - Separate sheets for project info, columns, documents, and extracted data
   - Ideal for data analysis and further processing

3. **Word Export**
   - Formatted document with tables and styling
   - Professional appearance with proper formatting
   - Suitable for documentation and sharing

### Export Options

- **Include Metadata**: Add confidence scores and extraction methods
- **Include Confidence Scores**: Show AI confidence for each extraction
- **Include Timestamps**: Show when each extraction was performed
- **Custom Filename**: Users can specify custom filenames for exports

## Usage

### Project-Level Export

1. **Quick Export Button**

   - Located in the project header next to "Add Column" and "Upload" buttons
   - Dropdown menu with three format options (Excel, PDF, Word)
   - One-click export with default settings

2. **Advanced Export Dialog**
   - Accessible via the "More" menu → "Export Data"
   - Three-tab interface:
     - **Format**: Choose export format and filename
     - **Options**: Configure export options (metadata, confidence, timestamps)
     - **Preview**: Review what will be exported

### Document-Level Export

1. **Individual Document Export**

   - Available in the actions column of the document grid
   - Click the "More" button (⋮) → "Export Data"
   - Exports only the selected document's extracted data

2. **Export Dialog**
   - Same interface as project export but scoped to single document
   - Shows document-specific information and extracted columns

## API Endpoints

### Project Export

```typescript
// GET /api/projects/[projectId]/export
// Get export options and preview data

// POST /api/projects/[projectId]/export
// Export entire project data
{
  format: 'pdf' | 'excel' | 'doc',
  includeMetadata?: boolean,
  includeConfidence?: boolean,
  includeTimestamps?: boolean,
  filename?: string
}
```

### Document Export

```typescript
// GET /api/projects/[projectId]/documents/[documentId]/export
// Get document export options

// POST /api/projects/[projectId]/documents/[documentId]/export
// Export single document data
{
  format: 'pdf' | 'excel' | 'doc',
  includeMetadata?: boolean,
  includeConfidence?: boolean,
  includeTimestamps?: boolean,
  filename?: string
}
```

## Export Content

### Project Export Includes

1. **Project Information**

   - Project name, description, creation date, last updated
   - Project statistics (total documents, completion rate, etc.)

2. **Extraction Columns**

   - Column names, types, AI models, and prompts
   - Configuration details for each extraction column

3. **Documents Summary**

   - List of all documents with basic information
   - Status, upload date, file type, and size

4. **Extracted Data** (Excel only)
   - All extracted data in a structured format
   - Document-column-value relationships

### Document Export Includes

1. **Document Information**

   - Filename, original name, upload date
   - File type, size, and processing status

2. **Extracted Data**
   - All extracted values for each column
   - Confidence scores and timestamps (if enabled)
   - Extraction method and metadata

## Technical Implementation

### Dependencies

```json
{
  "exceljs": "^4.4.0",
  "jspdf": "^2.5.1",
  "docx": "^8.5.0",
  "file-saver": "^2.0.5"
}
```

### Key Components

1. **ExportService** (`lib/services/exportService.ts`)

   - Singleton service handling all export operations
   - Methods for PDF, Excel, and Word generation
   - Data preparation and formatting utilities

2. **ExportDialog** (`components/dashboard/ExportDialog.tsx`)

   - Comprehensive export interface with tabs
   - Format selection, options configuration, and preview
   - Real-time validation and feedback

3. **QuickExportButton** (`components/dashboard/QuickExportButton.tsx`)

   - Simple dropdown for quick exports
   - One-click export with default settings

4. **API Routes**
   - RESTful endpoints for export operations
   - Authentication and authorization checks
   - Audit logging for export activities

### Data Flow

1. **User Action**: User clicks export button or menu item
2. **Dialog/Options**: Export dialog opens or quick export triggers
3. **API Call**: Frontend calls appropriate export endpoint
4. **Data Preparation**: Backend fetches and prepares data
5. **File Generation**: Export service generates file in requested format
6. **Download**: File is sent to browser for download
7. **Audit Log**: Export activity is logged for tracking

## File Structure

```
lib/services/
├── exportService.ts          # Main export service
└── ...

app/api/projects/[projectId]/
├── export/
│   └── route.ts             # Project export API
└── documents/[documentId]/
    └── export/
        └── route.ts         # Document export API

components/dashboard/
├── ExportDialog.tsx         # Main export dialog
├── QuickExportButton.tsx    # Quick export button
└── ...

app/dashboard/projects/[projectId]/
└── page.tsx                 # Project page with export integration
```

## Export Examples

### Excel Export Structure

**Sheet 1: Project Info**

```
Project Information
Name: [Project Name]
Description: [Project Description]
Created: [Date]
Updated: [Date]

Statistics
Total Documents: [Number]
Completed: [Number]
Processing: [Number]
Completion Rate: [Percentage]
```

**Sheet 2: Columns**

```
Name | Type | AI Model | Prompt
[Column Name] | [Type] | [Model] | [Prompt]
```

**Sheet 3: Documents**

```
Filename | Original Name | Upload Date | File Type | File Size | Status
[Filename] | [Original] | [Date] | [Type] | [Size] | [Status]
```

**Sheet 4: Extracted Data**

```
Document | Column | Value | Type | Confidence | Extracted At
[Doc] | [Col] | [Value] | [Type] | [Score] | [Timestamp]
```

### PDF Export Structure

1. **Title Page**: Project name and export information
2. **Project Information**: Basic project details
3. **Statistics**: Project metrics and completion rates
4. **Columns Table**: Extraction column configuration
5. **Documents Summary**: List of documents (first 10)
6. **Extracted Data**: Table of extracted values

### Word Export Structure

1. **Title**: Project extraction report
2. **Project Information**: Formatted project details
3. **Statistics**: Project metrics
4. **Columns Table**: Formatted table of extraction columns
5. **Documents Summary**: Table of documents (first 20)

## Security & Permissions

- Export functionality requires project access permissions
- Users can only export data from projects they have access to
- Admin users can export system-wide data
- All export activities are logged for audit purposes

## Performance Considerations

- Large projects may take time to export
- Excel exports with many documents can be memory-intensive
- PDF generation is optimized for readability
- File downloads use browser's native download mechanism

## Future Enhancements

1. **Batch Export**: Export multiple documents at once
2. **Scheduled Exports**: Automated export scheduling
3. **Export Templates**: Customizable export formats
4. **Email Export**: Send exports via email
5. **Cloud Storage**: Direct export to cloud storage services
6. **API Export**: Programmatic export via API
7. **Export History**: Track and manage export history

## Troubleshooting

### Common Issues

1. **Export Fails**

   - Check browser console for errors
   - Verify project/document permissions
   - Ensure sufficient memory for large exports

2. **File Not Downloading**

   - Check browser download settings
   - Verify file size limits
   - Clear browser cache

3. **Incomplete Data**
   - Ensure documents are fully processed
   - Check extraction column configuration
   - Verify data permissions

### Debug Information

- Export logs are available in browser console
- Server-side logs show export processing details
- Audit logs track all export activities

## Support

For issues with export functionality:

1. Check the browser console for error messages
2. Verify that the project/documents exist and are accessible
3. Ensure all required dependencies are installed
4. Contact support with specific error details and project information
