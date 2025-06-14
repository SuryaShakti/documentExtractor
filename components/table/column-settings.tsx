"use client";

import { useEffect, useRef, useState } from "react";
import { Edit2, Trash2, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Column } from "./document-table";
import { cn } from "@/lib/utils";

interface ColumnSettingsProps {
  column: Column;
  onClose: () => void;
  onDelete: () => void;
  onColorChange: (color: string) => void;
  onUpdate: (updates: Partial<Column>) => void;
}

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
  const ref = useRef<HTMLDivElement>(null);
  
  const colors = [
    { name: "Gray", value: "#64748b" },
    { name: "Red", value: "#ef4444" },
    { name: "Orange", value: "#f97316" },
    { name: "Amber", value: "#f59e0b" },
    { name: "Yellow", value: "#eab308" },
    { name: "Lime", value: "#84cc16" },
    { name: "Green", value: "#22c55e" },
    { name: "Emerald", value: "#10b981" },
    { name: "Teal", value: "#14b8a6" },
    { name: "Cyan", value: "#06b6d4" },
    { name: "Sky", value: "#0ea5e9" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Indigo", value: "#6366f1" },
    { name: "Violet", value: "#8b5cf6" },
    { name: "Purple", value: "#a855f7" },
    { name: "Fuchsia", value: "#d946ef" },
    { name: "Pink", value: "#ec4899" },
    { name: "Rose", value: "#f43f5e" },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Handle settings update
  const handleUpdate = () => {
    onUpdate({
      name: newName,
      prompt,
      aiModel,
      type: columnType as Column["type"],
    });
    setIsEditingName(false);
  };

  return (
    <div
      ref={ref}
      className="w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-[9999]"
      onClick={(e) => e.stopPropagation()}
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
      }}
    >
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Column Settings</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Column name */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-2 block">
            Column Name
          </label>
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100"
                onClick={() => setIsEditingName(false)}
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
              <span className="text-sm truncate text-gray-900">{newName}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-200"
                onClick={() => setIsEditingName(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Column Type */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-2 block">
            Column Type
          </label>
          <Select value={columnType} onValueChange={setColumnType}>
            <SelectTrigger className="w-full h-8">
              <SelectValue placeholder="Select column type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="location">Location</SelectItem>
              <SelectItem value="person">Person</SelectItem>
              <SelectItem value="organization">Organization</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="collection">Collection</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Extraction Prompt */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-2 block">
            Extraction Prompt
          </label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[80px] text-sm resize-none"
            placeholder="Enter extraction prompt..."
          />
        </div>

        {/* AI Model Selection */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-2 block">
            AI Model
          </label>
          <Select value={aiModel} onValueChange={setAiModel}>
            <SelectTrigger className="w-full h-8">
              <SelectValue placeholder="Select AI model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4">OpenAI GPT-4</SelectItem>
              <SelectItem value="gpt-3.5">OpenAI GPT-3.5</SelectItem>
              <SelectItem value="gemini-pro">Google Gemini Pro</SelectItem>
              <SelectItem value="claude-3">Anthropic Claude 3</SelectItem>
              <SelectItem value="mistral">Mistral AI</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Color selection */}
        <div>
          <label className="text-xs font-medium text-gray-700 mb-2 block">
            Column Color
          </label>
          <div className="grid grid-cols-6 gap-2">
            {colors.map((color) => (
              <button
                key={color.value}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-all hover:scale-110",
                  column.color === color.value ? "border-gray-900 ring-2 ring-gray-300" : "border-gray-200"
                )}
                style={{ backgroundColor: color.value }}
                onClick={() => onColorChange(color.value)}
                title={color.name}
              />
            ))}
            {/* Option to remove color */}
            <button
              className={cn(
                "h-6 w-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center transition-all hover:scale-110 bg-white",
                !column.color && "border-gray-900 ring-2 ring-gray-300"
              )}
              onClick={() => onColorChange("")}
              title="No Color"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer with action buttons */}
      <div className="flex gap-2 p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
        <Button
          variant="default"
          size="sm"
          className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
          onClick={handleUpdate}
        >
          Update Column
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
}