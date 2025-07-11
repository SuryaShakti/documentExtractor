#!/bin/bash
# setup-pdf-extraction.sh - Installs missing dependencies for PDF extraction

echo "🚀 Setting up PDF extraction for your Next.js app..."
echo ""

# Install missing PDF processing packages
echo "📦 Installing PDF processing packages..."
npm install pdf2pic@3.2.0 tesseract.js@5.1.0

echo ""
echo "✅ PDF extraction setup complete!"
echo ""
echo "📋 What was installed:"
echo "   - pdf2pic@3.2.0 (PDF to image conversion)"
echo "   - tesseract.js@5.1.0 (OCR for scanned PDFs)"
echo ""
echo "📋 Packages you already had:"
echo "   ✅ pdfjs-dist@3.11.174 (PDF text extraction)"
echo "   ✅ pdf-parse@1.1.1 (Alternative PDF parser)"
echo "   ✅ openai@4.28.0 (AI processing)"
echo ""
echo "🧪 Run the test script to verify everything works:"
echo "   node test-pdf-extraction.js"
echo ""
echo "🚀 Start your development server:"
echo "   npm run dev"
echo ""
echo "🎯 Your PDF extraction is ready! Upload a PDF to test it."