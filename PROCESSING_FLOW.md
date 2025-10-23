# AuditLens - Complete Invoice Processing Flow

> **Technical Reference Document**  
> This document provides a detailed architecture flow of the entire invoice processing pipeline.

---

## 📊 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (Browser)                              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Next.js 15 Frontend (Port 3000/3001)              │  │
│  │  • React 19 Components                                               │  │
│  │  • Invoice Upload UI                                                 │  │
│  │  • Dashboard & Data Tables                                           │  │
│  │  • Fraud Analysis Display                                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ HTTP/HTTPS REST API
                                │ (JSON Payloads)
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER (Node.js)                            │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │              Express.js Backend API (Port 5000)                      │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │ Authentication & Authorization                              │   │  │
│  │  │  • JWT Token Validation                                     │   │  │
│  │  │  • Role-Based Access Control (RBAC)                         │   │  │
│  │  │  • Session Management                                       │   │  │
│  │  └─────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │ Business Logic Layer                                        │   │  │
│  │  │  • Invoice CRUD Operations                                  │   │  │
│  │  │  • Vendor Management                                        │   │  │
│  │  │  • Data Validation                                          │   │  │
│  │  │  • Workflow Orchestration                                   │   │  │
│  │  └─────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │ Security Middleware                                         │   │  │
│  │  │  • Rate Limiting (100 req/min)                              │   │  │
│  │  │  • Input Sanitization                                       │   │  │
│  │  │  • XSS Protection                                           │   │  │
│  │  │  • CSRF Protection                                          │   │  │
│  │  │  • Security Headers (HSTS, CSP)                             │   │  │
│  │  └─────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐   │  │
│  │  │ Audit Service                                               │   │  │
│  │  │  • Blockchain-like Hash Chaining                            │   │  │
│  │  │  • Immutable Audit Logs                                     │   │  │
│  │  │  • HMAC Signatures (SHA-256)                                │   │  │
│  │  │  • Digital Signatures                                       │   │  │
│  │  └─────────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────┬──────────────────────────────┘
                            │                  │
                            │                  │ HTTP Proxy
                            ▼                  ▼
           ┌────────────────────────┐  ┌──────────────────────────────────┐
           │   MongoDB Database     │  │  Python FastAPI OCR Service      │
           │     (Port 27017)       │  │       (Port 8000)                │
           └────────────────────────┘  └──────────────────────────────────┘
```

---

## 🔄 Complete Invoice Processing Pipeline

### **Phase 1: Document Upload & Validation**

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: User Action                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
User uploads invoice file (PDF/PNG/JPG/TIFF)
  • File size limit: 10MB
  • Accepted formats: .pdf, .png, .jpg, .jpeg, .tiff
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Frontend Validation (Next.js)                          │
│ Location: src/components/invoice-upload.tsx                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Check file properties:
  • File type validation
  • File size check
  • MIME type verification
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: API Request                                             │
│ Method: POST /api/v1/invoices                                   │
│ Content-Type: multipart/form-data                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
FormData payload:
  • file: <binary data>
  • metadata: { uploadedBy, department }
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Backend Receives Request                                │
│ Location: backend-api/src/routes/invoiceRoutes.js              │
└─────────────────────────────────────────────────────────────────┘
```

---

### **Phase 2: Authentication & Authorization**

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: JWT Authentication                                      │
│ Location: backend-api/src/middleware/auth.js                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Extract JWT token from headers:
  Authorization: Bearer <token>
                              ↓
Verify token signature:
  • Decode JWT
  • Verify with JWT_SECRET
  • Check expiration (7 days)
  • Extract user data (id, role, email)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: Role-Based Access Control                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Check user permissions:
  • Admin: Full access
  • Auditor: Read/Write invoices
  • Viewer: Read-only access
                              ↓
If unauthorized → Return 401/403 error
If authorized → Continue to next step
```

---

### **Phase 3: File Processing & Storage**

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 7: File Upload Handling                                    │
│ Location: backend-api/src/middleware/upload.js                 │
│ Library: Multer                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Multer configuration:
  • Destination: backend-api/uploads/
  • Filename: timestamp_originalname
  • Storage: Disk storage
                              ↓
Save file to disk:
  Path: /uploads/1729684500000_invoice.pdf
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 8: Forward to OCR Service                                  │
│ Location: backend-api/src/controllers/invoiceController.js     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
HTTP POST to OCR service:
  URL: http://localhost:8000/api/process-invoice
  Method: POST
  Body: FormData with file
```

