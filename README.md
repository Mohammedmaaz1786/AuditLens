# AuditLens 🔍

A comprehensive AI-powered invoice auditing and fraud detection system built with Next.js and FastAPI.

## 🎯 Overview

AuditLens is an intelligent document processing platform that combines OCR technology, AI-powered data extraction, and machine learning-based fraud detection to automate invoice analysis and compliance checking.

## ✨ Key Features

### 🤖 AI-Powered OCR System
- **Intelligent Document Processing**: Automatically processes invoices in PDF, PNG, JPG, and TIFF formats
- **Smart Preprocessing**: Adaptive image enhancement based on document quality
  - Clean documents: Minimal processing (denoising + sharpening)
  - Poor quality: Full pipeline (CLAHE, binarization, deskewing, noise reduction)
- **Multi-language Support**: OCR in English, Spanish, and French
- **Gemini AI Integration**: Uses Google's Gemini 2.0 Flash model for intelligent entity extraction

### 🔍 Comprehensive Fraud Detection
Advanced ML-based fraud detection with 5 sophisticated algorithms:

1. **Duplicate Detection**
   - Content hashing for exact duplicates
   - TF-IDF similarity analysis for near-duplicates (>85% threshold)

2. **Amount Anomaly Detection**
   - Statistical Z-score analysis
   - Interquartile Range (IQR) outlier detection
   - Adaptive thresholds based on historical data

3. **Vendor Risk Assessment**
   - Historical transaction analysis
   - Risk scoring based on patterns
   - New vendor flagging

4. **Pattern Detection**
   - Round number detection (suspicious patterns)
   - Sequential invoice number validation
   - Temporal pattern analysis

5. **Line Item Validation**
   - Mathematical consistency checks
   - Unit price anomaly detection
   - Cross-validation of totals

### 📊 Modern Frontend Dashboard
- **Next.js 15.3.3**: Latest App Router with React Server Components
- **React 19**: Modern UI with client-side interactivity
- **Radix UI Components**: Accessible, production-ready components
- **TanStack Table**: Powerful data tables with sorting, filtering, and pagination
- **Tailwind CSS**: Beautiful, responsive design

## 🏗️ Architecture

```
AuditLens/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── services/
│   │   │   ├── document_processor.py      # Main OCR orchestrator
│   │   │   ├── ai_extractor.py           # Gemini AI extraction
│   │   │   ├── fraud_detector.py         # ML fraud detection
│   │   │   ├── image_preprocessor.py     # Smart preprocessing
│   │   │   └── entity_extractor.py       # Regex fallback
│   │   ├── models/
│   │   │   └── schemas.py                # Pydantic models
│   │   └── config.py                     # Configuration
│   ├── main.py                           # FastAPI application
│   ├── requirements.txt
│   └── .env
├── src/                        # Next.js frontend
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── dashboard/                # Main dashboard
│   │   │   ├── invoices/                 # Invoice management
│   │   │   ├── vendors/                  # Vendor tracking
│   │   │   ├── reports/                  # Reporting & analytics
│   │   │   ├── audit-trail/              # Audit logs
│   │   │   ├── security/                 # Security settings
│   │   │   └── settings/                 # App settings
│   │   └── layout.tsx
│   ├── components/
│   │   ├── invoice-upload-ocr.tsx        # OCR upload component
│   │   ├── data-table.tsx                # Reusable data table
│   │   └── ui/                           # UI components
│   └── lib/
│       └── ocr-client.ts                 # TypeScript API client
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

#### System Requirements
- **Node.js**: 18.x or higher
- **Python**: 3.9 or higher
- **Tesseract OCR**: 5.x (for OCR processing)
- **Poppler**: Latest version (for PDF processing)

#### Installation Steps

1. **Install Tesseract OCR**
   - Windows: Download from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)
   - Install to: `C:\Program Files\Tesseract-OCR`
   - Add to PATH or configure in `.env`

2. **Install Poppler**
   - Windows: Download from [GitHub](https://github.com/oschwartz10612/poppler-windows/releases)
   - Extract to: `C:\Program Files\poppler-25.07.0`
   - Add `bin` folder to PATH or configure in `.env`

### Backend Setup

1. **Navigate to backend directory**
   ```powershell
   cd "C:\Users\maazk\Audit Lens\AuditLens\backend"
   ```

2. **Create virtual environment**
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. **Install dependencies**
   ```powershell
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   
   Create `backend/.env`:
   ```env
   # Gemini AI Configuration
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # OCR Configuration
   TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
   POPPLER_PATH=C:\Program Files\poppler-25.07.0\Library\bin
   
   # CORS Settings (JSON array format)
   CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
   
   # Server Configuration
   HOST=0.0.0.0
   PORT=8000
   DEBUG=True
   ```

5. **Run the backend server**
   ```powershell
   python main.py
   ```
   
   Backend will be available at: `http://localhost:8000`

