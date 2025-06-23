"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  X,
  FileText,
  Image,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import {
  useDocumentActions,
  useUploadProgress,
  useDocumentUploading,
  useDocumentError,
  useUser,
} from "@/lib/stores";
import { User } from "@/lib/api";

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 10;

export function UploadDocumentDialog({
  open,
  onOpenChange,
  projectId,
}: UploadDocumentDialogProps) {
  const user = JSON.parse(localStorage.getItem("user") ?? "{}") as User;
  const { uploadDocuments, clearUploadProgress } = useDocumentActions();
  const uploadProgress = useUploadProgress();
  const isUploading = useDocumentUploading();
  const error = useDocumentError();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const validateFile = (file: File): string | null => {
    if (!Object.keys(ACCEPTED_FILE_TYPES).includes(file.type)) {
      return "Invalid file type. Only PDF, Word, images, text, and CSV files are allowed.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "File too large. Maximum size is 50MB.";
    }

    // if (!user?.canUploadDocument(file.size)) {
    //   return `Storage limit exceeded for ${user?.subscription.plan} plan.`;
    // }

    return null;
  };

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Clear previous errors
      setUploadError(null);

      // Validate files
      const validFiles: File[] = [];
      const errors: string[] = [];

      acceptedFiles.forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      });

      // Handle rejected files
      rejectedFiles.forEach(({ file, errors: rejectionErrors }) => {
        const errorMessages = rejectionErrors
          .map((e: any) => e.message)
          .join(", ");
        errors.push(`${file.name}: ${errorMessages}`);
      });

      // Check total file count
      const totalFiles = selectedFiles.length + validFiles.length;
      if (totalFiles > MAX_FILES) {
        errors.push(
          `Maximum ${MAX_FILES} files allowed. Selected ${totalFiles} files.`
        );
        return;
      }

      if (errors.length > 0) {
        setUploadError(errors.join("\n"));
      }

      if (validFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...validFiles]);
      }
    },
    [selectedFiles, user]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    disabled: isUploading,
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploadError(null);
      setUploadSuccess(false);

      await uploadDocuments(projectId, selectedFiles);

      setUploadSuccess(true);
      setSelectedFiles([]);

      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: any) {
      setUploadError(error.message || "Upload failed");
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFiles([]);
      setUploadError(null);
      setUploadSuccess(false);
      clearUploadProgress();
      onOpenChange(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes("image")) return <Image className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getTotalSize = () => {
    return selectedFiles.reduce((total, file) => total + file.size, 0);
  };

  const getStorageInfo = () => {
    const used = user?.stats.storageUsed || 0;
    const limits = {
      free: 100 * 1024 * 1024, // 100MB
      basic: 1024 * 1024 * 1024, // 1GB
      premium: 10 * 1024 * 1024 * 1024, // 10GB
    };

    const limit = limits[user?.subscription.plan || "free"];
    const totalAfterUpload = used + getTotalSize();
    const percentage =
      limit > 0 ? Math.round((totalAfterUpload / limit) * 100) : 0;

    return { used, limit, totalAfterUpload, percentage };
  };

  const storageInfo = getStorageInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload documents to extract data using AI. Supported formats: PDF,
            Word, Images, Text, CSV.
          </DialogDescription>
        </DialogHeader>

        {/* Storage Info */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Storage Usage:</span>
            <div className="flex items-center space-x-2">
              <span className="font-medium">
                {formatFileSize(storageInfo.totalAfterUpload)} /{" "}
                {formatFileSize(storageInfo.limit)}
              </span>
              <Badge variant="secondary" className="text-xs capitalize">
                {user?.subscription.plan}
              </Badge>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                storageInfo.percentage > 90
                  ? "bg-red-500"
                  : storageInfo.percentage > 70
                  ? "bg-yellow-500"
                  : "bg-blue-500"
              }`}
              style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
            />
          </div>
          {selectedFiles.length > 0 && (
            <p className="text-xs text-gray-500">
              +{formatFileSize(getTotalSize())} from selected files
            </p>
          )}
        </div>

        {/* Upload Success */}
        {uploadSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Documents uploaded successfully! They will be processed
              automatically.
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Error */}
        {(uploadError || error) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-line">
              {uploadError || error}
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Progress */}
        {isUploading && uploadProgress.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Uploading files...</p>
            {uploadProgress.map((progress, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{progress.file.name}</span>
                  <span>{Math.round(progress.percentage)}%</span>
                </div>
                <Progress 
                  value={typeof progress.percentage === 'number' ? Math.max(0, Math.min(100, progress.percentage)) : 0} 
                  className="h-2" 
                />
              </div>
            ))}
          </div>
        )}

        {/* Dropzone */}
        {!isUploading && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {isDragActive ? "Drop files here" : "Upload documents"}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Drag and drop files here, or click to select files
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>
                Supported: PDF, Word (.doc, .docx), Images (.jpg, .png), Text
                (.txt), CSV
              </p>
              <p>Maximum file size: 50MB • Maximum {MAX_FILES} files</p>
            </div>
          </div>
        )}

        {/* Selected Files */}
        {selectedFiles.length > 0 && !isUploading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Selected Files ({selectedFiles.length})
              </p>
              <p className="text-xs text-gray-500">
                Total: {formatFileSize(getTotalSize())}
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-shrink-0 text-gray-500">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} •{" "}
                      {file.type.split("/")[1].toUpperCase()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Cancel"}
          </Button>

          {!uploadSuccess && (
            <Button
              onClick={handleUpload}
              disabled={
                selectedFiles.length === 0 ||
                isUploading ||
                storageInfo.percentage > 95
              }
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {selectedFiles.length} File
                  {selectedFiles.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UploadDocumentDialog;