---

### **Phase 4: OCR Processing (Python FastAPI)**

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 9: OCR Service Receives File                               │
│ Location: ocr-service/main.py                                   │
│ Endpoint: POST /api/process-invoice                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 10: Document Preprocessing                                 │
│ Location: ocr-service/app/services/document_processor.py       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
PDF Handling (if PDF):
  • Use pdf2image (Poppler)
  • Convert each page to PIL Image
  • DPI: 300 for high quality
                              ↓
Image Preprocessing Pipeline:
  ┌──────────────────────────────────────┐
  │ 1. Grayscale Conversion              │
  │    cv2.cvtColor(GRAY)                │
  └──────────────────────────────────────┘
                ↓
  ┌──────────────────────────────────────┐
  │ 2. Noise Reduction                   │
  │    cv2.fastNlMeansDenoising()        │
  │    h=10, templateWindowSize=7        │
  └──────────────────────────────────────┘
                ↓
  ┌──────────────────────────────────────┐
  │ 3. Contrast Enhancement              │
  │    cv2.equalizeHist() - CLAHE        │
  │    clipLimit=2.0, tileGridSize=8x8   │
  └──────────────────────────────────────┘
                ↓
  ┌──────────────────────────────────────┐
  │ 4. Deskewing (if needed)             │
  │    Detect text angle                 │
  │    Rotate image to correct alignment │
  └──────────────────────────────────────┘
                ↓
  ┌──────────────────────────────────────┐
  │ 5. Binarization                      │
  │    cv2.threshold() - Otsu's method   │
  │    Black/White conversion            │
  └──────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 11: Tesseract OCR Extraction                               │
│ Library: pytesseract                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
OCR Configuration:
  • Language: eng (English)
  • PSM: 6 (Assume uniform block of text)
  • OEM: 3 (LSTM neural network)
                              ↓
pytesseract.image_to_string():
  • Extract raw text from image
  • Get confidence scores
                              ↓
pytesseract.image_to_data():
  • Extract word-level data
  • Bounding boxes
  • Confidence per word
                              ↓
Confidence check:
  • Average confidence > 60% → Continue
  • Average confidence < 60% → Flag low quality
                              ↓
Raw OCR Text Output:
  """
  INVOICE #12345
  Date: 2024-10-15
  Vendor: ABC Corp
  Total: $1,250.00
  ...
  """
```

---

### **Phase 5: AI-Powered Data Extraction (Gemini)**

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 12: Gemini AI Extraction                                   │
│ Location: ocr-service/app/services/ai_extractor.py             │
│ Model: Google Gemini 2.0 Flash                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Prepare prompt for Gemini:
  """
  Extract structured data from this invoice text:
  
  {raw_ocr_text}
  
  Return JSON with:
  - invoice_number
  - invoice_date
  - due_date
  - vendor_name
  - vendor_address
  - customer_name
  - customer_address
  - line_items: [{description, quantity, unit_price, total}]
  - subtotal
  - tax_amount
  - tax_rate
  - total_amount
  - currency
  - payment_terms
  - notes
  """
                              ↓
Send to Gemini API:
  POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
  Headers: 
    - x-goog-api-key: {GEMINI_API_KEY}
  Body: {prompt with raw text}
                              ↓
Gemini Processing:
  • Natural Language Understanding
  • Entity Recognition
  • Contextual extraction
  • Format standardization
                              ↓
Gemini Response (JSON):
{
  "invoice_number": "INV-12345",
  "invoice_date": "2024-10-15",
  "due_date": "2024-11-15",
  "vendor_name": "ABC Corporation",
  "vendor_address": "123 Main St, City, State 12345",
  "line_items": [
    {
      "description": "Professional Services",
      "quantity": 10,
      "unit_price": 125.00,
      "total": 1250.00
    }
  ],
  "subtotal": 1250.00,
  "tax_amount": 0.00,
  "tax_rate": 0.0,
  "total_amount": 1250.00,
  "currency": "USD",
  "payment_terms": "Net 30",
  "notes": ""
}
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 13: Data Validation & Cleaning                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Validate extracted data:
  • Check required fields
  • Validate date formats
  • Verify number formats
  • Calculate line item totals
  • Match subtotal + tax = total
                              ↓
Data cleaning:
  • Trim whitespace
  • Standardize formats
  • Convert data types
  • Handle missing values
```

