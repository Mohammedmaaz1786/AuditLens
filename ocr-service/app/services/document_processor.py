"""Main document processor orchestrating OCR and entity extraction"""

import io
import os
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
from app.services.fraud_detector import FraudDetector  # Rule-based fraud detection (ML coming in future)
# from app.services.ml_fraud_detector import MLFraudDetector  # TODO: Future - ML-based fraud detection
from app.services.azure_ocr import get_azure_ocr_service
from app.models.schemas import InvoiceData, ProcessingResult, ProcessingMetadata, LineItem
from app.config import settings


class DocumentProcessor:
    """Main document processing orchestrator"""
    
    def __init__(self):
        self.preprocessor = ImagePreprocessor()
        self.extractor = EntityExtractor()
        self.ai_extractor = AIExtractor()
        self.fraud_detector = FraudDetector()  # Rule-based fraud detection
        # TODO: Future - self.fraud_detector = MLFraudDetector()  # ML-based fraud detection
        
        # Get OCR provider from settings (reads from .env)
        self.ocr_provider = settings.OCR_PROVIDER.lower() if settings.OCR_PROVIDER else 'tesseract'
        self.primary_provider = self.ocr_provider  # Store primary choice
        
        # Initialize Azure OCR if configured
        self.azure_ocr = None
        if self.ocr_provider == 'azure':
            try:
                self.azure_ocr = get_azure_ocr_service()
                if self.azure_ocr:
                    logger.info(f"🤖 OCR Provider: AZURE Document Intelligence (Primary)")
                    logger.info(f"   Fallback Chain: Azure → Gemini → Tesseract")
                else:
                    logger.warning("⚠️  Azure credentials not configured")
                    logger.info("   Falling back to: Gemini AI → Tesseract")
                    self.ocr_provider = 'gemini'
            except Exception as e:
                logger.error(f"❌ Failed to initialize Azure OCR: {str(e)}")
                logger.info("   Falling back to: Gemini AI → Tesseract")
                self.azure_ocr = None
                self.ocr_provider = 'gemini'
        
        if self.ocr_provider == 'gemini':
            logger.info(f"🤖 OCR Provider: GOOGLE Gemini AI (Primary)")
            logger.info(f"   Fallback: Gemini → Tesseract")
        elif self.ocr_provider == 'tesseract':
            logger.info(f"🤖 OCR Provider: TESSERACT (Open Source)")
        
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
            logger.info(f"🔍 Starting processing for {filename}")
            
            # Detect file type
            file_type = self._get_file_type(filename)
            file_size = len(file_content)
            
            # Try OCR with fallback chain: Azure → Gemini → Tesseract
            invoice_data = None
            overall_confidence = 0.0
            combined_text = ""
            
            # Try Azure first (if configured)
            if self.ocr_provider == 'azure' and self.azure_ocr:
                try:
                    logger.info(f"📄 Attempting Azure Document Intelligence for {filename}")
                    invoice_data, overall_confidence, combined_text = await self._process_with_azure(
                        file_content, filename
                    )
                    logger.info(f"✅ Azure processing successful - Confidence: {overall_confidence:.2%}")
                except Exception as e:
                    logger.error(f"❌ Azure OCR failed: {str(e)}")
                    logger.info(f"   Falling back to Gemini AI...")
                    invoice_data = None
            
            # Fallback to Gemini/Tesseract if Azure failed or not configured
            if invoice_data is None:
                try:
                    provider_name = 'Gemini AI' if self.ocr_provider == 'gemini' else 'Tesseract'
                    logger.info(f"📄 Using {provider_name} OCR for {filename}")
                    invoice_data, overall_confidence, combined_text = await self._process_with_traditional_ocr(
                        file_content, filename, file_type, language
                    )
                    logger.info(f"✅ {provider_name} processing successful - Confidence: {overall_confidence:.2%}")
                except Exception as gemini_error:
                    if self.ocr_provider == 'gemini':
                        # If Gemini fails, try Tesseract as last resort
                        logger.error(f"❌ Gemini AI failed: {str(gemini_error)}")
                        logger.info(f"   Falling back to Tesseract OCR (last resort)...")
                        try:
                            # Force Tesseract mode temporarily
                            original_provider = self.ocr_provider
                            self.ocr_provider = 'tesseract'
                            invoice_data, overall_confidence, combined_text = await self._process_with_traditional_ocr(
                                file_content, filename, file_type, language
                            )
                            self.ocr_provider = original_provider
                            logger.info(f"✅ Tesseract processing successful (fallback)")
                        except Exception as tesseract_error:
                            logger.error(f"❌ All OCR methods failed!")
                            raise Exception(f"OCR processing failed: Azure, Gemini, and Tesseract all failed")
                    else:
                        raise
            
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
            
            logger.info(f"✅ Processing completed in {processing_time:.2f}s with confidence {overall_confidence:.2f}")
            logger.info(f"🛡️  Fraud Risk Level: {fraud_analysis['risk_level']} (Score: {fraud_analysis['risk_score']:.2f})")
            
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
    
    def _detect_and_convert_currency(self, ai_data: Dict, raw_text: str) -> tuple:
        """
        Detect currency and convert to USD if needed.
        
        Returns:
            tuple: (detected_currency, conversion_rate, converted_amounts, needs_conversion)
        """
        # Approximate INR to USD conversion rate (you should use a real API for production)
        INR_TO_USD = 0.012  # 1 INR = ~0.012 USD
        
        # Safely get values with fallbacks
        detected_currency = (ai_data.get('currency') or '').upper() if ai_data.get('currency') else ''
        vendor_name = (ai_data.get('vendorName') or '').lower()
        vendor_address = (ai_data.get('vendorAddress') or '').lower()
        raw_text_lower = (raw_text or '').lower()
        
        # Currency symbols to detect
        rupee_symbols = ['₹', 'rs', 'inr', 'rupee']
        dollar_symbols = ['$', 'usd', 'dollar']
        
        # Check if currency is explicitly mentioned
        is_rupee = any(symbol in raw_text_lower for symbol in rupee_symbols)
        is_dollar = any(symbol in raw_text_lower for symbol in dollar_symbols)
        
        # Check vendor location indicators
        indian_indicators = ['india', 'mumbai', 'delhi', 'bangalore', 'chennai', 'hyderabad', 
                            'pune', 'kolkata', 'ahmedabad', 'bengaluru']
        is_indian_vendor = any(indicator in vendor_name or indicator in vendor_address 
                              for indicator in indian_indicators)
        
        # Analyze amounts to determine currency
        total_amount = ai_data.get('total', 0) or 0
        line_items = ai_data.get('lineItems', []) or []
        
        # If amounts are very large (e.g., > 10000) and no dollar sign, likely INR
        if total_amount and float(total_amount) > 10000 and not is_dollar:
            is_rupee = True
        
        # Determine final currency
        if detected_currency == 'INR' or is_rupee or is_indian_vendor:
            original_currency = 'INR'
            conversion_rate = INR_TO_USD
            needs_conversion = True
        else:
            original_currency = 'USD'
            conversion_rate = 1.0
            needs_conversion = False
        
        logger.info(f"Detected currency: {original_currency}, Conversion needed: {needs_conversion}")
        
        # Convert amounts if needed
        converted_data = {}
        if needs_conversion:
            # Copy all data first
            converted_data = ai_data.copy()
            
            if ai_data.get('total') and ai_data.get('total') is not None:
                try:
                    converted_data['total'] = round(float(ai_data['total']) * conversion_rate, 2)
                    converted_data['original_total'] = ai_data['total']
                except (ValueError, TypeError):
                    converted_data['total'] = ai_data.get('total')
                    
            if ai_data.get('subtotal') and ai_data.get('subtotal') is not None:
                try:
                    converted_data['subtotal'] = round(float(ai_data['subtotal']) * conversion_rate, 2)
                    converted_data['original_subtotal'] = ai_data['subtotal']
                except (ValueError, TypeError):
                    converted_data['subtotal'] = ai_data.get('subtotal')
                    
            if ai_data.get('tax') and ai_data.get('tax') is not None:
                try:
                    converted_data['tax'] = round(float(ai_data['tax']) * conversion_rate, 2)
                    converted_data['original_tax'] = ai_data['tax']
                except (ValueError, TypeError):
                    converted_data['tax'] = ai_data.get('tax')
                    
            if ai_data.get('amountPaid') and ai_data.get('amountPaid') is not None:
                try:
                    converted_data['amountPaid'] = round(float(ai_data['amountPaid']) * conversion_rate, 2)
                except (ValueError, TypeError):
                    converted_data['amountPaid'] = ai_data.get('amountPaid')
                    
            if ai_data.get('balanceDue') and ai_data.get('balanceDue') is not None:
                try:
                    converted_data['balanceDue'] = round(float(ai_data['balanceDue']) * conversion_rate, 2)
                except (ValueError, TypeError):
                    converted_data['balanceDue'] = ai_data.get('balanceDue')
            
            # Convert line items
            if line_items and isinstance(line_items, list):
                converted_line_items = []
                for item in line_items:
                    if not isinstance(item, dict):
                        continue
                    converted_item = item.copy()
                    if item.get('rate') and item.get('rate') is not None:
                        try:
                            converted_item['rate'] = round(float(item['rate']) * conversion_rate, 2)
                            converted_item['original_rate'] = item['rate']
                        except (ValueError, TypeError):
                            pass
                    if item.get('amount') and item.get('amount') is not None:
                        try:
                            converted_item['amount'] = round(float(item['amount']) * conversion_rate, 2)
                            converted_item['original_amount'] = item['amount']
                        except (ValueError, TypeError):
                            pass
                    converted_line_items.append(converted_item)
                converted_data['lineItems'] = converted_line_items
        else:
            converted_data = ai_data.copy()
        
        return original_currency, conversion_rate, converted_data, needs_conversion

    def _build_invoice_data_from_ai(self, ai_data: Dict, raw_text: str) -> InvoiceData:
        """Build InvoiceData model from AI extracted data"""
        
        # Detect and convert currency with error handling
        try:
            original_currency, conversion_rate, converted_data, needs_conversion = self._detect_and_convert_currency(ai_data, raw_text)
        except Exception as e:
            logger.error(f"Error in currency conversion: {str(e)}")
            # Fallback: use original data without conversion
            original_currency = 'USD'
            conversion_rate = 1.0
            converted_data = ai_data.copy() if ai_data else {}
            needs_conversion = False
        
        # Use converted data for amounts
        data_to_use = converted_data if needs_conversion else ai_data
        
        # Convert line items to LineItem objects
        line_items = []
        for item in data_to_use.get('lineItems', []):
            line_items.append(LineItem(
                description=item.get('description'),
                quantity=item.get('quantity'),
                unit_price=item.get('rate'),
                amount=item.get('amount')
            ))
        
        # Build confidence scores dict
        confidence_scores = ai_data.get('confidence', {})
        
        # Add currency conversion info to notes if converted
        notes = ai_data.get('notes', '')
        if needs_conversion:
            conversion_note = f"\n[AUTO-CONVERTED: Original amount in {original_currency}: {ai_data.get('total', 0):,.2f}. Converted to USD at rate {conversion_rate}]"
            notes = (notes + conversion_note) if notes else conversion_note.strip()
        
        return InvoiceData(
            vendor_name=ai_data.get('vendorName'),
            vendor_address=ai_data.get('vendorAddress'),
            vendor_email=ai_data.get('vendorEmail'),
            vendor_phone=ai_data.get('vendorPhone'),
            bill_to_name=ai_data.get('billToName'),
            bill_to_address=ai_data.get('billToAddress'),
            bill_to_email=ai_data.get('billToEmail'),
            bill_to_phone=ai_data.get('billToPhone'),
            bill_to_company=ai_data.get('billToCompany'),
            customer_name=ai_data.get('customerName'),
            customer_address=ai_data.get('customerAddress'),
            customer_email=ai_data.get('customerEmail'),
            customer_phone=ai_data.get('customerPhone'),
            ship_to_name=ai_data.get('shipToName'),
            ship_to_address=ai_data.get('shipToAddress'),
            invoice_number=ai_data.get('invoiceNumber'),
            invoice_date=ai_data.get('date'),
            due_date=ai_data.get('dueDate'),
            subtotal=data_to_use.get('subtotal'),
            tax=data_to_use.get('tax'),
            total_amount=data_to_use.get('total'),
            amount_paid=data_to_use.get('amountPaid'),
            balance_due=data_to_use.get('balanceDue'),
            currency='USD',  # Always USD after conversion
            line_items=line_items,
            payment_instructions=ai_data.get('paymentInstructions'),
            notes=notes,
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
    
    async def _process_with_azure(
        self,
        file_content: bytes,
        filename: str
    ) -> tuple:
        """
        Process document using Azure Document Intelligence
        
        Returns:
            Tuple of (invoice_data, confidence, raw_text)
        """
        import tempfile
        
        # Save file temporarily for Azure processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp_file:
            tmp_file.write(file_content)
            tmp_path = tmp_file.name
        
        try:
            # Use Azure OCR to extract invoice data
            logger.info("🔍 Analyzing document with Azure Document Intelligence...")
            extracted_data = self.azure_ocr.analyze_invoice(tmp_path)
            
            # Build invoice data from Azure extraction
            invoice_data = self._build_invoice_data_from_azure(extracted_data)
            
            # Get confidence from Azure
            overall_confidence = extracted_data.get('confidence', 0.85)
            
            # Get raw text
            combined_text = extracted_data.get('raw_text', '')
            
            logger.info(f"✅ Azure extraction complete - Confidence: {overall_confidence:.2%}")
            
            return invoice_data, overall_confidence, combined_text
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(tmp_path)
            except Exception as e:
                logger.warning(f"Failed to delete temp file: {e}")
    
    async def _process_with_traditional_ocr(
        self,
        file_content: bytes,
        filename: str,
        file_type: str,
        language: str
    ) -> tuple:
        """
        Process document using Tesseract OCR + Gemini AI
        
        Returns:
            Tuple of (invoice_data, confidence, raw_text)
        """
        # Convert to images
        images = await self._file_to_images(file_content, file_type)
        
        if not images:
            raise ValueError("Could not convert document to images")
        
        logger.info(f"📄 Converted to {len(images)} page(s)")
        
        # Process each page
        all_text = []
        
        for i, image in enumerate(images):
            logger.info(f"🔍 Processing page {i+1}/{len(images)}")
            
            # Preprocess image
            processed_image = self.preprocessor.preprocess(image)
            
            # Perform OCR
            text, confidence = self._perform_ocr(processed_image, language)
            all_text.append(text)
            
            logger.info(f"   Page {i+1} OCR confidence: {confidence:.2f}")
        
        # Combine text from all pages
        combined_text = "\n\n=== PAGE BREAK ===\n\n".join(all_text)
        
        # Use AI to extract structured data from the combined text
        logger.info("🤖 Using AI extraction for structured data...")
        ai_extracted_data = self.ai_extractor.extract_invoice_data(combined_text)
        
        # Build invoice data from AI extraction
        invoice_data = self._build_invoice_data_from_ai(ai_extracted_data, combined_text)
        
        # Calculate overall confidence from AI confidence scores
        confidence_scores = ai_extracted_data.get('confidence', {})
        overall_confidence = self._calculate_ai_confidence(confidence_scores)
        
        return invoice_data, overall_confidence, combined_text
    
    def _build_invoice_data_from_azure(self, azure_data: Dict) -> InvoiceData:
        """Build InvoiceData from Azure Document Intelligence extraction"""
        
        vendor = azure_data.get('vendor', {})
        customer = azure_data.get('customer', {})
        
        # Extract line items
        line_items = []
        for item in azure_data.get('lineItems', []):
            line_items.append(LineItem(
                description=item.get('description', ''),
                quantity=item.get('quantity', 1.0),
                unit_price=item.get('unitPrice', 0.0),
                amount=item.get('amount', 0.0),
                product_code=item.get('productCode')
            ))
        
        # Detect and convert currency (INR → USD if needed)
        currency = azure_data.get('currency', 'USD')
        subtotal = azure_data.get('subtotal', 0.0)
        tax = azure_data.get('tax', 0.0)
        total = azure_data.get('total', 0.0)
        
        # Check if currency conversion is needed
        detected_currency = currency.upper() if currency else 'USD'
        raw_text = azure_data.get('raw_text', '')
        
        # INR to USD conversion
        if detected_currency == 'INR' or 'INR' in raw_text or '₹' in raw_text or 'rupee' in raw_text.lower():
            INR_TO_USD = 0.012  # 1 INR = ~0.012 USD
            logger.info(f"💱 Currency Conversion Detected: INR → USD")
            logger.info(f"   Original amounts: Subtotal={subtotal} INR, Tax={tax} INR, Total={total} INR")
            
            # Convert all amounts
            subtotal = subtotal * INR_TO_USD if subtotal else 0.0
            tax = tax * INR_TO_USD if tax else 0.0
            total = total * INR_TO_USD if total else 0.0
            
            # Convert line items
            for item in line_items:
                item.unit_price = item.unit_price * INR_TO_USD if item.unit_price else 0.0
                item.amount = item.amount * INR_TO_USD if item.amount else 0.0
            
            currency = 'USD'
            logger.info(f"   Converted amounts: Subtotal=${subtotal:.2f}, Tax=${tax:.2f}, Total=${total:.2f}")
        
        # Build confidence scores
        confidence_scores = {
            'invoiceNumber': azure_data.get('confidence', 0.85),
            'vendorName': azure_data.get('confidence', 0.85),
            'date': azure_data.get('confidence', 0.85),
            'total': azure_data.get('confidence', 0.85),
            'lineItems': azure_data.get('confidence', 0.85)
        }
        
        return InvoiceData(
            vendor_name=vendor.get('name'),
            vendor_address=vendor.get('address'),
            vendor_tax_id=vendor.get('taxId'),
            vendor_email=vendor.get('email'),
            vendor_phone=vendor.get('phone'),
            customer_name=customer.get('name'),
            customer_address=customer.get('address'),
            customer_email=None,
            customer_phone=None,
            ship_to_name=None,
            ship_to_address=None,
            invoice_number=azure_data.get('invoiceNumber'),
            invoice_date=azure_data.get('invoiceDate'),
            due_date=azure_data.get('dueDate'),
            subtotal=subtotal,
            tax=tax,
            total_amount=total,
            amount_paid=0.0,
            balance_due=total,
            currency=currency,
            line_items=line_items,
            payment_instructions=azure_data.get('paymentTerms'),
            notes=azure_data.get('notes'),
            confidence_scores=confidence_scores,
            raw_text=raw_text
        )
