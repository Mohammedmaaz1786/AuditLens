# OCR Document Processing Backend

Comprehensive OCR and document processing system for invoice analysis with FastAPI.

## Features

✅ **Multi-format Support**: PDF, PNG, JPG, TIFF  
✅ **Intelligent OCR**: Pytesseract with image preprocessing  
✅ **Entity Extraction**: Vendor name, amounts, dates, invoice numbers, line items  
✅ **Multi-language Support**: English, Spanish, French  
✅ **Confidence Scoring**: Quality metrics for extracted data  
✅ **Image Preprocessing**: OpenCV-based enhancement for better accuracy  
✅ **Batch Processing**: Handle multiple invoices simultaneously  
✅ **RESTful API**: FastAPI with automatic documentation  

## Prerequisites

### 1. Install Tesseract OCR

**Windows:**
```powershell
# Download and install from: https://github.com/UB-Mannheim/tesseract/wiki
# Default path: C:\Program Files\Tesseract-OCR\tesseract.exe
```

**Mac:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr
sudo apt-get install tesseract-ocr-spa tesseract-ocr-fra  # Additional languages
```

### 2. Install Poppler (for PDF processing)

**Windows:**
```powershell
# Download from: https://github.com/oschwartz10612/poppler-windows/releases
# Extract and add bin/ folder to PATH
```

**Mac:**
```bash
brew install poppler
```

**Linux:**
```bash
sudo apt-get install poppler-utils
```

### 3. Python 3.9+

```bash
python --version  # Should be 3.9 or higher
```

## Installation

### Step 1: Navigate to backend directory

```powershell
cd backend
```

### Step 2: Create virtual environment

```powershell
# Windows
python -m venv venv
.\venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install dependencies

```powershell
pip install -r requirements.txt
```

### Step 4: Download spaCy language model (optional, for enhanced NER)

```powershell
python -m spacy download en_core_web_sm
```

### Step 5: Configure environment

Edit `.env` file and set Tesseract path if needed:

```env
# Windows example
TESSERACT_CMD=C:/Program Files/Tesseract-OCR/tesseract.exe

# Mac/Linux (usually auto-detected)
# TESSERACT_CMD=/usr/bin/tesseract
```

## Running the Server

```powershell
# Development mode (with auto-reload)
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server will start at: **http://localhost:8000**

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

## API Endpoints

### Health Check
```http
GET /api/health
```

### Process Single Invoice
```http
POST /api/process-invoice
Content-Type: multipart/form-data

Parameters:
- file: Invoice file (PDF, PNG, JPG, TIFF)
- language: OCR language (eng, spa, fra) - optional, default: eng
```

### Batch Process Invoices
```http
POST /api/batch-process
Content-Type: multipart/form-data

Parameters:
- files: Multiple invoice files
- language: OCR language - optional, default: eng
```

## Response Format

```json
{
  "success": true,
  "filename": "invoice001.pdf",
  "data": {
    "vendor_name": "Acme Corporation",
    "invoice_number": "INV-2024-001",
    "invoice_date": "2024-01-15",
    "due_date": "2024-02-15",
    "subtotal": 1000.00,
    "tax": 80.00,
    "total_amount": 1080.00,
    "currency": "USD",
    "line_items": [
      {
        "description": "Professional Services",
        "quantity": 10,
        "unit_price": 100.00,
        "amount": 1000.00,
        "confidence": 0.85
      }
    ],
    "confidence_scores": {
      "invoice_number": 0.95,
      "total_amount": 0.92,
      "vendor_name": 0.88
    }
  },
  "confidence_score": 0.89,
  "processing_time": 2.45,
  "warnings": []
}
```

## Testing

### Using cURL

```bash
curl -X POST "http://localhost:8000/api/process-invoice" \
  -F "file=@invoice.pdf" \
  -F "language=eng"
```

### Using Python

```python
import requests

with open('invoice.pdf', 'rb') as f:
    files = {'file': f}
    response = requests.post(
        'http://localhost:8000/api/process-invoice',
        files=files
    )
    print(response.json())
```

## Project Structure

```
backend/
├── main.py                 # FastAPI application
├── requirements.txt        # Python dependencies
├── .env                    # Environment configuration
├── app/
│   ├── config.py          # Settings and configuration
│   ├── models/
│   │   └── schemas.py     # Pydantic models
│   └── services/
│       ├── document_processor.py    # Main orchestrator
│       ├── image_preprocessor.py    # Image enhancement
│       └── entity_extractor.py      # NLP entity extraction
└── logs/                   # Application logs
```

## Performance Tips

1. **Image Quality**: Higher resolution images (300 DPI) give better OCR results
2. **Preprocessing**: Enable image preprocessing for scanned documents
3. **Language**: Specify correct language for better accuracy
4. **Batch Processing**: Use batch endpoint for multiple files to save time
5. **Caching**: Implement Redis caching for frequently processed documents

## Troubleshooting

### Tesseract not found
```
Error: TesseractNotFoundError
Solution: Install Tesseract and set TESSERACT_CMD in .env
```

### PDF conversion fails
```
Error: PDFInfoNotInstalledError
Solution: Install Poppler and add to PATH
```

### Low confidence scores
```
Solution: 
- Use higher resolution images (300+ DPI)
- Enable preprocessing
- Ensure document is properly scanned/photographed
- Check if correct language is specified
```

### Import errors
```
Solution: Ensure all dependencies are installed
pip install -r requirements.txt
```

## Development

### Running Tests
```bash
pytest tests/
```

### Code Formatting
```bash
black app/
isort app/
```

### Type Checking
```bash
mypy app/
```

## Production Deployment

### Using Docker (Recommended)

Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-spa \
    tesseract-ocr-fra \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t ocr-api .
docker run -p 8000:8000 ocr-api
```

### Environment Variables for Production

```env
DEBUG=False
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=https://yourdomain.com
MAX_FILE_SIZE=20971520  # 20MB
```

## License

MIT

## Support

For issues and questions:
- Create an issue on GitHub
- Check API documentation at /api/docs
- Review logs in logs/ directory