---

### **Phase 6: Fraud Detection (ML Algorithms)**

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 14: Multi-Algorithm Fraud Detection                        │
│ Location: ocr-service/app/services/fraud_detector.py           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Algorithm 1: Duplicate Detection                                │
│ Method: SHA-256 Hashing + TF-IDF Similarity                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Step 1: Content Hashing
  • Concatenate: invoice_number + vendor + date + total
  • Generate SHA-256 hash
  • Check database for matching hash
                              ↓
Step 2: TF-IDF Similarity (if hash not found)
  • Vectorize invoice text using TF-IDF
  • Compare with existing invoices
  • Calculate cosine similarity
  • Threshold: 85% similarity = duplicate
                              ↓
Result: duplicate_risk_score (0.0 - 1.0)
  • > 0.85 → HIGH risk (likely duplicate)
  • 0.60 - 0.85 → MEDIUM risk
  • < 0.60 → LOW risk
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Algorithm 2: Amount Anomaly Detection                           │
│ Methods: Z-Score + IQR Analysis                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Step 1: Z-Score Analysis
  • Get historical invoice amounts
  • Calculate mean (μ) and std dev (σ)
  • Z-score = (amount - μ) / σ
  • |Z| > 3.0 = statistical outlier
                              ↓
Step 2: IQR (Interquartile Range)
  • Q1 = 25th percentile
  • Q3 = 75th percentile
  • IQR = Q3 - Q1
  • Outlier if: amount < Q1 - 1.5*IQR OR amount > Q3 + 1.5*IQR
                              ↓
Result: amount_anomaly_score (0.0 - 1.0)
  • Z-score > 3.0 → HIGH risk (0.9+)
  • Outside IQR → MEDIUM-HIGH risk (0.6-0.9)
  • Normal range → LOW risk (< 0.6)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Algorithm 3: Vendor Risk Assessment                             │
│ Method: Historical Pattern Analysis                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Check vendor history:
  • New vendor (< 3 invoices) → +0.3 risk
  • High amount for vendor → +0.2 risk
  • Unusual frequency → +0.2 risk
  • Payment delays → +0.15 risk
  • Previous fraud flags → +0.15 risk
                              ↓
Result: vendor_risk_score (0.0 - 1.0)
  • > 0.7 → HIGH risk vendor
  • 0.4 - 0.7 → MEDIUM risk
  • < 0.4 → LOW risk
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Algorithm 4: Pattern Detection                                  │
│ Methods: Statistical Pattern Matching                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Check for suspicious patterns:
  1. Round Number Detection
     • Total is round number (e.g., $1000.00) → +0.2 risk
     • Multiple round numbers → +0.3 risk
  
  2. Sequential Invoice Numbers
     • Check if invoice numbers are sequential
     • Compare with submission timestamps
     • Suspicious if sequential but different dates
  
  3. Weekend/Holiday Submissions
     • Check if submitted on unusual dates
     • Weekend submission → +0.1 risk
  
  4. Rapid Submission
     • Multiple invoices from same vendor in short time
     • < 1 hour between submissions → +0.2 risk
                              ↓
Result: pattern_risk_score (0.0 - 1.0)
  • > 0.6 → HIGH risk (suspicious patterns)
  • 0.3 - 0.6 → MEDIUM risk
  • < 0.3 → LOW risk
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Algorithm 5: Line Item Validation                               │
│ Method: Mathematical Consistency Check                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
For each line item:
  1. Calculate expected total
     expected_total = quantity × unit_price
  
  2. Compare with stated total
     difference = |expected_total - stated_total|
  
  3. Check tolerance
     tolerance = ±0.01 (1 cent)
  
  4. Flag if difference > tolerance
                              ↓
