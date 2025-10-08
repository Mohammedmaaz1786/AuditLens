"""Pydantic models for request/response schemas"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class LineItem(BaseModel):
    """Invoice line item"""
    description: str
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    amount: Optional[float] = None
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)


class InvoiceData(BaseModel):
    """Extracted invoice data"""
    vendor_name: Optional[str] = None
    vendor_address: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    total_amount: Optional[float] = None
    amount_paid: Optional[float] = None
    balance_due: Optional[float] = None
    currency: Optional[str] = "USD"
    line_items: List[LineItem] = []
    payment_instructions: Optional[str] = None
    notes: Optional[str] = None
    
    # Confidence scores for each field
    confidence_scores: Dict[str, float] = {}
    
    # Raw extracted text
    raw_text: Optional[str] = None


class ProcessingMetadata(BaseModel):
    """Processing metadata"""
    filename: str
    file_type: str
    file_size: int
    processing_time: float
    ocr_language: str
    timestamp: datetime = Field(default_factory=datetime.now)


class ProcessingResult(BaseModel):
    """Complete processing result"""
    success: bool
    filename: str
    data: Optional[InvoiceData] = None
    confidence_score: float = Field(ge=0.0, le=1.0)
    processing_time: float
    metadata: Optional[ProcessingMetadata] = None
    error: Optional[str] = None
    warnings: List[str] = []
    fraud_analysis: Optional[Dict[str, Any]] = None  # Fraud detection results


class HealthCheck(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    detail: str
    timestamp: datetime = Field(default_factory=datetime.now)
