/**
 * OCR API Client for Next.js Frontend
 * TypeScript/JavaScript wrapper for OCR backend
 */

interface InvoiceData {
  vendor_name?: string;
  vendor_address?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  subtotal?: number;
  tax?: number;
  total_amount?: number;
  amount_paid?: number;
  balance_due?: number;
  currency?: string;
  line_items?: LineItem[];
  payment_instructions?: string;
  notes?: string;
  confidence_scores?: Record<string, number>;
  raw_text?: string;
}

interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  amount?: number;
  confidence: number;
}

interface FraudDetection {
  type: string;
  severity: string;
  description: string;
  confidence: number;
}

interface FraudAnalysis {
  invoice_id?: string;
  fraud_detected: boolean;
  risk_score: number;
  risk_level: string;
  detections: FraudDetection[];
  warnings: FraudDetection[];
  details?: Record<string, any>;
}

interface ProcessingResult {
  success: boolean;
  filename: string;
  data?: InvoiceData;
  confidence_score: number;
  processing_time: number;
  error?: string;
  warnings?: string[];
  fraud_analysis?: FraudAnalysis;
}

export type { InvoiceData, LineItem, ProcessingResult, FraudAnalysis, FraudDetection };

class OCRClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Process a single invoice document
   */
  async processInvoice(
    file: File,
    language: string = 'eng'
  ): Promise<ProcessingResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);

    try {
      const response = await fetch(`${this.baseUrl}/api/process-invoice`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Processing failed');
      }

      return await response.json();
    } catch (error) {
      console.error('OCR processing error:', error);
      throw error;
    }
  }

  /**
   * Process multiple invoices in batch
   */
  async batchProcessInvoices(
    files: File[],
    language: string = 'eng'
  ): Promise<ProcessingResult[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('language', language);

    try {
      const response = await fetch(`${this.baseUrl}/api/batch-process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Batch processing failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Batch OCR processing error:', error);
      throw error;
    }
  }

  /**
   * Check API health status
   */
  async healthCheck(): Promise<{status: string; service: string; version: string}> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const ocrClient = new OCRClient(
  process.env.NEXT_PUBLIC_OCR_API_URL || 'http://localhost:8000'
);
