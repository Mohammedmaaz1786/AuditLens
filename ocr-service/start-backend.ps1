# Quick Start Script for OCR Backend
# Run this from the backend directory

Write-Host "🚀 Starting Audit Lens OCR Backend..." -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.9+" -ForegroundColor Red
    exit 1
}

# Check if virtual environment exists
if (-Not (Test-Path "venv")) {
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Create directories
if (-Not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}
if (-Not (Test-Path "temp")) {
    New-Item -ItemType Directory -Path "temp" | Out-Null
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Important: Make sure you have installed:" -ForegroundColor Yellow
Write-Host "   1. Tesseract OCR: https://github.com/UB-Mannheim/tesseract/wiki"
Write-Host "   2. Poppler: https://github.com/oschwartz10612/poppler-windows/releases"
Write-Host ""
Write-Host "🚀 Starting server at http://localhost:8000..." -ForegroundColor Cyan
Write-Host "📚 API Documentation: http://localhost:8000/api/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start the server
python main.py
