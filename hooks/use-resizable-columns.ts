"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Column } from "@/components/table/document-table";

export function useResizableColumns(columns: Column[]) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState(false);
  const resizingRef = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Initialize column widths from columns prop
  useEffect(() => {
    const initialWidths: Record<string, number> = {};
    columns.forEach((column) => {
      if (!columnWidths[column.id]) {
        initialWidths[column.id] = column.width || 200;
      }
    });
    
    if (Object.keys(initialWidths).length > 0) {
      setColumnWidths((prev) => ({ ...prev, ...initialWidths }));
    }
  }, [columns, columnWidths]);

  // Load saved column widths from localStorage
  useEffect(() => {
    const savedWidths = localStorage.getItem("docextract-column-widths");
    if (savedWidths) {
      try {
        const parsedWidths = JSON.parse(savedWidths);
        setColumnWidths((prev) => ({ ...prev, ...parsedWidths }));
      } catch (error) {
        console.error("Failed to parse saved column widths", error);
      }
    }
  }, []);

  // Save column widths to localStorage
  const saveColumnWidths = useCallback((widths: Record<string, number>) => {
    localStorage.setItem("docextract-column-widths", JSON.stringify(widths));
  }, []);

  // Handle mouse move during resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current || !isResizing) return;
    
    e.preventDefault();
    
    const { columnId, startX, startWidth } = resizingRef.current;
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(80, startWidth + deltaX); // Minimum width of 80px
    
    setColumnWidths((prev) => {
      const updated = {
        ...prev,
        [columnId]: newWidth,
      };
      
      // Debounced save to localStorage
      requestAnimationFrame(() => {
        saveColumnWidths(updated);
      });
      
      return updated;
    });
  }, [isResizing, saveColumnWidths]);

  // Handle mouse up to end resizing
  const handleMouseUp = useCallback(() => {
    if (resizingRef.current) {
      setIsResizing(false);
      resizingRef.current = null;
      
      // Remove cursor style from body
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Final save to localStorage
      saveColumnWidths(columnWidths);
    }
  }, [columnWidths, saveColumnWidths]);

  // Start resizing a column
  const startResizing = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const currentWidth = columnWidths[columnId] || 200;
    
    resizingRef.current = {
      columnId,
      startX: e.clientX,
      startWidth: currentWidth,
    };
    
    setIsResizing(true);
    
    // Set cursor style on body for smooth resizing
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columnWidths]);

  // Set up global mouse event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove, { passive: false });
      document.addEventListener("mouseup", handleMouseUp);
      
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  // Update a column width programmatically
  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    const newWidth = Math.max(80, width);
    setColumnWidths((prev) => {
      const updated = {
        ...prev,
        [columnId]: newWidth,
      };
      saveColumnWidths(updated);
      return updated;
    });
  }, [saveColumnWidths]);

  return {
    columnWidths,
    isResizing,
    startResizing,
    updateColumnWidth,
  };
}