"use client";

// Demo page showcasing all cell-level extraction features
// Access at: /demo/cell-extraction

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  CheckCircle,
  AlertCircle,
  Clock,
  Edit3,
  Zap,
  History,
  BarChart3,
  Eye,
  RefreshCw,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CellStatusIndicator } from "@/components/dashboard/cell-customization/CellStatusIndicator";
import { CellCustomizationDialog } from "@/components/dashboard/cell-customization/CellCustomizationDialog";

// Mock data for demonstration
const mockDocuments = [
  {
    _id: "doc1",
    filename: "invoice_001.pdf",
    extractedData: {
      invoice_number: {
        value: "INV-2024-001",
        confidence: 0.95,
        cellCustomization: {
          isCustomized: false,
          extractionHistory: [
            {
              prompt: "Extract the invoice number",
              result: "INV-2024-001",
              confidence: 0.95,
              timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
              model: "gpt-4o"
            }
          ]
        }
      },
      total_amount: {
        value: "$2,450.00",
        confidence: 0.87,
        cellCustomization: {
          isCustomized: true,
          customPrompt: "Extract the total amount from the bottom right, including currency symbol",
          originalPrompt: "Extract the total amount",
          extractionHistory: [
            {
              prompt: "Extract the total amount",
              result: "2450",
              confidence: 0.65,
              timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
              model: "gpt-4o"
            },
            {
              prompt: "Extract the total amount from the bottom right, including currency symbol",
              result: "$2,450.00",
              confidence: 0.87,
              timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
              model: "gpt-4o"
            }
          ]
        }
      },
      vendor_name: {
        value: "",
        confidence: 0,
        cellCustomization: {
          isCustomized: false,
          extractionHistory: []
        }
      }
    }
  },
  {
    _id: "doc2", 
    filename: "receipt_042.jpg",
    extractedData: {
      invoice_number: {
        value: "RCP-042",
        confidence: 0.72,
        cellCustomization: {
          isCustomized: true,
          customPrompt: "Look for receipt number in the top section, may be labeled as 'Receipt #' or 'No.'",
          originalPrompt: "Extract the invoice number",
          extractionHistory: [
            {
              prompt: "Extract the invoice number",
              result: "",
              confidence: 0,
              timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
              model: "gpt-4o"
            },
            {
              prompt: "Look for receipt number in the top section, may be labeled as 'Receipt #' or 'No.'",
              result: "RCP-042",
              confidence: 0.72,
              timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 mins ago
              model: "gpt-4o"
            }
          ]
        }
      },
      total_amount: {
        value: "$89.50",
        confidence: 0.91,
        cellCustomization: {
          isCustomized: false,
          extractionHistory: [
            {
              prompt: "Extract the total amount",
              result: "$89.50",
              confidence: 0.91,
              timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
              model: "gpt-4o"
            }
          ]
        }
      },
      vendor_name: {
        value: "Coffee Shop Inc",
        confidence: 0.88,
        cellCustomization: {
          isCustomized: false,
          extractionHistory: [
            {
              prompt: "Extract the vendor name",
              result: "Coffee Shop Inc",
              confidence: 0.88,
              timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
              model: "gpt-4o"
            }
          ]
        }
      }
    }
  }
];

const mockColumns = [
  { id: "invoice_number", name: "Invoice Number", defaultPrompt: "Extract the invoice number" },
  { id: "total_amount", name: "Total Amount", defaultPrompt: "Extract the total amount" },
  { id: "vendor_name", name: "Vendor Name", defaultPrompt: "Extract the vendor name" },
];

