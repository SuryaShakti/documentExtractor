"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Palette } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { AddColumnData } from "@/lib/api/projects";

const formSchema = z.object({
  name: z.string().min(1, "Column name is required").max(100, "Column name is too long"),
  prompt: z.string().min(10, "Prompt must be at least 10 characters").max(1000, "Prompt is too long"),
  aiModel: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'claude-2']),
  type: z.enum(['text', 'date', 'price', 'location', 'person', 'organization', 'status', 'collection']),
  width: z.number().min(50).max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format").optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (column: AddColumnData) => Promise<void>;
}

const PREDEFINED_COLORS = [
  '#f97316', // Orange
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f97316', // Orange
];

const COLUMN_TYPE_INFO = {
  text: { icon: '📝', description: 'General text content' },
  date: { icon: '📅', description: 'Dates and timestamps' },
  price: { icon: '💰', description: 'Monetary values' },
  location: { icon: '📍', description: 'Addresses and locations' },
  person: { icon: '👤', description: 'Names and people' },
  organization: { icon: '🏢', description: 'Companies and organizations' },
  status: { icon: '✅', description: 'Status indicators (Yes/No)' },
  collection: { icon: '📊', description: 'Categorized data' }
};

export function AddColumnDialog({ open, onOpenChange, onAdd }: AddColumnDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      prompt: "",
      aiModel: "gpt-4",
      type: "text",
      width: 150,
      color: PREDEFINED_COLORS[0],
    },
  });

  const selectedColor = form.watch('color');
  const selectedType = form.watch('type');

  const handleClose = () => {
    form.reset();
    setError(null);
    onOpenChange(false);
  };

  const onSubmit = async (values: FormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      await onAdd({
        name: values.name,
        prompt: values.prompt,
        aiModel: values.aiModel,
        type: values.type,
        width: values.width,
        color: values.color
      });

      handleClose();
    } catch (error: any) {
      setError(error.message || "Failed to create column");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Extraction Column</DialogTitle>
          <DialogDescription>
            Create a new column to extract specific data from your documents using AI.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Column Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Invoice Date" {...field} />
                    </FormControl>
                    <FormDescription>
                      A short, descriptive name for the data
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Column Width</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={50} 
                        max={500} 
                        placeholder="150"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 150)}
                      />
                    </FormControl>
                    <FormDescription>
                      Width in pixels (50-500)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Column Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(COLUMN_TYPE_INFO).map(([value, info]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            <span>{info.icon}</span>
                            <div>
                              <div className="capitalize font-medium">{value}</div>
                              <div className="text-xs text-gray-500">{info.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {selectedType && COLUMN_TYPE_INFO[selectedType]?.description}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extraction Prompt *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Extract the invoice date in MM/DD/YYYY format from this document. Look for terms like 'Invoice Date', 'Date', or 'Issued'."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Detailed instructions for the AI model. Be specific about what to extract and the expected format.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="aiModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AI Model *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select AI model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gpt-4">
                          <div>
                            <div className="font-medium">GPT-4</div>
                            <div className="text-xs text-gray-500">Most accurate, slower</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="gpt-3.5-turbo">
                          <div>
                            <div className="font-medium">GPT-3.5 Turbo</div>
                            <div className="text-xs text-gray-500">Fast and reliable</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="claude-3">
                          <div>
                            <div className="font-medium">Claude 3</div>
                            <div className="text-xs text-gray-500">Great for complex text</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="claude-2">
                          <div>
                            <div className="font-medium">Claude 2</div>
                            <div className="text-xs text-gray-500">Good balance</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Column Color</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input 
                            type="color" 
                            className="w-12 h-10 p-1 border rounded"
                            {...field}
                          />
                          <Input 
                            type="text" 
                            placeholder="#3b82f6"
                            className="flex-1"
                            {...field}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {PREDEFINED_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`w-6 h-6 rounded border-2 ${
                                selectedColor === color ? 'border-gray-900' : 'border-gray-300'
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => field.onChange(color)}
                            />
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Choose a color for the column header and data chips
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Preview */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  style={{ backgroundColor: selectedColor, color: 'white' }}
                  className="text-xs"
                >
                  {form.watch('name') || 'Column Name'}
                </Badge>
                <span className="text-xs text-gray-500">
                  {selectedType && COLUMN_TYPE_INFO[selectedType]?.icon} {selectedType}
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gray-900 hover:bg-gray-800"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Column"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default AddColumnDialog;
