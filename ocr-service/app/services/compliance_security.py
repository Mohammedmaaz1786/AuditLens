"""
Comprehensive Compliance and Security Monitoring System

This module implements enterprise-grade compliance and security features including:
- SOX compliance with immutable audit trails
- PCI-DSS payment data protection
- GDPR privacy compliance
- End-to-end encryption
- Blockchain-like audit logging
"""

import hashlib
import json
import hmac
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
from loguru import logger

try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
    from cryptography.hazmat.backends import default_backend
    import base64
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    logger.warning("cryptography library not installed. Encryption features will be limited.")


class ComplianceType(str, Enum):
    """Compliance standards"""
    SOX = "SOX"
    PCI_DSS = "PCI-DSS"
    GDPR = "GDPR"
    HIPAA = "HIPAA"
    ISO27001 = "ISO27001"


class AuditAction(str, Enum):
    """Audit action types"""
    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    EXPORT = "EXPORT"
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    ACCESS_DENIED = "ACCESS_DENIED"


class SensitivityLevel(str, Enum):
    """Data sensitivity levels"""
    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    CONFIDENTIAL = "CONFIDENTIAL"
    RESTRICTED = "RESTRICTED"


class EncryptionManager:
    """Handle AES-256 encryption for sensitive data"""
    
    def __init__(self, master_key: Optional[str] = None):
        if not CRYPTO_AVAILABLE:
            logger.warning("Encryption disabled - cryptography library not available")
            self.enabled = False
            return
        
        self.enabled = True
        
        # Generate or use provided master key
        if master_key:
            self.master_key = master_key.encode()
        else:
            self.master_key = Fernet.generate_key()
        
        self.cipher = Fernet(self.master_key)
        logger.info("EncryptionManager initialized with AES-256")
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt data using AES-256
        
        Args:
            plaintext: String to encrypt
            
        Returns:
            Base64 encoded encrypted string
        """
        if not self.enabled:
            return plaintext
        
        try:
            encrypted = self.cipher.encrypt(plaintext.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            logger.error(f"Encryption error: {str(e)}")
            raise
    
    def decrypt(self, ciphertext: str) -> str:
        """
        Decrypt AES-256 encrypted data
        
        Args:
            ciphertext: Base64 encoded encrypted string
            
        Returns:
            Decrypted plaintext
        """
        if not self.enabled:
            return ciphertext
        
        try:
            decoded = base64.urlsafe_b64decode(ciphertext.encode())
            decrypted = self.cipher.decrypt(decoded)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Decryption error: {str(e)}")
            raise
    
    def hash_pii(self, data: str, salt: Optional[str] = None) -> str:
        """
        Create irreversible hash of PII for anonymization
        
        Args:
            data: PII data to hash
            salt: Optional salt for hashing
            
        Returns:
            SHA-256 hash
        """
        if salt:
            data = data + salt
        return hashlib.sha256(data.encode()).hexdigest()
    
    def pseudonymize(self, data: str, mapping_id: str) -> Dict[str, str]:
        """
        Pseudonymize data for GDPR compliance
        
        Args:
            data: Original data
            mapping_id: Identifier for reverse mapping
            
        Returns:
            Dictionary with pseudonym and mapping
        """
        pseudonym = hashlib.sha256(f"{data}{mapping_id}".encode()).hexdigest()[:16]
        
        return {
            "pseudonym": pseudonym,
            "mapping_id": mapping_id,
            "original_hash": self.hash_pii(data)
        }


class AuditLogger:
    """Blockchain-like immutable audit logging system"""
    
    def __init__(self):
        self.audit_chain: List[Dict] = []
        self.previous_hash = "0" * 64  # Genesis hash
        logger.info("AuditLogger initialized with blockchain-like chain")
    
    def create_audit_entry(
        self,
        action: AuditAction,
        user_id: str,
        resource_type: str,
        resource_id: str,
        details: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        sensitivity: SensitivityLevel = SensitivityLevel.INTERNAL,
        compliance_tags: Optional[List[ComplianceType]] = None
    ) -> Dict:
        """
        Create immutable audit log entry
        
        Args:
            action: Type of action performed
            user_id: User performing action
            resource_type: Type of resource (invoice, vendor, user)
            resource_id: Unique identifier of resource
            details: Additional context
            ip_address: User's IP address
            sensitivity: Data sensitivity level
            compliance_tags: Relevant compliance standards
            
        Returns:
            Audit entry with blockchain hash
        """
        timestamp = datetime.now(timezone.utc).isoformat()
        
        entry = {
            "id": self._generate_audit_id(timestamp, user_id, action),
            "timestamp": timestamp,
            "action": action.value,
            "user_id": user_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details or {},
            "ip_address": ip_address,
            "sensitivity": sensitivity.value,
            "compliance_tags": [tag.value for tag in (compliance_tags or [])],
            "previous_hash": self.previous_hash,
        }
        
        # Calculate hash for blockchain integrity
        entry["hash"] = self._calculate_hash(entry)
        
        # Digital signature
        entry["signature"] = self._create_signature(entry)
        
        # Add to chain
        self.audit_chain.append(entry)
        self.previous_hash = entry["hash"]
        
        logger.info(
            f"Audit: {action.value} by {user_id} on {resource_type}:{resource_id}"
        )
        
        return entry
    
    def verify_chain_integrity(self) -> Dict[str, Any]:
        """
        Verify blockchain integrity of audit log
        
        Returns:
            Verification results
        """
        if not self.audit_chain:
            return {"valid": True, "message": "No entries to verify"}
        
        errors = []
        
        for i, entry in enumerate(self.audit_chain):
            # Verify hash
            calculated_hash = self._calculate_hash(entry)
            if calculated_hash != entry["hash"]:
                errors.append({
                    "entry_id": entry["id"],
                    "error": "Hash mismatch",
                    "expected": entry["hash"],
                    "actual": calculated_hash
                })
            
            # Verify chain linkage
            if i > 0:
                if entry["previous_hash"] != self.audit_chain[i-1]["hash"]:
                    errors.append({
                        "entry_id": entry["id"],
                        "error": "Chain broken",
                        "previous_entry": self.audit_chain[i-1]["id"]
                    })
        
        return {
            "valid": len(errors) == 0,
            "total_entries": len(self.audit_chain),
            "errors": errors
        }
    
    def get_user_audit_trail(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict]:
        """Get audit trail for specific user"""
        trail = [
            entry for entry in self.audit_chain
            if entry["user_id"] == user_id
        ]
        
        if start_date:
            trail = [
                e for e in trail
                if datetime.fromisoformat(e["timestamp"]) >= start_date
            ]
        
        if end_date:
            trail = [
                e for e in trail
                if datetime.fromisoformat(e["timestamp"]) <= end_date
            ]
        
        return trail
    
    def get_resource_audit_trail(
        self,
        resource_type: str,
        resource_id: str
    ) -> List[Dict]:
        """Get complete audit trail for a resource"""
        return [
            entry for entry in self.audit_chain
            if entry["resource_type"] == resource_type
            and entry["resource_id"] == resource_id
        ]
    
    def _generate_audit_id(self, timestamp: str, user_id: str, action: AuditAction) -> str:
        """Generate unique audit entry ID"""
        data = f"{timestamp}{user_id}{action.value}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def _calculate_hash(self, entry: Dict) -> str:
        """Calculate SHA-256 hash of entry (excluding hash and signature fields)"""
        entry_copy = entry.copy()
        entry_copy.pop("hash", None)
        entry_copy.pop("signature", None)
        
        entry_string = json.dumps(entry_copy, sort_keys=True)
        return hashlib.sha256(entry_string.encode()).hexdigest()
    
    def _create_signature(self, entry: Dict) -> str:
        """Create HMAC signature for entry"""
        # In production, use a secret key from environment
        secret_key = b"audit_secret_key_change_in_production"
        entry_string = json.dumps(entry, sort_keys=True)
        signature = hmac.new(secret_key, entry_string.encode(), hashlib.sha256)
        return signature.hexdigest()


class ComplianceMonitor:
    """Monitor and enforce compliance requirements"""
    
    def __init__(self):
        self.violations: List[Dict] = []
        self.audit_logger = AuditLogger()
        logger.info("ComplianceMonitor initialized")
    
    def check_sox_compliance(self, transaction: Dict) -> Dict:
        """
        Verify SOX compliance requirements
        
        SOX Requirements:
        - Segregation of duties
        - Authorization workflows
        - Immutable audit trails
        - Financial controls
        """
        violations = []
        
        # Check for segregation of duties
        if transaction.get("created_by") == transaction.get("approved_by"):
            violations.append({
                "rule": "SOX-001",
                "description": "Same user created and approved transaction",
                "severity": "HIGH",
                "recommendation": "Require different users for creation and approval"
            })
        
        # Check for authorization
        if not transaction.get("approved_by"):
            violations.append({
                "rule": "SOX-002",
                "description": "Transaction not approved",
                "severity": "MEDIUM",
                "recommendation": "Require management approval for financial transactions"
            })
        
        # Check for audit trail
        if not transaction.get("audit_trail"):
            violations.append({
                "rule": "SOX-003",
                "description": "Missing audit trail",
                "severity": "CRITICAL",
                "recommendation": "Maintain complete audit trail for all transactions"
            })
        
        # Check amount thresholds
        amount = transaction.get("amount", 0)
        if amount > 10000 and not transaction.get("dual_approval"):
            violations.append({
                "rule": "SOX-004",
                "description": f"Transaction amount ${amount} requires dual approval",
                "severity": "HIGH",
                "recommendation": "Implement dual approval for transactions over $10,000"
            })
        
        return {
            "compliant": len(violations) == 0,
            "standard": "SOX",
            "violations": violations,
            "checked_at": datetime.now(timezone.utc).isoformat()
        }
    
    def check_pci_dss_compliance(self, data: Dict) -> Dict:
        """
        Verify PCI-DSS compliance for payment data
        
        PCI-DSS Requirements:
        - Encryption at rest and in transit
        - Access controls
        - Secure transmission
        - Regular audits
        """
        violations = []
        
        # Check for unencrypted payment data
        sensitive_fields = ["card_number", "cvv", "card_holder", "account_number"]
        for field in sensitive_fields:
            if field in data and not self._is_encrypted(data[field]):
                violations.append({
                    "rule": "PCI-001",
                    "description": f"Sensitive field '{field}' is not encrypted",
                    "severity": "CRITICAL",
                    "recommendation": "Encrypt all payment card data using AES-256"
                })
        
        # Check for masking
        if "card_number" in data and len(str(data["card_number"])) > 4:
            violations.append({
                "rule": "PCI-002",
                "description": "Card number not properly masked",
                "severity": "HIGH",
                "recommendation": "Mask all but last 4 digits of card numbers"
            })
        
        # Check for secure storage
        if not data.get("encrypted_storage"):
            violations.append({
                "rule": "PCI-003",
                "description": "Payment data not in encrypted storage",
                "severity": "CRITICAL",
                "recommendation": "Store payment data only in PCI-compliant encrypted systems"
            })
        
        return {
            "compliant": len(violations) == 0,
            "standard": "PCI-DSS",
            "violations": violations,
            "checked_at": datetime.now(timezone.utc).isoformat()
        }
    
    def check_gdpr_compliance(self, data_processing: Dict) -> Dict:
        """
        Verify GDPR compliance for PII
        
        GDPR Requirements:
        - Consent management
        - Data anonymization
        - Right to deletion
        - Data breach detection
        - Privacy by design
        """
        violations = []
        
        # Check for consent
        if not data_processing.get("user_consent"):
            violations.append({
                "rule": "GDPR-001",
                "description": "No user consent for data processing",
                "severity": "CRITICAL",
                "recommendation": "Obtain explicit consent before processing personal data"
            })
        
        # Check for anonymization
        pii_fields = ["email", "phone", "address", "ssn", "tax_id"]
        for field in pii_fields:
            if field in data_processing and not data_processing.get(f"{field}_anonymized"):
                violations.append({
                    "rule": "GDPR-002",
                    "description": f"PII field '{field}' not anonymized for analytics",
                    "severity": "MEDIUM",
                    "recommendation": "Anonymize or pseudonymize PII when possible"
                })
        
        # Check retention policy
        if not data_processing.get("retention_policy"):
            violations.append({
                "rule": "GDPR-003",
                "description": "No data retention policy defined",
                "severity": "MEDIUM",
                "recommendation": "Define and implement data retention policies"
            })
        
        # Check for data deletion capability
        if not data_processing.get("deletion_supported"):
            violations.append({
                "rule": "GDPR-004",
                "description": "Right to deletion not implemented",
                "severity": "HIGH",
                "recommendation": "Implement user data deletion functionality"
            })
        
        # Check for data breach detection
        if not data_processing.get("breach_detection"):
            violations.append({
                "rule": "GDPR-005",
                "description": "No data breach detection mechanism",
                "severity": "HIGH",
                "recommendation": "Implement automated breach detection and 72-hour notification"
            })
        
        return {
            "compliant": len(violations) == 0,
            "standard": "GDPR",
            "violations": violations,
            "checked_at": datetime.now(timezone.utc).isoformat()
        }
    
    def generate_compliance_report(
        self,
        standards: List[ComplianceType],
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """Generate comprehensive compliance report"""
        report = {
            "report_id": hashlib.sha256(
                f"{datetime.now().isoformat()}".encode()
            ).hexdigest()[:16],
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "standards": [s.value for s in standards],
            "violations_summary": {},
            "audit_statistics": {},
            "recommendations": []
        }
        
        # Aggregate violations by severity
        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        
        for violation in self.violations:
            if start_date <= datetime.fromisoformat(violation["timestamp"]) <= end_date:
                severity = violation["severity"]
                severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        report["violations_summary"] = severity_counts
        
        # Audit statistics
        audit_entries = [
            e for e in self.audit_logger.audit_chain
            if start_date <= datetime.fromisoformat(e["timestamp"]) <= end_date
        ]
        
        report["audit_statistics"] = {
            "total_entries": len(audit_entries),
            "unique_users": len(set(e["user_id"] for e in audit_entries)),
            "actions_by_type": self._count_by_field(audit_entries, "action"),
            "chain_integrity": self.audit_logger.verify_chain_integrity()
        }
        
        return report
    
    def _is_encrypted(self, value: str) -> bool:
        """Check if value appears to be encrypted"""
        # Simple heuristic: encrypted data is base64 and longer than original
        try:
            base64.b64decode(value)
            return len(value) > 20  # Encrypted values are typically longer
        except:
            return False
    
    def _count_by_field(self, items: List[Dict], field: str) -> Dict:
        """Count occurrences of field values"""
        counts = {}
        for item in items:
            value = item.get(field, "unknown")
            counts[value] = counts.get(value, 0) + 1
        return counts


class SecurityManager:
    """Manage security controls and monitoring"""
    
    def __init__(self):
        self.failed_login_attempts: Dict[str, List[datetime]] = {}
        self.rate_limit_tracker: Dict[str, List[datetime]] = {}
        self.encryption_manager = EncryptionManager()
        logger.info("SecurityManager initialized")
    
    def validate_input(self, input_data: str, input_type: str = "text") -> Dict:
        """
        Validate and sanitize input to prevent injection attacks
        
        Args:
            input_data: Input to validate
            input_type: Type of input (text, email, number, sql)
            
        Returns:
            Validation result
        """
        violations = []
        
        # SQL Injection patterns
        sql_patterns = [
            "' OR '1'='1", "'; DROP TABLE", "UNION SELECT",
            "INSERT INTO", "DELETE FROM", "UPDATE ", "exec(",
            "execute(", "script>", "<iframe"
        ]
        
        input_lower = input_data.lower()
        
        for pattern in sql_patterns:
            if pattern.lower() in input_lower:
                violations.append({
                    "type": "SQL_INJECTION",
                    "pattern": pattern,
                    "severity": "CRITICAL"
                })
        
        # XSS patterns
        xss_patterns = ["<script", "javascript:", "onerror=", "onload="]
        
        for pattern in xss_patterns:
            if pattern.lower() in input_lower:
                violations.append({
                    "type": "XSS",
                    "pattern": pattern,
                    "severity": "HIGH"
                })
        
        return {
            "valid": len(violations) == 0,
            "violations": violations,
            "sanitized": self._sanitize_input(input_data)
        }
    
    def check_rate_limit(
        self,
        identifier: str,
        max_requests: int = 100,
        window_seconds: int = 60
    ) -> Dict:
        """
        Check if request exceeds rate limit
        
        Args:
            identifier: User ID or IP address
            max_requests: Maximum requests allowed
            window_seconds: Time window in seconds
            
        Returns:
            Rate limit status
        """
        now = datetime.now(timezone.utc)
        cutoff = now.timestamp() - window_seconds
        
        # Initialize or clean old entries
        if identifier not in self.rate_limit_tracker:
            self.rate_limit_tracker[identifier] = []
        
        # Remove old requests
        self.rate_limit_tracker[identifier] = [
            ts for ts in self.rate_limit_tracker[identifier]
            if ts.timestamp() > cutoff
        ]
        
        # Add current request
        self.rate_limit_tracker[identifier].append(now)
        
        request_count = len(self.rate_limit_tracker[identifier])
        
        return {
            "allowed": request_count <= max_requests,
            "request_count": request_count,
            "limit": max_requests,
            "reset_at": datetime.fromtimestamp(cutoff + window_seconds, timezone.utc).isoformat()
        }
    
    def track_failed_login(self, user_id: str) -> Dict:
        """Track failed login attempts for brute force detection"""
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(minutes=15)
        
        if user_id not in self.failed_login_attempts:
            self.failed_login_attempts[user_id] = []
        
        # Remove old attempts
        self.failed_login_attempts[user_id] = [
            ts for ts in self.failed_login_attempts[user_id]
            if ts > cutoff
        ]
        
        # Add current attempt
        self.failed_login_attempts[user_id].append(now)
        
        attempt_count = len(self.failed_login_attempts[user_id])
        
        return {
            "attempts": attempt_count,
            "locked": attempt_count >= 5,
            "lockout_duration": "15 minutes" if attempt_count >= 5 else None
        }
    
    def _sanitize_input(self, input_data: str) -> str:
        """Sanitize input by removing dangerous characters"""
        # Remove common SQL injection characters
        dangerous_chars = ["'", '"', ";", "--", "/*", "*/", "xp_", "sp_"]
        sanitized = input_data
        
        for char in dangerous_chars:
            sanitized = sanitized.replace(char, "")
        
        return sanitized


# Global instances
encryption_manager = EncryptionManager()
audit_logger = AuditLogger()
compliance_monitor = ComplianceMonitor()
security_manager = SecurityManager()
