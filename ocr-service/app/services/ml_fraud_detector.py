"""
Machine Learning-Based Fraud Detection System

This module implements a comprehensive ML-based fraud detection system using:
- Isolation Forest for anomaly detection
- Random Forest Classifier for fraud prediction
- DBSCAN for clustering suspicious patterns
- Logistic Regression for binary classification
- Ensemble voting for final decision

The system automatically trains on historical data and adapts to new patterns.
"""

import os
import pickle
import hashlib
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict
import numpy as np
from loguru import logger
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# ML Libraries
from sklearn.ensemble import IsolationForest, RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import pandas as pd


class MLFraudDetector:
    """
    Machine Learning-based fraud detection system that learns from historical data.
    
    Features:
    - Auto-trains on historical invoices
    - Multi-model ensemble approach
    - Real-time prediction with confidence scores
    - Continuous learning from new data
    - Model persistence for deployment
    """
    
    def __init__(self):
        # MongoDB connection
        self.mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/auditlens")
        self.db_client = None
        self.db = None
        self.invoices_collection = None
        self.vendors_collection = None
        self._connect_to_mongodb()
        
        # ML Models
        self.isolation_forest = None
        self.random_forest = None
        self.logistic_regression = None
        self.ensemble_model = None
        self.dbscan = None
        
        # Preprocessing
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        
        # Feature engineering
        self.vendor_risk_profiles = {}
        self.global_statistics = {}
        
        # Model paths
        self.model_dir = "models"
        os.makedirs(self.model_dir, exist_ok=True)
        
        # Configuration
        self.min_training_samples = int(os.getenv("MIN_TRAINING_SAMPLES", "50"))
        self.anomaly_contamination = float(os.getenv("ANOMALY_CONTAMINATION", "0.1"))
        self.retrain_interval_hours = int(os.getenv("RETRAIN_INTERVAL_HOURS", "24"))
        
        # Training state
        self.is_trained = False
        self.last_training_time = None
        self.training_data_count = 0
        
        # Initialize system
        self._load_or_train_models()
        
        logger.info("✅ ML-Based Fraud Detection System Initialized")
    
    def _connect_to_mongodb(self):
        """Establish MongoDB connection"""
        try:
            self.db_client = MongoClient(self.mongodb_uri, serverSelectionTimeoutMS=5000)
            self.db_client.admin.command('ping')
            self.db = self.db_client.get_default_database()
            self.invoices_collection = self.db.invoices
            self.vendors_collection = self.db.vendors
            logger.info("✅ MongoDB connected for ML fraud detection")
        except ConnectionFailure as e:
            logger.error(f"❌ MongoDB connection failed: {str(e)}")
            raise Exception("MongoDB required for ML fraud detection")
    
    def _load_or_train_models(self):
        """Load existing models or train new ones"""
        try:
            # Try to load existing models
            if self._load_models():
                logger.info("✅ Loaded pre-trained models")
                self.is_trained = True
            else:
                # Train new models
                logger.info("🔄 No existing models found. Training new models...")
                self._train_models()
        except Exception as e:
            logger.error(f"Error in model initialization: {str(e)}")
            logger.warning("System will train on next batch of data")
    
    def analyze_invoice(self, invoice_data: Dict, invoice_id: str = None) -> Dict:
        """
        Analyze invoice for fraud using ML models
        
        Args:
            invoice_data: Invoice data dictionary
            invoice_id: Optional invoice ID
            
        Returns:
            Fraud analysis results with ML predictions
        """
        try:
            # Check if models need retraining
            if self._should_retrain():
                logger.info("🔄 Scheduled model retraining...")
                self._train_models()
            
            # Extract features from invoice
            features = self._extract_features(invoice_data)
            
            # Make predictions
            predictions = self._make_predictions(features, invoice_data)
            
            # Check for exact duplicates (critical check)
            duplicate_check = self._check_duplicates_db(invoice_data)
            
            # Build result
            result = self._build_fraud_result(predictions, duplicate_check, invoice_data)
            
            logger.info(f"ML Fraud Analysis: Invoice {invoice_id} - Risk: {result['risk_level']} ({result['risk_score']:.2%})")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in ML fraud analysis: {str(e)}")
            return {
                "fraud_detected": False,
                "risk_score": 0.0,
                "risk_level": "LOW",
                "message": "Analysis completed with warnings",
                "ml_predictions": {},
                "error": str(e)
            }
    
    def _extract_features(self, invoice_data: Dict) -> np.ndarray:
        """
        Extract numerical features from invoice data
        
        Features:
        1. Total amount
        2. Number of line items
        3. Average item price
        4. Amount variance
        5. Vendor history metrics
        6. Date-based features
        7. Text-based features
        """
        features = []
        
        # Amount features
        total_amount = float(invoice_data.get("total_amount", 0))
        features.append(total_amount)
        
        # Line items features
        line_items = invoice_data.get("line_items", [])
        num_items = len(line_items)
        features.append(num_items if num_items > 0 else 0)
        
        # Calculate item statistics
        if line_items:
            item_amounts = [item.get("amount", 0) for item in line_items]
            avg_item_price = np.mean(item_amounts) if item_amounts else 0
            std_item_price = np.std(item_amounts) if len(item_amounts) > 1 else 0
            max_item_price = max(item_amounts) if item_amounts else 0
            min_item_price = min(item_amounts) if item_amounts else 0
        else:
            avg_item_price = total_amount
            std_item_price = 0
            max_item_price = total_amount
            min_item_price = total_amount
        
        features.extend([avg_item_price, std_item_price, max_item_price, min_item_price])
        
        # Vendor features
        vendor_name = invoice_data.get("vendor_name", "") or invoice_data.get("vendorName", "")
        vendor_features = self._get_vendor_features(vendor_name, total_amount)
        features.extend(vendor_features)
        
        # Date features
        date_features = self._extract_date_features(invoice_data)
        features.extend(date_features)
        
        # Text complexity features
        text_features = self._extract_text_features(invoice_data)
        features.extend(text_features)
        
        return np.array(features).reshape(1, -1)
    
    def _get_vendor_features(self, vendor_name: str, current_amount: float) -> List[float]:
        """Extract vendor-specific features"""
        features = []
        
        try:
            # Get vendor history from database
            if self.invoices_collection and vendor_name:
                vendor_invoices = list(self.invoices_collection.find({
                    "vendorName": {"$regex": vendor_name, "$options": "i"},
                    "status": {"$ne": "rejected"}
                }).limit(100))
                
                if vendor_invoices:
                    amounts = [inv.get("totalAmount", 0) for inv in vendor_invoices]
                    
                    # Vendor invoice count
                    features.append(len(amounts))
                    
                    # Amount statistics
                    features.append(np.mean(amounts))
                    features.append(np.std(amounts) if len(amounts) > 1 else 0)
                    features.append(max(amounts))
                    features.append(min(amounts))
                    
                    # Z-score of current amount
                    mean_amount = np.mean(amounts)
                    std_amount = np.std(amounts)
                    z_score = (current_amount - mean_amount) / std_amount if std_amount > 0 else 0
                    features.append(z_score)
                    
                    # Vendor age (days since first invoice)
                    dates = [inv.get("createdAt") for inv in vendor_invoices if inv.get("createdAt")]
                    if dates:
                        first_date = min(dates)
                        age_days = (datetime.now() - first_date).days
                        features.append(age_days)
                    else:
                        features.append(0)
                    
                    # Invoice frequency (invoices per month)
                    if dates and len(dates) > 1:
                        date_range_days = (max(dates) - min(dates)).days
                        frequency = len(dates) / (date_range_days / 30) if date_range_days > 0 else 0
                        features.append(frequency)
                    else:
                        features.append(0)
                    
                else:
                    # New vendor - all zeros except current amount
                    features.extend([0, current_amount, 0, current_amount, current_amount, 0, 0, 0])
                    
            else:
                # No database access - use defaults
                features.extend([0, current_amount, 0, current_amount, current_amount, 0, 0, 0])
                
        except Exception as e:
            logger.error(f"Error extracting vendor features: {str(e)}")
            features.extend([0, current_amount, 0, current_amount, current_amount, 0, 0, 0])
        
        return features
    
    def _extract_date_features(self, invoice_data: Dict) -> List[float]:
        """Extract date-based features"""
        features = []
        
        try:
            invoice_date_str = invoice_data.get("invoice_date") or invoice_data.get("date", "")
            
            if invoice_date_str:
                # Parse date
                invoice_date = datetime.fromisoformat(invoice_date_str.replace("Z", "+00:00"))
                current_date = datetime.now()
                
                # Days from today (negative if future, positive if past)
                days_diff = (current_date - invoice_date).days
                features.append(days_diff)
                
                # Day of week (0=Monday, 6=Sunday)
                features.append(invoice_date.weekday())
                
                # Day of month
                features.append(invoice_date.day)
                
                # Month
                features.append(invoice_date.month)
                
                # Is weekend
                features.append(1 if invoice_date.weekday() >= 5 else 0)
                
            else:
                features.extend([0, 0, 15, 6, 0])  # Neutral defaults
                
        except Exception as e:
            logger.error(f"Error extracting date features: {str(e)}")
            features.extend([0, 0, 15, 6, 0])
        
        return features
    
    def _extract_text_features(self, invoice_data: Dict) -> List[float]:
        """Extract text complexity features"""
        features = []
        
        try:
            # Vendor name length
            vendor_name = invoice_data.get("vendor_name", "") or invoice_data.get("vendorName", "")
            features.append(len(vendor_name))
            
            # Invoice number length
            invoice_number = invoice_data.get("invoice_number", "") or invoice_data.get("invoiceNumber", "")
            features.append(len(str(invoice_number)))
            
            # Number of line items with descriptions
            line_items = invoice_data.get("line_items", [])
            items_with_desc = sum(1 for item in line_items if item.get("description"))
            features.append(items_with_desc)
            
            # Average description length
            if line_items:
                desc_lengths = [len(item.get("description", "")) for item in line_items]
                avg_desc_length = np.mean(desc_lengths) if desc_lengths else 0
                features.append(avg_desc_length)
            else:
                features.append(0)
                
        except Exception as e:
            logger.error(f"Error extracting text features: {str(e)}")
            features.extend([0, 0, 0, 0])
        
        return features
    
    def _make_predictions(self, features: np.ndarray, invoice_data: Dict) -> Dict:
        """Make fraud predictions using all ML models"""
        predictions = {
            "anomaly_score": 0.0,
            "fraud_probability": 0.0,
            "cluster_label": -1,
            "is_anomaly": False,
            "is_fraud": False,
            "confidence": 0.0
        }
        
        try:
            # Scale features
            features_scaled = self.scaler.transform(features)
            
            # Isolation Forest - Anomaly Detection
            if self.isolation_forest and self.is_trained:
                anomaly_pred = self.isolation_forest.predict(features_scaled)
                anomaly_score = self.isolation_forest.score_samples(features_scaled)[0]
                predictions["is_anomaly"] = (anomaly_pred[0] == -1)
                predictions["anomaly_score"] = float(-anomaly_score)  # Higher = more anomalous
                
            # Random Forest - Fraud Classification
            if self.random_forest and self.is_trained:
                fraud_proba = self.random_forest.predict_proba(features_scaled)[0]
                predictions["fraud_probability"] = float(fraud_proba[1] if len(fraud_proba) > 1 else 0)
                predictions["is_fraud"] = predictions["fraud_probability"] > 0.5
                
            # Logistic Regression - Binary Classification
            if self.logistic_regression and self.is_trained:
                lr_proba = self.logistic_regression.predict_proba(features_scaled)[0]
                lr_fraud_prob = float(lr_proba[1] if len(lr_proba) > 1 else 0)
                
                # Average with Random Forest
                predictions["fraud_probability"] = (predictions["fraud_probability"] + lr_fraud_prob) / 2
                
            # DBSCAN - Clustering (outliers have cluster -1)
            if self.dbscan and self.is_trained:
                cluster = self.dbscan.fit_predict(features_scaled)
                predictions["cluster_label"] = int(cluster[0])
                
            # Calculate overall confidence
            confidence_scores = []
            if predictions["is_anomaly"]:
                confidence_scores.append(min(predictions["anomaly_score"] / 5.0, 1.0))
            if predictions["fraud_probability"] > 0:
                confidence_scores.append(predictions["fraud_probability"])
                
            predictions["confidence"] = np.mean(confidence_scores) if confidence_scores else 0.0
            
        except Exception as e:
            logger.error(f"Error making ML predictions: {str(e)}")
        
        return predictions
    
    def _check_duplicates_db(self, invoice_data: Dict) -> Dict:
        """Check for exact duplicates in database"""
        result = {
            "is_duplicate": False,
            "confidence": 0.0,
            "message": "",
            "duplicate_id": None
        }
        
        try:
            if not self.invoices_collection:
                return result
                
            vendor_name = invoice_data.get("vendor_name") or invoice_data.get("vendorName", "")
            invoice_number = invoice_data.get("invoice_number") or invoice_data.get("invoiceNumber", "")
            total_amount = invoice_data.get("total_amount") or invoice_data.get("totalAmount", 0)
            
            # Check for exact match
            existing = self.invoices_collection.find_one({
                "invoiceNumber": invoice_number,
                "vendorName": vendor_name,
                "totalAmount": total_amount
            })
            
            if existing:
                result["is_duplicate"] = True
                result["confidence"] = 1.0
                result["duplicate_id"] = str(existing.get("_id"))
                result["message"] = f"🚨 DUPLICATE: Exact match with invoice {invoice_number}"
                
        except Exception as e:
            logger.error(f"Error checking duplicates: {str(e)}")
        
        return result
    
    def _build_fraud_result(self, predictions: Dict, duplicate_check: Dict, invoice_data: Dict) -> Dict:
        """Build comprehensive fraud analysis result"""
        
        # Start with base result
        result = {
            "fraud_detected": False,
            "risk_score": 0.0,
            "risk_level": "LOW",
            "message": "✅ Invoice appears legitimate",
            "ml_predictions": predictions,
            "duplicate_check": duplicate_check,
            "risk_factors": [],
            "detections": [],
            "warnings": []
        }
        
        # Check for duplicate (highest priority)
        if duplicate_check["is_duplicate"]:
            result["fraud_detected"] = True
            result["risk_score"] = 1.0
            result["risk_level"] = "CRITICAL"
            result["message"] = duplicate_check["message"]
            result["risk_factors"].append({
                "factor": "DUPLICATE_INVOICE",
                "severity": "CRITICAL",
                "description": duplicate_check["message"],
                "confidence": 1.0,
                "risk_contribution": 1.0
            })
            return result
        
        # ML-based risk assessment
        risk_score = 0.0
        
        # Anomaly detection contribution
        if predictions["is_anomaly"]:
            anomaly_contribution = min(predictions["anomaly_score"] / 5.0, 0.4)
            risk_score += anomaly_contribution
            result["risk_factors"].append({
                "factor": "STATISTICAL_ANOMALY",
                "severity": "HIGH" if anomaly_contribution > 0.3 else "MEDIUM",
                "description": f"⚠️ Invoice shows statistical anomaly (score: {predictions['anomaly_score']:.2f})",
                "confidence": predictions["confidence"],
                "risk_contribution": anomaly_contribution
            })
        
        # Fraud probability contribution
        if predictions["fraud_probability"] > 0.3:
            fraud_contribution = predictions["fraud_probability"] * 0.6
            risk_score += fraud_contribution
            severity = "HIGH" if predictions["fraud_probability"] > 0.7 else "MEDIUM"
            result["risk_factors"].append({
                "factor": "FRAUD_PATTERN_DETECTED",
                "severity": severity,
                "description": f"🚨 ML model detected fraud patterns (probability: {predictions['fraud_probability']:.1%})",
                "confidence": predictions["confidence"],
                "risk_contribution": fraud_contribution
            })
        
        # Cluster analysis
        if predictions["cluster_label"] == -1:
            cluster_contribution = 0.2
            risk_score += cluster_contribution
            result["risk_factors"].append({
                "factor": "OUTLIER_PATTERN",
                "severity": "MEDIUM",
                "description": "⚠️ Invoice doesn't match typical patterns",
                "confidence": 0.7,
                "risk_contribution": cluster_contribution
            })
        
        # Vendor risk assessment
        vendor_risk = self._assess_vendor_risk(invoice_data)
        if vendor_risk["risk_score"] > 0:
            risk_score += vendor_risk["risk_score"]
            result["risk_factors"].extend(vendor_risk["factors"])
        
        # Cap risk score at 1.0
        result["risk_score"] = min(risk_score, 1.0)
        
        # Determine risk level
        if result["risk_score"] >= 0.7:
            result["risk_level"] = "CRITICAL"
            result["fraud_detected"] = True
            result["message"] = "🚨 HIGH FRAUD RISK: Multiple suspicious patterns detected"
        elif result["risk_score"] >= 0.5:
            result["risk_level"] = "HIGH"
            result["fraud_detected"] = True
            result["message"] = "⚠️ ELEVATED RISK: Significant fraud indicators present"
        elif result["risk_score"] >= 0.3:
            result["risk_level"] = "MEDIUM"
            result["message"] = "⚠️ MODERATE RISK: Some suspicious patterns detected"
        else:
            result["risk_level"] = "LOW"
            result["message"] = "✅ Invoice appears legitimate"
        
        # Add most critical risk factor to message
        if result["risk_factors"]:
            critical_factors = [f for f in result["risk_factors"] if f["severity"] == "CRITICAL"]
            high_factors = [f for f in result["risk_factors"] if f["severity"] == "HIGH"]
            
            if critical_factors:
                result["message"] = critical_factors[0]["description"]
            elif high_factors:
                result["message"] = high_factors[0]["description"]
        
        return result
    
    def _assess_vendor_risk(self, invoice_data: Dict) -> Dict:
        """Assess vendor-specific risks"""
        vendor_risk = {
            "risk_score": 0.0,
            "factors": []
        }
        
        try:
            vendor_name = invoice_data.get("vendor_name") or invoice_data.get("vendorName", "")
            
            if not vendor_name or not self.vendors_collection:
                return vendor_risk
            
            # Check vendor in database
            vendor_record = self.vendors_collection.find_one({
                "name": {"$regex": f"^{vendor_name}$", "$options": "i"}
            })
            
            if vendor_record:
                vendor_status = vendor_record.get("status", "active").lower()
                
                # Blocked vendor
                if vendor_status == "blocked":
                    vendor_risk["risk_score"] += 1.0
                    vendor_risk["factors"].append({
                        "factor": "BLOCKED_VENDOR",
                        "severity": "CRITICAL",
                        "description": f"🚨 BLOCKED VENDOR: {vendor_name} is marked as blocked in the system",
                        "confidence": 1.0,
                        "risk_contribution": 1.0
                    })
                
                # Inactive vendor
                elif vendor_status == "inactive":
                    vendor_risk["risk_score"] += 0.7
                    vendor_risk["factors"].append({
                        "factor": "INACTIVE_VENDOR",
                        "severity": "HIGH",
                        "description": f"⚠️ INACTIVE VENDOR: {vendor_name} is marked as inactive",
                        "confidence": 1.0,
                        "risk_contribution": 0.7
                    })
            else:
                # Check if vendor has any invoices
                invoice_count = self.invoices_collection.count_documents({
                    "vendorName": {"$regex": f"^{vendor_name}$", "$options": "i"}
                })
                
                if invoice_count == 0:
                    # Completely new vendor
                    vendor_risk["risk_score"] += 0.6
                    vendor_risk["factors"].append({
                        "factor": "NEW_VENDOR",
                        "severity": "HIGH",
                        "description": f"🚨 NEW VENDOR: {vendor_name} is not registered in the system",
                        "confidence": 1.0,
                        "risk_contribution": 0.6
                    })
                else:
                    # Vendor has invoices but no record
                    vendor_risk["risk_score"] += 0.4
                    vendor_risk["factors"].append({
                        "factor": "UNREGISTERED_VENDOR",
                        "severity": "MEDIUM",
                        "description": f"⚠️ First transaction with vendor: {vendor_name}",
                        "confidence": 0.8,
                        "risk_contribution": 0.4
                    })
                    
        except Exception as e:
            logger.error(f"Error assessing vendor risk: {str(e)}")
        
        return vendor_risk
    
    def _train_models(self):
        """Train ML models on historical data"""
        try:
            logger.info("🔄 Starting ML model training...")
            
            # Load training data
            training_data = self._load_training_data()
            
            if len(training_data) < self.min_training_samples:
                logger.warning(f"Insufficient training data: {len(training_data)} samples (minimum: {self.min_training_samples})")
                logger.info("Models will train automatically when more data is available")
                return False
            
            # Prepare features and labels
            X, y = self._prepare_training_data(training_data)
            
            logger.info(f"Training on {len(X)} samples with {X.shape[1]} features")
            
            # Fit scaler
            self.scaler.fit(X)
            X_scaled = self.scaler.transform(X)
            
            # Train Isolation Forest (unsupervised anomaly detection)
            logger.info("Training Isolation Forest...")
            self.isolation_forest = IsolationForest(
                contamination=self.anomaly_contamination,
                random_state=42,
                n_estimators=100
            )
            self.isolation_forest.fit(X_scaled)
            
            # Train supervised models if we have labels
            if y is not None and len(np.unique(y)) > 1:
                # Split data
                X_train, X_test, y_train, y_test = train_test_split(
                    X_scaled, y, test_size=0.2, random_state=42
                )
                
                # Train Random Forest
                logger.info("Training Random Forest Classifier...")
                self.random_forest = RandomForestClassifier(
                    n_estimators=100,
                    max_depth=10,
                    random_state=42
                )
                self.random_forest.fit(X_train, y_train)
                
                # Train Logistic Regression
                logger.info("Training Logistic Regression...")
                self.logistic_regression = LogisticRegression(
                    random_state=42,
                    max_iter=1000
                )
                self.logistic_regression.fit(X_train, y_train)
                
                # Evaluate models
                self._evaluate_models(X_test, y_test)
            
            # Train DBSCAN (clustering)
            logger.info("Training DBSCAN Clustering...")
            self.dbscan = DBSCAN(eps=0.5, min_samples=5)
            self.dbscan.fit(X_scaled)
            
            # Save models
            self._save_models()
            
            # Update training state
            self.is_trained = True
            self.last_training_time = datetime.now()
            self.training_data_count = len(training_data)
            
            logger.info(f"✅ ML models trained successfully on {len(training_data)} samples")
            return True
            
        except Exception as e:
            logger.error(f"Error training models: {str(e)}")
            return False
    
    def _load_training_data(self) -> List[Dict]:
        """Load historical invoices for training"""
        try:
            if not self.invoices_collection:
                return []
            
            # Get all invoices with complete data
            invoices = list(self.invoices_collection.find({
                "totalAmount": {"$exists": True, "$gt": 0},
                "vendorName": {"$exists": True, "$ne": ""}
            }).limit(10000))
            
            logger.info(f"Loaded {len(invoices)} invoices for training")
            return invoices
            
        except Exception as e:
            logger.error(f"Error loading training data: {str(e)}")
            return []
    
    def _prepare_training_data(self, invoices: List[Dict]) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        """Prepare features and labels from invoice data"""
        features_list = []
        labels = []
        
        for invoice in invoices:
            try:
                # Convert to format expected by feature extraction
                invoice_data = {
                    "total_amount": invoice.get("totalAmount", 0),
                    "vendor_name": invoice.get("vendorName", ""),
                    "invoice_number": invoice.get("invoiceNumber", ""),
                    "invoice_date": invoice.get("date", ""),
                    "line_items": invoice.get("lineItems", [])
                }
                
                # Extract features
                features = self._extract_features(invoice_data)
                features_list.append(features[0])
                
                # Generate label (0 = legitimate, 1 = fraudulent)
                # Use status and fraud analysis results if available
                status = invoice.get("status", "pending").lower()
                fraud_analysis = invoice.get("fraudAnalysis", {})
                
                # Label as fraud if: rejected, or high fraud risk
                is_fraud = (
                    status == "rejected" or
                    fraud_analysis.get("risk_level") in ["CRITICAL", "HIGH"]
                )
                labels.append(1 if is_fraud else 0)
                
            except Exception as e:
                logger.error(f"Error preparing invoice {invoice.get('_id')}: {str(e)}")
                continue
        
        X = np.array(features_list)
        y = np.array(labels) if labels else None
        
        return X, y
    
    def _evaluate_models(self, X_test: np.ndarray, y_test: np.ndarray):
        """Evaluate trained models"""
        try:
            if self.random_forest:
                y_pred_rf = self.random_forest.predict(X_test)
                logger.info("\n📊 Random Forest Performance:")
                logger.info(f"\n{classification_report(y_test, y_pred_rf)}")
                
            if self.logistic_regression:
                y_pred_lr = self.logistic_regression.predict(X_test)
                logger.info("\n📊 Logistic Regression Performance:")
                logger.info(f"\n{classification_report(y_test, y_pred_lr)}")
                
        except Exception as e:
            logger.error(f"Error evaluating models: {str(e)}")
    
    def _save_models(self):
        """Save trained models to disk"""
        try:
            # Save models
            if self.isolation_forest:
                with open(f"{self.model_dir}/isolation_forest.pkl", "wb") as f:
                    pickle.dump(self.isolation_forest, f)
                    
            if self.random_forest:
                with open(f"{self.model_dir}/random_forest.pkl", "wb") as f:
                    pickle.dump(self.random_forest, f)
                    
            if self.logistic_regression:
                with open(f"{self.model_dir}/logistic_regression.pkl", "wb") as f:
                    pickle.dump(self.logistic_regression, f)
                    
            if self.dbscan:
                with open(f"{self.model_dir}/dbscan.pkl", "wb") as f:
                    pickle.dump(self.dbscan, f)
            
            # Save scaler
            with open(f"{self.model_dir}/scaler.pkl", "wb") as f:
                pickle.dump(self.scaler, f)
            
            # Save metadata
            metadata = {
                "training_date": datetime.now().isoformat(),
                "training_samples": self.training_data_count,
                "min_training_samples": self.min_training_samples
            }
            with open(f"{self.model_dir}/metadata.json", "w") as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"✅ Models saved to {self.model_dir}/")
            
        except Exception as e:
            logger.error(f"Error saving models: {str(e)}")
    
    def _load_models(self) -> bool:
        """Load trained models from disk"""
        try:
            # Check if models exist
            if not os.path.exists(f"{self.model_dir}/isolation_forest.pkl"):
                return False
            
            # Load models
            with open(f"{self.model_dir}/isolation_forest.pkl", "rb") as f:
                self.isolation_forest = pickle.load(f)
                
            if os.path.exists(f"{self.model_dir}/random_forest.pkl"):
                with open(f"{self.model_dir}/random_forest.pkl", "rb") as f:
                    self.random_forest = pickle.load(f)
                    
            if os.path.exists(f"{self.model_dir}/logistic_regression.pkl"):
                with open(f"{self.model_dir}/logistic_regression.pkl", "rb") as f:
                    self.logistic_regression = pickle.load(f)
                    
            if os.path.exists(f"{self.model_dir}/dbscan.pkl"):
                with open(f"{self.model_dir}/dbscan.pkl", "rb") as f:
                    self.dbscan = pickle.load(f)
            
            # Load scaler
            with open(f"{self.model_dir}/scaler.pkl", "rb") as f:
                self.scaler = pickle.load(f)
            
            # Load metadata
            if os.path.exists(f"{self.model_dir}/metadata.json"):
                with open(f"{self.model_dir}/metadata.json", "r") as f:
                    metadata = json.load(f)
                    self.last_training_time = datetime.fromisoformat(metadata["training_date"])
                    self.training_data_count = metadata["training_samples"]
            
            return True
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            return False
    
    def _should_retrain(self) -> bool:
        """Check if models should be retrained"""
        if not self.is_trained:
            return True
            
        if not self.last_training_time:
            return True
            
        # Check if enough time has passed
        hours_since_training = (datetime.now() - self.last_training_time).total_seconds() / 3600
        
        return hours_since_training >= self.retrain_interval_hours
    
    def retrain_now(self):
        """Force immediate model retraining"""
        logger.info("🔄 Manual model retraining requested...")
        return self._train_models()
    
    def get_model_info(self) -> Dict:
        """Get information about trained models"""
        return {
            "is_trained": self.is_trained,
            "last_training_time": self.last_training_time.isoformat() if self.last_training_time else None,
            "training_data_count": self.training_data_count,
            "models_available": {
                "isolation_forest": self.isolation_forest is not None,
                "random_forest": self.random_forest is not None,
                "logistic_regression": self.logistic_regression is not None,
                "dbscan": self.dbscan is not None
            },
            "next_retrain_in_hours": max(0, self.retrain_interval_hours - 
                ((datetime.now() - self.last_training_time).total_seconds() / 3600 
                 if self.last_training_time else 0))
        }
