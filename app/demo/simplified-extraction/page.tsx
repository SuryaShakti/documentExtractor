"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SimplifiedExtractionDemo } from '@/components/dashboard/SimplifiedExtractionDemo';

export default function SimplifiedExtractionDemoPage() {
  // Your actual IDs from the screenshots/chat
  const [projectId, setProjectId] = useState('687653a8395848229071d69a');
  const [collectionId, setCollectionId] = useState('687b64b495afe5e7304c3b1b');
  const [documentId, setDocumentId] = useState('67d123456789abcdef012345');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Simplified Extraction API Demo
              </h1>
              <p className="text-gray-600 mt-1">
                Test your new unified extraction API with the payload format you requested
              </p>
            </div>
            <div className="text-sm text-gray-500">
              <div>Endpoint: <code className="bg-gray-100 px-2 py-1 rounded">/api/extract/simplified</code></div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🔧 Configuration</CardTitle>
            <CardDescription>
              Update these IDs to match your actual data. The collection ID is from your screenshot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="projectId">Project ID</Label>
                <Input 
                  id="projectId"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="Your project ID"
                />
                <p className="text-xs text-gray-500 mt-1">From your screenshot</p>
              </div>
              <div>
                <Label htmlFor="collectionId">Collection ID</Label>
                <Input 
                  id="collectionId"
                  value={collectionId}
                  onChange={(e) => setCollectionId(e.target.value)}
                  placeholder="Your collection ID"
                />
                <p className="text-xs text-gray-500 mt-1">From your curl command</p>
              </div>
              <div>
                <Label htmlFor="documentId">Document ID (for testing)</Label>
                <Input 
                  id="documentId"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="Any document ID in your project"
                />
                <p className="text-xs text-gray-500 mt-1">For single document/cell tests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Component */}
        <SimplifiedExtractionDemo 
          projectId={projectId}
          collectionId={collectionId}
          documentId={documentId}
        />

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>📋 How to Use This Demo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">🚀 Quick Test (Your Main Use Case):</h4>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>Click "Extract from Collection" to test your main scenario</li>
                <li>This replaces your current curl command to <code>/document-collections/{collectionId}/extract</code></li>
                <li>Check the results and network tab to see the new API in action</li>
              </ol>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">✅ What to Expect:</h4>
              <ul className="list-disc list-inside space-y-1 text-green-800">
                <li><strong>Same results</strong> as your current API, but with the new payload format</li>
                <li><strong>Progress tracking</strong> with real-time updates</li>
                <li><strong>Toast notifications</strong> for success/error feedback</li>
                <li><strong>Detailed response</strong> showing extraction stats and timing</li>
              </ul>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-medium text-orange-900 mb-2">🔧 Next Steps for Your Frontend:</h4>
              <ol className="list-decimal list-inside space-y-1 text-orange-800">
                <li>Replace <code>useCollectionActions().extractData</code> with <code>useSimplifiedExtraction().extractFromCollection</code></li>
                <li>Update your components to pass <code>projectId</code> along with <code>collectionId</code></li>
                <li>Test each scenario to ensure it works with your actual data</li>
                <li>Both APIs can run simultaneously during migration</li>
              </ol>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">🎯 New Capabilities:</h4>
              <ul className="list-disc list-inside space-y-1 text-purple-800">
                <li><strong>Cell Customization:</strong> Customize extraction prompts for individual cells</li>
                <li><strong>Row Re-extraction:</strong> Re-extract entire document rows with one call</li>
                <li><strong>Batch Processing:</strong> Multiple extractions in a single request</li>
                <li><strong>Better Error Handling:</strong> Detailed error messages and retry logic</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