### Frontend Setup

1. **Navigate to project root**
   ```powershell
   cd "C:\Users\maazk\Audit Lens\AuditLens"
   ```

2. **Install dependencies**
   ```powershell
   npm install
   ```

3. **Configure environment variables**
   
   Create `.env.local`:
   ```env
   NEXT_PUBLIC_OCR_API_URL=http://localhost:8000
   ```

4. **Run the development server**
   ```powershell
   npm run dev
   ```
   
   Frontend will be available at: `http://localhost:3000`

## 📚 API Documentation

### Endpoints

#### `POST /api/process-invoice`
Process a single invoice document.

**Request:**
- `file`: Uploaded file (PDF, PNG, JPG, TIFF)
- Max size: 10MB

**Response:**
```json
{
  "success": true,
  "data": {
    "invoice_number": "INV-12345",
    "vendor_name": "Acme Corp",
    "total_amount": 1564.00,
    "invoice_date": "2024-01-15",
    "due_date": "2024-02-15",
    "line_items": [...],
    "fraud_analysis": {
      "risk_level": "LOW",
      "overall_score": 15.5,
      "detections": [...],
      "warnings": [...]
    }
  },
  "confidence": 0.89
}
```

#### `POST /api/batch-process`
Process multiple invoices in batch.

#### `GET /api/health`
Health check endpoint.

## 🔧 Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **Pytesseract 0.3.13**: OCR engine
- **OpenCV 4.10.0.84**: Image preprocessing
- **pdf2image 1.17.0**: PDF conversion
- **Google Generative AI 0.8.3**: Gemini 2.0 Flash
- **scikit-learn 1.6.1**: Machine learning algorithms
- **pandas 2.2.3**: Data manipulation
- **Pydantic**: Data validation

### Frontend
- **Next.js 15.3.3**: React framework
- **React 19.0.0**: UI library
- **TypeScript 5**: Type safety
- **Tailwind CSS 3.4.1**: Styling
- **Radix UI**: Component primitives
- **TanStack Table**: Data tables
- **Genkit AI 1.21.0**: AI workflows

## 🎨 Features in Detail

### OCR Processing Pipeline

1. **Document Upload**: Drag-and-drop or click to upload
2. **Format Detection**: Automatic file type recognition
3. **Image Preprocessing**:
   - Quality assessment
   - Adaptive enhancement
   - Noise reduction
   - Deskewing
4. **OCR Extraction**: Multi-pass with PSM modes (1, 3, 6)
5. **AI Enhancement**: Gemini AI structures the data
6. **Fraud Analysis**: ML algorithms detect anomalies
7. **Result Display**: Confidence scores and extracted data

### Fraud Detection Scoring

- **CRITICAL** (>70): Immediate attention required
- **HIGH** (50-70): Significant risk detected
- **MEDIUM** (30-50): Moderate concerns
- **LOW** (<30): Minimal risk

## 📖 Documentation

- **[OCR_INTEGRATION_GUIDE.md](./OCR_INTEGRATION_GUIDE.md)**: Complete OCR setup and usage
- **[FRAUD_DETECTION_GUIDE.md](./FRAUD_DETECTION_GUIDE.md)**: Fraud detection algorithms and configuration
- **[backend/AI_EXTRACTION_SETUP.md](./backend/AI_EXTRACTION_SETUP.md)**: AI extraction configuration
- **[backend/README.md](./backend/README.md)**: Backend-specific documentation

## 🔐 Security Considerations

- API keys stored in environment variables
- File size limits (10MB) to prevent abuse
- CORS configured for allowed origins
- Input validation with Pydantic
- Secure file handling

## 🚧 Development Status

### ✅ Completed
- [x] Next.js frontend with App Router
- [x] FastAPI backend with OCR
- [x] Gemini AI integration
- [x] Comprehensive fraud detection (5 algorithms)
- [x] Smart image preprocessing
- [x] TypeScript API client
- [x] React upload component
- [x] Complete documentation

### 🔨 In Progress
- [ ] Frontend fraud detection UI display
- [ ] Historical data integration
- [ ] ML model training pipeline

### 📋 Planned
- [ ] Fraud detection dashboard
- [ ] Alert system for high-risk invoices
- [ ] Batch processing UI
- [ ] Export functionality
- [ ] User authentication
- [ ] Role-based access control

## 🤝 Contributing

This is a private project. For questions or issues, please contact the development team.

## 📝 License

Proprietary - All rights reserved

## 👥 Team

- **Developer**: Mohammed Maaz
- **Project**: AuditLens
- **Repository**: Mohammedmaaz1786/AuditLens

## 📞 Support

For technical support or questions:
- Check the documentation files in the project
- Review the error logs in `backend/logs/`
- Ensure all dependencies are installed correctly

---

**Built with ❤️ using Next.js, FastAPI, and Google Gemini AI**
