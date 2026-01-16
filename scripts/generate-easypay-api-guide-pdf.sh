#!/bin/bash

# Generate PDF from EasyPay API Integration Guide Markdown
# This script converts the markdown documentation to PDF format for easy sharing

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[PDF Generator]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
MD_FILE="docs/integrations/EasyPay_API_Integration_Guide.md"
OUTPUT_DIR="docs/integrations"
PDF_FILE="${OUTPUT_DIR}/EasyPay_API_Integration_Guide.pdf"
TIMESTAMP=$(date +%Y%m%d)

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "EasyPay API Integration Guide - PDF Generator"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if markdown file exists
if [ ! -f "$MD_FILE" ]; then
    error "Markdown file not found: $MD_FILE"
    exit 1
fi

log "Source file: $MD_FILE"
log "Output file: $PDF_FILE"
echo ""

# Method 1: Try pandoc (preferred - best quality)
if command -v pandoc &> /dev/null; then
    log "Using pandoc to generate PDF..."
    
    # Check if LaTeX is available (required for PDF generation)
    if command -v pdflatex &> /dev/null || command -v xelatex &> /dev/null || command -v lualatex &> /dev/null; then
        log "LaTeX found - generating high-quality PDF..."
        
        pandoc "$MD_FILE" \
            -o "$PDF_FILE" \
            --pdf-engine=xelatex \
            -V geometry:margin=1in \
            -V fontsize=11pt \
            -V documentclass=article \
            -V colorlinks=true \
            -V linkcolor=blue \
            -V urlcolor=blue \
            -V toccolor=gray \
            --toc \
            --toc-depth=3 \
            --highlight-style=tango \
            -V title="EasyPay API Integration Guide" \
            -V author="MyMoolah Treasury Platform" \
            -V date="$(date +'%B %d, %Y')" \
            2>&1 | grep -v "Warning" || true
        
        if [ -f "$PDF_FILE" ]; then
            log "✅ PDF generated successfully: $PDF_FILE"
            log "   File size: $(du -h "$PDF_FILE" | cut -f1)"
            exit 0
        else
            warn "Pandoc PDF generation failed, trying alternative method..."
        fi
    else
        warn "LaTeX not found. Pandoc requires LaTeX for PDF generation."
        warn "Installing LaTeX: brew install --cask mactex (macOS) or apt-get install texlive-full (Linux)"
    fi
fi

# Method 2: Try markdown-pdf (Node.js package)
if command -v markdown-pdf &> /dev/null; then
    log "Using markdown-pdf to generate PDF..."
    
    markdown-pdf "$MD_FILE" -o "$PDF_FILE" \
        --paper-format A4 \
        --paper-orientation portrait \
        --paper-border 1in \
        --css-path "" \
        --renderer-options '{"width": 800}' 2>&1 || true
    
    if [ -f "$PDF_FILE" ]; then
        log "✅ PDF generated successfully: $PDF_FILE"
        log "   File size: $(du -h "$PDF_FILE" | cut -f1)"
        exit 0
    else
        warn "markdown-pdf generation failed, trying alternative method..."
    fi
fi

# Method 3: Try wkhtmltopdf (via HTML intermediate)
if command -v wkhtmltopdf &> /dev/null; then
    log "Using wkhtmltopdf to generate PDF..."
    
    # First convert markdown to HTML
    TEMP_HTML="${OUTPUT_DIR}/EasyPay_API_Integration_Guide_temp.html"
    
    if command -v pandoc &> /dev/null; then
        pandoc "$MD_FILE" -o "$TEMP_HTML" --standalone --toc --toc-depth=3
    elif command -v markdown &> /dev/null; then
        markdown "$MD_FILE" > "$TEMP_HTML"
    else
        error "No markdown to HTML converter found"
        exit 1
    fi
    
    # Convert HTML to PDF
    wkhtmltopdf \
        --page-size A4 \
        --margin-top 20mm \
        --margin-bottom 20mm \
        --margin-left 15mm \
        --margin-right 15mm \
        --encoding UTF-8 \
        --enable-local-file-access \
        --print-media-type \
        --no-outline \
        "$TEMP_HTML" "$PDF_FILE" 2>&1 | grep -v "Warning" || true
    
    # Clean up temp HTML
    rm -f "$TEMP_HTML"
    
    if [ -f "$PDF_FILE" ]; then
        log "✅ PDF generated successfully: $PDF_FILE"
        log "   File size: $(du -h "$PDF_FILE" | cut -f1)"
        exit 0
    fi
fi

# Method 4: Provide instructions for manual conversion
error "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
error "No PDF conversion tool found!"
error "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
warn "Install one of the following tools:"
echo ""
echo "Option 1: Pandoc (recommended)"
echo "  macOS:   brew install pandoc && brew install --cask mactex"
echo "  Linux:   apt-get install pandoc texlive-full"
echo ""
echo "Option 2: markdown-pdf (Node.js)"
echo "  npm install -g markdown-pdf"
echo ""
echo "Option 3: wkhtmltopdf"
echo "  macOS:   brew install wkhtmltopdf"
echo "  Linux:   apt-get install wkhtmltopdf"
echo ""
echo "Option 4: Online conversion"
echo "  Use an online markdown to PDF converter:"
echo "  - https://www.markdowntopdf.com/"
echo "  - https://dillinger.io/ (export as PDF)"
echo "  - Upload $MD_FILE and download as PDF"
echo ""
echo "Option 5: VS Code extension"
echo "  Install 'Markdown PDF' extension in VS Code"
echo "  Right-click on $MD_FILE → 'Markdown PDF: Export (pdf)'"
echo ""

exit 1