Validate invoice totals:
  1. Sum all line items = subtotal
  2. subtotal + tax = total_amount
  3. Check tax calculation: subtotal × tax_rate = tax_amount
                              ↓
Result: validation_risk_score (0.0 - 1.0)
  • Math errors found → HIGH risk (0.9+)
  • Minor discrepancies → MEDIUM risk (0.5-0.9)
  • All correct → LOW risk (0.0)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 15: Aggregate Fraud Score                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Weighted average calculation:
  final_fraud_score = (
    duplicate_score × 0.30 +      # 30% weight
    amount_anomaly × 0.25 +        # 25% weight
    vendor_risk × 0.20 +           # 20% weight
    pattern_risk × 0.15 +          # 15% weight
    validation_risk × 0.10         # 10% weight
  )
                              ↓
Determine risk level:
  • score > 0.7 → "HIGH" risk
  • 0.4 - 0.7 → "MEDIUM" risk
  • < 0.4 → "LOW" risk
                              ↓
Fraud Analysis Result:
{
  "overall_risk_score": 0.32,
  "risk_level": "LOW",
  "flags": [],
  "checks": {
    "duplicate_detection": {
      "score": 0.15,
      "status": "PASS"
    },
    "amount_anomaly": {
      "score": 0.25,
      "status": "PASS"
    },
    "vendor_risk": {
      "score": 0.40,
      "status": "MEDIUM"
    },
    "pattern_detection": {
      "score": 0.20,
      "status": "PASS"
    },
    "line_item_validation": {
      "score": 0.05,
      "status": "PASS"
    }
  }
}
```

---

### **Phase 7: Compliance & Security Validation**

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 16: Compliance Monitoring                                  │
│ Location: ocr-service/app/services/compliance_security.py      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ SOX Compliance (Sarbanes-Oxley Act)                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Checks performed:
  1. Audit Trail Creation
     • Create immutable audit entry
     • Record all actions and timestamps
     • Include user information
  
  2. Segregation of Duties
     • Verify uploader ≠ approver
     • Check role permissions
  
  3. Authorization Workflow
     • Amount > $10,000 → Requires approval
     • Flag for authorization
  
  4. Data Integrity
     • Calculate cryptographic hash
     • Store for tamper detection
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PCI-DSS Compliance (Payment Card Industry)                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Checks performed:
  1. Card Data Detection
     • Scan for credit card numbers (regex)
     • Pattern: \b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b
  
  2. Data Encryption
     • Encrypt sensitive fields using AES-256
     • Use Fernet symmetric encryption
     • Key: ENCRYPTION_MASTER_KEY from .env
  
  3. Card Number Masking
     • Mask: 4532-****-****-9876
     • Show only first 4 and last 4 digits
  
  4. Secure Storage
     • Encrypted fields marked in database
     • Access logging enabled
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ GDPR Compliance (General Data Protection Regulation)           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Checks performed:
  1. PII Detection
     • Email addresses
     • Phone numbers
     • Personal names
     • Addresses
  
  2. Data Anonymization (if flagged)
     • Hash PII fields
     • Use SHA-256 for anonymization
     • Store mapping for recovery (if consented)
  
  3. Consent Tracking
     • Record data processing consent
     • Timestamp consent
     • Purpose of data collection
  
  4. Deletion Capabilities
     • Mark for deletion if requested
     • Soft delete initially (30 days)
     • Hard delete after retention period
                              ↓
Compliance Result:
{
  "sox_compliant": true,
  "pci_dss_compliant": true,
  "gdpr_compliant": true,
  "issues": [],
  "encrypted_fields": ["vendor_bank_account"],
  "pii_detected": ["vendor_email", "customer_email"]
}
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 17: Data Encryption                                        │
│ Algorithm: AES-256 (Fernet)                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Encryption process:
  1. Generate Fernet key from ENCRYPTION_MASTER_KEY
     key = Fernet(base64.urlsafe_b64encode(key_bytes))
  
  2. Identify sensitive fields
     • Bank account numbers
     • Credit card info
     • SSN/Tax IDs
     • Personal contact info
  
  3. Encrypt each field
     encrypted = fernet.encrypt(plaintext.encode())
     encrypted_b64 = base64.b64encode(encrypted).decode()
  
  4. Replace plaintext with encrypted data
     invoice_data["vendor_bank_account"] = encrypted_b64
```

---

### **Phase 8: Data Storage & Audit Trail**

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 18: Return to Backend API                                  │
│ OCR Service → Express Backend                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
HTTP Response from OCR service:
{
  "extracted_data": {
    "invoice_number": "INV-12345",
    "vendor": {...},
    "line_items": [...],
    "total_amount": 1250.00
  },
  "fraud_analysis": {
    "risk_score": 0.32,
    "risk_level": "LOW"
  },
  "compliance_check": {
    "sox_compliant": true,
    "pci_dss_compliant": true,
    "gdpr_compliant": true
  },
  "file_path": "/uploads/processed/invoice_12345.pdf"
}
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 19: Create Audit Entry (Backend)                          │
│ Location: backend-api/src/services/auditService.js             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Blockchain-like audit trail creation:
  1. Get previous audit entry
     previousEntry = AuditEntry.findOne().sort({timestamp: -1})
  
  2. Calculate current entry hash
     data_to_hash = JSON.stringify({
       action: "INVOICE_CREATED",
       user_id: user._id,
       resource_id: invoice._id,
       timestamp: new Date(),
       details: invoice_data
     })
     currentHash = crypto.createHash('sha256')
                        .update(data_to_hash)
                        .digest('hex')
  
  3. Link to previous entry
     previousHash = previousEntry ? previousEntry.currentHash : "genesis"
  
  4. Create HMAC signature
     signature = crypto.createHmac('sha256', AUDIT_SECRET)
                      .update(currentHash + previousHash)
                      .digest('hex')
  
  5. Save audit entry
     AuditEntry.create({
       action: "INVOICE_CREATED",
       userId: user._id,
       resourceType: "Invoice",
       resourceId: invoice._id,
       previousHash: previousHash,
       currentHash: currentHash,
       signature: signature,
       timestamp: new Date(),
       metadata: {
         invoice_number: "INV-12345",
         total_amount: 1250.00,
         fraud_risk: "LOW"
       }
     })
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 20: Save to MongoDB                                        │
│ Collections: invoices, vendors, audit_logs                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Transaction starts (ACID compliance)
                              ↓
1. Create/Update Vendor:
   Vendor.findOneAndUpdate(
     { name: vendor_name },
     { 
       $set: vendor_data,
       $inc: { invoiceCount: 1, totalSpent: invoice_amount }
     },
     { upsert: true }
   )
                              ↓
2. Create Invoice:
   Invoice.create({
     invoiceNumber: "INV-12345",
     vendorId: vendor._id,
     customerId: customer._id,
     date: new Date("2024-10-15"),
     dueDate: new Date("2024-11-15"),
     lineItems: [...],
     subtotal: 1250.00,
     taxAmount: 0.00,
     taxRate: 0.0,
     totalAmount: 1250.00,
     currency: "USD",
     status: "pending",
     fraudAnalysis: {
       riskScore: 0.32,
       riskLevel: "LOW",
       checks: {...}
     },
     complianceStatus: {
       sox: true,
       pciDss: true,
       gdpr: true
     },
     uploadedBy: user._id,
     createdAt: new Date(),
     updatedAt: new Date()
   })
                              ↓
Transaction commits
                              ↓
Indexes updated:
  • invoiceNumber (unique)
  • vendorId (indexed)
  • status (indexed)
  • date (indexed)
  • fraudAnalysis.riskLevel (indexed)
