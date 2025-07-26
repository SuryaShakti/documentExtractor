"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  RefreshCw, 
  Settings, 
  FileText, 
  FolderOpen,
  Target,
  CheckCircle,
  AlertCircle,
  Clock,
  Brain
} from 'lucide-react';

import useSimplifiedExtraction from '@/hooks/useSimplifiedExtraction';

interface SimplifiedExtractionDemoProps {
  projectId: string;
  collectionId?: string;
  documentId?: string;
}

/**
 * Demo component showing how to use the new simplified extraction API
 * 
 * This replaces the old document-collections/[id]/extract API calls
 */
export function SimplifiedExtractionDemo({
  projectId,
  collectionId = "687b64b495afe5e7304c3b1b", // Your collection ID from the chat
  documentId = "67d123456789abcdef012345" // Example document ID
}: SimplifiedExtractionDemoProps) {
  const {
    extractFromCollection,
    extractFromDocument,
    reextractRow,
    customizeCell,
    isExtracting,
    extractionProgress,
    lastResult,
    clearLastResult
  } = useSimplifiedExtraction();

  // Form states
  const [columns, setColumns] = useState("document_title,amount");
  const [forceReextract, setForceReextract] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("Extract the main title or heading from this document");
  const [selectedColumnId, setSelectedColumnId] = useState("document_title");

  const getStatusIcon = () => {
    if (isExtracting) return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
    if (lastResult?.success) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (lastResult && !lastResult.success) return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Brain className="h-4 w-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (isExtracting) {
      const progress = extractionProgress ? Math.round(extractionProgress) : 0;
      return `Extracting... ${progress}%`;
    }
    if (lastResult?.success) return "Extraction completed successfully";
    if (lastResult && !lastResult.success) return "Extraction failed";
    return "Ready to extract";
  };

  const handleCollectionExtraction = async () => {
    const columnList = columns.split(',').map(col => col.trim()).filter(Boolean);
    
    await extractFromCollection(
      projectId,
      collectionId,
      {
        columns: columnList,
        forceReextract,
        aggregationStrategy: 'concatenate'
      }
    );
  };

  const handleDocumentExtraction = async () => {
    const columnList = columns.split(',').map(col => col.trim()).filter(Boolean);
    const columnConfigs = columnList.map(columnId => ({ columnId }));
    
    await extractFromDocument(
      projectId,
      documentId,
      columnConfigs,
      { forceReextract }
    );
  };

  const handleRowReextraction = async () => {
    const columnList = columns.split(',').map(col => col.trim()).filter(Boolean);
    
    await reextractRow(
      projectId,
      documentId,
      columnList.length > 0 ? columnList : undefined // undefined means all columns
    );
  };

  const handleCellCustomization = async () => {
    await customizeCell(
      projectId,
      documentId,
      selectedColumnId,
      customPrompt,
      {
        notes: "Demo cell customization",
        aiModel: "gpt-4o"
      }
    );
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Simplified Extraction API Demo</h1>
        <p className="text-gray-600 mt-2">
          Test the new unified extraction API with your preferred payload format
        </p>
        
        {/* Status Card */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-center space-x-3">
              {getStatusIcon()}
              <span className="font-medium">{getStatusText()}</span>
            </div>
            
            {isExtracting && extractionProgress && (
              <div className="mt-3">
                <Progress value={extractionProgress} className="w-full" />
              </div>
            )}
            
            {lastResult && (
              <div className="mt-3 text-sm">
                <Badge variant={lastResult.success ? "default" : "destructive"} className="mr-2">
                  {lastResult.success ? "Success" : "Failed"}
                </Badge>
                {lastResult.success && (
                  <span className="text-gray-600">
                    {lastResult.stats?.successfulExtractions}/{lastResult.stats?.totalExtractions} successful 
                    in {lastResult.stats?.processingTimeMs}ms
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Configure the extraction parameters for testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="projectId">Project ID</Label>
              <Input id="projectId" value={projectId} disabled />
            </div>
            <div>
              <Label htmlFor="collectionId">Collection ID</Label>
              <Input id="collectionId" value={collectionId} disabled />
            </div>
            <div>
              <Label htmlFor="documentId">Document ID</Label>
              <Input id="documentId" value={documentId} disabled />
            </div>
          </div>
          
          <div>
            <Label htmlFor="columns">Columns (comma-separated)</Label>
            <Input 
              id="columns"
              value={columns}
              onChange={(e) => setColumns(e.target.value)}
              placeholder="document_title,amount,client_name"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="forceReextract"
              checked={forceReextract}
              onChange={(e) => setForceReextract(e.target.checked)}
            />
            <Label htmlFor="forceReextract">Force re-extraction</Label>
          </div>
        </CardContent>
      </Card>

      {/* Scenario 1: Document Collection Extraction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5 text-blue-500" />
            <span>Scenario 1: Document Collection Extraction</span>
          </CardTitle>
          <CardDescription>
            Extract data from document collection (replaces your current API call)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-2">Old API Call:</h4>
            <code className="text-sm text-gray-700">
              POST /api/document-collections/{collectionId}/extract<br/>
              {`{"forceReextract": false}`}
            </code>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-2">New API Call:</h4>
            <code className="text-sm text-gray-700">
              POST /api/extract/simplified<br/>
              {`{"projectId": "${projectId}", "extractions": [{"documentCollection": {"id": "${collectionId}", "columns": [], "forceReextract": ${forceReextract}}}]}`}
            </code>
          </div>
          
          <Button onClick={handleCollectionExtraction} disabled={isExtracting}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Extract from Collection
          </Button>
        </CardContent>
      </Card>

      {/* Scenario 2: Single Document Extraction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-green-500" />
            <span>Scenario 2: Single Document Extraction</span>
          </CardTitle>
          <CardDescription>
            Extract data from a single document
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDocumentExtraction} disabled={isExtracting}>
            <FileText className="h-4 w-4 mr-2" />
            Extract from Document
          </Button>
        </CardContent>
      </Card>

      {/* Scenario 3: Row Re-extraction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 text-orange-500" />
            <span>Scenario 3: Row Re-extraction</span>
          </CardTitle>
          <CardDescription>
            Re-extract all columns for a document
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRowReextraction} disabled={isExtracting}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-extract Row
          </Button>
        </CardContent>
      </Card>

      {/* Scenario 4: Cell Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-purple-500" />
            <span>Scenario 4: Cell Customization</span>
          </CardTitle>
          <CardDescription>
            Customize single cell with custom prompt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="columnId">Column ID</Label>
              <Input 
                id="columnId"
                value={selectedColumnId}
                onChange={(e) => setSelectedColumnId(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="customPrompt">Custom Prompt</Label>
            <Textarea 
              id="customPrompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              placeholder="Enter your custom extraction prompt..."
            />
          </div>
          
          <Button onClick={handleCellCustomization} disabled={isExtracting}>
            <Target className="h-4 w-4 mr-2" />
            Customize Cell
          </Button>
        </CardContent>
      </Card>

      {/* Results Display */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Latest Results</span>
              <Button variant="outline" size="sm" onClick={clearLastResult}>
                Clear
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto max-h-96">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Migration Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Guide</CardTitle>
          <CardDescription>
            How to update your components to use the new API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">1. Install the hook:</h4>
            <code className="bg-gray-100 p-2 rounded text-sm block">
              import useSimplifiedExtraction from '@/hooks/useSimplifiedExtraction';
            </code>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">2. Replace your current extraction calls:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-red-50 p-3 rounded">
                <h5 className="font-medium text-red-700 mb-1">❌ Old way:</h5>
                <code className="text-sm">
                  const {`{ extractData }`} = useCollectionActions();<br/>
                  await extractData(collectionId, null, [], false);
                </code>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <h5 className="font-medium text-green-700 mb-1">✅ New way:</h5>
                <code className="text-sm">
                  const {`{ extractFromCollection }`} = useSimplifiedExtraction();<br/>
                  await extractFromCollection(projectId, collectionId);
                </code>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">3. Benefits of the new API:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>✅ Unified interface for all 4 extraction scenarios</li>
              <li>✅ Your preferred payload format</li>
              <li>✅ Better error handling and progress tracking</li>
              <li>✅ Consistent response format</li>
              <li>✅ Built-in toast notifications</li>
              <li>✅ TypeScript support with proper types</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SimplifiedExtractionDemo;
