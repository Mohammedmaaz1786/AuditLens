"use client";

import { useState, useEffect } from "react";
import { DataTable } from "@/components/data-table";
import { columns } from "./columns";
import { InvoiceUpload } from "@/components/invoice-upload";
import { apiClient } from "@/lib/api-client";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceDetailsDialog } from "@/components/invoice-details-dialog";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'view' | 'approve' | 'reject'>('view');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getInvoices({ page: 1, limit: 100 });
      if (response.success && response.data) {
        setInvoices(response.data.invoices);
        setError(null);
      } else {
        setError("Failed to load invoices");
      }
    } catch (err: any) {
      console.error("Error fetching invoices:", err);
      setError(err.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleUploadSuccess = () => {
    // Refresh the invoices list after successful upload
    fetchInvoices();
  };

  const handleViewDetails = (invoice: any, action?: 'approve' | 'reject') => {
    setSelectedInvoice(invoice);
    setDialogAction(action || 'view');
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedInvoice(null);
    setDialogAction('view');
  };

  const handleInvoiceUpdate = () => {
    fetchInvoices();
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Invoices</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchInvoices}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage and review all company invoices
          </p>
        </div>
        <div className="flex-shrink-0">
          <InvoiceUpload onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <DataTable 
          columns={columns({ onViewDetails: handleViewDetails })} 
          data={invoices} 
          filterColumn="vendorName"
          filterPlaceholder="Filter by vendor..."
        />
      </div>

      {selectedInvoice && (
        <InvoiceDetailsDialog
          invoice={selectedInvoice}
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          onUpdate={handleInvoiceUpdate}
          initialAction={dialogAction}
        />
      )}
    </div>
  );
}
