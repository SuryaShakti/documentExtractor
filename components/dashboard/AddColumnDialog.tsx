"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, 
  Loader2, 
  Palette, 
  Bot, 
  Type,
  Calendar,
  DollarSign,
  MapPin,
  User,
  Building,
  CheckCircle,
  List
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import { useProjectActions, useActiveProject } from '@/lib/stores';

const addColumnSchema = z.object({
  name: z.string()
    .min(1, 'Column name is required')
    .max(100, 'Column name cannot exceed 100 characters'),
  prompt: z.string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(1000, 'Prompt cannot exceed 1000 characters'),
  aiModel: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'claude-2']),
  type: z.enum(['text', 'date', 'price', 'location', 'person', 'organization', 'status', 'collection']),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  width: z.number().min(50).max(500).optional()
});

type AddColumnFormData = z.infer<typeof addColumnSchema>;

interface AddColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

const DATA_TYPES = [
  { value: 'text', label: 'Text', icon: Type, color: '#3b82f6', description: 'General text content' },
  { value: 'date', label: 'Date', icon: Calendar, color: '#10b981', description: 'Dates and timestamps' },
  { value: 'price', label: 'Price/Amount', icon: DollarSign, color: '#f59e0b', description: 'Monetary values and amounts' },
  { value: 'location', label: 'Location', icon: MapPin, color: '#ef4444', description: 'Addresses and locations' },
  { value: 'person', label: 'Person', icon: User, color: '#8b5cf6', description: 'Names and people' },
  { value: 'organization', label: 'Organization', icon: Building, color: '#06b6d4', description: 'Companies and organizations' },
  { value: 'status', label: 'Status', icon: CheckCircle, color: '#22c55e', description: 'Status indicators' },
  { value: 'collection', label: 'Collection', icon: List, color: '#f97316', description: 'Lists and collections' }
];

const AI_MODELS = [
  { value: 'gpt-4', label: 'GPT-4', description: 'Most capable, best for complex extraction' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and efficient for most tasks' },
  { value: 'claude-3', label: 'Claude 3', description: 'Great for detailed analysis' },
  { value: 'claude-2', label: 'Claude 2', description: 'Reliable for document processing' }
];

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#06b6d4', '#22c55e', '#f97316',
  '#6366f1', '#ec4899', '#14b8a6', '#f97316'
];

const PROMPT_TEMPLATES = {
  text: 'Extract the main {field_name} mentioned in this document.',
  date: 'Find and extract any date related to {field_name} in this document. Return in YYYY-MM-DD format.',
  price: 'Extract the monetary amount or price for {field_name} from this document. Include currency if mentioned.',
  location: 'Identify and extract the address or location for {field_name} mentioned in this document.',
  person: 'Extract the name of the person related to {field_name} in this document.',
  organization: 'Identify and extract the company or organization name related to {field_name} in this document.',
  status: 'Determine the status of {field_name} in this document (e.g., approved, pending, rejected).',
  collection: 'Extract all instances of {field_name} mentioned in this document as a comma-separated list.'
};

export function AddColumnDialog({ 
  open, 
  onOpenChange, 
  projectId 
}: AddColumnDialogProps) {
  const activeProject = useActiveProject();
  const { addColumn } = useProjectActions();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('text');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    getValues
  } = useForm<AddColumnFormData>({
    resolver: zodResolver(addColumnSchema),
    defaultValues: {
      name: '',
      prompt: '',
      aiModel: 'gpt-4',
      type: 'text',
      color: '#3b82f6',
      width: 150
    }
  });

  const watchedType = watch('type');
  const watchedName = watch('name');
  const watchedColor = watch('color');

  const handleClose = () => {
    reset();
    setError(null);
    setSelectedType('text');
    onOpenChange(false);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setValue('type', type as any);
    
    // Set default color for type
    const typeConfig = DATA_TYPES.find(t => t.value === type);
    if (typeConfig) {
      setValue('color', typeConfig.color);
    }
    
    // Generate default prompt template
    const name = getValues('name');
    if (name) {
      const template = PROMPT_TEMPLATES[type as keyof typeof PROMPT_TEMPLATES];
      setValue('prompt', template.replace('{field_name}', name.toLowerCase()));
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue('name', name);
    
    // Auto-generate prompt when name changes
    if (name && watchedType) {
      const template = PROMPT_TEMPLATES[watchedType as keyof typeof PROMPT_TEMPLATES];
      setValue('prompt', template.replace('{field_name}', name.toLowerCase()));
    }
  };

  const onSubmit = async (data: AddColumnFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if column name already exists
      const existingColumns = Object.values(activeProject?.gridConfiguration?.columnDefs || {});
      const nameExists = existingColumns.some((col: any) => 
        col.customProperties?.name?.toLowerCase() === data.name.toLowerCase()
      );

      if (nameExists) {
        throw new Error('A column with this name already exists');
      }

      await addColumn(projectId, data);
      handleClose();
    } catch (error: any) {
      setError(error.message || 'Failed to add column');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTypeConfig = DATA_TYPES.find(t => t.value === selectedType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Extraction Column</DialogTitle>
          <DialogDescription>
            Create a new column to extract specific data from documents using AI.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Column Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Column Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Company Name, Invoice Date, Total Amount"
              {...register('name')}
              onChange={handleNameChange}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Data Type Selection */}
          <div className="space-y-3">
            <Label>Data Type *</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DATA_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.value;
                
                return (
                  <div
                    key={type.value}
                    className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
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
                        <p className="text-xs text-gray-500">{type.description}</p>
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
            <Label htmlFor="aiModel">AI Model *</Label>
            <Select value={watch('aiModel')} onValueChange={(value) => setValue('aiModel', value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{model.label}</span>
                      <span className="text-xs text-gray-500">{model.description}</span>
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
              placeholder="Describe what data to extract from the documents..."
              rows={4}
              {...register('prompt')}
              className={errors.prompt ? 'border-red-500' : ''}
            />
            {errors.prompt && (
              <p className="text-sm text-red-500">{errors.prompt.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Be specific about what data to extract. The AI will use this prompt to find relevant information in uploaded documents.
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
                    {...register('color')}
                    className="w-12 h-10 p-1 border"
                  />
                  <Input
                    value={watchedColor}
                    onChange={(e) => setValue('color', e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-400"
                      style={{ backgroundColor: color }}
                      onClick={() => setValue('color', color)}
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
                {...register('width', { valueAsNumber: true })}
                placeholder="150"
              />
              {errors.width && (
                <p className="text-sm text-red-500">{errors.width.message}</p>
              )}
            </div>
          </div>

          {/* Preview */}
          {watchedName && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-sm text-gray-700 mb-3">Preview:</h4>
              <div className="flex items-center space-x-3">
                <div 
                  className="px-3 py-1 rounded text-white text-sm font-medium"
                  style={{ backgroundColor: watchedColor }}
                >
                  {watchedName}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {selectedTypeConfig?.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {watch('aiModel')}
                </Badge>
              </div>
              {selectedTypeConfig && (
                <p className="text-xs text-gray-500 mt-2">
                  {selectedTypeConfig.description}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Column
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddColumnDialog;
