import React, { useState } from "react";
import {
  FileText,
  Download,
  Eye,
  EyeOff,
  Plus,
  X,
  Upload,
  GripVertical,
  Settings,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Document {
  _id: string;
  filename: string;
  originalName: string;
  fileMetadata: {
    size: number;
    mimeType: string;
  };
  processing: {
    status: "pending" | "processing" | "completed" | "failed";
  };
  cloudinary: {
    secureUrl: string;
  };
  uploaderId?: {
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
}

interface DocumentCollection {
  _id: string;
  name: string;
  documents: Document[];
  documentCount: number;
  stats: {
    totalSize: number;
    lastModified: string;
  };
  settings: {
    hiddenDocuments: string[];
  };
}

interface DocumentCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: DocumentCollection;
  onUpdateCollection: (collectionId: string, updates: any) => Promise<void>;
  onAddDocument: (collectionId: string, file: File) => Promise<void>;
  onRemoveDocument: (collectionId: string, documentId: string) => Promise<void>;
  onToggleDocumentVisibility: (
    collectionId: string,
    documentId: string,
    hidden: boolean
  ) => Promise<void>;
  onReorderDocuments: (
    collectionId: string,
    documentIds: string[]
  ) => Promise<void>;
}

export function DocumentCollectionModal({
  isOpen,
  onClose,
  collection,
  onUpdateCollection,
  onAddDocument,
  onRemoveDocument,
  onToggleDocumentVisibility,
  onReorderDocuments,
}: DocumentCollectionModalProps) {
  const [collectionName, setCollectionName] = useState(collection.name);
  const [isEditing, setIsEditing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Debug logging
  console.log('DocumentCollectionModal received collection:', collection);
  console.log('Collection documents:', collection.documents);
  console.log('Documents length:', collection.documents?.length);
  
  // Add safety check for collection data
  if (!collection) {
    console.error('DocumentCollectionModal: No collection data provided');
    return null;
  }
  
  // Ensure documents array exists
  const documents = collection.documents || [];
  console.log('Processed documents:', documents);

  const getFileIcon = (mimeType: string): string => {
    if (mimeType?.includes("pdf")) return "📄";
    if (mimeType?.includes("word")) return "📝";
    if (mimeType?.includes("image")) return "🖼️";
    if (mimeType?.includes("csv")) return "📊";
    return "📎";
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getStatusIcon = (status: string): JSX.Element => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleSaveName = async (): Promise<void> => {
    try {
      await onUpdateCollection(collection._id, { name: collectionName });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update collection name:", error);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const files = event.target.files;
    if (!files) return;

    setIsUploading(true);
    const fileArray = Array.from(files);
    
    try {
      console.log(`Uploading ${fileArray.length} file(s) to collection:`, collection.name);
      
      // Upload files one by one to provide better error handling
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        console.log(`Uploading file ${i + 1}/${fileArray.length}: ${file.name}`);
        
        try {
          await onAddDocument(collection._id, file);
          console.log(`Successfully uploaded: ${file.name}`);
        } catch (fileError: any) {
          console.error(`Failed to upload ${file.name}:`, fileError);
          // Continue with other files even if one fails
          alert(`Failed to upload ${file.name}: ${fileError.message || 'Unknown error'}`);
        }
      }
      
      console.log('All upload attempts completed');
    } catch (error: any) {
      console.error("Upload process failed:", error);
      alert(`Upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      event.target.value = ""; // Reset input
    }
  };

  const handleToggleVisibility = async (
    documentId: string,
    isHidden: boolean
  ): Promise<void> => {
    try {
      await onToggleDocumentVisibility(collection._id, documentId, !isHidden);
    } catch (error) {
      console.error("Failed to toggle document visibility:", error);
    }
  };

  const handleRemoveDocument = async (documentId: string): Promise<void> => {
    if (
      confirm(
        "Are you sure you want to remove this document from the collection?"
      )
    ) {
      try {
        await onRemoveDocument(collection._id, documentId);
      } catch (error) {
        console.error("Failed to remove document:", error);
      }
    }
  };

  const isDocumentHidden = (documentId: string): boolean => {
    return collection.settings.hiddenDocuments.includes(documentId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isEditing ? (
                <div className="flex items-center space-x-2">
                  <Input
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    className="text-lg font-semibold"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveName}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCollectionName(collection.name);
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <DialogTitle className="text-xl">
                    {collection.name}
                  </DialogTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <Badge variant="secondary">
              {collection.documentCount} document
              {collection.documentCount !== 1 ? "s" : ""}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="space-y-4">
            {/* Upload Section */}
            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isUploading 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}>
              <div className="flex flex-col items-center space-y-3">
                <Upload className={`h-8 w-8 ${
                  isUploading ? 'text-blue-500 animate-pulse' : 'text-gray-400'
                }`} />
                <div>
                  <label htmlFor="document-upload" className={`cursor-pointer ${
                    isUploading ? 'pointer-events-none' : ''
                  }`}>
                    <span className={`text-sm font-medium ${
                      isUploading 
                        ? 'text-blue-700' 
                        : 'text-blue-600 hover:text-blue-500'
                    }`}>
                      {isUploading 
                        ? "Uploading to collection..." 
                        : "Add more documents to this collection"
                      }
                    </span>
                    <input
                      id="document-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.csv,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    {isUploading 
                      ? 'Please wait while files are being added to this collection...'
                      : 'PDF, DOC, DOCX, TXT, CSV, JPG, JPEG, PNG'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Documents List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">
                  Documents in Collection
                </h4>
                <div className="text-sm text-gray-500">
                  Total size: {formatFileSize(collection?.stats?.totalSize || 0)}
                </div>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No documents in this collection</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {documents.map((doc, index) => {
                    // Safety check for document data
                    if (!doc || !doc._id) {
                      console.warn('DocumentCollectionModal: Invalid document data at index', index, doc);
                      return null;
                    }
                    
                    const isHidden = isDocumentHidden(doc._id);
                    return (
                      <div
                        key={doc._id}
                        className={`flex items-center space-x-3 p-3 border rounded-lg ${
                          isHidden ? "bg-gray-50 opacity-60" : "bg-white"
                        }`}
                      >
                        <div className="cursor-move text-gray-400">
                          <GripVertical className="h-4 w-4" />
                        </div>

                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center text-sm">
                            {getFileIcon(doc?.fileMetadata?.mimeType || '')}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {doc?.originalName || 'Unknown Document'}
                            </p>
                            {getStatusIcon(doc?.processing?.status || 'pending')}
                            {isHidden && (
                              <Badge variant="outline" className="text-xs">
                                Hidden
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-gray-500">
                            <span>{formatFileSize(doc?.fileMetadata?.size || 0)}</span>
                            <span>•</span>
                            <span>
                              {doc.uploaderId?.firstName && doc.uploaderId?.lastName 
                                ? `${doc.uploaderId.firstName} ${doc.uploaderId.lastName}`
                                : "Unknown User"
                              }
                            </span>
                            <span>•</span>
                            <span>
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const url = doc?.cloudinary?.secureUrl;
                                    if (url) {
                                      window.open(url, "_blank");
                                    }
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download document</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleToggleVisibility(doc._id, isHidden)
                                  }
                                >
                                  {isHidden ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isHidden
                                  ? "Show in extraction"
                                  : "Hide from extraction"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveDocument(doc._id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Remove from collection
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-500">
              Last modified:{" "}
              {new Date(collection?.stats?.lastModified).toLocaleString()}
            </div>
            <Button onClick={onClose}>Done</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentCollectionModal;
