"use client";

import { useEffect, useRef, useState } from "react";
import {
  Edit2,
  Trash2,
  X,
  CheckCircle,
  Type,
  Calendar,
  DollarSign,
  MapPin,
  User,
  Building,
  List,
  Palette,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Column } from "./document-table";
import { cn } from "@/lib/utils";

interface ColumnSettingsProps {
  column: Column;
  onClose: () => void;
  onDelete: () => void;
  onColorChange: (color: string) => void;
  onUpdate: (updates: Partial<Column>) => void;
}

const DATA_TYPES = [
  {
    value: "text",
    label: "Text",
    icon: Type,
    color: "#3b82f6",
    description: "General text content",
  },
  {
    value: "date",
    label: "Date",
    icon: Calendar,
    color: "#10b981",
    description: "Dates and timestamps",
  },
  {
    value: "price",
    label: "Price/Amount",
    icon: DollarSign,
    color: "#f59e0b",
    description: "Monetary values and amounts",
  },
  {
    value: "location",
    label: "Location",
    icon: MapPin,
    color: "#ef4444",
    description: "Addresses and locations",
  },
  {
    value: "person",
    label: "Person",
    icon: User,
    color: "#8b5cf6",
    description: "Names and people",
  },
  {
    value: "organization",
    label: "Organization",
    icon: Building,
    color: "#06b6d4",
    description: "Companies and organizations",
  },
  {
    value: "status",
    label: "Status",
    icon: CheckCircle,
    color: "#22c55e",
    description: "Status indicators",
  },
  {
    value: "collection",
    label: "Collection",
    icon: List,
    color: "#f97316",
    description: "Lists and collections",
  },
];

const AI_MODELS = [
  {
    value: "gpt-4",
    label: "GPT-4",
    description: "Most capable, best for complex extraction",
  },
  {
    value: "gpt-3.5-turbo",
    label: "GPT-3.5 Turbo",
    description: "Fast and efficient for most tasks",
  },
  {
    value: "claude-3",
    label: "Claude 3",
    description: "Great for detailed analysis",
  },
  {
    value: "claude-2",
    label: "Claude 2",
    description: "Reliable for document processing",
  },
];

const PRESET_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#22c55e",
  "#f97316",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

const PROMPT_TEMPLATES = {
  text: "Extract the main {field_name} mentioned in this document.",
  date: "Find and extract any date related to {field_name} in this document. Return in YYYY-MM-DD format.",
  price:
    "Extract the monetary amount or price for {field_name} from this document. Include currency if mentioned.",
  location:
    "Identify and extract the address or location for {field_name} mentioned in this document.",
  person:
    "Extract the name of the person related to {field_name} in this document.",
  organization:
    "Identify and extract the company or organization name related to {field_name} in this document.",
  status:
    "Determine the status of {field_name} in this document (e.g., approved, pending, rejected).",
  collection:
    "Extract all instances of {field_name} mentioned in this document as a comma-separated list.",
};

