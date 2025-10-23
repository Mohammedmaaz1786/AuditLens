# AuditLens 🔍

> **Enterprise-grade AI-powered invoice processing system with OCR, fraud detection, compliance monitoring, and advanced analytics.**

[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3.12+-green)](https://python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

---

## 🎯 Overview

**AuditLens** is a comprehensive invoice auditing platform that automates document processing with advanced AI and machine learning capabilities:

### Key Features
- 🤖 **Intelligent OCR** - Powered by Tesseract + Google Gemini AI 2.0 Flash
- 🛡️ **Fraud Detection** - 5 ML algorithms (Isolation Forest, TF-IDF, Z-Score, Pattern Matching)
- ✅ **Compliance** - SOX, PCI-DSS, and GDPR validation
- 📊 **Advanced Analytics** - Spending patterns, vendor performance, AI recommendations
- 🔐 **Enterprise Security** - AES-256 encryption, JWT auth, blockchain-like audit trails
- 📈 **Real-time Dashboard** - React-based UI with live statistics and visualizations

> 📄 **[View Complete Processing Flow Documentation](PROCESSING_FLOW.md)** - Detailed technical architecture and data flow

---

## 🏗️ Architecture

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────┐
│   Next.js Frontend  │◄────►│   Express Backend   │◄────►│    MongoDB      │
│   (Port 3000/3001)  │      │     (Port 5000)     │      │    Database     │
└─────────────────────┘      └─────────────────────┘      └─────────────────┘
                                       │
                                       │ REST API
                                       ▼
                             ┌─────────────────────┐
                             │  Python FastAPI     │
                             │  OCR + Analytics    │
                             │     (Port 8000)     │
                             └─────────────────────┘
```

**Three-tier hybrid microservices architecture:**
- **Frontend**: Next.js 15 + React 19 + Tailwind CSS
- **Backend API**: Express.js (JavaScript/ES Modules) + MongoDB + JWT Authentication
- **OCR Service**: Python FastAPI + Tesseract + Gemini AI + scikit-learn

---

## 🚀 Quick Start

### Prerequisites

**Required Software:**
```
Node.js >= 18.x
Python >= 3.12
MongoDB >= 4.4
Tesseract OCR >= 5.x
Poppler (for PDF processing)
```

**API Keys:**
- Google Gemini API Key ([Get it here](https://makersuite.google.com/app/apikey))

### Installation

**1. Clone the Repository**
```bash
git clone https://github.com/Mohammedmaaz1786/AuditLens.git
cd AuditLens
```

**2. Backend API Setup**
```bash
cd backend-api
npm install
```

Create `backend-api/.env`:
```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/auditlens
MONGODB_TEST_URI=mongodb://localhost:27017/auditlens_test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
JWT_REFRESH_EXPIRE=30d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000

# OCR Service Configuration
OCR_SERVICE_URL=http://localhost:8000
OCR_SERVICE_TIMEOUT=30000

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info

# Audit Security
AUDIT_SECRET=your-audit-secret-key-change-this-in-production
```

Start backend:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

**3. OCR Service Setup**
```bash
cd ../ocr-service
pip install -r requirements.txt
```

Create `ocr-service/.env`:
```env
PORT=8000
GEMINI_API_KEY=your-gemini-api-key-here
ENCRYPTION_MASTER_KEY=your-32-byte-fernet-key
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
POPPLER_PATH=C:\poppler\Library\bin
CORS_ORIGINS=["http://localhost:3000","http://localhost:5000"]
HOST=0.0.0.0
DEBUG=True
```

Start OCR service:
```bash
python main.py
```

**4. Frontend Setup**
```bash
cd ../
npm install
```

Create `.env.local` (optional - for additional config):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_OCR_API_URL=http://localhost:8000/api
```

Start frontend:
```bash
npm run dev
```

### 🌐 Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main web application |
| **Backend API** | http://localhost:5000 | REST API server |
| **API Health** | http://localhost:5000/health | Backend health check |
| **OCR Service** | http://localhost:8000 | OCR processing service |
| **API Docs** | http://localhost:8000/docs | Interactive API documentation |

---

## 🔐 Security Features

### Authentication & Authorization
- ✅ JWT token-based authentication
- ✅ Role-based access control (RBAC) - admin, auditor, viewer
- ✅ Secure password hashing (bcryptjs)
- ✅ Token expiration and refresh mechanism

### Data Protection
- ✅ AES-256 encryption (Fernet)
- ✅ Sensitive data masking
- ✅ PII anonymization
- ✅ Secure file uploads with validation

### API Security
- ✅ Rate limiting (100 req/15min)
- ✅ Input validation and sanitization
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Security headers (HSTS, CSP, Helmet)
- ✅ SQL/NoSQL injection prevention

### Audit & Compliance
- ✅ Blockchain-like audit trails with hash chaining
- ✅ SHA-256 hash verification
- ✅ HMAC digital signatures
- ✅ Immutable audit records
- ✅ Compliance tracking (SOX, PCI-DSS, GDPR)
- ✅ Complete action history logging

---

## 🤖 Fraud Detection Algorithms

### 1. Duplicate Detection
- **Method**: SHA-256 content hashing + TF-IDF similarity
- **Threshold**: 85% similarity
- **Risk**: HIGH if duplicate found

### 2. Amount Anomaly Detection
- **Method**: Z-score and IQR (Interquartile Range) analysis
- **Threshold**: Z-score > 3.0 or outside IQR range
- **Risk**: HIGH if amount is statistical outlier

### 3. Vendor Risk Assessment
- **Method**: Historical transaction analysis + pattern recognition
- **Factors**: New vendor status, transaction amount, frequency patterns
- **Risk**: Scaled based on vendor history

### 4. Pattern Detection
- **Checks**: Round number patterns, sequential invoice numbers
- **Method**: Statistical pattern matching
- **Risk**: MEDIUM if suspicious patterns detected

### 5. Line Item Validation
- **Check**: quantity × unit_price = total (with tolerance)
- **Tolerance**: ±0.01
- **Risk**: HIGH if calculation validation fails

**Final Risk Score**: Weighted average of all algorithms
- **CRITICAL** (>70): Immediate attention required
- **HIGH** (50-70): Significant risk detected
- **MEDIUM** (30-50): Moderate concerns
- **LOW** (<30): Minimal risk

---

## 📊 Analytics Features

### Spending Pattern Analysis
- Trend identification (increasing/decreasing/stable)
- Seasonal spending patterns with statistical analysis
- Department-wise breakdown
- Category-based insights

### Vendor Performance Metrics
- Total spending per vendor
- Payment compliance rates
- Invoice accuracy scores
- Risk assessment trends
- Performance dashboards

### Process Optimization
- Processing time tracking
- Bottleneck identification
- Error rate monitoring
- Automation opportunity detection

### AI Recommendations
- Vendor negotiation opportunities
- Cost-saving identification
- Process improvement suggestions
- Risk mitigation strategies

---

## 📁 Project Structure

```
AuditLens/
├── backend-api/              # Express.js Backend (JavaScript/ES Modules)
│   ├── src/
│   │   ├── config/           # Configuration (database, app config)
│   │   ├── controllers/      # Request handlers
│   │   │   ├── authController.js
│   │   │   ├── invoiceController.js
│   │   │   └── vendorController.js
│   │   ├── models/           # MongoDB schemas
│   │   │   ├── User.js
│   │   │   ├── Invoice.js
│   │   │   ├── Vendor.js
│   │   │   ├── AuditEntry.js
│   │   │   └── AuditLog.js
│   │   ├── routes/           # API endpoints
│   │   │   ├── authRoutes.js
│   │   │   ├── invoiceRoutes.js
│   │   │   └── vendorRoutes.js
│   │   ├── middleware/       # Auth, security, upload
│   │   │   ├── auth.js
│   │   │   ├── security.js
│   │   │   ├── upload.js
│   │   │   └── errorHandler.js
│   │   ├── services/         # Business logic services
│   │   │   └── auditService.js
│   │   ├── utils/            # Utilities
│   │   │   └── logger.js
│   │   ├── scripts/          # Database scripts
│   │   │   ├── seed.js
│   │   │   ├── clear-database.js
│   │   │   └── sync-vendor-status.js
│   │   └── server.js         # Entry point
│   ├── uploads/              # File uploads directory
│   ├── logs/                 # Application logs
│   ├── package.json
│   └── .env                  # Environment variables
│
├── ocr-service/              # Python FastAPI OCR
│   ├── app/
│   │   ├── services/
│   │   │   ├── document_processor.py    # OCR processing
│   │   │   ├── ai_extractor.py          # Gemini AI extraction
│   │   │   ├── fraud_detector.py        # ML fraud detection
│   │   │   ├── compliance_security.py   # Compliance validation
│   │   │   ├── analytics_engine.py      # Analytics generation
│   │   │   └── visualization_engine.py  # Chart generation
│   │   ├── routes/
│   │   │   └── analytics.py             # Analytics endpoints
│   │   ├── models/
│   │   │   └── schemas.py               # Pydantic schemas
│   │   └── config.py                    # Configuration
│   ├── main.py               # Entry point
│   ├── requirements.txt      # Python dependencies
│   └── .env                  # Environment variables
│
├── src/                      # Next.js Frontend
│   ├── app/
│   │   ├── (app)/           # Protected routes
│   │   │   ├── dashboard/
│   │   │   ├── invoices/
│   │   │   ├── vendors/
│   │   │   ├── reports/
│   │   │   ├── audit-trail/
│   │   │   └── security/
│   │   ├── (auth)/          # Public routes
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/          # React components
│   │   ├── ui/             # Shadcn UI components
│   │   ├── invoice-upload.tsx
│   │   ├── invoice-upload-ocr.tsx
│   │   ├── data-table.tsx
│   │   └── header.tsx
│   ├── lib/                # Utilities
│   │   ├── api-client.ts
│   │   ├── ocr-client.ts
│   │   └── utils.ts
│   └── hooks/              # Custom React hooks
│
├── PROCESSING_FLOW.md      # Complete technical flow documentation
├── README.md               # This file
├── package.json            # Frontend dependencies
├── tailwind.config.js      # Tailwind configuration
├── next.config.js          # Next.js configuration
└── tsconfig.json           # TypeScript configuration
```

---

## 🔑 API Endpoints

### Authentication (`/api/v1/auth`)
```http
POST   /api/v1/auth/register         # Register new user
POST   /api/v1/auth/login            # Login user
GET    /api/v1/auth/me               # Get current user
PUT    /api/v1/auth/update-details   # Update user details
PUT    /api/v1/auth/update-password  # Update password
```

### Invoices (`/api/v1/invoices`)
```http
POST   /api/v1/invoices/process      # Process invoice with OCR
POST   /api/v1/invoices              # Create invoice manually
GET    /api/v1/invoices              # List invoices (pagination & filters)
GET    /api/v1/invoices/:id          # Get single invoice
PUT    /api/v1/invoices/:id          # Update invoice
DELETE /api/v1/invoices/:id          # Delete invoice
PUT    /api/v1/invoices/:id/approve  # Approve invoice
PUT    /api/v1/invoices/:id/reject   # Reject invoice
GET    /api/v1/invoices/stats        # Get invoice statistics
```

### Vendors (`/api/v1/vendors`)
```http
GET    /api/v1/vendors               # List all vendors
POST   /api/v1/vendors               # Create vendor
GET    /api/v1/vendors/:id           # Get single vendor
PUT    /api/v1/vendors/:id           # Update vendor
DELETE /api/v1/vendors/:id           # Delete vendor
GET    /api/v1/vendors/stats         # Get vendor statistics
```

### OCR Service (`http://localhost:8000/api`)
```http
POST   /api/process-invoice          # Process invoice document
POST   /api/analytics/spending-patterns    # Get spending analysis
POST   /api/analytics/vendor-performance   # Get vendor metrics
POST   /api/analytics/recommendations      # Get AI recommendations
POST   /api/analytics/dashboard            # Get comprehensive analytics
GET    /api/health                   # Health check
```

---

## 📈 Performance

- **OCR Processing**: ~5-20 seconds per document (depends on quality & complexity)
- **Fraud Detection**: < 1 second per invoice
- **API Response**: < 100ms average
- **Database Queries**: Optimized with indexes on frequently queried fields
- **Concurrent Users**: Tested up to 100 simultaneous connections

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15.3.3 (App Router) + React 19
- **Language**: TypeScript 5
- **UI Library**: Shadcn UI + Radix UI
- **Styling**: Tailwind CSS 3.4.1
- **Tables**: TanStack Table v8
- **State**: React hooks + Context API
- **HTTP**: Fetch API
- **Forms**: React Hook Form + Zod validation

### Backend API (JavaScript/ES Modules)
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB + Mongoose 8.0.3
- **Authentication**: JWT (jsonwebtoken 9.0.2) + bcryptjs 2.4.3
- **File Upload**: Multer 1.4.5
- **Logging**: Winston 3.11.0
- **Security**: Helmet 7.1.0 + express-rate-limit 7.1.5
- **Validation**: Joi 17.11.0
- **HTTP Client**: Axios 1.6.2

### OCR Service (Python)
- **Framework**: FastAPI
- **OCR**: Pytesseract 0.3.13 + Tesseract 5.x
- **AI**: Google Generative AI 0.8.3 (Gemini 2.0 Flash)
- **ML**: scikit-learn 1.6.1 (Isolation Forest)
- **Image Processing**: OpenCV 4.10.0, Pillow
- **PDF**: pdf2image 1.17.0
- **Analytics**: pandas 2.2.3, numpy
- **Visualization**: matplotlib, seaborn
- **Validation**: Pydantic

---

## 🧪 Testing

```bash
# Backend API tests
cd backend-api
npm test

# OCR service tests
cd ocr-service
pytest

# Frontend tests
npm test
```

---

## 🐳 Docker Support (Optional)

```bash
# Build and run with Docker Compose
docker-compose up --build

# Services will be available at:
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# OCR Service: http://localhost:8000
# MongoDB: localhost:27017
```

---

## 🔧 Development

### Backend Development
```bash
cd backend-api
npm run dev  # Uses nodemon for auto-reload
```

### OCR Service Development
```bash
cd ocr-service
uvicorn main:app --reload --port 8000
```

### Frontend Development
```bash
npm run dev  # Next.js with hot reload
```

### Database Management
```bash
# Seed database with sample data
cd backend-api
npm run seed

# Clear all database collections
node src/scripts/clear-database.js

# Sync vendor status fields
node src/scripts/sync-vendor-status.js
```

---

## 📝 Environment Variables Reference

### Backend API
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret for JWT signing
- `OCR_SERVICE_URL`: OCR service endpoint
- `AUDIT_SECRET`: Secret for audit trail signatures

### OCR Service
- `PORT`: Service port (default: 8000)
- `GEMINI_API_KEY`: Google Gemini API key
- `TESSERACT_PATH`: Path to Tesseract executable
- `POPPLER_PATH`: Path to Poppler bin directory
- `ENCRYPTION_MASTER_KEY`: 32-byte key for Fernet encryption

### Frontend
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_OCR_API_URL`: OCR service URL

---

## 🚧 Troubleshooting

### Backend won't start
- Ensure MongoDB is running
- Check `.env` file exists with correct values
- Verify Node.js version >= 18.x
- Check port 5000 is not in use

### OCR service errors
- Verify Tesseract is installed and path is correct
- Check Poppler installation for PDF support
- Ensure Gemini API key is valid
- Verify Python version >= 3.12

### Frontend issues
- Clear `.next` cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check API URLs in browser console

---

## � Future Improvements & Planned Features

### 🎯 High Priority
- [ ] **Enhanced Fraud Detection Dashboard**
  - Real-time fraud alerts and notifications
  - Interactive risk visualization charts
  - Fraud pattern trending analysis
  - Customizable alert thresholds

- [ ] **Batch Processing**
  - Multi-file upload support
  - Bulk invoice processing queue
  - Progress tracking and status updates
  - Batch approval/rejection workflows

- [ ] **Advanced Analytics Dashboard**
  - Predictive analytics using historical data
  - Vendor performance comparison tools
  - Cost optimization recommendations
  - Custom report builder

- [ ] **Export Functionality**
  - PDF report generation
  - Excel/CSV data export
  - Automated report scheduling
  - Email report delivery

### 🚀 Medium Priority
- [ ] **User Management Improvements**
  - Password reset via email
  - Two-factor authentication (2FA)
  - User activity logs
  - Session management dashboard

- [ ] **Vendor Portal**
  - Self-service vendor registration
  - Invoice submission interface
  - Status tracking for vendors
  - Payment history visibility

- [ ] **Notification System**
  - Email notifications for critical events
  - In-app notification center
  - Webhook support for integrations
  - Customizable notification preferences

- [ ] **Mobile Application**
  - React Native mobile app
  - Mobile-optimized OCR
  - Push notifications
  - Offline mode support

### 💡 Low Priority / Future Enhancements
- [ ] **Machine Learning Improvements**
  - Continuous ML model training
  - Custom fraud detection model training
  - Historical data pattern learning
  - Vendor behavior prediction

- [ ] **Integration Capabilities**
  - ERP system integrations (SAP, Oracle)
  - Accounting software APIs (QuickBooks, Xero)
  - Cloud storage integration (Google Drive, Dropbox)
  - Payment gateway integration

- [ ] **Advanced Security Features**
  - Blockchain audit trail implementation
  - End-to-end encryption for sensitive data
  - Advanced threat detection
  - Compliance reporting automation

- [ ] **Performance Optimizations**
  - Redis caching layer
  - Database query optimization
  - CDN integration for static assets
  - Load balancing for high traffic

- [ ] **Testing & Quality**
  - Comprehensive unit test coverage (>80%)
  - Integration tests for API endpoints
  - E2E tests with Playwright/Cypress
  - Performance testing with k6

### 📝 Known Issues
- Minor Mongoose duplicate index warnings (cosmetic)
- Deprecated MongoDB driver options need cleanup
- OCR confidence scores occasionally inconsistent with complex layouts
- Large PDF files (>5MB) may take longer to process

> **Note**: This is an actively maintained project. Feature requests and contributions are welcome!

---

## �📚 Documentation

- **[PROCESSING_FLOW.md](./PROCESSING_FLOW.md)** - Complete technical architecture and data flow

---

## 🤝 Contributing

This is a private project. For questions or contributions, please contact the repository owner.

---

## 📄 License

Proprietary - All rights reserved

---

## 👨‍💻 Author

**Mohammed Maaz**
- GitHub: [@Mohammedmaaz1786](https://github.com/Mohammedmaaz1786)
- Project: AuditLens

---

## 🙏 Acknowledgments

- **Google Gemini AI** for intelligent data extraction
- **Tesseract OCR** for open-source text recognition
- **MongoDB** for flexible data storage
- **Shadcn UI** for beautiful component library
- **FastAPI** for high-performance Python backend
- **Next.js** for modern React framework

---

## 📊 Status

| Metric | Status |
|--------|--------|
| **Version** | 1.0.0 |
| **Status** | ✅ Production Ready |
| **Last Updated** | October 2025 |
| **Backend** | ✅ JavaScript/ES Modules |
| **OCR Service** | ✅ Operational |
| **Frontend** | ✅ React 19 |

---

**Built with ❤️ using Next.js, Express.js, FastAPI, and Google Gemini AI**

---

