"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Column } from "./document-table";

const formSchema = z.object({
  name: z.string().min(1, "Column name is required"),
  prompt: z.string().min(10, "Prompt must be at least 10 characters"),
  aiModel: z.string().min(1, "AI model selection is required"),
  type: z.string().min(1, "Column type is required"),
});

type AddColumnDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (column: Column) => void;
};

export function AddColumnDialog({ open, onOpenChange, onAdd }: AddColumnDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      prompt: "",
      aiModel: "",
      type: "text",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const newColumn: Column = {
        id: `col-${Date.now()}`,
        name: values.name,
        prompt: values.prompt,
        aiModel: values.aiModel,
        type: values.type as Column["type"],
        width: 200, // Default width
      };
      
      onAdd(newColumn);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding column:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Extraction Column</DialogTitle>
          <DialogDescription>
            Create a new column to extract specific data from your documents.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Column Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Invoice Date" {...field} />
                  </FormControl>
                  <FormDescription>
                    A short, descriptive name for the data you want to extract.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Column Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select column type" />
                      </SelectTrigger>
                    </FormControl>
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
                  <FormDescription>
                    Choose the type of data this column will contain.
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
                  <FormLabel>Extraction Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Extract the invoice date in MM/DD/YYYY format from this document."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Detailed instructions for the AI model on what data to extract.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="aiModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Model</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an AI model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="gpt-4">OpenAI GPT-4</SelectItem>
                      <SelectItem value="gpt-3.5">OpenAI GPT-3.5</SelectItem>
                      <SelectItem value="gemini-pro">Google Gemini Pro</SelectItem>
                      <SelectItem value="claude-3">Anthropic Claude 3</SelectItem>
                      <SelectItem value="mistral">Mistral AI</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the AI model that will process your documents.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-gray-900 hover:bg-gray-800">
                {isSubmitting ? "Creating..." : "Create Column"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}