export function ColumnSettings({
  column,
  onClose,
  onDelete,
  onColorChange,
  onUpdate,
}: ColumnSettingsProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(column.name);
  const [prompt, setPrompt] = useState(column.prompt);
  const [aiModel, setAiModel] = useState(column.aiModel);
  const [columnType, setColumnType] = useState(column.type || "text");
  const [selectedColor, setSelectedColor] = useState(column.color || "#3b82f6");
  const [width, setWidth] = useState(column.width || 150);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (overlayRef.current && event.target === overlayRef.current) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Auto-generate prompt when type or name changes
  const handleTypeChange = (type: string) => {
    setColumnType(
      type as
        | "text"
        | "date"
        | "price"
        | "location"
        | "person"
        | "organization"
        | "status"
        | "collection"
    );

    // Set default color for type
    const typeConfig = DATA_TYPES.find((t) => t.value === type);
    if (typeConfig) {
      setSelectedColor(typeConfig.color);
    }

    // Generate default prompt template
    if (newName) {
      const template = PROMPT_TEMPLATES[type as keyof typeof PROMPT_TEMPLATES];
      setPrompt(template.replace("{field_name}", newName.toLowerCase()));
    }
  };

  const handleNameChange = (name: string) => {
    setNewName(name);

    // Auto-generate prompt when name changes
    if (name && columnType) {
      const template =
        PROMPT_TEMPLATES[columnType as keyof typeof PROMPT_TEMPLATES];
      setPrompt(template.replace("{field_name}", name.toLowerCase()));
    }
  };

  // Handle settings update
  const handleUpdate = () => {
    try {
      setError(null);

      if (!newName.trim()) {
        throw new Error("Column name is required");
      }

      if (!prompt.trim()) {
        throw new Error("Extraction prompt is required");
      }

      if (prompt.length < 10) {
        throw new Error("Prompt must be at least 10 characters");
      }

      onUpdate({
        name: newName.trim(),
        prompt: prompt.trim(),
        aiModel,
        type: columnType as Column["type"],
        color: selectedColor,
        width: width,
      });

      // Update color separately
      onColorChange(selectedColor);

      setIsEditingName(false);
      onClose();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDelete = () => {
    if (
      confirm(
        `Are you sure you want to delete the "${column.name}" column? This action cannot be undone.`
      )
    ) {
      onDelete();
    }
  };

  const selectedTypeConfig = DATA_TYPES.find((t) => t.value === columnType);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-white rounded-lg shadow-2xl border border-gray-200 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Column Settings
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Customize how data is extracted from documents
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-gray-200"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Column Name */}
          <div className="space-y-2">
            <Label htmlFor="column-name">Column Name *</Label>
            <Input
              id="column-name"
              value={newName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Company Name, Invoice Date, Total Amount"
              className="w-full"
            />
          </div>

          {/* Data Type Selection */}
          <div className="space-y-3">
            <Label>Data Type *</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DATA_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = columnType === type.value;

                return (
                  <div
                    key={type.value}
                    className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleTypeChange(type.value)}
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: type.color }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{type.label}</p>
                        <p className="text-xs text-gray-500">
                          {type.description}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="ai-model">AI Model *</Label>
            <Select value={aiModel} onValueChange={setAiModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{model.label}</span>
                      <span className="text-xs text-gray-500">
                        {model.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Extraction Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Extraction Prompt *</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] text-sm resize-none"
              placeholder="Describe what data to extract from the documents..."
            />
            <p className="text-xs text-gray-500">
              Be specific about what data to extract. The AI will use this
              prompt to find relevant information in uploaded documents.
            </p>
          </div>

          {/* Color and Width */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Column Color</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Input
                    id="color"
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-12 h-10 p-1 border"
                  />
                  <Input
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "w-6 h-6 rounded border-2 transition-all hover:scale-110",
                        selectedColor === color
                          ? "border-gray-900 ring-2 ring-gray-300"
                          : "border-gray-300"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="width">Column Width (px)</Label>
              <Input
                id="width"
                type="number"
                min={50}
                max={500}
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value) || 150)}
                placeholder="150"
              />
            </div>
          </div>

          {/* Preview */}
          {newName && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-sm text-gray-700 mb-3">
                Preview:
              </h4>
              <div className="flex items-center space-x-3">
                <div
                  className="px-3 py-1 rounded text-white text-sm font-medium"
                  style={{ backgroundColor: selectedColor }}
                >
                  {newName}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {selectedTypeConfig?.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {aiModel}
                </Badge>
              </div>
              {selectedTypeConfig && (
                <p className="text-xs text-gray-500 mt-2">
                  {selectedTypeConfig.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Column
          </Button>
          <Button
            onClick={handleUpdate}
            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Update Column
          </Button>
        </div>
      </div>
    </div>
  );
}
