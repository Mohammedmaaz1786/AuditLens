"""
OCR Document Processing API
Main FastAPI application for invoice analysis
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, List
import uvicorn
from loguru import logger
import sys

from app.services.document_processor import DocumentProcessor
from app.models.schemas import (
    InvoiceData,
    ProcessingResult,
    HealthCheck,
    ErrorResponse
)
from app.config import settings

# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level="INFO"
)
logger.add(
    "logs/app_{time}.log",
    rotation="500 MB",
    retention="10 days",
    level="DEBUG"
)

# Initialize FastAPI app
app = FastAPI(
    title="Audit Lens OCR API",
    description="Document processing and OCR service for invoice analysis",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize document processor
document_processor = DocumentProcessor()


@app.get("/", response_model=HealthCheck)
async def root():
    """Root endpoint - health check"""
    return {
        "status": "healthy",
        "service": "Audit Lens OCR API",
        "version": "1.0.0"
    }


@app.get("/api/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Audit Lens OCR API",
        "version": "1.0.0"
    }


@app.post("/api/process-invoice", response_model=ProcessingResult)
async def process_invoice(
    file: UploadFile = File(...),
    language: Optional[str] = "eng"
):
    """
    Process an invoice document and extract structured data.
    
    Args:
        file: Uploaded document (PDF, PNG, JPG, TIFF)
        language: OCR language code (eng, spa, fra)
    
    Returns:
        ProcessingResult with extracted invoice data and confidence scores
    """
    try:
        logger.info(f"Processing file: {file.filename} with language: {language}")
        
        # Validate file type
        allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.tif']
        file_ext = file.filename.lower().split('.')[-1]
        if f'.{file_ext}' not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Process document
        result = await document_processor.process_document(
            file_content=file_content,
            filename=file.filename,
            language=language
        )
        
        logger.info(f"Successfully processed {file.filename}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing document: {str(e)}"
        )


@app.post("/api/batch-process", response_model=List[ProcessingResult])
async def batch_process_invoices(
    files: List[UploadFile] = File(...),
    language: Optional[str] = "eng"
):
    """
    Process multiple invoice documents in batch.
    
    Args:
        files: List of uploaded documents
        language: OCR language code (eng, spa, fra)
    
    Returns:
        List of ProcessingResult objects
    """
    try:
        logger.info(f"Batch processing {len(files)} files")
        results = []
        
        for file in files:
            try:
                file_content = await file.read()
                result = await document_processor.process_document(
                    file_content=file_content,
                    filename=file.filename,
                    language=language
                )
                results.append(result)
            except Exception as e:
                logger.error(f"Error processing {file.filename}: {str(e)}")
                # Add error result
                results.append({
                    "success": False,
                    "filename": file.filename,
                    "error": str(e),
                    "data": None,
                    "confidence_score": 0.0,
                    "processing_time": 0.0
                })
        
        return results
        
    except Exception as e:
        logger.error(f"Batch processing error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch processing error: {str(e)}"
        )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Global exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc)
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