```

---

### **Phase 9: Analytics Processing (Optional)**

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 21: Analytics Engine Trigger (Optional)                   │
│ Location: ocr-service/app/services/analytics_engine.py         │
│ Endpoint: POST /api/analytics/dashboard                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Analytics can be triggered:
  • On-demand via API call
  • Scheduled (e.g., nightly batch)
  • Real-time (streaming)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Spending Pattern Analysis                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
1. Load invoice data into pandas DataFrame
   df = pd.DataFrame(invoices)

2. Time series analysis
   • Group by date: df.groupby('date')['total_amount'].sum()
   • Calculate rolling averages (7-day, 30-day)
   • Detect trends (increasing/decreasing/stable)

3. Seasonal decomposition
   • Extract seasonal patterns
   • Identify monthly/quarterly cycles

4. Department breakdown
   • Group by department
   • Calculate spending percentages
   • Identify top spenders

5. Category insights
   • Categorize by expense type
   • Calculate distribution
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Vendor Performance Metrics                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
1. Aggregate vendor data
   • Total spent per vendor
   • Invoice count
   • Average invoice amount

2. Payment compliance
   • On-time payment rate
   • Average payment delay
   • Compliance score

3. Invoice accuracy
   • Error rate
   • Correction frequency
   • Quality score

4. Risk assessment
   • Historical fraud flags
   • Reliability score
   • Vendor risk level

5. Optimization potential
   • Negotiation opportunities
   • Consolidation possibilities
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Process Optimization Analysis                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
1. Processing time tracking
   • Average time per invoice
   • Median processing time
   • Bottleneck identification

2. Error rate monitoring
   • OCR error rate
   • Validation error rate
   • Manual correction rate

3. Automation score
   • Percentage of automated processing
   • Manual intervention rate
   • Automation opportunities

4. Department efficiency
   • Processing time by department
   • Error rates by department
   • Improvement recommendations
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ AI Recommendation Engine                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Generate recommendations based on:

1. Vendor Negotiation Opportunities
   • High-volume vendors (>$50k/year)
   • Frequent small invoices (consolidation)
   • Price increases detected
   • Alternative vendor suggestions

2. Cost Savings Identification
   • Duplicate service detection
   • Overlapping vendor services
   • Volume discount opportunities
   • Early payment discount analysis

3. Process Improvements
   • Workflow bottlenecks
   • Automation opportunities
   • Error reduction strategies
   • Training recommendations

4. Risk Mitigation
   • High-risk vendor diversification
   • Fraud prevention measures
   • Compliance improvements
   • Security enhancements

5. Compliance Optimization
   • Audit trail improvements
   • Policy updates needed
   • Training requirements
                              ↓
Prioritize recommendations:
  • Priority: HIGH / MEDIUM / LOW
  • Potential savings: $X,XXX
  • Implementation effort: Easy / Medium / Complex
  • Expected impact: High / Medium / Low
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Visualization Generation                                        │
│ Location: ocr-service/app/services/visualization_engine.py     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Generate charts using matplotlib/seaborn:

1. Spending Trend Chart
   • Line chart with area fill
   • X-axis: Time periods
   • Y-axis: Amount ($)

2. Vendor Performance Chart
   • Horizontal bar chart
   • Color-coded by risk level
   • Shows total spent per vendor

3. Category Distribution Chart
   • Pie chart
   • Expense categories
   • Percentages displayed

4. Seasonal Heatmap
   • 12-month grid
   • Color intensity = spending
   • YlOrRd colormap

5. Risk Distribution Chart
   • Bar chart by risk level
   • Shows count per level
   • Color: Red (HIGH), Yellow (MEDIUM), Green (LOW)

6. Processing Metrics Dashboard
   • 2x2 grid of gauges
   • Metrics: Processing time, Accuracy, Automation, Efficiency
   • Thresholds displayed
                              ↓
Convert charts to base64 PNG:
  • fig.savefig(buffer, format='png')
  • base64_image = base64.b64encode(buffer.getvalue()).decode()
  • Return: "data:image/png;base64,{base64_image}"
```

---

