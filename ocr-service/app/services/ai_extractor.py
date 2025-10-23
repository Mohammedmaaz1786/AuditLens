"""AI-powered entity extraction using Google Gemini"""

import os
import json
from typing import Dict, Optional
from loguru import logger
import google.generativeai as genai
from app.config import settings


class AIExtractor:
    """Extract structured data from invoice text using Gemini AI"""
    
    def __init__(self):
        # Configure Gemini API
        api_key = settings.GEMINI_API_KEY
        if not api_key or api_key == "your_google_ai_api_key_here":
            logger.warning("No Gemini API key found. AI extraction will be disabled.")
            self.model = None
        else:
            genai.configure(api_key=api_key)
            # Use the latest Gemini 2.0 Flash model
            self.model = genai.GenerativeModel('gemini-2.0-flash')
            logger.info("Gemini AI (gemini-2.0-flash) initialized successfully")
    
    def extract_invoice_data(self, ocr_text: str) -> Dict:
        """
        Extract structured invoice data using AI
        
        Args:
            ocr_text: Raw text extracted from OCR
            
        Returns:
            Dictionary with structured invoice data
        """
        if not self.model:
            logger.warning("AI extraction unavailable - no API key configured")
            return self._fallback_extraction()
        
        try:
            prompt = self._build_extraction_prompt(ocr_text)
            
            logger.info("Sending text to Gemini AI for extraction...")
            response = self.model.generate_content(prompt)
            
            # Parse the JSON response
            result_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if result_text.startswith("```json"):
                result_text = result_text[7:]  # Remove ```json
            if result_text.startswith("```"):
                result_text = result_text[3:]  # Remove ```
            if result_text.endswith("```"):
                result_text = result_text[:-3]  # Remove ```
            
            result_text = result_text.strip()
            
            extracted_data = json.loads(result_text)
            logger.info("AI extraction successful")
            
            # Add confidence scores
            extracted_data['ai_extracted'] = True
            extracted_data['extraction_method'] = 'gemini-ai'
            
            return extracted_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.error(f"Response text: {response.text}")
            return self._fallback_extraction()
        except Exception as e:
            logger.error(f"AI extraction error: {str(e)}")
            return self._fallback_extraction()
    
    def _build_extraction_prompt(self, ocr_text: str) -> str:
        """Build the prompt for Gemini AI"""
        return f"""You are an expert invoice data extraction system. Analyze the following text extracted from an invoice using OCR and extract structured information.

OCR TEXT:
{ocr_text}

Extract the following information and return ONLY a valid JSON object (no other text):

{{
  "invoiceNumber": "string or null",
  "vendorName": "string or null",
  "vendorAddress": "string or null",
  "vendorEmail": "string or null",
  "vendorPhone": "string or null",
  "billToName": "string or null",
  "billToAddress": "string or null",
  "billToEmail": "string or null",
  "billToPhone": "string or null",
  "billToCompany": "string or null",
  "customerName": "string or null",
  "customerAddress": "string or null",
  "customerEmail": "string or null",
  "customerPhone": "string or null",
  "shipToName": "string or null",
  "shipToAddress": "string or null",
  "date": "YYYY-MM-DD format or null",
  "dueDate": "YYYY-MM-DD format or null",
  "subtotal": "number or null",
  "tax": "number or null",
  "total": "number or null",
  "amountPaid": "number or null",
  "balanceDue": "number or null",
  "currency": "USD, EUR, etc. or null",
  "lineItems": [
    {{
      "description": "string",
      "quantity": "number",
      "rate": "number",
      "amount": "number"
    }}
  ],
  "paymentInstructions": "string or null",
  "notes": "string or null",
  "confidence": {{
    "invoiceNumber": 0.0-1.0,
    "vendorName": 0.0-1.0,
    "date": 0.0-1.0,
    "total": 0.0-1.0,
    "lineItems": 0.0-1.0
  }}
}}

IMPORTANT RULES:
1. Return ONLY valid JSON, no markdown, no explanations
2. Use null for fields you cannot find
3. For dates, convert to YYYY-MM-DD format (e.g., "Jun 22, 2021" becomes "2021-06-22")
4. For amounts, extract only the numeric value (e.g., "$1,564.00" becomes 1564.00)
5. Extract ALL line items you can find
6. Provide confidence scores (0.0-1.0) for key fields based on how certain you are
7. If currency symbol is present ($, €, £), identify the currency
8. Be smart about OCR errors (e.g., "INV-O05" might mean "INV-005")
9. IMPORTANT: Look for email addresses in the vendor section (usually near vendor name/address). Common patterns: info@, contact@, sales@, accounts@, support@
10. IMPORTANT: Look for phone numbers near vendor information. May include country codes (+1, etc.) or be in format (XXX) XXX-XXXX or XXX-XXX-XXXX
11. Extract contact information from VENDOR section only, not from bill-to or customer sections
12. RECEIVER/CUSTOMER INFORMATION: Look for sections labeled "Bill To:", "Invoice To:", "Customer:", "Sold To:", or "Billed To:"
    - Extract the company name or person name in billToName/customerName
    - Extract the complete address in billToAddress/customerAddress
    - Extract email and phone if present in the bill-to section
    - billToCompany is for the company name if different from billToName
13. SHIP TO: If there's a separate "Ship To:" section, extract shipToName and shipToAddress
14. Distinguish between VENDOR (who issues the invoice) and CUSTOMER/BILL-TO (who receives and pays the invoice)

Return ONLY the JSON object, nothing else."""

    def _fallback_extraction(self) -> Dict:
        """Return empty structure when AI extraction fails"""
        return {
            "invoiceNumber": None,
            "vendorName": None,
            "vendorAddress": None,
            "vendorEmail": None,
            "vendorPhone": None,
            "billToName": None,
            "billToAddress": None,
            "billToEmail": None,
            "billToPhone": None,
            "billToCompany": None,
            "customerName": None,
            "customerAddress": None,
            "customerEmail": None,
            "customerPhone": None,
            "shipToName": None,
            "shipToAddress": None,
            "date": None,
            "dueDate": None,
            "subtotal": None,
            "tax": None,
            "total": None,
            "amountPaid": None,
            "balanceDue": None,
            "currency": None,
            "lineItems": [],
            "paymentInstructions": None,
            "notes": None,
            "confidence": {
                "invoiceNumber": 0.0,
                "vendorName": 0.0,
                "date": 0.0,
                "total": 0.0,
                "lineItems": 0.0
            },
            "ai_extracted": False,
            "extraction_method": 'regex-fallback'
        }
