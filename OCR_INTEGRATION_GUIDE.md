# OCR Document Processing Integration Guide

## 🎯 Overview

This document describes how to integrate the OCR document processing system with your Audit Lens application.

## 📦 What's Included

### Backend (Python/FastAPI)
- ✅ **OCR Processing**: Tesseract OCR with image preprocessing
- ✅ **Entity Extraction**: Regex and NLP-based extraction
- ✅ **Multi-format Support**: PDF, PNG, JPG, TIFF
- ✅ **Batch Processing**: Handle multiple documents
- ✅ **Confidence Scoring**: Quality metrics for extracted data
- ✅ **RESTful API**: FastAPI with automatic documentation

### Frontend (Next.js/TypeScript)
- ✅ **OCR Client**: TypeScript API wrapper
- ✅ **Enhanced Upload Component**: Drag-and-drop with OCR processing
- ✅ **Real-time Results**: Display extracted invoice data
- ✅ **Confidence Indicators**: Visual feedback on data quality

## 🚀 Quick Start

### Step 1: Install Backend Dependencies

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Install System Dependencies

**Windows:**
1. Install Tesseract: https://github.com/UB-Mannheim/tesseract/wiki
2. Install Poppler: https://github.com/oschwartz10612/poppler-windows/releases
3. Add both to system PATH

**Mac:**
```bash
brew install tesseract poppler
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr poppler-utils
```

### Step 3: Configure Backend

Edit `backend/.env`:
```env
# Windows
TESSERACT_CMD=C:/Program Files/Tesseract-OCR/tesseract.exe

# Mac/Linux (usually auto-detected)
# TESSERACT_CMD=/usr/bin/tesseract
```

### Step 4: Start Backend Server

```powershell
cd backend
python main.py
```

Server runs at: **http://localhost:8000**  
API Docs at: **http://localhost:8000/api/docs**

### Step 5: Configure Frontend

Your `.env.local` already includes:
```env
NEXT_PUBLIC_OCR_API_URL=http://localhost:8000
```

### Step 6: Use the OCR Component

Replace the old invoice upload component in your invoices page:

**Option 1 - Replace in page:**
```tsx
// src/app/(app)/invoices/page.tsx
import { InvoiceUploadWithOCR } from "@/components/invoice-upload-ocr";

export default function InvoicesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage and review all company invoices.</p>
        </div>
        <InvoiceUploadWithOCR />  {/* Use OCR-enabled component */}
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
```

**Option 2 - Update existing component:**
You can also update the existing `invoice-upload.tsx` to use OCR by importing the client:

```tsx
import { ocrClient } from '@/lib/ocr-client';

// Then use ocrClient.processInvoice(file) in your upload handler
```

## 📝 Usage Examples

### Basic Usage

```typescript
import { ocrClient } from '@/lib/ocr-client';

// Process single invoice
const result = await ocrClient.processInvoice(file, 'eng');

if (result.success && result.data) {
  console.log('Vendor:', result.data.vendor_name);
  console.log('Amount:', result.data.total_amount);
  console.log('Invoice #:', result.data.invoice_number);
  console.log('Confidence:', result.confidence_score);
}
```

### Batch Processing

```typescript
const files = [file1, file2, file3];
const results = await ocrClient.batchProcessInvoices(files, 'eng');

results.forEach(result => {
  if (result.success) {
    console.log(`Processed ${result.filename}:`, result.data);
  }
});
```

### With Error Handling

```typescript
try {
  const result = await ocrClient.processInvoice(file);
  
  if (!result.success) {
    console.error('Processing failed:', result.error);
    return;
  }
  
  // Check warnings
  if (result.warnings && result.warnings.length > 0) {
    console.warn('Warnings:', result.warnings);
  }
  
  // Use extracted data
  saveInvoiceToDatabase(result.data);
  
} catch (error) {
  console.error('API error:', error);
}
```

## 🔧 Integration Points

### 1. Invoice Creation Form

Auto-fill invoice form fields with extracted data:

```typescript
const handleOCRComplete = (result: ProcessingResult) => {
  if (result.success && result.data) {
    form.setValue('vendorName', result.data.vendor_name);
    form.setValue('invoiceNumber', result.data.invoice_number);
    form.setValue('amount', result.data.total_amount);
    form.setValue('date', result.data.invoice_date);
    // etc...
  }
};
```

### 2. Database Integration

Save extracted data to your database:

```typescript
async function saveExtractedInvoice(result: ProcessingResult) {
  if (!result.success || !result.data) return;
  
  const invoice = {
    vendorName: result.data.vendor_name,
    invoiceNumber: result.data.invoice_number,
    amount: result.data.total_amount,
    date: result.data.invoice_date,
    dueDate: result.data.due_date,
    status: 'pending',
    confidence: result.confidence_score,
    rawData: result.data,
  };
  
  // Save to Firestore
  await addDoc(collection(db, 'invoices'), invoice);
}
```

