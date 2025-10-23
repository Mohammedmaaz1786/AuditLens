"""Image preprocessing utilities for better OCR accuracy"""

import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Optional
from loguru import logger


class ImagePreprocessor:
    """Image preprocessing pipeline for OCR optimization"""
    
    def __init__(self):
        self.target_dpi = 300
        
    def preprocess(self, image: np.ndarray, enhance: bool = True) -> np.ndarray:
        """
        Complete preprocessing pipeline
        
        Args:
            image: Input image as numpy array
            enhance: Whether to apply enhancement techniques
            
        Returns:
            Preprocessed image
        """
        try:
            # Convert to grayscale if needed
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image.copy()
            
            # Resize if too large
            gray = self._resize_image(gray)
            
            # Check if image is already clean (high quality document)
            if self._is_clean_document(gray):
                logger.info("Clean document detected, using minimal preprocessing")
                # Only apply light denoising and sharpening
                denoised = cv2.fastNlMeansDenoising(gray, None, h=3, templateWindowSize=7, searchWindowSize=21)
                # Apply sharpening
                kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
                sharpened = cv2.filter2D(denoised, -1, kernel)
                return sharpened
            
            # For lower quality images, apply full preprocessing
            logger.info("Applying full preprocessing pipeline")
            
            # Denoise
            image = self._denoise(gray)
            
            if enhance:
                # Enhance contrast
                image = self._enhance_contrast(image)
                
                # Binarization (adaptive thresholding)
                image = self._binarize(image)
                
                # Deskew
                image = self._deskew(image)
            
            return image
            
        except Exception as e:
            logger.error(f"Preprocessing error: {str(e)}")
            return image
    
    def _is_clean_document(self, image: np.ndarray) -> bool:
        """Check if document is already clean and high quality"""
        # Calculate image variance (measure of contrast)
        variance = cv2.Laplacian(image, cv2.CV_64F).var()
        
        # Clean documents typically have high variance (sharp edges)
        # and good contrast
        mean_intensity = np.mean(image)
        std_intensity = np.std(image)
        
        # High variance and good contrast indicate clean document
        is_clean = variance > 100 and std_intensity > 40
        
        logger.info(f"Document quality check - Variance: {variance:.2f}, Std: {std_intensity:.2f}, Clean: {is_clean}")
        return is_clean
    
    def _resize_image(self, image: np.ndarray, max_size: int = 4096) -> np.ndarray:
        """Resize image if too large"""
        height, width = image.shape[:2]
        
        if max(height, width) > max_size:
            scale = max_size / max(height, width)
            new_width = int(width * scale)
            new_height = int(height * scale)
            image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
            logger.info(f"Resized image to {new_width}x{new_height}")
        
        return image
    
    def _denoise(self, image: np.ndarray) -> np.ndarray:
        """Remove noise from image"""
        return cv2.fastNlMeansDenoising(image, None, 10, 7, 21)
    
    def _enhance_contrast(self, image: np.ndarray) -> np.ndarray:
        """Enhance image contrast using CLAHE"""
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        return clahe.apply(image)
    
    def _binarize(self, image: np.ndarray) -> np.ndarray:
        """Apply adaptive thresholding for binarization"""
        return cv2.adaptiveThreshold(
            image,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,
            2
        )
    
    def _deskew(self, image: np.ndarray) -> np.ndarray:
        """Correct image skew/rotation"""
        try:
            coords = np.column_stack(np.where(image > 0))
            angle = cv2.minAreaRect(coords)[-1]
            
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            
            # Only deskew if angle is significant
            if abs(angle) > 0.5:
                (h, w) = image.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                image = cv2.warpAffine(
                    image,
                    M,
                    (w, h),
                    flags=cv2.INTER_CUBIC,
                    borderMode=cv2.BORDER_REPLICATE
                )
                logger.info(f"Deskewed image by {angle:.2f} degrees")
            
            return image
            
        except Exception as e:
            logger.warning(f"Deskew failed: {str(e)}")
            return image
    
    def remove_borders(self, image: np.ndarray) -> np.ndarray:
        """Remove borders from scanned documents"""
        try:
            # Find contours
            contours, _ = cv2.findContours(
                image,
                cv2.RETR_EXTERNAL,
                cv2.CHAIN_APPROX_SIMPLE
            )
            
            if contours:
                # Get the largest contour (presumably the document)
                largest_contour = max(contours, key=cv2.contourArea)
                x, y, w, h = cv2.boundingRect(largest_contour)
                
                # Crop to the document
                image = image[y:y+h, x:x+w]
                logger.info("Removed borders from image")
            
            return image
            
        except Exception as e:
            logger.warning(f"Border removal failed: {str(e)}")
            return image
    
    def upscale_image(self, image: np.ndarray, scale: float = 2.0) -> np.ndarray:
        """Upscale low-resolution images"""
        try:
            height, width = image.shape[:2]
            new_width = int(width * scale)
            new_height = int(height * scale)
            
            upscaled = cv2.resize(
                image,
                (new_width, new_height),
                interpolation=cv2.INTER_CUBIC
            )
            logger.info(f"Upscaled image to {new_width}x{new_height}")
            return upscaled
            
        except Exception as e:
            logger.warning(f"Upscaling failed: {str(e)}")
            return image
