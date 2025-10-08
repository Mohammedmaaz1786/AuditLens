# 🔍 Fraud Detection System - Setup Guide

## Overview

Your Audit Lens application now includes a **comprehensive fraud detection system** powered by machine learning algorithms. This system works seamlessly with your existing OCR pipeline to detect fraudulent invoices in real-time.

## ✨ Features Implemented

### 1. **Duplicate Invoice Detection**
- Hash-based exact duplicate detection
- Fuzzy matching for near-duplicates using TF-IDF
- Key field matching (vendor + amount + date)
- Confidence scoring for each match type

### 2. **Amount Anomaly Detection**
- Statistical outlier detection (Z-score analysis)
- Interquartile Range (IQR) analysis
- Vendor-specific historical spending patterns
- Round number detection (e.g., exactly $10,000.00)

### 3. **Vendor Risk Assessment**
- New vendor detection
- Ghost vendor indicators (missing address/contact)
- Personal email domain detection
- Risk factor aggregation

### 4. **Pattern-Based Fraud**
- Split billing detection (amounts just under approval thresholds)
- Weekend/holiday transaction flags
- Missing invoice number detection
- Duplicate invoice number tracking

### 5. **Line Item Analysis**
- Calculation error detection
- Vague description flagging
- Unusual quantity/rate combinations
- Subtotal verification

## 📦 Installation

### 1. **Install ML Dependencies**

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install scikit-learn==1.6.1 pandas==2.2.3
```

### 2. **Restart Backend**

```powershell
python main.py
```

## 🎯 How It Works

### Integration with OCR Pipeline

```
┌─────────────────┐
│  Upload Invoice │
└────────┬────────┘
         ▼
┌─────────────────┐
│  OCR Processing │ ← Tesseract + Gemini AI
└────────┬────────┘
         ▼
┌─────────────────┐
│ Entity Extraction│ ← Gemini AI structures the data
└────────┬────────┘
         ▼
┌─────────────────┐
│ FRAUD DETECTION │ ← NEW! Analyzes for fraud
│                 │   - Duplicates
│                 │   - Anomalies
│                 │   - Risk factors
│                 │   - Patterns
└────────┬────────┘
         ▼
┌─────────────────┐
│  Return Results │ ← Includes fraud analysis
└─────────────────┘
```

### Fraud Analysis Response

Every invoice now returns a `fraud_analysis` object:

```json
{
  "success": true,
  "data": { "vendor_name": "...", "total_amount": 1564.00, ... },
  "fraud_analysis": {
    "fraud_detected": false,
    "risk_score": 0.3,
    "risk_level": "MEDIUM",
    "detections": [],
    "warnings": [
      {
        "type": "VENDOR_RISK",
        "severity": "MEDIUM",
        "description": "Vendor has 2 risk factor(s)",
        "confidence": 0.7
      }
    ],
    "details": {
      "duplicate_check": { "is_duplicate": false, ... },
      "amount_check": { "is_anomaly": false, ... },
      "vendor_risk": { "is_high_risk": true, ... },
      "pattern_analysis": { "suspicious_patterns": [...], ... },
      "line_item_check": { "suspicious": false, ... }
    }
  }
}
```

## 📊 Risk Levels

- **CRITICAL** (≥0.7): High confidence fraud detected
- **HIGH** (≥0.5): Multiple red flags, requires review
- **MEDIUM** (≥0.3): Some suspicious patterns
- **LOW** (<0.3): No significant concerns

## 🎨 Frontend Display

The invoice upload component now shows:

### ✅ Clean Invoice
```
Risk Assessment: LOW
✓ No fraud indicators detected
✓ All validations passed
```

### ⚠️ Suspicious Invoice
```
Risk Assessment: MEDIUM
⚠️ New vendor (first transaction)
⚠️ Personal email domain
⚠️ Amount is 2.5 std deviations above vendor average
```

### 🚨 Fraudulent Invoice  
```
Risk Assessment: CRITICAL
🚨 DUPLICATE INVOICE DETECTED
🚨 Exact match with invoice #INV-001
🚨 Same vendor, amount, and date
```

## 🔧 Configuration

### Thresholds (in `fraud_detector.py`)

```python
# Adjust these based on your needs
self.duplicate_similarity_threshold = 0.85  # 85% similarity
self.amount_outlier_zscore = 3.0           # 3 standard deviations
self.high_risk_score_threshold = 0.7        # 70% risk score
```

## 📈 Machine Learning Models

### Currently Active:
- **TF-IDF Vectorizer**: Text similarity for duplicate detection
- **Standard Scaler**: Feature normalization
- **Statistical Methods**: Z-score, IQR for anomaly detection

### Ready to Implement (when you have training data):
- **Isolation Forest**: Multivariate anomaly detection
- **Random Forest Classifier**: Fraud classification
- **DBSCAN**: Clustering for pattern detection
- **Logistic Regression**: Risk scoring

## 🧪 Testing

### Test Case 1: Normal Invoice
```
Result: Risk Level = LOW
Expected: No detections, minimal warnings
```

### Test Case 2: Upload Same Invoice Twice
```
Result: Risk Level = CRITICAL
Expected: Duplicate detected with 100% confidence
```

### Test Case 3: Very Large Amount
```
Result: Risk Level = HIGH
Expected: Amount anomaly flagged
```

### Test Case 4: New Vendor
```
Result: Risk Level = MEDIUM
Expected: Vendor risk warning
```

## 📝 Logging

Fraud detection events are logged:

```
2025-10-08 23:15:00 | INFO | Fraud analysis completed for invoice INV-005: Risk Level = MEDIUM
2025-10-08 23:15:01 | WARNING | Amount anomaly detected: $15,000.00 is 4.2 std deviations from vendor average
```

## 🔮 Future Enhancements

1. **Model Training**: Train ML models on historical fraud data
2. **Real-time Dashboard**: Show fraud statistics and trends
3. **Alert System**: Email/Slack notifications for high-risk invoices
4. **Whitelist/Blacklist**: Vendor whitelist and blacklist management
5. **Rule Engine**: Custom fraud detection rules per company
6. **Audit Trail**: Complete history of fraud detections
7. **ML Pipeline**: Automatic retraining with new data
8. **API Endpoint**: Dedicated fraud-check endpoint

## 🎓 Best Practices

1. **Review MEDIUM+ Risk Invoices**: Always manually review
2. **Monitor False Positives**: Track and adjust thresholds
3. **Update Vendor Profiles**: Regularly update vendor information
4. **Analyze Patterns**: Look for trends in fraud attempts
5. **Train Models**: Use historical data to improve accuracy

## 🆘 Troubleshooting

### "scikit-learn not installed"
```powershell
pip install scikit-learn==1.6.1
```

### High False Positive Rate
- Adjust `duplicate_similarity_threshold` (increase for fewer false positives)
- Adjust `amount_outlier_zscore` (increase for fewer anomaly flags)

### Not Detecting Known Fraud
- Lower thresholds
- Add custom detection rules
- Review vendor profiles

## 🎉 Success!

Your fraud detection system is now integrated and ready to catch fraudulent invoices before they're processed! Every invoice upload automatically triggers comprehensive fraud analysis.

**Next Steps:**
1. Upload test invoices
2. Review fraud analysis results
3. Adjust thresholds as needed
4. Monitor logs for patterns
5. Build historical data for ML training

---

**Questions?** Check the logs at `backend/logs/` for detailed analysis information!
