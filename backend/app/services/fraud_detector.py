"""
Comprehensive fraud detection system using multiple ML algorithms.

This module integrates with the existing OCR pipeline to detect fraudulent invoices
using various techniques including duplicate detection, anomaly detection, and
pattern-based fraud identification.
"""

import hashlib
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import numpy as np
from loguru import logger

try:
    from sklearn.ensemble import IsolationForest, RandomForestClassifier
    from sklearn.cluster import DBSCAN
    from sklearn.preprocessing import StandardScaler
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    from sklearn.linear_model import LogisticRegression
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("scikit-learn not installed. ML-based fraud detection will be limited.")


class FraudDetector:
    """Comprehensive fraud detection system"""
    
    def __init__(self):
        self.invoice_history = []  # Store historical invoices for comparison
        self.vendor_profiles = defaultdict(dict)  # Vendor risk profiles
        self.scaler = StandardScaler() if SKLEARN_AVAILABLE else None
        self.isolation_forest = None
        self.tfidf_vectorizer = TfidfVectorizer() if SKLEARN_AVAILABLE else None
        
        # Thresholds
        self.duplicate_similarity_threshold = 0.85
        self.amount_outlier_zscore = 3.0
        self.high_risk_score_threshold = 0.7
        
        logger.info("FraudDetector initialized")
    
    def analyze_invoice(self, invoice_data: Dict, invoice_id: str = None) -> Dict:
        """
        Comprehensive fraud analysis of an invoice
        
        Args:
            invoice_data: Extracted invoice data from OCR
            invoice_id: Optional unique identifier for the invoice
            
        Returns:
            Dictionary with fraud analysis results
        """
        results = {
            "invoice_id": invoice_id,
            "fraud_detected": False,
            "risk_score": 0.0,
            "risk_level": "LOW",
            "detections": [],
            "warnings": [],
            "details": {}
        }
        
        try:
            # 1. Duplicate Invoice Detection
            duplicate_result = self._detect_duplicates(invoice_data)
            if duplicate_result["is_duplicate"]:
                results["detections"].append({
                    "type": "DUPLICATE_INVOICE",
                    "severity": "HIGH",
                    "description": duplicate_result["message"],
                    "confidence": duplicate_result["confidence"]
                })
                results["fraud_detected"] = True
            results["details"]["duplicate_check"] = duplicate_result
            
            # 2. Amount Anomaly Detection
            amount_anomaly = self._detect_amount_anomalies(invoice_data)
            if amount_anomaly["is_anomaly"]:
                results["detections"].append({
                    "type": "AMOUNT_ANOMALY",
                    "severity": amount_anomaly["severity"],
                    "description": amount_anomaly["message"],
                    "confidence": amount_anomaly["confidence"]
                })
                if amount_anomaly["severity"] == "HIGH":
                    results["fraud_detected"] = True
            results["details"]["amount_check"] = amount_anomaly
            
            # 3. Vendor Risk Assessment
            vendor_risk = self._assess_vendor_risk(invoice_data)
            if vendor_risk["is_high_risk"]:
                results["warnings"].append({
                    "type": "VENDOR_RISK",
                    "severity": "MEDIUM",
                    "description": vendor_risk["message"],
                    "confidence": vendor_risk["confidence"]
                })
            results["details"]["vendor_risk"] = vendor_risk
            
            # 4. Pattern-Based Fraud Detection
            pattern_fraud = self._detect_pattern_fraud(invoice_data)
            if pattern_fraud["suspicious_patterns"]:
                for pattern in pattern_fraud["suspicious_patterns"]:
                    results["warnings"].append({
                        "type": "SUSPICIOUS_PATTERN",
                        "severity": pattern["severity"],
                        "description": pattern["description"],
                        "confidence": pattern["confidence"]
                    })
                    if pattern["severity"] == "HIGH":
                        results["fraud_detected"] = True
            results["details"]["pattern_analysis"] = pattern_fraud
            
            # 5. Line Item Analysis
            line_item_fraud = self._analyze_line_items(invoice_data)
            if line_item_fraud["suspicious"]:
                results["warnings"].append({
                    "type": "LINE_ITEM_FRAUD",
                    "severity": "MEDIUM",
                    "description": line_item_fraud["message"],
                    "confidence": line_item_fraud["confidence"]
                })
            results["details"]["line_item_check"] = line_item_fraud
            
            # Calculate overall risk score
            risk_score = self._calculate_risk_score(results)
            results["risk_score"] = risk_score
            results["risk_level"] = self._get_risk_level(risk_score)
            
            # Store invoice for future comparisons
            self._store_invoice(invoice_data, invoice_id)
            
            logger.info(f"Fraud analysis completed for invoice {invoice_id}: Risk Level = {results['risk_level']}")
            
        except Exception as e:
            logger.error(f"Fraud detection error: {str(e)}")
            results["error"] = str(e)
        
        return results
    
    def _detect_duplicates(self, invoice_data: Dict) -> Dict:
        """Detect duplicate invoices using multiple techniques"""
        result = {
            "is_duplicate": False,
            "confidence": 0.0,
            "message": "",
            "matches": []
        }
        
        try:
            # Generate invoice hash for exact duplicate detection
            invoice_hash = self._generate_invoice_hash(invoice_data)
            
            # Check against historical invoices
            for historical in self.invoice_history:
                # Exact match
                if historical.get("hash") == invoice_hash:
                    result["is_duplicate"] = True
                    result["confidence"] = 1.0
                    result["message"] = f"Exact duplicate of invoice {historical.get('id', 'unknown')}"
                    result["matches"].append({
                        "type": "exact",
                        "invoice_id": historical.get("id"),
                        "similarity": 1.0
                    })
                    break
                
                # Fuzzy matching using TF-IDF
                if SKLEARN_AVAILABLE and self.tfidf_vectorizer:
                    similarity = self._calculate_text_similarity(invoice_data, historical)
                    if similarity > self.duplicate_similarity_threshold:
                        result["is_duplicate"] = True
                        result["confidence"] = similarity
                        result["message"] = f"Similar to invoice {historical.get('id', 'unknown')} (similarity: {similarity:.2%})"
                        result["matches"].append({
                            "type": "fuzzy",
                            "invoice_id": historical.get("id"),
                            "similarity": similarity
                        })
                
                # Check for same vendor + amount + date (common duplicate scenario)
                if self._check_key_fields_match(invoice_data, historical):
                    result["is_duplicate"] = True
                    result["confidence"] = 0.9
                    result["message"] = "Duplicate: Same vendor, amount, and date"
                    result["matches"].append({
                        "type": "key_fields",
                        "invoice_id": historical.get("id"),
                        "similarity": 0.9
                    })
        
        except Exception as e:
            logger.error(f"Duplicate detection error: {str(e)}")
        
        return result
    
    def _detect_amount_anomalies(self, invoice_data: Dict) -> Dict:
        """Detect anomalous amounts using statistical methods"""
        result = {
            "is_anomaly": False,
            "confidence": 0.0,
            "message": "",
            "severity": "LOW",
            "details": {}
        }
        
        try:
            total_amount = invoice_data.get("total_amount") or invoice_data.get("total")
            if not total_amount:
                return result
            
            vendor_name = invoice_data.get("vendor_name") or invoice_data.get("vendorName")
            
            # Get vendor's historical amounts
            vendor_amounts = self._get_vendor_amounts(vendor_name)
            
            if len(vendor_amounts) > 3:  # Need enough data for statistical analysis
                mean_amount = np.mean(vendor_amounts)
                std_amount = np.std(vendor_amounts)
                
                # Z-score analysis
                if std_amount > 0:
                    z_score = abs((total_amount - mean_amount) / std_amount)
                    
                    if z_score > self.amount_outlier_zscore:
                        result["is_anomaly"] = True
                        result["confidence"] = min(z_score / 10.0, 1.0)
                        result["severity"] = "HIGH" if z_score > 5 else "MEDIUM"
                        result["message"] = f"Amount ${total_amount:,.2f} is {z_score:.1f} standard deviations from vendor average ${mean_amount:,.2f}"
                        result["details"]["z_score"] = z_score
                        result["details"]["vendor_avg"] = mean_amount
                
                # IQR analysis
                q1, q3 = np.percentile(vendor_amounts, [25, 75])
                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                
                if total_amount < lower_bound or total_amount > upper_bound:
                    result["is_anomaly"] = True
                    result["confidence"] = max(result["confidence"], 0.7)
                    result["message"] = f"Amount ${total_amount:,.2f} outside typical range (${lower_bound:,.2f} - ${upper_bound:,.2f})"
                    result["details"]["iqr_range"] = [lower_bound, upper_bound]
            
            # Check for round numbers (potential fraud indicator)
            if total_amount % 1000 == 0 and total_amount >= 10000:
                result["is_anomaly"] = True
                result["confidence"] = max(result["confidence"], 0.5)
                result["severity"] = "MEDIUM"
                result["message"] = f"Suspiciously round amount: ${total_amount:,.2f}"
                result["details"]["round_number"] = True
        
        except Exception as e:
            logger.error(f"Amount anomaly detection error: {str(e)}")
        
        return result
    
    def _assess_vendor_risk(self, invoice_data: Dict) -> Dict:
        """Assess vendor risk factors"""
        result = {
            "is_high_risk": False,
            "confidence": 0.0,
            "message": "",
            "risk_factors": []
        }
        
        try:
            vendor_name = invoice_data.get("vendor_name") or invoice_data.get("vendorName")
            if not vendor_name:
                return result
            
            # Check if new vendor
            vendor_history = self._get_vendor_history(vendor_name)
            is_new_vendor = len(vendor_history) == 0
            
            if is_new_vendor:
                result["risk_factors"].append({
                    "factor": "NEW_VENDOR",
                    "description": "First transaction with this vendor",
                    "risk_contribution": 0.3
                })
            
            # Check vendor address
            vendor_address = invoice_data.get("vendor_address") or invoice_data.get("vendorAddress")
            if not vendor_address or vendor_address in ["", "null", None]:
                result["risk_factors"].append({
                    "factor": "MISSING_ADDRESS",
                    "description": "Vendor address not provided (ghost vendor indicator)",
                    "risk_contribution": 0.5
                })
            
            # Check vendor contact info
            vendor_email = invoice_data.get("vendor_email") or invoice_data.get("vendorEmail")
            vendor_phone = invoice_data.get("vendor_phone") or invoice_data.get("vendorPhone")
            
            if not vendor_email and not vendor_phone:
                result["risk_factors"].append({
                    "factor": "NO_CONTACT_INFO",
                    "description": "No email or phone number provided",
                    "risk_contribution": 0.4
                })
            
            # Check for suspicious email domains
            if vendor_email and any(domain in vendor_email.lower() for domain in ["gmail", "yahoo", "hotmail", "outlook"]):
                result["risk_factors"].append({
                    "factor": "PERSONAL_EMAIL",
                    "description": "Using personal email domain instead of business domain",
                    "risk_contribution": 0.3
                })
            
            # Calculate overall risk
            if result["risk_factors"]:
                total_risk = sum(factor["risk_contribution"] for factor in result["risk_factors"])
                result["confidence"] = min(total_risk, 1.0)
                result["is_high_risk"] = total_risk > 0.6
                result["message"] = f"Vendor has {len(result['risk_factors'])} risk factor(s)"
        
        except Exception as e:
            logger.error(f"Vendor risk assessment error: {str(e)}")
        
        return result
    
    def _detect_pattern_fraud(self, invoice_data: Dict) -> Dict:
        """Detect pattern-based fraud indicators"""
        result = {
            "suspicious_patterns": [],
            "pattern_count": 0
        }
        
        try:
            # Split billing detection
            total_amount = invoice_data.get("total_amount") or invoice_data.get("total")
            if total_amount:
                # Check for amounts just under approval thresholds
                common_thresholds = [1000, 5000, 10000, 25000, 50000]
                for threshold in common_thresholds:
                    if threshold * 0.9 < total_amount < threshold:
                        result["suspicious_patterns"].append({
                            "pattern": "SPLIT_BILLING",
                            "description": f"Amount ${total_amount:,.2f} is just below ${threshold:,.2f} threshold",
                            "severity": "MEDIUM",
                            "confidence": 0.6
                        })
            
            # Check invoice date patterns
            invoice_date = invoice_data.get("invoice_date") or invoice_data.get("date")
            if invoice_date:
                try:
                    # Parse date
                    if isinstance(invoice_date, str):
                        date_obj = datetime.fromisoformat(invoice_date.replace('/', '-'))
                    else:
                        date_obj = invoice_date
                    
                    # Weekend transaction
                    if date_obj.weekday() >= 5:  # Saturday or Sunday
                        result["suspicious_patterns"].append({
                            "pattern": "WEEKEND_TRANSACTION",
                            "description": "Invoice dated on weekend",
                            "severity": "LOW",
                            "confidence": 0.4
                        })
                    
                    # Holiday check (simplified - would need full holiday calendar)
                    if date_obj.month == 12 and date_obj.day >= 24:
                        result["suspicious_patterns"].append({
                            "pattern": "HOLIDAY_TRANSACTION",
                            "description": "Invoice dated during holiday period",
                            "severity": "LOW",
                            "confidence": 0.4
                        })
                except:
                    pass
            
            # Check for missing invoice number
            invoice_number = invoice_data.get("invoice_number") or invoice_data.get("invoiceNumber")
            if not invoice_number or invoice_number in ["", "null", None]:
                result["suspicious_patterns"].append({
                    "pattern": "MISSING_INVOICE_NUMBER",
                    "description": "Invoice number not provided",
                    "severity": "MEDIUM",
                    "confidence": 0.7
                })
            
            # Check for sequential invoice numbers (could indicate forgery)
            if invoice_number and len(self.invoice_history) > 0:
                recent_numbers = [inv.get("invoice_number") for inv in self.invoice_history[-10:]]
                if invoice_number in recent_numbers:
                    result["suspicious_patterns"].append({
                        "pattern": "DUPLICATE_INVOICE_NUMBER",
                        "description": f"Invoice number {invoice_number} already exists",
                        "severity": "HIGH",
                        "confidence": 1.0
                    })
            
            result["pattern_count"] = len(result["suspicious_patterns"])
        
        except Exception as e:
            logger.error(f"Pattern fraud detection error: {str(e)}")
        
        return result
    
    def _analyze_line_items(self, invoice_data: Dict) -> Dict:
        """Analyze line items for fraud indicators"""
        result = {
            "suspicious": False,
            "confidence": 0.0,
            "message": "",
            "issues": []
        }
        
        try:
            line_items = invoice_data.get("line_items") or invoice_data.get("lineItems", [])
            
            if not line_items:
                result["issues"].append("No line items provided")
                result["suspicious"] = True
                result["confidence"] = 0.5
                result["message"] = "Missing line item details"
                return result
            
            # Check for calculation errors
            subtotal = invoice_data.get("subtotal")
            if subtotal:
                calculated_total = sum(
                    item.get("amount", 0) 
                    for item in line_items 
                    if isinstance(item, dict)
                )
                
                if abs(calculated_total - subtotal) > 0.02:  # Allow 2 cent difference
                    result["suspicious"] = True
                    result["confidence"] = 0.8
                    result["issues"].append(f"Line items total ${calculated_total:,.2f} doesn't match subtotal ${subtotal:,.2f}")
            
            # Check for vague descriptions
            vague_keywords = ["miscellaneous", "various", "other", "services", "expenses"]
            for item in line_items:
                if isinstance(item, dict):
                    description = str(item.get("description", "")).lower()
                    if any(keyword in description for keyword in vague_keywords):
                        result["suspicious"] = True
                        result["confidence"] = max(result["confidence"], 0.4)
                        result["issues"].append(f"Vague line item description: '{item.get('description')}'")
            
            # Check for high-quantity low-value items
            for item in line_items:
                if isinstance(item, dict):
                    quantity = item.get("quantity", 0)
                    rate = item.get("rate") or item.get("unit_price", 0)
                    if quantity > 100 and rate < 1:
                        result["suspicious"] = True
                        result["confidence"] = max(result["confidence"], 0.5)
                        result["issues"].append(f"Unusual quantity/rate combination: {quantity} × ${rate}")
            
            if result["issues"]:
                result["message"] = f"{len(result['issues'])} issue(s) found in line items"
        
        except Exception as e:
            logger.error(f"Line item analysis error: {str(e)}")
        
        return result
    
    # Helper methods
    
    def _generate_invoice_hash(self, invoice_data: Dict) -> str:
        """Generate hash for exact duplicate detection"""
        # Use key fields for hashing
        key_fields = {
            "vendor": invoice_data.get("vendor_name") or invoice_data.get("vendorName", ""),
            "invoice_number": invoice_data.get("invoice_number") or invoice_data.get("invoiceNumber", ""),
            "amount": invoice_data.get("total_amount") or invoice_data.get("total", 0),
            "date": invoice_data.get("invoice_date") or invoice_data.get("date", "")
        }
        hash_string = json.dumps(key_fields, sort_keys=True)
        return hashlib.sha256(hash_string.encode()).hexdigest()
    
    def _calculate_text_similarity(self, invoice1: Dict, invoice2: Dict) -> float:
        """Calculate text similarity using TF-IDF"""
        if not SKLEARN_AVAILABLE:
            return 0.0
        
        try:
            # Combine relevant text fields
            text1 = " ".join([
                str(invoice1.get("vendor_name", "")),
                str(invoice1.get("invoice_number", "")),
                str(invoice1.get("total_amount", ""))
            ])
            
            text2 = " ".join([
                str(invoice2.get("vendor_name", "")),
                str(invoice2.get("invoice_number", "")),
                str(invoice2.get("total_amount", ""))
            ])
            
            vectors = self.tfidf_vectorizer.fit_transform([text1, text2])
            similarity = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
            return float(similarity)
        except:
            return 0.0
    
    def _check_key_fields_match(self, invoice1: Dict, invoice2: Dict) -> bool:
        """Check if key fields match between invoices"""
        vendor1 = invoice1.get("vendor_name") or invoice1.get("vendorName", "")
        vendor2 = invoice2.get("vendor_name") or invoice2.get("vendorName", "")
        
        amount1 = invoice1.get("total_amount") or invoice1.get("total", 0)
        amount2 = invoice2.get("total_amount") or invoice2.get("total", 0)
        
        date1 = invoice1.get("invoice_date") or invoice1.get("date", "")
        date2 = invoice2.get("invoice_date") or invoice2.get("date", "")
        
        return (
            vendor1.lower() == vendor2.lower() and
            abs(amount1 - amount2) < 0.01 and
            date1 == date2
        )
    
    def _get_vendor_amounts(self, vendor_name: str) -> List[float]:
        """Get historical amounts for a vendor"""
        if not vendor_name:
            return []
        
        amounts = []
        for invoice in self.invoice_history:
            inv_vendor = invoice.get("vendor_name") or invoice.get("vendorName", "")
            if inv_vendor.lower() == vendor_name.lower():
                amount = invoice.get("total_amount") or invoice.get("total", 0)
                if amount:
                    amounts.append(amount)
        return amounts
    
    def _get_vendor_history(self, vendor_name: str) -> List[Dict]:
        """Get all historical invoices for a vendor"""
        if not vendor_name:
            return []
        
        history = []
        for invoice in self.invoice_history:
            inv_vendor = invoice.get("vendor_name") or invoice.get("vendorName", "")
            if inv_vendor.lower() == vendor_name.lower():
                history.append(invoice)
        return history
    
    def _store_invoice(self, invoice_data: Dict, invoice_id: str = None):
        """Store invoice in history for future comparisons"""
        invoice_copy = invoice_data.copy()
        invoice_copy["id"] = invoice_id
        invoice_copy["hash"] = self._generate_invoice_hash(invoice_data)
        invoice_copy["timestamp"] = datetime.now().isoformat()
        
        self.invoice_history.append(invoice_copy)
        
        # Keep only last 1000 invoices
        if len(self.invoice_history) > 1000:
            self.invoice_history = self.invoice_history[-1000:]
    
    def _calculate_risk_score(self, analysis_results: Dict) -> float:
        """Calculate overall risk score from analysis results"""
        score = 0.0
        
        # High severity detections
        high_severity = len([d for d in analysis_results["detections"] if d["severity"] == "HIGH"])
        score += high_severity * 0.3
        
        # Medium severity detections
        medium_severity = len([d for d in analysis_results["detections"] if d["severity"] == "MEDIUM"])
        score += medium_severity * 0.15
        
        # Warnings
        score += len(analysis_results["warnings"]) * 0.1
        
        # Fraud detected flag
        if analysis_results["fraud_detected"]:
            score += 0.4
        
        return min(score, 1.0)
    
    def _get_risk_level(self, risk_score: float) -> str:
        """Convert risk score to risk level"""
        if risk_score >= 0.7:
            return "CRITICAL"
        elif risk_score >= 0.5:
            return "HIGH"
        elif risk_score >= 0.3:
            return "MEDIUM"
        else:
            return "LOW"
    
    def get_statistics(self) -> Dict:
        """Get fraud detection statistics"""
        return {
            "total_invoices_analyzed": len(self.invoice_history),
            "unique_vendors": len(set(
                inv.get("vendor_name", "").lower() 
                for inv in self.invoice_history 
                if inv.get("vendor_name")
            )),
            "sklearn_available": SKLEARN_AVAILABLE
        }