### **Phase 10: Response & Display**

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 22: Backend Returns Response                               │
│ Express Backend → Next.js Frontend                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
HTTP 201 Created Response:
{
  "success": true,
  "message": "Invoice processed successfully",
  "invoice": {
    "_id": "67890abcdef",
    "invoiceNumber": "INV-12345",
    "vendor": {
      "_id": "vendor123",
      "name": "ABC Corporation",
      "riskLevel": "LOW"
    },
    "totalAmount": 1250.00,
    "status": "pending",
    "fraudAnalysis": {
      "riskScore": 0.32,
      "riskLevel": "LOW",
      "flags": [],
      "checks": {...}
    },
    "complianceStatus": {
      "sox": true,
      "pciDss": true,
      "gdpr": true
    },
    "createdAt": "2024-10-23T10:30:00.000Z"
  },
  "auditTrailId": "audit_xyz789"
}
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 23: Frontend Display                                       │
│ Location: src/components/invoice-upload.tsx                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Preview Dialog (before final save):
  ┌──────────────────────────────────────────────────────┐
  │ Invoice Preview                                       │
  ├──────────────────────────────────────────────────────┤
  │                                                       │
  │ Invoice #: INV-12345                                 │
  │ Vendor: ABC Corporation                              │
  │ Date: 2024-10-15                                     │
  │ Total: $1,250.00                                     │
  │                                                       │
  │ Line Items:                                          │
  │ ┌─────────────────────────────────────────────────┐ │
  │ │ Description          Qty    Price    Total      │ │
  │ │ Professional Svc     10     $125.00  $1,250.00 │ │
  │ └─────────────────────────────────────────────────┘ │
  │                                                       │
  │ Fraud Analysis:                                      │
  │ Risk Level: ● LOW (Score: 0.32)                     │
  │                                                       │
  │ ✓ Duplicate Check: PASS                             │
  │ ✓ Amount Check: PASS                                │
  │ ⚠ Vendor Risk: MEDIUM                               │
  │ ✓ Pattern Check: PASS                               │
  │ ✓ Math Validation: PASS                             │
  │                                                       │
  │ Compliance:                                          │
  │ ✓ SOX Compliant                                     │
  │ ✓ PCI-DSS Compliant                                 │
  │ ✓ GDPR Compliant                                    │
  │                                                       │
  │ [Approve] [Edit] [Reject]                           │
  └──────────────────────────────────────────────────────┘
                              ↓
User actions:
  • Approve → Status = "approved"
  • Edit → Open edit form
  • Reject → Status = "rejected", add reason
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 24: Dashboard Update                                       │
│ Location: src/app/(app)/dashboard/page.tsx                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
Real-time dashboard refresh:
  • Update invoice count
  • Refresh recent invoices table
  • Update fraud alert count
  • Recalculate statistics
                              ↓
Dashboard displays:
  ┌──────────────────────────────────────────────────────┐
  │ AuditLens Dashboard                                   │
  ├──────────────────────────────────────────────────────┤
  │                                                       │
  │ [Total Invoices: 1,234] [Total Amount: $1.2M]       │
  │ [Pending: 45] [High Risk: 12]                       │
  │                                                       │
  │ Recent Invoices:                                     │
  │ ┌─────────────────────────────────────────────────┐ │
  │ │ ID       Vendor      Amount    Risk    Status   │ │
  │ │ INV-345  ABC Corp    $1,250   ● LOW    Pending │ │
  │ │ INV-344  XYZ Inc     $3,400   ● MED    Pending │ │
  │ │ INV-343  123 LLC     $8,900   ● HIGH   Flagged │ │
  │ └─────────────────────────────────────────────────┘ │
  │                                                       │
  │ Fraud Alerts:                                        │
  │ • 3 high-risk invoices require review               │
  │ • 1 duplicate detected                              │
  │                                                       │
  │ [View All Invoices] [Generate Report]               │
  └──────────────────────────────────────────────────────┘
```

---

## 🔐 Security Flow

### Authentication Flow
```
1. User Login
   POST /api/v1/auth/login
   { email, password }
        ↓
2. Verify Credentials
   • Hash password with bcrypt
   • Compare with stored hash
        ↓
3. Generate JWT Token
   payload = { userId, email, role }
   token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
        ↓
4. Return Token
   { token, user: { id, email, role } }
        ↓
5. Client Stores Token
   localStorage.setItem('token', token)
        ↓
6. Future Requests
   Headers: { Authorization: 'Bearer ' + token }
        ↓
7. Token Verification
   decoded = jwt.verify(token, JWT_SECRET)
   req.user = decoded
```

### Encryption Flow
```
1. Identify Sensitive Data
   • Credit card numbers
   • Bank account numbers
   • SSN/Tax IDs
        ↓
2. Generate Encryption Key
   key = Fernet(ENCRYPTION_MASTER_KEY)
        ↓
3. Encrypt Data
   encrypted = key.encrypt(plaintext.encode())
        ↓