### 3. AI Workflow Integration

Combine OCR with existing AI flows:

```typescript
// First extract data with OCR
const ocrResult = await ocrClient.processInvoice(file);

if (ocrResult.success && ocrResult.data) {
  // Then run AI compliance check
  const complianceRules = await automateComplianceRuleSelection({
    documentType: 'invoice',
    vendorName: ocrResult.data.vendor_name || '',
    invoiceData: JSON.stringify(ocrResult.data),
  });
  
  // Combine results
  return {
    extractedData: ocrResult.data,
    complianceRules: complianceRules.applicableRules,
    confidence: ocrResult.confidence_score,
  };
}
```

### 4. Validation & Review

Add validation step for low-confidence extractions:

```typescript
if (result.confidence_score < 0.7) {
  // Show review UI for manual verification
  showReviewDialog(result.data);
} else {
  // Auto-approve high-confidence extractions
  await saveInvoice(result.data);
}
```

## 🎨 UI Components

### Confidence Badge

```tsx
function ConfidenceBadge({ score }: { score: number }) {
  if (score >= 0.8) {
    return <Badge className="bg-green-500">High Confidence</Badge>;
  }
  if (score >= 0.6) {
    return <Badge variant="secondary">Medium Confidence</Badge>;
  }
  return <Badge variant="destructive">Low Confidence - Review Needed</Badge>;
}
```

### Extracted Data Card

```tsx
function ExtractedDataCard({ data }: { data: InvoiceData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Extracted Invoice Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <Label>Vendor</Label>
          <p className="font-medium">{data.vendor_name}</p>
        </div>
        <div>
          <Label>Invoice Number</Label>
          <p className="font-medium">{data.invoice_number}</p>
        </div>
        <div>
          <Label>Total Amount</Label>
          <p className="text-2xl font-bold">${data.total_amount}</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

## 🐛 Troubleshooting

### Backend not starting

```powershell
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process if needed
taskkill /PID <PID> /F

# Restart backend
cd backend
python main.py
```

### CORS errors

Ensure frontend URL is in backend `CORS_ORIGINS`:

```env
# backend/.env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Tesseract not found

```env
# backend/.env
TESSERACT_CMD=C:/Program Files/Tesseract-OCR/tesseract.exe
```

### Low OCR accuracy

1. Use higher resolution images (300+ DPI)
2. Ensure good image quality
3. Try different languages: `ocrClient.processInvoice(file, 'spa')` for Spanish
4. Check preprocessing is enabled

### File upload fails

Check file size (max 10MB) and format (PDF, PNG, JPG, TIFF only).

## 📊 Performance Tips

1. **Image Quality**: Use 300 DPI for best results
2. **File Size**: Compress large PDFs before upload
3. **Batch Processing**: Process multiple invoices together
4. **Caching**: Cache frequently processed documents
5. **Async Processing**: Use background jobs for large batches

## 🚀 Production Deployment

### Backend Deployment (Docker)

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t audit-lens-ocr ./backend
docker run -p 8000:8000 audit-lens-ocr
```

### Environment Variables

Production `.env`:
```env
DEBUG=False
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=https://yourdomain.com
MAX_FILE_SIZE=20971520  # 20MB
```

## 📚 Additional Resources

- **Backend API Docs**: http://localhost:8000/api/docs
- **Backend README**: `backend/README.md`
- **Tesseract Documentation**: https://github.com/tesseract-ocr/tesseract
- **FastAPI Documentation**: https://fastapi.tiangolo.com/

## 🤝 Support

For issues:
1. Check backend logs in `backend/logs/`
2. Test API at http://localhost:8000/api/docs
3. Verify Tesseract installation: `tesseract --version`
4. Check frontend console for errors

## ✅ Testing Checklist

- [ ] Backend server starts successfully
- [ ] API documentation loads at /api/docs
- [ ] Can upload PDF invoice
- [ ] Can upload image (PNG/JPG) invoice
- [ ] Extracted data appears in frontend
- [ ] Confidence scores display correctly
- [ ] Warnings show for missing fields
- [ ] Line items extract properly
- [ ] Can process multiple invoices
- [ ] Error handling works correctly

## 🎉 Next Steps

1. ✅ Backend is set up and running
2. ✅ Frontend components are created
3. 📝 Update invoices page to use OCR component
4. 🧪 Test with sample invoices
5. 🎨 Customize UI to match your design
6. 💾 Integrate with database
7. 🤖 Combine with AI workflows
8. 🚀 Deploy to production

---

**Ready to process invoices with AI!** 🚀
