"use client";

import { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

interface OcrResult {
  invoiceNumber: string;
  vendorName: string;
  vendorEmail?: string;
  vendorPhone?: string;
  vendorAddress?: string;
  // Receiver/Customer Information
  billToName?: string;
  billToAddress?: string;
  billToEmail?: string;
  billToPhone?: string;
  billToCompany?: string;
  customerName?: string;
  customerAddress?: string;
  customerEmail?: string;
  customerPhone?: string;
  shipToName?: string;
  shipToAddress?: string;
  totalAmount: number;
  taxAmount: number;
  subtotal: number;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  lineItems: any[];
  ocrConfidence: number;
  rawText: string;
}

interface OcrResponse {
  success: boolean;
  filename: string;
  data: {
    vendor_name: string;
    vendor_address?: string;
    vendor_email?: string;
    vendor_phone?: string;
    // Receiver/Customer Information
    bill_to_name?: string;
    bill_to_address?: string;
    bill_to_email?: string;
    bill_to_phone?: string;
    bill_to_company?: string;
    customer_name?: string;
    customer_address?: string;
    customer_email?: string;
    customer_phone?: string;
    ship_to_name?: string;
    ship_to_address?: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    subtotal: number;
    tax: number;
    total_amount: number;
    currency: string;
    line_items: any[];
    raw_text: string;
  };
  confidence_score: number;
  processing_time: number;
  fraud_analysis?: FraudAnalysis;
}

interface FraudAnalysis {
  risk_level: string;
  risk_score: number;
  fraud_detected: boolean;
  detections: Array<{ type: string; severity: string; description: string; confidence: number }>;
  warnings: Array<{ type: string; severity: string; description: string; confidence: number }>;
  details?: any;
}

export function InvoiceUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [fraudAnalysis, setFraudAnalysis] = useState<FraudAnalysis | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isConfirmingSave, setIsConfirmingSave] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  async function handleFileUpload() {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Upload file to OCR service
      const formData = new FormData();
      formData.append('file', selectedFile);

      const ocrResponse = await fetch('http://localhost:8000/api/process-invoice', {
        method: 'POST',
        body: formData,
      });

      if (!ocrResponse.ok) {
        const errorData = await ocrResponse.json();
        throw new Error(errorData.detail || 'OCR processing failed');
      }

      const ocrData: OcrResponse = await ocrResponse.json();
      
      // LOG: OCR Extraction Results
      console.log('=== OCR EXTRACTION RESULTS ===');
      console.log('Full OCR Response:', JSON.stringify(ocrData, null, 2));
      console.log('Line Items from OCR:', ocrData.data.line_items);
      console.log('Line Items Count:', ocrData.data.line_items?.length || 0);
      
      // Transform line items from snake_case to camelCase
      const transformedLineItems = (ocrData.data.line_items || [])
        .map((item: any, index: number) => {
          console.log(`Raw Line Item ${index}:`, item);
          
          const transformed = {
            description: item.description || 'N/A',
            quantity: item.quantity || 0,
            unitPrice: item.unit_price || item.unitPrice || 0,
            amount: item.amount || 0,
          };
          
          console.log(`Transformed Line Item ${index}:`, transformed);
          return transformed;
        })
        .filter((item: any) => item.description && item.description !== 'N/A'); // Only include valid items
      
      console.log('Final Transformed Line Items:', transformedLineItems);
      
      // Transform snake_case to camelCase for display
      const transformedData: OcrResult = {
        invoiceNumber: ocrData.data.invoice_number || 'N/A',
        vendorName: ocrData.data.vendor_name || 'Unknown',
        vendorEmail: ocrData.data.vendor_email || '',
        vendorPhone: ocrData.data.vendor_phone || '',
        vendorAddress: ocrData.data.vendor_address || '',
        // Receiver/Customer Information
        billToName: ocrData.data.bill_to_name,
        billToAddress: ocrData.data.bill_to_address,
        billToEmail: ocrData.data.bill_to_email,
        billToPhone: ocrData.data.bill_to_phone,
        billToCompany: ocrData.data.bill_to_company,
        customerName: ocrData.data.customer_name,
        customerAddress: ocrData.data.customer_address,
        customerEmail: ocrData.data.customer_email,
        customerPhone: ocrData.data.customer_phone,
        shipToName: ocrData.data.ship_to_name,
        shipToAddress: ocrData.data.ship_to_address,
        totalAmount: ocrData.data.total_amount || 0,
        taxAmount: ocrData.data.tax || 0,
        subtotal: ocrData.data.subtotal || 0,
        invoiceDate: ocrData.data.invoice_date || new Date().toISOString(),
        dueDate: ocrData.data.due_date || new Date().toISOString(),
        currency: ocrData.data.currency || 'USD',
        lineItems: transformedLineItems,
        ocrConfidence: ocrData.confidence_score || 0,
        rawText: ocrData.data.raw_text || '',
      };
      
      console.log('Transformed Line Items:', transformedData.lineItems);
      
      setOcrResult(transformedData);

      // Extract fraud analysis from OCR response (it's at the root level, not inside data)
      const fraudAnalysisData = ocrData.fraud_analysis;
      console.log('=== FRAUD ANALYSIS ===');
      console.log('Fraud Analysis Data:', JSON.stringify(fraudAnalysisData, null, 2));
      if (fraudAnalysisData) {
        setFraudAnalysis(fraudAnalysisData);
        console.log('Fraud Risk Level:', fraudAnalysisData.risk_level);
        console.log('Fraud Detected:', fraudAnalysisData.fraud_detected);
        console.log('Detections:', fraudAnalysisData.detections);
        console.log('Warnings:', fraudAnalysisData.warnings);
      } else {
        console.warn('⚠️ No fraud analysis data in response');
      }

      // Show preview dialog instead of immediately saving
      setIsProcessing(false);
      setShowPreview(true);

    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to process invoice");
      setIsProcessing(false);
    }
  }

  async function handleConfirmSave() {
    if (!ocrResult) return;

    setIsConfirmingSave(true);

    try {
      // Step 2: Create invoice in backend with extracted data
      const token = localStorage.getItem('auth_token');
      
      // Prepare invoice data for backend (camelCase)
      const invoicePayload = {
        invoiceNumber: ocrResult.invoiceNumber,
        vendorName: ocrResult.vendorName,
        vendorEmail: ocrResult.vendorEmail || undefined,
        totalAmount: ocrResult.totalAmount,
        taxAmount: ocrResult.taxAmount,
        subtotal: ocrResult.subtotal,
        invoiceDate: ocrResult.invoiceDate,
        dueDate: ocrResult.dueDate,
        currency: ocrResult.currency,
        lineItems: ocrResult.lineItems,
        ocrConfidence: ocrResult.ocrConfidence,
        rawText: ocrResult.rawText,
        fraudAnalysis: fraudAnalysis || undefined,
        status: 'pending'
      };

      console.log('=== INVOICE PAYLOAD TO BACKEND ===');
      console.log('Full Payload:', JSON.stringify(invoicePayload, null, 2));
      console.log('Line Items in Payload:', invoicePayload.lineItems);
      console.log('Number of Line Items:', invoicePayload.lineItems?.length || 0);
      if (invoicePayload.lineItems && invoicePayload.lineItems.length > 0) {
        invoicePayload.lineItems.forEach((item: any, index: number) => {
          console.log(`Line Item ${index}:`, {
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice || item.unit_price,
            amount: item.amount,
            hasUnitPrice: !!(item.unitPrice || item.unit_price)
          });
        });
      }

      console.warn('🚨 SENDING TO BACKEND - CHECK LINE ITEMS HAVE unitPrice (not unit_price)');
      console.log('Line items being sent:', JSON.stringify(invoicePayload.lineItems, null, 2));

      const createResponse = await fetch('http://localhost:5000/api/v1/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(invoicePayload),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || 'Failed to save invoice');
      }

      const invoiceData = await createResponse.json();
      
      setShowPreview(false);
      setIsDone(true);
      
      // Call success callback to refresh invoice list
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err.message || "Failed to save invoice");
    } finally {
      setIsConfirmingSave(false);
    }
  }

  function handleCancelPreview() {
    setShowPreview(false);
    setOcrResult(null);
    setFraudAnalysis(null);
    setSelectedFile(null);
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      // Reset state when dialog is closed
      setIsProcessing(false);
      setIsDone(false);
      setError(null);
      setOcrResult(null);
      setFraudAnalysis(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  const getRiskColor = (riskLevel?: string) => {
    switch (riskLevel?.toUpperCase()) {
      case 'LOW': return 'text-green-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'HIGH': return 'text-orange-600';
      case 'CRITICAL': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Helper function to combine detections and warnings into a single array
  const getAllFraudFlags = (fraudAnalysis: FraudAnalysis | null) => {
    if (!fraudAnalysis) return [];
    const flags = [];
    
    // Add detections (HIGH priority issues)
    if (fraudAnalysis.detections && fraudAnalysis.detections.length > 0) {
      flags.push(...fraudAnalysis.detections.map(d => ({
        type: d.type,
        severity: d.severity,
        message: d.description
      })));
    }
    
    // Add warnings (MEDIUM priority issues)
    if (fraudAnalysis.warnings && fraudAnalysis.warnings.length > 0) {
      flags.push(...fraudAnalysis.warnings.map(w => ({
        type: w.type,
        severity: w.severity,
        message: w.description
      })));
    }
    
    return flags;
  };

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UploadCloud className="mr-2 h-4 w-4" />
          Upload Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Invoice for Processing</DialogTitle>
          <DialogDescription>
            Upload an invoice to extract data using OCR and perform fraud risk analysis
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* File Upload Area */}
          {!isProcessing && !isDone && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.tiff"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <div
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer border-border hover:bg-accent transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <UploadCloud className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, PNG, JPG, TIFF (Max 10MB)
                </p>
              </div>
              {selectedFile && (
                <div className="mt-3 p-3 bg-accent rounded-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              )}
              {error && (
                <div className="mt-3 p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <UploadCloud className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <p className="text-sm font-medium mb-2">Processing Invoice...</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Performing OCR extraction and fraud risk analysis
                </p>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          )}

          {/* Success State with OCR Results */}
          {isDone && ocrResult && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">Invoice Processed Successfully!</h3>
              </div>

              {/* OCR Results */}
              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Extracted Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Invoice #:</span>
                      <p className="font-medium">{ocrResult.invoiceNumber}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vendor:</span>
                      <p className="font-medium">{ocrResult.vendorName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Amount:</span>
                      <p className="font-medium">${ocrResult.totalAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Invoice Date:</span>
                      <p className="font-medium">
                        {new Date(ocrResult.invoiceDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">OCR Confidence:</span>
                      <p className="font-medium">{(ocrResult.ocrConfidence * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Line Items:</span>
                      <p className="font-medium">{ocrResult.lineItems?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fraud Analysis Results */}
              {fraudAnalysis && (
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Fraud Risk Analysis
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Risk Level:</span>
                        <Badge 
                          variant={
                            fraudAnalysis.risk_level === 'LOW' ? 'default' :
                            fraudAnalysis.risk_level === 'MEDIUM' ? 'secondary' :
                            'destructive'
                          }
                          className={getRiskColor(fraudAnalysis.risk_level)}
                        >
                          {fraudAnalysis.risk_level}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Risk Score:</span>
                        <span className="font-semibold">{Math.round(fraudAnalysis.risk_score * 100)}/100</span>
                      </div>
                      {getAllFraudFlags(fraudAnalysis).length > 0 && (
                        <div>
                          <span className="text-sm text-muted-foreground block mb-2">Detected Issues:</span>
                          <div className="space-y-2">
                            {getAllFraudFlags(fraudAnalysis).map((flag, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs p-2 bg-accent rounded">
                                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-orange-600" />
                                <div>
                                  <span className="font-medium">{flag.type}:</span>{' '}
                                  <span className="text-muted-foreground">{flag.message}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          {isDone ? (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          ) : (
            <Button 
              onClick={handleFileUpload} 
              disabled={isProcessing || !selectedFile}
            >
              {isProcessing ? 'Processing...' : 'Upload & Process'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Preview Dialog - Shows extracted data before saving */}
      <Dialog open={showPreview} onOpenChange={(open) => !open && handleCancelPreview()}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Extracted Invoice Data</DialogTitle>
            <DialogDescription>
              Please review the extracted information before saving to database
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* OCR Results */}
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5" />
                  Extracted Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Invoice Number:</span>
                    <p className="font-semibold text-base">{ocrResult?.invoiceNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Vendor:</span>
                    <p className="font-semibold text-base">{ocrResult?.vendorName}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <p className="font-semibold text-lg text-green-600">
                      {ocrResult?.currency} ${ocrResult?.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <p className="font-medium">${ocrResult?.subtotal.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Tax Amount:</span>
                    <p className="font-medium">${ocrResult?.taxAmount.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Currency:</span>
                    <p className="font-medium">{ocrResult?.currency}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Invoice Date:</span>
                    <p className="font-medium">
                      {ocrResult?.invoiceDate ? new Date(ocrResult.invoiceDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Due Date:</span>
                    <p className="font-medium">
                      {ocrResult?.dueDate ? new Date(ocrResult.dueDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">OCR Confidence:</span>
                    <p className="font-medium">
                      <Badge variant="secondary">
                        {((ocrResult?.ocrConfidence || 0) * 100).toFixed(1)}%
                      </Badge>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Line Items:</span>
                    <p className="font-medium">{ocrResult?.lineItems?.length || 0} items</p>
                  </div>
                </div>

                {/* Receiver/Bill-To Information */}
                {(ocrResult?.billToName || ocrResult?.billToCompany || ocrResult?.customerName) && (
                  <div className="mt-6 pt-6 border-t">
                    <h5 className="font-semibold mb-4 text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Receiver Information
                    </h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {ocrResult.billToName && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Bill To Name:</span>
                          <p className="font-medium">{ocrResult.billToName}</p>
                        </div>
                      )}
                      {ocrResult.billToCompany && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Bill To Company:</span>
                          <p className="font-medium">{ocrResult.billToCompany}</p>
                        </div>
                      )}
                      {ocrResult.billToEmail && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Bill To Email:</span>
                          <p className="font-medium">{ocrResult.billToEmail}</p>
                        </div>
                      )}
                      {ocrResult.billToPhone && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Bill To Phone:</span>
                          <p className="font-medium">{ocrResult.billToPhone}</p>
                        </div>
                      )}
                      {ocrResult.billToAddress && (
                        <div className="space-y-1 col-span-2">
                          <span className="text-muted-foreground">Bill To Address:</span>
                          <p className="font-medium">{ocrResult.billToAddress}</p>
                        </div>
                      )}
                      {ocrResult.customerName && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Customer Name:</span>
                          <p className="font-medium">{ocrResult.customerName}</p>
                        </div>
                      )}
                      {ocrResult.customerEmail && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Customer Email:</span>
                          <p className="font-medium">{ocrResult.customerEmail}</p>
                        </div>
                      )}
                      {ocrResult.customerPhone && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Customer Phone:</span>
                          <p className="font-medium">{ocrResult.customerPhone}</p>
                        </div>
                      )}
                      {ocrResult.customerAddress && (
                        <div className="space-y-1 col-span-2">
                          <span className="text-muted-foreground">Customer Address:</span>
                          <p className="font-medium">{ocrResult.customerAddress}</p>
                        </div>
                      )}
                      {ocrResult.shipToName && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Ship To Name:</span>
                          <p className="font-medium">{ocrResult.shipToName}</p>
                        </div>
                      )}
                      {ocrResult.shipToAddress && (
                        <div className="space-y-1 col-span-2">
                          <span className="text-muted-foreground">Ship To Address:</span>
                          <p className="font-medium">{ocrResult.shipToAddress}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Line Items Table */}
                {ocrResult?.lineItems && ocrResult.lineItems.length > 0 && (
                  <div className="mt-6">
                    <h5 className="font-semibold mb-3 text-sm">Line Items:</h5>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-2 font-medium">Description</th>
                            <th className="text-right p-2 font-medium">Qty</th>
                            <th className="text-right p-2 font-medium">Unit Price</th>
                            <th className="text-right p-2 font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ocrResult.lineItems.map((item: any, idx: number) => (
                            <tr key={idx} className="border-t">
                              <td className="p-2">{item.description}</td>
                              <td className="text-right p-2">{item.quantity}</td>
                              <td className="text-right p-2">${item.unitPrice?.toFixed(2)}</td>
                              <td className="text-right p-2 font-medium">${item.amount?.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fraud Analysis Results */}
            {fraudAnalysis && (
              <Card className="border-orange-200">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-4 flex items-center gap-2 text-base">
                    <Shield className="h-5 w-5 text-orange-600" />
                    Fraud Risk Analysis
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Risk Level:</span>
                      <Badge 
                        variant={
                          fraudAnalysis.risk_level === 'LOW' ? 'default' :
                          fraudAnalysis.risk_level === 'MEDIUM' ? 'secondary' :
                          'destructive'
                        }
                        className={getRiskColor(fraudAnalysis.risk_level) + ' px-4 py-1'}
                      >
                        {fraudAnalysis.risk_level}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Risk Score:</span>
                      <span className="font-bold text-lg">{Math.round(fraudAnalysis.risk_score * 100)}/100</span>
                    </div>
                    {getAllFraudFlags(fraudAnalysis).length > 0 && (
                      <div>
                        <span className="text-sm font-medium block mb-3">Detected Issues ({getAllFraudFlags(fraudAnalysis).length}):</span>
                        <div className="space-y-2">
                          {getAllFraudFlags(fraudAnalysis).map((flag, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-orange-600" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-sm">{flag.type}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {flag.severity}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{flag.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancelPreview}
              disabled={isConfirmingSave}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSave}
              disabled={isConfirmingSave}
            >
              {isConfirmingSave ? 'Saving...' : 'Confirm & Save to Database'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
