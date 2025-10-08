"use client";

import { DataTable } from "@/components/data-table";
import { columns } from "./columns";
import { invoices } from "@/lib/data";
import { InvoiceUploadWithOCR } from "@/components/invoice-upload-ocr";

export default function InvoicesPage() {
  const handleUploadComplete = (result: any) => {
    console.log("OCR Result:", result);
    // TODO: Auto-fill form, save to database, refresh table, etc.
    // Example: You can add the extracted data to your invoices state
    if (result.success && result.data) {
      const extractedData = result.data;
      console.log("Vendor:", extractedData.vendorName);
      console.log("Amount:", extractedData.amount);
      console.log("Date:", extractedData.date);
      console.log("Invoice Number:", extractedData.invoiceNumber);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground">Manage and review all company invoices.</p>
        </div>
        <InvoiceUploadWithOCR onUploadComplete={handleUploadComplete} />
      </div>
      <DataTable 
        columns={columns} 
        data={invoices} 
        filterColumn="vendorName"
        filterPlaceholder="Filter by vendor..."
      />
    </div>
  );
}