export default function CellExtractionDemo() {
  const router = useRouter();
  const [selectedDocument, setSelectedDocument] = useState(mockDocuments[0]);
  const [selectedColumn, setSelectedColumn] = useState(mockColumns[0]);
  const [customizationDialog, setCustomizationDialog] = useState({
    open: false,
    projectId: "demo-project",
    documentId: "",
    columnId: "",
    columnName: "",
    documentName: "",
  });

  // Calculate statistics
  const getStats = () => {
    let totalCells = 0;
    let extractedCells = 0;
    let customizedCells = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;

    mockDocuments.forEach(doc => {
      Object.entries(doc.extractedData).forEach(([columnId, data]) => {
        totalCells++;
        if (data.value) extractedCells++;
        if (data.cellCustomization?.isCustomized) customizedCells++;
        if (data.confidence > 0) {
          totalConfidence += data.confidence;
          confidenceCount++;
        }
      });
    });

    return {
      totalCells,
      extractedCells,
      customizedCells,
      averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      extractionRate: totalCells > 0 ? (extractedCells / totalCells) * 100 : 0,
      customizationRate: totalCells > 0 ? (customizedCells / totalCells) * 100 : 0,
    };
  };

  const stats = getStats();

  const handleCellCustomize = (documentId: string, columnId: string) => {
    const document = mockDocuments.find(d => d._id === documentId);
    const column = mockColumns.find(c => c.id === columnId);
    
    if (document && column) {
      setCustomizationDialog({
        open: true,
        projectId: "demo-project",
        documentId,
        columnId,
        columnName: column.name,
        documentName: document.filename,
      });
    }
  };

  const handleQuickExtract = (documentId: string, columnId: string) => {
    console.log("Quick extract:", { documentId, columnId });
    // In real app, this would trigger the extraction API
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Target className="h-6 w-6 text-blue-600" />
                Cell-Level Extraction Demo
              </h1>
              <p className="text-gray-600 mt-1">
                Explore granular control over document data extraction with custom prompts per cell
              </p>
            </div>
            <Button
              onClick={() => router.push("/dashboard")}
              variant="outline"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Cells</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCells}</div>
              <p className="text-xs text-gray-600">Across all documents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Extraction Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.extractionRate.toFixed(1)}%</div>
              <Progress value={stats.extractionRate} className="mt-2" />
              <p className="text-xs text-gray-600 mt-1">
                {stats.extractedCells}/{stats.totalCells} cells extracted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Customized Cells</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.customizedCells}</div>
              <p className="text-xs text-gray-600">
                {stats.customizationRate.toFixed(1)}% of total cells
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(stats.averageConfidence * 100).toFixed(1)}%
              </div>
              <Progress value={stats.averageConfidence * 100} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Main Demo Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Grid Simulation */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Document Grid with Cell-Level Controls</CardTitle>
              <CardDescription>
                Right-click on any data cell to customize its extraction prompt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Column Headers */}
                <div className="grid grid-cols-4 gap-4 pb-2 border-b">
                  <div className="font-medium text-sm text-gray-600">Document</div>
                  {mockColumns.map(column => (
                    <div key={column.id} className="font-medium text-sm text-gray-600">
                      {column.name}
                    </div>
                  ))}
                </div>

                {/* Data Rows */}
                {mockDocuments.map(document => (
                  <div key={document._id} className="grid grid-cols-4 gap-4 items-center py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📄</span>
                      <div>
                        <div className="font-medium text-sm">{document.filename}</div>
                        <div className="text-xs text-gray-500">Demo document</div>
                      </div>
                    </div>

                    {mockColumns.map(column => {
                      const cellData = document.extractedData[column.id];
                      return (
                        <div key={column.id}>
                          <CellStatusIndicator
                            value={cellData.value}
                            confidence={cellData.confidence}
                            isCustomized={cellData.cellCustomization?.isCustomized || false}
                            extractedAt={new Date()}
                            extractionHistory={cellData.cellCustomization?.extractionHistory || []}
                            onCustomizeClick={() => handleCellCustomize(document._id, column.id)}
                            onQuickExtractClick={() => handleQuickExtract(document._id, column.id)}
                            variant="chip"
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                💡 <strong>Try it:</strong> Click on any data chip to see detailed status, or click "Customize" to open the prompt editor.
              </div>
            </CardContent>
          </Card>

          {/* Status Indicator Variants */}
          <Card>
            <CardHeader>
              <CardTitle>Status Indicator Variants</CardTitle>
              <CardDescription>
                Different ways to display cell extraction status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Minimal Variant */}
              <div>
                <h4 className="font-medium text-sm mb-2">Minimal Variant</h4>
                <CellStatusIndicator
                  value="$2,450.00"
                  confidence={0.87}
                  isCustomized={true}
                  variant="minimal"
                />
              </div>

              <Separator />

              {/* Chip Variant */}
              <div>
                <h4 className="font-medium text-sm mb-2">Chip Variant (Default)</h4>
                <CellStatusIndicator
                  value="INV-2024-001"
                  confidence={0.95}
                  isCustomized={false}
                  extractedAt={new Date(Date.now() - 1000 * 60 * 30)}
                  variant="chip"
                />
              </div>

              <Separator />

              {/* Full Variant */}
              <div>
                <h4 className="font-medium text-sm mb-2">Full Variant</h4>
                <CellStatusIndicator
                  value="RCP-042"
                  confidence={0.72}
                  isCustomized={true}
                  extractedAt={new Date(Date.now() - 1000 * 60 * 45)}
                  extractionHistory={[
                    {
                      prompt: "Extract the invoice number",
                      result: "",
                      confidence: 0,
                      timestamp: new Date(Date.now() - 1000 * 60 * 120),
                      model: "gpt-4o"
                    },
                    {
                      prompt: "Look for receipt number in the top section",
                      result: "RCP-042",
                      confidence: 0.72,
                      timestamp: new Date(Date.now() - 1000 * 60 * 45),
                      model: "gpt-4o"
                    }
                  ]}
                  onCustomizeClick={() => console.log("Customize clicked")}
                  onQuickExtractClick={() => console.log("Quick extract clicked")}
                  variant="full"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Showcase */}
        <Card>
          <CardHeader>
            <CardTitle>Cell-Level Extraction Features</CardTitle>
            <CardDescription>
              Comprehensive overview of all new capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="features" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="workflow">Workflow</TabsTrigger>
                <TabsTrigger value="benefits">Benefits</TabsTrigger>
                <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
              </TabsList>

              <TabsContent value="features" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      Cell-Level Customization
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Custom prompts for individual cells</li>
                      <li>• Override column defaults selectively</li>
                      <li>• Visual indicators for customized cells</li>
                      <li>• Easy revert to default functionality</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <History className="h-4 w-4 text-green-600" />
                      Extraction History
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Track all extraction attempts</li>
                      <li>• Compare prompt effectiveness</li>
                      <li>• Confidence score tracking</li>
                      <li>• Timestamp and model information</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      Smart Processing
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Automatic prompt detection</li>
                      <li>• Enhanced extraction API</li>
                      <li>• Efficient batch processing</li>
                      <li>• Test prompts before saving</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-purple-600" />
                      Analytics & Insights
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Customization statistics</li>
                      <li>• Confidence trend analysis</li>
                      <li>• Performance metrics</li>
                      <li>• Export capabilities</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="workflow" className="space-y-4">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</div>
                    <div>
                      <h4 className="font-medium">Start with Column Defaults</h4>
                      <p className="text-sm text-gray-600">Create columns with default prompts as usual. System processes all documents automatically.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
                    <div>
                      <h4 className="font-medium">Identify Problem Cells</h4>
                      <p className="text-sm text-gray-600">Review extraction results and identify cells with poor accuracy or missing data.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
                    <div>
                      <h4 className="font-medium">Customize Cell Prompts</h4>
                      <p className="text-sm text-gray-600">Right-click on problem cells and create custom prompts for better extraction accuracy.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">4</div>
                    <div>
                      <h4 className="font-medium">Test and Refine</h4>
                      <p className="text-sm text-gray-600">Test custom prompts before saving. Iterate until you achieve perfect results.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">5</div>
                    <div>
                      <h4 className="font-medium">Achieve Precision</h4>
                      <p className="text-sm text-gray-600">Mix default and custom approaches for optimal extraction across all document variations.</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="benefits" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-green-600">User Benefits</h4>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Handle document variations perfectly</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Solve edge cases with custom solutions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Improve accuracy incrementally</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Build library of effective prompts</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-blue-600">Technical Benefits</h4>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>100% backward compatibility</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>Additive enhancement only</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>No performance impact on existing features</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span>Comprehensive API coverage</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="compatibility" className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    100% Backward Compatibility Guaranteed
                  </h4>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
                    <div>
                      <strong>Database:</strong> All new fields are optional, existing data unaffected
                    </div>
                    <div>
                      <strong>APIs:</strong> Existing endpoints work unchanged
                    </div>
                    <div>
                      <strong>UI:</strong> Original components backed up and preserved
                    </div>
                    <div>
                      <strong>Performance:</strong> No impact on existing extraction speed
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800">Migration Strategy</h4>
                  <div className="mt-2 text-sm text-blue-700 space-y-1">
                    <p>• <strong>Existing Projects:</strong> Work unchanged, can add cell customization gradually</p>
                    <p>• <strong>New Projects:</strong> Start with defaults, enhance as needed</p>
                    <p>• <strong>No Downtime:</strong> Deploy without affecting current operations</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Implementation Code Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Implementation Examples</CardTitle>
            <CardDescription>
              Copy-paste code examples for rapid integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList>
                <TabsTrigger value="basic">Basic Usage</TabsTrigger>
                <TabsTrigger value="api">API Calls</TabsTrigger>
                <TabsTrigger value="utils">Utilities</TabsTrigger>
              </TabsList>

              <TabsContent value="basic">
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">
{`// Basic cell customization dialog usage
import { CellCustomizationDialog } from "@/components/dashboard/cell-customization/CellCustomizationDialog";

const [dialogState, setDialogState] = useState({
  open: false,
  projectId: "",
  documentId: "",
  columnId: "",
  columnName: "",
  documentName: "",
});

// Open dialog on cell right-click
const handleCellCustomize = (projectId, documentId, columnId, columnName, documentName) => {
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
  onCustomizationSaved={() => refreshData()}
/>`}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="api">
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">
{`// Extract single cell with custom prompt
import { extractCell } from "@/lib/api/cell-extraction";

const result = await extractCell({
  projectId: "project_id",
  documentId: "document_id",
  columnId: "invoice_number",
  customPrompt: "Extract invoice number from top-right corner",
  saveCustomPrompt: true
}, token);

if (result.success) {
  console.log("Value:", result.data.result.value);
  console.log("Confidence:", result.data.result.confidence);
}

// Get cell customization info
import { getCellCustomization } from "@/lib/api/cell-extraction";

const info = await getCellCustomization(projectId, documentId, columnId, token);
if (info.success) {
  console.log("Is customized:", info.data.isCustomized);
  console.log("Effective prompt:", info.data.effectivePrompt);
}`}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="utils">
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm">
{`// Check cell customization status
import { isCellCustomized, getEffectivePrompt } from "@/lib/utils/cell-extraction";

const isCustom = isCellCustomized(document, "invoice_number");
const activePrompt = getEffectivePrompt(document, "invoice_number", "Default prompt");

// Get project statistics
import { countCustomizedCells } from "@/lib/utils/cell-extraction";

const stats = countCustomizedCells(documents);
console.log(\`\${stats.totalCustomizations} cells customized\`);
console.log(\`\${stats.documentsWithCustomizations} documents affected\`);

// Validate custom prompt
import { validateCustomPrompt } from "@/lib/utils/cell-extraction";

const validation = validateCustomPrompt("Extract the invoice number carefully");
if (!validation.isValid) {
  console.log("Errors:", validation.errors);
  console.log("Suggestions:", validation.suggestions);
}`}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Cell Customization Dialog */}
      <CellCustomizationDialog
        open={customizationDialog.open}
        onOpenChange={(open) => setCustomizationDialog(prev => ({ ...prev, open }))}
        projectId={customizationDialog.projectId}
        documentId={customizationDialog.documentId}
        columnId={customizationDialog.columnId}
        columnName={customizationDialog.columnName}
        documentName={customizationDialog.documentName}
        onCustomizationSaved={() => {
          console.log("Demo: Customization saved");
          // In real app, this would refresh the data
        }}
      />
    </div>
  );
}
