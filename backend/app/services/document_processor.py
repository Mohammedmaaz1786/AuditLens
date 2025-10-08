"""Main document processor orchestrating OCR and entity extraction"""

import io
import time
from typing import Dict, Optional
import numpy as np
from PIL import Image
import pytesseract
import cv2
from pdf2image import convert_from_bytes
from loguru import logger

from app.services.image_preprocessor import ImagePreprocessor
from app.services.entity_extractor import EntityExtractor
from app.services.ai_extractor import AIExtractor
from app.services.fraud_detector import FraudDetector
from app.models.schemas import InvoiceData, ProcessingResult, ProcessingMetadata, LineItem
from app.config import settings


class DocumentProcessor:
    """Main document processing orchestrator"""
    
    def __init__(self):
        self.preprocessor = ImagePreprocessor()
        self.extractor = EntityExtractor()
        self.ai_extractor = AIExtractor()
        self.fraud_detector = FraudDetector()
        
        # Configure Tesseract if custom path provided
        if settings.TESSERACT_CMD:
            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
    
    async def process_document(
        self,
        file_content: bytes,
        filename: str,
        language: str = "eng"
    ) -> ProcessingResult:
        """
        Process a document and extract invoice data
        
        Args:
            file_content: File content as bytes
            filename: Original filename
            language: OCR language code
            
        Returns:
            ProcessingResult with extracted data
        """
        start_time = time.time()
        
        try:
            logger.info(f"Starting processing for {filename}")
            
            # Detect file type
            file_type = self._get_file_type(filename)
            file_size = len(file_content)
            
            # Convert to images
            images = await self._file_to_images(file_content, file_type)
            
            if not images:
                raise ValueError("Could not convert document to images")
            
            logger.info(f"Converted to {len(images)} page(s)")
            
            # Process each page
            all_text = []
            all_data = []
            
            for i, image in enumerate(images):
                logger.info(f"Processing page {i+1}/{len(images)}")
                
                # Preprocess image
                processed_image = self.preprocessor.preprocess(image)
                
                # Perform OCR
                text, confidence = self._perform_ocr(processed_image, language)
                all_text.append(text)
                
                logger.info(f"Page {i+1} OCR confidence: {confidence:.2f}")
            
            # Combine text from all pages
            combined_text = "\n\n=== PAGE BREAK ===\n\n".join(all_text)
            
            # Use AI to extract structured data from the combined text
            logger.info("Using AI extraction for structured data...")
            ai_extracted_data = self.ai_extractor.extract_invoice_data(combined_text)
            
            # Build invoice data from AI extraction
            invoice_data = self._build_invoice_data_from_ai(ai_extracted_data, combined_text)
            
            # Calculate overall confidence from AI confidence scores
            confidence_scores = ai_extracted_data.get('confidence', {})
            overall_confidence = self._calculate_ai_confidence(confidence_scores)
            
            # Processing metadata
            processing_time = time.time() - start_time
            metadata = ProcessingMetadata(
                filename=filename,
                file_type=file_type,
                file_size=file_size,
                processing_time=processing_time,
                ocr_language=language
            )
            
            # Validation warnings
            warnings = self._validate_invoice_data(invoice_data)
            
            # FRAUD DETECTION: Analyze invoice for fraud indicators
            fraud_analysis = self.fraud_detector.analyze_invoice(
                invoice_data.dict() if hasattr(invoice_data, 'dict') else invoice_data,
                invoice_id=invoice_data.invoice_number
            )
            
            logger.info(f"Processing completed in {processing_time:.2f}s with confidence {overall_confidence:.2f}")
            logger.info(f"Fraud Risk Level: {fraud_analysis['risk_level']} (Score: {fraud_analysis['risk_score']:.2f})")
            
            return ProcessingResult(
                success=True,
                filename=filename,
                data=invoice_data,
                confidence_score=overall_confidence,
                processing_time=processing_time,
                metadata=metadata,
                warnings=warnings,
                fraud_analysis=fraud_analysis  # Include fraud analysis in result
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Processing failed for {filename}: {str(e)}")
            
            return ProcessingResult(
                success=False,
                filename=filename,
                data=None,
                confidence_score=0.0,
                processing_time=processing_time,
                error=str(e)
            )
    
    def _get_file_type(self, filename: str) -> str:
        """Detect file type from filename"""
        ext = filename.lower().split('.')[-1]
        return f".{ext}"
    
    async def _file_to_images(self, file_content: bytes, file_type: str) -> list:
        """Convert file to list of images"""
        try:
            if file_type == '.pdf':
                # Convert PDF to images with explicit poppler path if configured
                kwargs = {
                    'pdf_file': file_content,
                    'dpi': 300,
                    'fmt': 'png'
                }
                
                # Add poppler_path if configured or try to detect it
                if settings.POPPLER_PATH:
                    kwargs['poppler_path'] = settings.POPPLER_PATH
                    logger.info(f"Using Poppler from: {settings.POPPLER_PATH}")
                
                images = convert_from_bytes(**kwargs)
                # Convert PIL images to numpy arrays
                return [np.array(img) for img in images]
            else:
                # Load image file
                image = Image.open(io.BytesIO(file_content))
                # Convert to RGB if needed
                if image.mode != 'RGB':
                    image = image.convert('RGB')
                return [np.array(image)]
                
        except Exception as e:
            logger.error(f"File conversion error: {str(e)}")
            raise
    
    def _perform_ocr(self, image: np.ndarray, language: str = "eng") -> tuple:
        """
        Perform OCR on preprocessed image
        
        Args:
            image: Preprocessed image
            language: OCR language code
            
        Returns:
            Tuple of (extracted_text, confidence)
        """
        try:
            # Try different PSM modes for better accuracy
            psm_modes = [1, 3, 6]  # Auto with OSD, Fully auto, Single block
            
            best_text = ""
            best_confidence = 0.0
            
            for psm in psm_modes:
                try:
                    config = f"--oem 3 --psm {psm}"
                    
                    # Get detailed OCR data
                    ocr_data = pytesseract.image_to_data(
                        image,
                        lang=language,
                        config=config,
                        output_type=pytesseract.Output.DICT
                    )
                    
                    # Extract text
                    text = pytesseract.image_to_string(
                        image,
                        lang=language,
                        config=config
                    )
                    
                    # Calculate average confidence
                    confidences = [
                        int(conf) for conf in ocr_data['conf']
                        if conf != '-1'
                    ]
                    avg_confidence = sum(confidences) / len(confidences) if confidences else 0
                    avg_confidence = avg_confidence / 100.0  # Convert to 0-1 scale
                    
                    # Keep the best result
                    if avg_confidence > best_confidence:
                        best_confidence = avg_confidence
                        best_text = text
                        logger.info(f"PSM {psm} achieved confidence: {avg_confidence:.2f}")
                    
                except Exception as e:
                    logger.warning(f"PSM {psm} failed: {str(e)}")
                    continue
            
            if not best_text:
                raise ValueError("All OCR attempts failed")
            
            return best_text, best_confidence
            
        except Exception as e:
            logger.error(f"OCR error: {str(e)}")
            raise
    
    def _combine_entities(self, all_entities: list) -> Dict:
        """Combine entities from multiple pages"""
        if not all_entities:
            return {}
        
        if len(all_entities) == 1:
            return all_entities[0]
        
        # For multiple pages, prefer entities from first page (usually has invoice header)
        combined = all_entities[0].copy()
        
        # Combine line items from all pages
        all_line_items = []
        for entities in all_entities:
            if 'line_items' in entities:
                all_line_items.extend(entities['line_items'])
        
        if all_line_items:
            combined['line_items'] = all_line_items
        
        # If some fields missing in first page, try to get from other pages
        for entities in all_entities[1:]:
            for key, value in entities.items():
                if key not in combined or combined[key] is None:
                    combined[key] = value
        
        return combined
    
    def _build_invoice_data(self, entities: Dict, raw_text: str) -> InvoiceData:
        """Build InvoiceData model from extracted entities"""
        
        # Convert line items to LineItem objects
        line_items = []
        for item in entities.get('line_items', []):
            line_items.append(LineItem(**item))
        
        return InvoiceData(
            vendor_name=entities.get('vendor_name'),
            vendor_address=None,  # TODO: Extract address
            invoice_number=entities.get('invoice_number'),
            invoice_date=entities.get('invoice_date'),
            due_date=entities.get('due_date'),
            subtotal=entities.get('subtotal'),
            tax=entities.get('tax'),
            total_amount=entities.get('total_amount'),
            currency='USD',  # TODO: Detect currency
            line_items=line_items,
            confidence_scores=entities.get('confidence_scores', {}),
            raw_text=raw_text
        )
    
    def _validate_invoice_data(self, invoice_data: InvoiceData) -> list:
        """Validate extracted data and return warnings"""
        warnings = []
        
        # Check for missing critical fields
        if not invoice_data.invoice_number:
            warnings.append("Invoice number not found")
        
        if not invoice_data.total_amount:
            warnings.append("Total amount not found")
        
        if not invoice_data.vendor_name:
            warnings.append("Vendor name not found")
        
        if not invoice_data.invoice_date:
            warnings.append("Invoice date not found")
        
        # Validate amount calculations
        if invoice_data.subtotal and invoice_data.tax and invoice_data.total_amount:
            calculated_total = invoice_data.subtotal + invoice_data.tax
            if abs(calculated_total - invoice_data.total_amount) > 0.02:  # Allow 2 cent difference
                warnings.append(
                    f"Amount mismatch: Subtotal({invoice_data.subtotal}) + "
                    f"Tax({invoice_data.tax}) ≠ Total({invoice_data.total_amount})"
                )
        
        # Check line items total
        if invoice_data.line_items and invoice_data.subtotal:
            line_items_total = sum(item.amount for item in invoice_data.line_items if item.amount)
            if abs(line_items_total - invoice_data.subtotal) > 0.02:
                warnings.append(
                    f"Line items total ({line_items_total}) doesn't match "
                    f"subtotal ({invoice_data.subtotal})"
                )
        
        # Check confidence scores
        low_confidence_fields = [
            field for field, score in invoice_data.confidence_scores.items()
            if score < settings.MIN_CONFIDENCE
        ]
        if low_confidence_fields:
            warnings.append(
                f"Low confidence for fields: {', '.join(low_confidence_fields)}"
            )
        
        return warnings
    
    def _build_invoice_data_from_ai(self, ai_data: Dict, raw_text: str) -> InvoiceData:
        """Build InvoiceData model from AI extracted data"""
        
        # Convert line items to LineItem objects
        line_items = []
        for item in ai_data.get('lineItems', []):
            line_items.append(LineItem(
                description=item.get('description'),
                quantity=item.get('quantity'),
                unit_price=item.get('rate'),
                amount=item.get('amount')
            ))
        
        # Build confidence scores dict
        confidence_scores = ai_data.get('confidence', {})
        
        return InvoiceData(
            vendor_name=ai_data.get('vendorName'),
            vendor_address=ai_data.get('vendorAddress'),
            invoice_number=ai_data.get('invoiceNumber'),
            invoice_date=ai_data.get('date'),
            due_date=ai_data.get('dueDate'),
            subtotal=ai_data.get('subtotal'),
            tax=ai_data.get('tax'),
            total_amount=ai_data.get('total'),
            amount_paid=ai_data.get('amountPaid'),
            balance_due=ai_data.get('balanceDue'),
            currency=ai_data.get('currency', 'USD'),
            line_items=line_items,
            payment_instructions=ai_data.get('paymentInstructions'),
            notes=ai_data.get('notes'),
            confidence_scores=confidence_scores,
            raw_text=raw_text
        )
    
    def _calculate_ai_confidence(self, confidence_scores: Dict) -> float:
        """Calculate overall confidence from AI extraction"""
        if not confidence_scores:
            return 0.5  # Default moderate confidence
        
        # Weight important fields more heavily
        weights = {
            'invoiceNumber': 0.2,
            'vendorName': 0.2,
            'date': 0.15,
            'total': 0.25,
            'lineItems': 0.2
        }
        
        weighted_sum = 0.0
        total_weight = 0.0
        
        for field, weight in weights.items():
            if field in confidence_scores:
                weighted_sum += confidence_scores[field] * weight
                total_weight += weight
        
        return weighted_sum / total_weight if total_weight > 0 else 0.5
