"use client";

import { useState } from 'react';
import { UploadCloud } from 'lucide-react';
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
import { automateComplianceRuleSelection } from '@/ai/flows/automate-compliance-rule-selection';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';

export function InvoiceUpload() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [rules, setRules] = useState<string[]>([]);

  async function handleFileUpload() {
    setIsProcessing(true);
    // Simulate file processing and AI call
    try {
      const result = await automateComplianceRuleSelection({
        documentType: 'invoice',
        vendorName: 'Innovate LLC',
        invoiceData: JSON.stringify({
            amount: 2500,
            date: '2024-07-15',
            items: [{description: 'Consulting Services', quantity: 1, price: 2500}]
        }),
      });
      setRules(result.applicableRules);
    } catch (error) {
      console.error("AI call failed:", error);
      setRules(["Error generating rules. Please try again."]);
    }
    
    setIsProcessing(false);
    setIsDone(true);
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      // Reset state when dialog is closed
      setIsProcessing(false);
      setIsDone(false);
      setRules([]);
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Upload Invoice</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Invoice</DialogTitle>
          <DialogDescription>
            Drag and drop your invoice file or click to browse.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!isProcessing && !isDone && (
            <div
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer border-border hover:bg-accent"
              onClick={handleFileUpload}
            >
              <UploadCloud className="w-10 h-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Click or drag file to this area to upload
              </p>
            </div>
          )}
          {isProcessing && (
            <div className="space-y-4">
                <p className="text-sm text-center text-muted-foreground">Analyzing document and selecting compliance rules...</p>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-1/2" />
            </div>
          )}
          {isDone && (
            <div>
              <h4 className="font-medium mb-2">AI Suggested Compliance Rules:</h4>
              <div className="flex flex-wrap gap-2">
                {rules.map((rule, index) => (
                  <Badge key={index} variant="secondary">{rule}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
            {isDone ? (
                <Button onClick={() => handleOpenChange(false)}>Done</Button>
            ) : (
                <Button onClick={handleFileUpload} disabled={isProcessing}>
                    {isProcessing ? 'Processing...' : 'Upload'}
                </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
