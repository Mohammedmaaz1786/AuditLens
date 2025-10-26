"""
Azure Document Intelligence Service
Provides OCR and document analysis using Azure AI Document Intelligence
"""

import os
import re
import logging
from typing import Dict, List, Any, Optional
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential
from app.config import settings

logger = logging.getLogger(__name__)


class AzureOCRService:
    """Azure Document Intelligence OCR Service"""
    
    def __init__(self):
        """Initialize Azure Document Intelligence client"""
        endpoint = settings.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
        key = settings.AZURE_DOCUMENT_INTELLIGENCE_KEY
        
        if not endpoint or not key:
            raise ValueError(
                "Azure Document Intelligence credentials not configured. "
                "Please set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and "
                "AZURE_DOCUMENT_INTELLIGENCE_KEY in .env file."
            )
        
        self.client = DocumentAnalysisClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(key)
        )
        
        logger.info(f"✅ Azure Document Intelligence service initialized: {endpoint}")
    
    def analyze_invoice(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze invoice using Azure Document Intelligence prebuilt invoice model
        
        Args:
            file_path: Path to the invoice file (PDF, PNG, JPG, TIFF)
            
        Returns:
            Extracted and structured invoice data
        """
        try:
            logger.info(f"🔍 Analyzing invoice with Azure Document Intelligence: {file_path}")
            
            with open(file_path, "rb") as f:
                poller = self.client.begin_analyze_document(
                    "prebuilt-invoice",  # Use prebuilt invoice model
                    document=f
                )
            
            # Wait for the result
            result = poller.result()
            
            if not result.documents:
                logger.warning("⚠️  No documents found in analysis result")
                return self._empty_result()
            
            # Extract invoice data from the first document
            invoice_data = self._extract_invoice_data(result.documents[0])
            
            logger.info(f"✅ Successfully analyzed invoice: {invoice_data.get('invoiceNumber', 'unknown')}")
            logger.info(f"   Confidence: {invoice_data.get('confidence', 0):.2%}")
            
            return invoice_data
            
        except Exception as e:
            logger.error(f"❌ Error analyzing invoice with Azure: {str(e)}")
            raise
    
    def _extract_invoice_data(self, document) -> Dict[str, Any]:
        """Extract structured data from Azure Document Intelligence result"""
        
        fields = document.fields
        
        # Extract vendor information
        vendor_name = self._get_field_value(fields, 'VendorName')
        vendor_address = self._get_field_value(fields, 'VendorAddress')
        vendor_tax_id = self._get_field_value(fields, 'VendorTaxId')
        
        # Try to extract vendor contact info from address
        vendor_email = None
        vendor_phone = None
        if vendor_address:
            # Simple extraction - you can enhance this with regex
            if '@' in str(vendor_address):
                email_match = re.search(r'[\w\.-]+@[\w\.-]+', str(vendor_address))
                if email_match:
                    vendor_email = email_match.group(0)
            
            phone_match = re.search(r'\+?[\d\s\-\(\)]+', str(vendor_address))
            if phone_match:
                vendor_phone = phone_match.group(0).strip()
        
        # Extract customer information
        customer_name = self._get_field_value(fields, 'CustomerName')
        customer_address = self._get_field_value(fields, 'CustomerAddress')
        
        # Extract invoice details
        invoice_id = self._get_field_value(fields, 'InvoiceId')
        invoice_date = self._get_field_value(fields, 'InvoiceDate')
        due_date = self._get_field_value(fields, 'DueDate')
        
        # Format dates to string if they're date objects
        if invoice_date and hasattr(invoice_date, 'isoformat'):
            invoice_date = invoice_date.isoformat()
        if due_date and hasattr(due_date, 'isoformat'):
            due_date = due_date.isoformat()
        
        # Extract amounts
        subtotal = self._get_field_value(fields, 'SubTotal', 0.0)
        tax = self._get_field_value(fields, 'TotalTax', 0.0)
        total = self._get_field_value(fields, 'InvoiceTotal', 0.0)
        
        # Convert currency amounts to float
        subtotal = self._extract_currency_amount(subtotal)
        tax = self._extract_currency_amount(tax)
        total = self._extract_currency_amount(total)
        
        # Calculate tax if Azure returns 0 but we have total and subtotal
        if tax == 0.0 and total > 0 and subtotal > 0:
            calculated_tax = total - subtotal
            if calculated_tax > 0:
                tax = calculated_tax
                logger.info(f"🧮 Calculated tax from total-subtotal: ${tax:.2f}")
        
        # Extract line items
        line_items = self._extract_line_items(fields.get('Items'))
        
        # Extract payment terms
        payment_terms = self._get_field_value(fields, 'PaymentTerm')
        
        # Get currency code
        currency = self._get_field_value(fields, 'CurrencyCode', 'USD')
        
        return {
            "vendor": {
                "name": vendor_name,
                "address": vendor_address,
                "taxId": vendor_tax_id,
                "email": vendor_email,
                "phone": vendor_phone
            },
            "customer": {
                "name": customer_name,
                "address": customer_address
            },
            "invoiceNumber": invoice_id,
            "invoiceDate": invoice_date,
            "dueDate": due_date,
            "subtotal": subtotal,
            "tax": tax,
            "total": total,
            "currency": currency,
            "lineItems": line_items,
            "paymentTerms": payment_terms,
            "notes": None,
            "confidence": document.confidence,
            "raw_text": self._extract_raw_text(fields)
        }
    
    def _extract_line_items(self, items_field) -> List[Dict[str, Any]]:
        """Extract line items from invoice"""
        line_items = []
        
        if not items_field or not items_field.value:
            logger.info("No line items found in invoice")
            return line_items
        
        logger.info(f"📋 Extracting {len(items_field.value)} line items")
        
        for idx, item in enumerate(items_field.value):
            if hasattr(item, 'value') and isinstance(item.value, dict):
                fields = item.value
                
                description = self._get_field_value(fields, 'Description', '')
                quantity = self._get_field_value(fields, 'Quantity', 1.0)
                unit_price = self._get_field_value(fields, 'UnitPrice', 0.0)
                amount = self._get_field_value(fields, 'Amount', 0.0)
                product_code = self._get_field_value(fields, 'ProductCode')
                
                # Convert to proper types
                quantity = float(quantity) if quantity else 1.0
                unit_price = self._extract_currency_amount(unit_price)
                amount = self._extract_currency_amount(amount)
                
                line_items.append({
                    "description": description,
                    "quantity": quantity,
                    "unitPrice": unit_price,
                    "amount": amount,
                    "productCode": product_code
                })
                
                logger.debug(f"   Line {idx+1}: {description} - {quantity} x ${unit_price} = ${amount}")
        
        logger.info(f"✅ Extracted {len(line_items)} line items")
        return line_items
    
    def _extract_currency_amount(self, value: Any) -> float:
        """Extract numeric amount from currency field"""
        if value is None:
            return 0.0
        
        # If it's already a number
        if isinstance(value, (int, float)):
            return float(value)
        
        # If it's a CurrencyValue object
        if hasattr(value, 'amount'):
            return float(value.amount) if value.amount else 0.0
        
        # If it's a string, try to parse it
        if isinstance(value, str):
            try:
                # Remove currency symbols and commas
                cleaned = value.replace('$', '').replace(',', '').replace('€', '').replace('£', '').strip()
                return float(cleaned)
            except ValueError:
                return 0.0
        
        return 0.0
    
    def _get_field_value(self, fields: Dict, field_name: str, default: Any = None) -> Any:
        """Safely extract field value from Azure result and convert complex types to strings"""
        if field_name not in fields:
            return default
        
        field = fields[field_name]
        
        if field is None:
            return default
        
        # Handle different field types
        if hasattr(field, 'value'):
            value = field.value
            
            if value is None:
                return default
            
            # Handle AddressValue objects (convert to formatted string)
            if hasattr(value, '__class__') and 'AddressValue' in str(type(value)):
                return self._address_value_to_string(value)
            
            return value
        
        if hasattr(field, 'content'):
            return field.content if field.content is not None else default
        
        return default
    
    def _address_value_to_string(self, address_value) -> str:
        """Convert Azure AddressValue object to formatted string"""
        parts = []
        
        # Extract address components in logical order
        if hasattr(address_value, 'house_number') and address_value.house_number:
            parts.append(str(address_value.house_number))
        
        if hasattr(address_value, 'road') and address_value.road:
            parts.append(str(address_value.road))
        
        if hasattr(address_value, 'unit') and address_value.unit:
            parts.append(f"Unit {address_value.unit}")
        
        if hasattr(address_value, 'city') and address_value.city:
            parts.append(str(address_value.city))
        
        if hasattr(address_value, 'state') and address_value.state:
            parts.append(str(address_value.state))
        
        if hasattr(address_value, 'postal_code') and address_value.postal_code:
            parts.append(str(address_value.postal_code))
        
        if hasattr(address_value, 'country_region') and address_value.country_region:
            parts.append(str(address_value.country_region))
        
        return ', '.join(parts) if parts else ''
    
    def _extract_raw_text(self, fields: Dict) -> str:
        """Extract all text content for raw_text field"""
        text_parts = []
        
        for field_name, field in fields.items():
            if hasattr(field, 'content') and field.content:
                text_parts.append(f"{field_name}: {field.content}")
            elif hasattr(field, 'value') and field.value:
                text_parts.append(f"{field_name}: {field.value}")
        
        return "\n".join(text_parts)
    
    def _empty_result(self) -> Dict[str, Any]:
        """Return empty result structure when no data is extracted"""
        return {
            "vendor": {
                "name": None,
                "address": None,
                "taxId": None,
                "email": None,
                "phone": None
            },
            "customer": {
                "name": None,
                "address": None
            },
            "invoiceNumber": None,
            "invoiceDate": None,
            "dueDate": None,
            "subtotal": 0.0,
            "tax": 0.0,
            "total": 0.0,
            "currency": "USD",
            "lineItems": [],
            "paymentTerms": None,
            "notes": None,
            "confidence": 0.0,
            "raw_text": ""
        }


# Create singleton instance - will be initialized when credentials are available
def get_azure_ocr_service() -> Optional[AzureOCRService]:
    """Get Azure OCR service instance if credentials are configured"""
    try:
        endpoint = settings.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
        key = settings.AZURE_DOCUMENT_INTELLIGENCE_KEY
        
        if not endpoint or not key:
            logger.warning("⚠️  Azure Document Intelligence credentials not configured in .env")
            return None
        
        return AzureOCRService()
    except Exception as e:
        logger.error(f"❌ Failed to initialize Azure OCR service: {str(e)}")
        return None
