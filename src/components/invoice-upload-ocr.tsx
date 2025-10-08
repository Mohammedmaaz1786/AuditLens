"use client";

import { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { ocrClient, type ProcessingResult, type InvoiceData } from '@/lib/ocr-client';

interface InvoiceUploadWithOCRProps {
  onUploadComplete?: (result: ProcessingResult) => void;
}

export function InvoiceUploadWithOCR({ onUploadComplete }: InvoiceUploadWithOCRProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(pdf|png|jpg|jpeg|tiff|tif)$/i)) {
        setError('Please upload a valid file (PDF, PNG, JPG, or TIFF)');
        return;
      }
      
      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const event = {
        target: { files: [droppedFile] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(event);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const processDocument = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await ocrClient.processInvoice(file, 'eng');
      setResult(result);
      
      if (!result.success) {
        setError(result.error || 'Processing failed');
      } else {
        // Call the callback if provided
        onUploadComplete?.(result);
      }
    } catch (err) {
      console.error('OCR processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process document');
      setResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setIsProcessing(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetState();
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) return <Badge variant="default" className="bg-green-500">High ({(score * 100).toFixed(0)}%)</Badge>;
    if (score >= 0.6) return <Badge variant="secondary">Medium ({(score * 100).toFixed(0)}%)</Badge>;
    return <Badge variant="destructive">Low ({(score * 100).toFixed(0)}%)</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UploadCloud className="w-4 h-4 mr-2" />
          Upload Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Upload & Process Invoice</DialogTitle>
          <DialogDescription>
            Upload an invoice (PDF, PNG, JPG, TIFF) to automatically extract data using OCR.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid gap-4 py-4">
            {/* File Upload Area */}
            {!file && !result && (
              <div
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer border-border hover:bg-accent transition-colors"
                onClick={() => document.getElementById('file-input')?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <UploadCloud className="w-10 h-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Click or drag file to upload
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, PNG, JPG, TIFF (max 10MB)
                </p>
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
                  onChange={handleFileChange}
                />
              </div>
            )}

            {/* File Selected */}
            {file && !result && !isProcessing && (
              <div className="space-y-4">
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </AlertDescription>
                </Alert>
                <Button onClick={processDocument} className="w-full">
                  Process Document
                </Button>
              </div>
            )}

            {/* Processing State */}
            {isProcessing && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium">Processing Document...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Extracting data using OCR and AI
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Results */}
            {result && result.success && result.data && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-semibold">Processing Complete</span>
                  </div>
                  {getConfidenceBadge(result.confidence_score)}
                </div>

                <Separator />

                {/* Extracted Data */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Extracted Information</h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="text-muted-foreground">Vendor</label>
                      <p className="font-medium">{result.data.vendor_name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Invoice #</label>
                      <p className="font-medium">{result.data.invoice_number || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Date</label>
                      <p className="font-medium">{result.data.invoice_date || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Due Date</label>
                      <p className="font-medium">{result.data.due_date || 'N/A'}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="text-muted-foreground">Subtotal</label>
                      <p className="font-medium">{formatCurrency(result.data.subtotal)}</p>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Tax</label>
                      <p className="font-medium">{formatCurrency(result.data.tax)}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-muted-foreground">Total Amount</label>
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(result.data.total_amount)}
                      </p>
                    </div>
                  </div>

                  {/* Line Items */}
                  {result.data.line_items && result.data.line_items.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold text-sm mb-2">
                          Line Items ({result.data.line_items.length})
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {result.data.line_items.slice(0, 5).map((item, idx) => (
                            <div key={idx} className="text-xs bg-accent p-2 rounded">
                              <div className="flex justify-between">
                                <span className="font-medium truncate flex-1">
                                  {item.description}
                                </span>
                                <span className="font-bold ml-2">
                                  {formatCurrency(item.amount)}
                                </span>
                              </div>
                              {item.quantity && item.unit_price && (
                                <div className="text-muted-foreground">
                                  Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                                </div>
                              )}
                            </div>
                          ))}
                          {result.data.line_items.length > 5 && (
                            <p className="text-xs text-muted-foreground text-center">
                              +{result.data.line_items.length - 5} more items
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Warnings */}
                  {result.warnings && result.warnings.length > 0 && (
                    <>
                      <Separator />
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <p className="font-medium text-sm mb-1">Warnings:</p>
                          <ul className="text-xs space-y-1">
                            {result.warnings.map((warning, idx) => (
                              <li key={idx}>• {warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </>
                  )}

                  {/* Processing Info */}
                  <div className="text-xs text-muted-foreground text-center pt-2">
                    Processed in {result.processing_time.toFixed(2)}s
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          {result && (
            <Button variant="outline" onClick={resetState}>
              Upload Another
            </Button>
          )}
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
