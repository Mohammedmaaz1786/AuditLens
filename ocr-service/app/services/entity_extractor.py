"""Entity extraction using NLP and pattern matching"""

import re
from typing import Dict, Optional, List, Tuple
from datetime import datetime
from dateutil import parser as date_parser
from loguru import logger


class EntityExtractor:
    """Extract entities from OCR text using NLP and regex"""
    
    def __init__(self):
        self.patterns = self._compile_patterns()
        
    def _compile_patterns(self) -> Dict:
        """Compile regex patterns for entity extraction"""
        return {
            'invoice_number': [
                r'invoice\s*#?\s*:?\s*([A-Z0-9\-]+)',
                r'invoice\s+number\s*:?\s*([A-Z0-9\-]+)',
                r'inv\s*#?\s*:?\s*([A-Z0-9\-]+)',
                r'#\s*([A-Z0-9\-]{5,})',
            ],
            'amount': [
                r'total\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})',
                r'amount\s+due\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})',
                r'balance\s+due\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})',
                r'grand\s+total\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})',
            ],
            'subtotal': [
                r'subtotal\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})',
                r'sub\s*-?\s*total\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})',
            ],
            'tax': [
                r'tax\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})',
                r'sales\s+tax\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})',
                r'vat\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})',
            ],
            'date': [
                r'date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'invoice\s+date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})',
            ],
            'due_date': [
                r'due\s+date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'payment\s+due\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            ],
            'vendor_name': [
                r'^([A-Z][A-Za-z\s&,\.]{3,40}(?:Inc|LLC|Ltd|Corporation|Corp)?)',
            ],
            'email': [
                r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
            ],
            'phone': [
                r'(\+?\d{1,3}[\s\-]?)?(\(?\d{3}\)?[\s\-]?)?\d{3}[\s\-]?\d{4}',
            ],
        }
    
    def extract_entities(self, text: str) -> Dict[str, any]:
        """
        Extract all entities from text
        
        Args:
            text: OCR extracted text
            
        Returns:
            Dictionary of extracted entities with confidence scores
        """
        entities = {}
        confidence_scores = {}
        
        # Normalize text
        text = self._normalize_text(text)
        
        # Extract invoice number
        invoice_num, conf = self._extract_invoice_number(text)
        if invoice_num:
            entities['invoice_number'] = invoice_num
            confidence_scores['invoice_number'] = conf
        
        # Extract amounts
        total, conf = self._extract_amount(text, 'amount')
        if total:
            entities['total_amount'] = total
            confidence_scores['total_amount'] = conf
        
        subtotal, conf = self._extract_amount(text, 'subtotal')
        if subtotal:
            entities['subtotal'] = subtotal
            confidence_scores['subtotal'] = conf
        
        tax, conf = self._extract_amount(text, 'tax')
        if tax:
            entities['tax'] = tax
            confidence_scores['tax'] = conf
        
        # Extract dates
        invoice_date, conf = self._extract_date(text, 'date')
        if invoice_date:
            entities['invoice_date'] = invoice_date
            confidence_scores['invoice_date'] = conf
        
        due_date, conf = self._extract_date(text, 'due_date')
        if due_date:
            entities['due_date'] = due_date
            confidence_scores['due_date'] = conf
        
        # Extract vendor name
        vendor, conf = self._extract_vendor_name(text)
        if vendor:
            entities['vendor_name'] = vendor
            confidence_scores['vendor_name'] = conf
        
        # Extract contact info
        email, conf = self._extract_pattern(text, 'email')
        if email:
            entities['vendor_email'] = email
            confidence_scores['vendor_email'] = conf
        
        phone, conf = self._extract_pattern(text, 'phone')
        if phone:
            entities['vendor_phone'] = phone
            confidence_scores['vendor_phone'] = conf
        
        # Extract line items
        line_items = self._extract_line_items(text)
        if line_items:
            entities['line_items'] = line_items
        
        entities['confidence_scores'] = confidence_scores
        
        return entities
    
    def _normalize_text(self, text: str) -> str:
        """Normalize text for better matching"""
        # Convert to lowercase for pattern matching
        text = text.lower()
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def _extract_invoice_number(self, text: str) -> Tuple[Optional[str], float]:
        """Extract invoice number with confidence"""
        for pattern in self.patterns['invoice_number']:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                invoice_num = match.group(1).strip().upper()
                confidence = 0.9 if 'invoice' in match.group(0).lower() else 0.7
                logger.info(f"Extracted invoice number: {invoice_num} (confidence: {confidence})")
                return invoice_num, confidence
        return None, 0.0
    
    def _extract_amount(self, text: str, amount_type: str) -> Tuple[Optional[float], float]:
        """Extract monetary amount with confidence"""
        patterns = self.patterns.get(amount_type, [])
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount_str = match.group(1).replace(',', '')
                try:
                    amount = float(amount_str)
                    confidence = 0.9 if amount_type in match.group(0).lower() else 0.7
                    logger.info(f"Extracted {amount_type}: ${amount:.2f} (confidence: {confidence})")
                    return amount, confidence
                except ValueError:
                    continue
        
        return None, 0.0
    
    def _extract_date(self, text: str, date_type: str) -> Tuple[Optional[str], float]:
        """Extract date with confidence"""
        patterns = self.patterns.get(date_type, [])
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                date_str = match.group(1).strip()
                try:
                    # Parse date
                    parsed_date = date_parser.parse(date_str, fuzzy=True)
                    formatted_date = parsed_date.strftime('%Y-%m-%d')
                    confidence = 0.9 if date_type.replace('_', ' ') in match.group(0).lower() else 0.7
                    logger.info(f"Extracted {date_type}: {formatted_date} (confidence: {confidence})")
                    return formatted_date, confidence
                except Exception as e:
                    logger.warning(f"Date parsing error: {str(e)}")
                    continue
        
        return None, 0.0
    
    def _extract_vendor_name(self, text: str) -> Tuple[Optional[str], float]:
        """Extract vendor name (usually at the top)"""
        # Split into lines and check first few lines
        lines = text.split('\n')
        
        for i, line in enumerate(lines[:5]):  # Check first 5 lines
            line = line.strip()
            if len(line) > 3 and not any(char.isdigit() for char in line[:10]):
                # Check if it looks like a company name
                if any(keyword in line.lower() for keyword in ['inc', 'llc', 'ltd', 'corp', 'company']):
                    confidence = 0.9
                elif i == 0 and len(line) > 5:
                    confidence = 0.7
                else:
                    continue
                
                vendor = line.title()
                logger.info(f"Extracted vendor name: {vendor} (confidence: {confidence})")
                return vendor, confidence
        
        return None, 0.0
    
    def _extract_pattern(self, text: str, pattern_type: str) -> Tuple[Optional[str], float]:
        """Extract generic pattern match"""
        patterns = self.patterns.get(pattern_type, [])
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value = match.group(0 if pattern_type == 'phone' else 1).strip()
                confidence = 0.85
                logger.info(f"Extracted {pattern_type}: {value} (confidence: {confidence})")
                return value, confidence
        
        return None, 0.0
    
    def _extract_line_items(self, text: str) -> List[Dict]:
        """Extract line items from invoice"""
        line_items = []
        lines = text.split('\n')
        
        # Look for table-like structures
        for line in lines:
            # Pattern: description ... quantity ... price ... amount
            # This is a simplified version - can be enhanced
            if re.search(r'\d+\.\d{2}', line):  # Has a price
                # Try to extract components
                numbers = re.findall(r'[\d,]+\.?\d{0,2}', line)
                if len(numbers) >= 2:
                    try:
                        # Last number is typically the amount
                        amount = float(numbers[-1].replace(',', ''))
                        # Previous might be unit price
                        unit_price = float(numbers[-2].replace(',', '')) if len(numbers) > 1 else None
                        # First might be quantity
                        quantity = float(numbers[0].replace(',', '')) if len(numbers) > 2 else None
                        
                        # Extract description (text before numbers)
                        description = re.sub(r'[\d,\.]+', '', line).strip()
                        
                        if description and amount:
                            line_items.append({
                                'description': description[:100],  # Limit length
                                'quantity': quantity,
                                'unit_price': unit_price,
                                'amount': amount,
                                'confidence': 0.6
                            })
                    except ValueError:
                        continue
        
        logger.info(f"Extracted {len(line_items)} line items")
        return line_items
    
    def calculate_overall_confidence(self, confidence_scores: Dict[str, float]) -> float:
        """Calculate overall extraction confidence"""
        if not confidence_scores:
            return 0.0
        
        # Weight important fields more
        weights = {
            'invoice_number': 1.5,
            'total_amount': 2.0,
            'invoice_date': 1.5,
            'vendor_name': 1.2,
            'subtotal': 1.0,
            'tax': 1.0,
        }
        
        weighted_sum = 0.0
        total_weight = 0.0
        
        for field, confidence in confidence_scores.items():
            weight = weights.get(field, 1.0)
            weighted_sum += confidence * weight
            total_weight += weight
        
        overall_confidence = weighted_sum / total_weight if total_weight > 0 else 0.0
        logger.info(f"Overall confidence score: {overall_confidence:.2f}")
        
        return round(overall_confidence, 2)
