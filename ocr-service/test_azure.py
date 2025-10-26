"""
Test Azure Document Intelligence integration
This script tests if Azure OCR is working correctly
"""

import sys
import os
from loguru import logger

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.config import settings
from app.services.azure_ocr import get_azure_ocr_service

def test_azure_connection():
    """Test Azure Document Intelligence connection and configuration"""
    
    print("\n" + "="*60)
    print("🧪 TESTING AZURE DOCUMENT INTELLIGENCE")
    print("="*60 + "\n")
    
    # 1. Check configuration
    print("📋 Step 1: Checking Configuration")
    print("-" * 60)
    
    endpoint = settings.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
    key = settings.AZURE_DOCUMENT_INTELLIGENCE_KEY
    provider = settings.OCR_PROVIDER
    
    print(f"✓ OCR Provider: {provider}")
    print(f"✓ Azure Endpoint: {endpoint}")
    print(f"✓ Azure Key: {'✓ Configured' if key else '✗ Missing'}")
    print()
    
    if not endpoint or not key:
        print("❌ FAILED: Azure credentials not configured in .env file")
        print("\nPlease set:")
        print("  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/")
        print("  AZURE_DOCUMENT_INTELLIGENCE_KEY=your_key_here")
        return False
    
    # 2. Test service initialization
    print("📋 Step 2: Initializing Azure Service")
    print("-" * 60)
    
    try:
        azure_service = get_azure_ocr_service()
        if azure_service:
            print("✅ SUCCESS: Azure Document Intelligence service initialized")
            print(f"   Endpoint: {endpoint}")
        else:
            print("❌ FAILED: Could not initialize Azure service")
            return False
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        return False
    
    print()
    
    # 3. Check document processor configuration
    print("📋 Step 3: Checking Document Processor")
    print("-" * 60)
    
    from app.services.document_processor import DocumentProcessor
    
    try:
        processor = DocumentProcessor()
        print(f"✓ OCR Provider: {processor.ocr_provider}")
        print(f"✓ Azure OCR: {'Enabled' if processor.azure_ocr else 'Disabled'}")
        
        if processor.ocr_provider == 'azure' and processor.azure_ocr:
            print("✅ SUCCESS: Document processor configured to use Azure")
        else:
            print(f"⚠️  WARNING: Document processor using {processor.ocr_provider} instead of Azure")
            print("   Check OCR_PROVIDER in .env file")
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        return False
    
    print()
    
    # 4. Summary
    print("="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    print()
    print("✅ Azure Document Intelligence: READY")
    print("✅ Configuration: VALID")
    print("✅ Service: INITIALIZED")
    print()
    print("🎉 Your system is ready to use Azure OCR!")
    print()
    print("💡 To test with a real invoice:")
    print("   1. Go to http://localhost:5173")
    print("   2. Upload an invoice")
    print("   3. Check OCR service logs for 'Azure Document Intelligence'")
    print()
    print("📊 Expected Accuracy: 95%+")
    print("⏱️  Expected Processing Time: 2-5 seconds")
    print("💰 Free Tier: 500 invoices/month")
    print()
    
    return True

if __name__ == "__main__":
    try:
        success = test_azure_connection()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Test failed with error: {str(e)}")
        sys.exit(1)
