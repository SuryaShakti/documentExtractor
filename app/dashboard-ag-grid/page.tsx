"use client";

import React from "react";
import { AgGridDocumentTable } from "@/components/table/ag-grid-document-table";

export default function DashboardAgGridPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8 bg-gray-50">
      <div className="w-full max-w-7xl mx-auto">
        <AgGridDocumentTable />
      </div>
    </main>
  );
}
