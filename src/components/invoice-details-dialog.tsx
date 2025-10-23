"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

interface InvoiceDetailsDialogProps {
  invoice: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  initialAction?: 'view' | 'approve' | 'reject';
}

export function InvoiceDetailsDialog({
  invoice,
  open,
  onOpenChange,
  onUpdate,
  initialAction = 'view',
}: InvoiceDetailsDialogProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const { toast } = useToast();

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      const response = await apiClient.approveInvoice(invoice._id);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Invoice approved successfully",
        });
        onOpenChange(false);
        onUpdate?.();
      } else {
        throw new Error("Failed to approve invoice");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve invoice",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsRejecting(true);
      const response = await apiClient.rejectInvoice(invoice._id);
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Invoice rejected successfully",
        });
        onOpenChange(false);
        onUpdate?.();
      } else {
        throw new Error("Failed to reject invoice");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject invoice",
        variant: "destructive",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, any> = {
      pending: { variant: "secondary", label: "Pending" },
      approved: { variant: "outline", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      paid: { variant: "default", label: "Paid" },
      overdue: { variant: "destructive", label: "Overdue" },
    };

    const info = statusMap[status?.toLowerCase()] || { variant: "outline", label: status };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  const getRiskBadge = (riskLevel?: string) => {
    if (!riskLevel) return null;

    const riskMap: Record<string, any> = {
      LOW: { variant: "default", label: "Low Risk" },
      MEDIUM: { variant: "secondary", label: "Medium Risk" },
      HIGH: { variant: "destructive", label: "High Risk" },
      CRITICAL: { variant: "destructive", label: "Critical Risk" },
    };

    const info = riskMap[riskLevel.toUpperCase()] || { variant: "outline", label: riskLevel };
    return (
      <Badge variant={info.variant} className="gap-1">
        {(riskLevel === "HIGH" || riskLevel === "CRITICAL") && (
          <AlertTriangle className="h-3 w-3" />
        )}
        {info.label}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Invoice Details</DialogTitle>
          <DialogDescription>
            Complete information about invoice {invoice?.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Buttons at Top - Only for Pending Invoices */}
          {invoice?.status === "pending" && (
            <div className="flex gap-3 justify-end pb-4 border-b">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isRejecting || isApproving}
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Invoice
                  </>
                )}
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
              >
                {isApproving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Invoice
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Header Info */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">{invoice?.invoiceNumber}</h3>
              <p className="text-sm text-muted-foreground">
                Issued on {new Date(invoice?.invoiceDate).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              {getStatusBadge(invoice?.status)}
              {invoice?.fraudAnalysis?.riskLevel && getRiskBadge(invoice.fraudAnalysis.riskLevel)}
            </div>
          </div>

          <Separator />

          {/* Vendor Information */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{invoice?.vendorName || "N/A"}</p>
              </div>
              {invoice?.vendorEmail && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{invoice.vendorEmail}</p>
                </div>
              )}
              {invoice?.vendorPhone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{invoice.vendorPhone}</p>
                </div>
              )}
              {invoice?.vendorAddress && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{invoice.vendorAddress}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bill To Information */}
          {(invoice?.billToName || invoice?.customerName) && (
            <Card>
              <CardHeader>
                <CardTitle>Bill To / Customer</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{invoice?.billToName || invoice?.customerName || "N/A"}</p>
                </div>
                {(invoice?.billToEmail || invoice?.customerEmail) && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{invoice.billToEmail || invoice.customerEmail}</p>
                  </div>
                )}
                {(invoice?.billToPhone || invoice?.customerPhone) && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{invoice.billToPhone || invoice.customerPhone}</p>
                  </div>
                )}
                {(invoice?.billToAddress || invoice?.customerAddress) && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{invoice.billToAddress || invoice.customerAddress}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Line Items */}
          {invoice?.lineItems && invoice.lineItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.lineItems.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{item.description || "N/A"}</TableCell>
                          <TableCell className="text-right">{item.quantity || 0}</TableCell>
                          <TableCell className="text-right">
                            ${(item.unitPrice || item.unit_price || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${(item.amount || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoice?.subtotal && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
                </div>
              )}
              {invoice?.taxAmount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">${invoice.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${(invoice?.totalAmount || 0).toFixed(2)}</span>
              </div>
              {invoice?.dueDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Due Date</span>
                  <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fraud Analysis */}
          {invoice?.fraudAnalysis && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Fraud Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Risk Level</span>
                  {getRiskBadge(invoice.fraudAnalysis.riskLevel)}
                </div>
                {invoice.fraudAnalysis.overallScore !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk Score</span>
                    <span className="font-medium">{invoice.fraudAnalysis.overallScore}/100</span>
                  </div>
                )}
                {invoice.fraudAnalysis.warnings && invoice.fraudAnalysis.warnings.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Warnings:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {invoice.fraudAnalysis.warnings.map((warning: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {invoice?.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
