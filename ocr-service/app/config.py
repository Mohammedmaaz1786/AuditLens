"""Configuration settings for the OCR API"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # CORS Settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]
    
    # Gemini AI Settings
    GEMINI_API_KEY: str = None  # Gemini AI API key for AI extraction
    
    # Azure Document Intelligence Settings
    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: str = None  # Azure Document Intelligence endpoint
    AZURE_DOCUMENT_INTELLIGENCE_KEY: str = None  # Azure Document Intelligence API key
    
    # OCR Provider: 'azure', 'gemini', or 'tesseract'
    OCR_PROVIDER: str = "tesseract"
    
    # Security & Encryption Settings
    ENCRYPTION_MASTER_KEY: str = None  # Fernet encryption key
    AUDIT_SECRET: str = None  # Secret for audit log signatures
    
    # MongoDB Settings
    MONGODB_URI: str = "mongodb://localhost:27017/auditlens"  # MongoDB connection string
    
    # OCR Settings
    TESSERACT_CMD: str = None  # Will use system default
    POPPLER_PATH: str = None  # Path to Poppler bin directory
    OCR_LANGUAGES: List[str] = ["eng", "spa", "fra"]
    OCR_CONFIG: str = "--oem 3 --psm 6"
    
    # Image Processing Settings
    MAX_IMAGE_SIZE: int = 4096
    MIN_CONFIDENCE: float = 0.5
    
    # File Upload Settings
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif"]
    
    # Paths
    TEMP_DIR: str = "temp"
    LOGS_DIR: str = "logs"
    MODELS_DIR: str = "models"
    
    # Fraud Detection Settings
    DUPLICATE_SIMILARITY_THRESHOLD: float = 0.85
    AMOUNT_OUTLIER_ZSCORE: float = 3.0
    HIGH_RISK_SCORE_THRESHOLD: float = 0.7
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