4. Store Encrypted Data
   Save base64-encoded encrypted bytes
        ↓
5. Decrypt When Needed
   decrypted = key.decrypt(encrypted_bytes)
   plaintext = decrypted.decode()
```

### Audit Trail Verification
```
1. Retrieve Audit Chain
   entries = AuditEntry.find().sort({ timestamp: 1 })
        ↓
2. Verify Each Link
   for each entry:
     • Calculate expected hash
     • Compare with stored currentHash
     • Verify previousHash links correctly
     • Validate HMAC signature
        ↓
3. Detect Tampering
   If any hash mismatch → Chain broken → Tampering detected
        ↓
4. Report Integrity Status
   { 
     intact: boolean,
     brokenAt: entry_id | null,
     verified: number_of_entries
   }
```

---

## 📊 Data Flow Summary

```
Invoice File
    ↓
Frontend Upload
    ↓
Backend API (JWT Auth)
    ↓
File Storage
    ↓
OCR Service
    ├→ Tesseract OCR
    ├→ Gemini AI Extraction
    ├→ Fraud Detection (5 algorithms)
    ├→ Compliance Check (SOX/PCI-DSS/GDPR)
    └→ Data Encryption
    ↓
Backend API
    ├→ Create Audit Entry (blockchain-like)
    ├→ Save to MongoDB
    └→ Update Statistics
    ↓
Response to Frontend
    ↓
Preview Dialog
    ↓
User Approval
    ↓
Dashboard Display
    ↓
[Optional] Analytics Processing
    ├→ Spending Patterns
    ├→ Vendor Performance
    ├→ Process Optimization
    ├→ AI Recommendations
    └→ Visualizations
```

---

## 🚀 Performance Metrics

| Stage | Average Time | Notes |
|-------|-------------|-------|
| File Upload | < 1 second | Depends on file size & network |
| OCR Processing | 5-20 seconds | Varies with document quality & size |
| Gemini AI Extraction | 2-5 seconds | API latency dependent |
| Fraud Detection | < 1 second | All 5 algorithms parallel |
| Compliance Check | < 500ms | Fast validation rules |
| Data Storage | < 100ms | MongoDB indexed queries |
| Audit Entry Creation | < 200ms | Hash calculation overhead |
| Total End-to-End | 10-30 seconds | Typical invoice processing |
| Analytics (on-demand) | 2-10 seconds | Depends on data volume |
| Dashboard Refresh | < 100ms | Optimized queries with indexes |

---

## 🔄 Error Handling & Recovery

### OCR Processing Errors
```
Low Confidence (< 60%)
    ↓
Retry with enhanced preprocessing
    ↓
Still low? → Flag for manual review
    ↓
Store raw OCR text for reference
```

### Gemini API Errors
```
Rate Limit / Timeout
    ↓
Exponential backoff retry (3 attempts)
    ↓
Fallback to regex extraction
    ↓
Flag as "needs review"
```

### Fraud Detection Errors
```
Algorithm failure (e.g., insufficient historical data)
    ↓
Skip failed algorithm
    ↓
Calculate score from remaining algorithms
    ↓
Log warning for investigation
```

### Database Errors
```
Connection failure
    ↓
Retry with backoff (3 attempts)
    ↓
Queue for later processing
    ↓
Notify admin if critical
```

---

## 📈 Scalability Considerations

### Horizontal Scaling
- **Frontend**: Deploy multiple Next.js instances behind load balancer
- **Backend API**: Stateless Express servers, scale with container orchestration
- **OCR Service**: Python workers in queue-based architecture
- **Database**: MongoDB replica sets with sharding

### Caching Strategy
- **Redis Cache**: 
  - Vendor data (1 hour TTL)
  - User sessions (7 days TTL)
  - Analytics results (30 minutes TTL)
  
### Queue System (Future)
- **RabbitMQ/Redis Queue**: 
  - Async OCR processing
  - Batch analytics jobs
  - Email notifications
  
### CDN Integration
- **Static Assets**: Serve via CloudFront/Cloudflare
- **Processed Documents**: S3 + CloudFront

---

**Document Version**: 1.0  
**Last Updated**: October 23, 2025  
**Maintained By**: Mohammed Maaz (@Mohammedmaaz1786)
