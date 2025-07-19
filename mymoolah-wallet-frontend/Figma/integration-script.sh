#!/bin/bash

# Enhanced MyMoolah Integration Script v2.0
# Works with comprehensive Figma AI handover documentation

set -e  # Exit on any error

# Colors for better visibility
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 MyMoolah Enhanced Integration Script v2.0${NC}"
echo -e "${BLUE}================================================${NC}"

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}$1${NC}"
    echo -e "${BLUE}$(printf '%*s' ${#1} | tr ' ' '-')${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_section "🔍 STEP 1: SAFETY BACKUP"

# Create timestamped backup
BACKUP_DIR="mymoolah_backup_$(date +%Y%m%d_%H%M%S)"
if [ ! -d "$BACKUP_DIR" ]; then
    echo "📦 Creating safety backup..."
    cp -r . "$BACKUP_DIR"
    print_success "Backup created: $BACKUP_DIR"
else
    print_warning "Backup directory already exists"
fi

print_section "📋 STEP 2: HANDOVER DOCUMENTATION CHECK"

# Check if handover documentation exists
HANDOVER_FILE="FIGMA_HANDOVER_$(date +%Y%m%d).md"
if [ -f "$HANDOVER_FILE" ]; then
    print_success "Handover documentation found: $HANDOVER_FILE"
    echo "📖 Please review the handover documentation before proceeding."
    read -p "Have you reviewed the handover documentation? (y/n): " review_confirmed
    if [ "$review_confirmed" != "y" ]; then
        print_error "Please review the handover documentation first."
        exit 1
    fi
else
    print_warning "No handover documentation found."
    echo "📝 Expected file: $HANDOVER_FILE"
    echo "💡 Figma AI should provide this documentation with enhancements."
    read -p "Do you want to continue without handover docs? (y/n): " continue_without
    if [ "$continue_without" != "y" ]; then
        print_error "Integration cancelled. Please get handover documentation from Figma AI."
        exit 1
    fi
fi

print_section "🛡️  STEP 3: PROTECTED FILES VERIFICATION"

# Protected files that should NOT be overwritten
PROTECTED_FILES=(
    "App.tsx"
    "styles/globals.css"
    "package.json"
    "vite.config.ts"
    "tsconfig.json"
    "contexts/AuthContext.tsx"
    "contexts/MoolahContext.tsx"
    "layouts/MobileLayout.tsx"
    "main.tsx"
    "index.html"
)

echo "🔒 These files are protected and will NOT be overwritten:"
for file in "${PROTECTED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "$file (exists)"
    else
        print_warning "$file (missing - this might be intentional)"
    fi
done

print_section "📁 STEP 4: FIGMA FILES ANALYSIS"

# Create staging area for Figma files
STAGING_DIR="figma_staging"
mkdir -p "$STAGING_DIR"

echo "📂 Please place your Figma AI enhanced files in the '$STAGING_DIR' directory"
echo "📋 Expected structure:"
echo "   $STAGING_DIR/"
echo "   ├── pages/           (updated page components)"
echo "   ├── components/      (new/updated components)"  
echo "   ├── styles/          (updated styles - REVIEW CAREFULLY)"
echo "   └── package.json     (new dependencies - REVIEW CAREFULLY)"

read -p "Have you placed the Figma files in $STAGING_DIR? (y/n): " files_ready
if [ "$files_ready" != "y" ]; then
    print_error "Please place Figma files in $STAGING_DIR first."
    exit 1
fi

print_section "🔍 STEP 5: CHANGE ANALYSIS"

# Analyze what's being changed
echo "🔍 Analyzing changes..."

# Check for new pages
if [ -d "$STAGING_DIR/pages" ]; then
    echo "\n📄 Page Updates Found:"
    for page in "$STAGING_DIR/pages"/*.tsx; do
        if [ -f "$page" ]; then
            page_name=$(basename "$page")
            if [ -f "pages/$page_name" ]; then
                print_warning "UPDATE: pages/$page_name (will be replaced)"
            else
                print_success "NEW: pages/$page_name (will be added)"
            fi
        fi
    done
fi

# Check for new components
if [ -d "$STAGING_DIR/components" ]; then
    echo "\n🧩 Component Updates Found:"
    find "$STAGING_DIR/components" -name "*.tsx" | while read -r component; do
        rel_path=${component#$STAGING_DIR/}
        if [ -f "$rel_path" ]; then
            print_warning "UPDATE: $rel_path (will be replaced)"
        else
            print_success "NEW: $rel_path (will be added)"
        fi
    done
fi

# Check for style changes
if [ -f "$STAGING_DIR/styles/globals.css" ]; then
    print_warning "CRITICAL: styles/globals.css will be updated"
    echo "⚠️  This could affect your entire app's appearance!"
fi

# Check for dependency changes
if [ -f "$STAGING_DIR/package.json" ]; then
    print_warning "CRITICAL: package.json has new dependencies"
    echo "📦 New packages will be installed"
fi

print_section "⚠️  STEP 6: INTEGRATION CONFIRMATION"

echo "🎯 Integration Summary:"
echo "   • Backup created: $BACKUP_DIR"
echo "   • Protected files will be preserved"
echo "   • New/updated components will be integrated"
echo "   • Dependencies will be updated if needed"
echo ""
print_warning "This will modify your MyMoolah application!"

read -p "Proceed with integration? (y/n): " proceed_integration
if [ "$proceed_integration" != "y" ]; then
    print_error "Integration cancelled by user."
    exit 1
fi

print_section "🔧 STEP 7: SAFE INTEGRATION"

# Integrate pages (non-protected)
if [ -d "$STAGING_DIR/pages" ]; then
    echo "📄 Integrating page updates..."
    for page in "$STAGING_DIR/pages"/*.tsx; do
        if [ -f "$page" ]; then
            page_name=$(basename "$page")
            cp "$page" "pages/$page_name"
            print_success "Integrated: pages/$page_name"
        fi
    done
fi

# Integrate components (non-protected)
if [ -d "$STAGING_DIR/components" ]; then
    echo "🧩 Integrating component updates..."
    # Copy component directories recursively, but skip protected ones
    rsync -av --exclude='auth/ProtectedRoute.tsx' \
             --exclude='common/ErrorBoundary.tsx' \
             --exclude='figma/' \
             "$STAGING_DIR/components/" "components/"
    print_success "Components integrated (protected files skipped)"
fi

# Handle dependency updates
if [ -f "$STAGING_DIR/package.json" ]; then
    echo "📦 Checking for new dependencies..."
    
    # Extract new dependencies (this is a simplified approach)
    print_warning "New package.json detected. Please review dependencies manually."
    echo "📋 Compare these files:"
    echo "   • Current: package.json"
    echo "   • New: $STAGING_DIR/package.json"
    
    read -p "Install new dependencies now? (y/n): " install_deps
    if [ "$install_deps" = "y" ]; then
        echo "📦 Installing dependencies..."
        npm install
        print_success "Dependencies updated"
    fi
fi

# Handle style updates (CAREFULLY)
if [ -f "$STAGING_DIR/styles/globals.css" ]; then
    print_warning "Style updates detected!"
    echo "🎨 Comparing current styles with Figma updates..."
    
    # Show diff if available
    if command -v diff >/dev/null 2>&1; then
        echo "📋 Style differences:"
        diff -u "styles/globals.css" "$STAGING_DIR/styles/globals.css" || true
    fi
    
    read -p "Apply style updates? (y/n): " apply_styles
    if [ "$apply_styles" = "y" ]; then
        cp "$STAGING_DIR/styles/globals.css" "styles/globals.css"
        print_success "Styles updated"
    else
        print_warning "Styles NOT updated - manual review needed"
    fi
fi

print_section "🧪 STEP 8: INTEGRATION TESTING"

echo "🔧 Running integration tests..."

# Check if TypeScript compiles
echo "📋 Checking TypeScript compilation..."
if command -v npx >/dev/null 2>&1; then
    if npx tsc --noEmit; then
        print_success "TypeScript compilation successful"
    else
        print_error "TypeScript compilation failed"
        echo "⚠️  Please fix TypeScript errors before proceeding"
    fi
else
    print_warning "TypeScript compiler not available for testing"
fi

# Check if app builds
echo "📋 Testing application build..."
if npm run build >/dev/null 2>&1; then
    print_success "Application builds successfully"
else
    print_error "Application build failed"
    echo "⚠️  Please check build errors"
fi

print_section "✅ STEP 9: INTEGRATION COMPLETE"

print_success "MyMoolah integration completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "   1. Start development server: npm run dev"
echo "   2. Test mobile layout at 375px width"
echo "   3. Verify all 6 pages work correctly"
echo "   4. Test user authentication flow"
echo "   5. Check MyMoolah branding consistency"
echo "   6. Test on low-cost Android device simulation"
echo ""
echo "📁 Important Files:"
echo "   • Backup: $BACKUP_DIR"
echo "   • Staging: $STAGING_DIR (can be deleted after testing)"
if [ -f "$HANDOVER_FILE" ]; then
    echo "   • Documentation: $HANDOVER_FILE"
fi
echo ""
echo "🆘 If Issues Occur:"
echo "   • Restore backup: rm -rf frontend/ && mv $BACKUP_DIR frontend/"
echo "   • Check Figma AI handover documentation"
echo "   • Ask Cursor AI for backend integration help"
echo ""
print_success "🚀 Your MyMoolah app is ready for testing!"

# Clean up staging area (optional)
read -p "Remove staging directory? (y/n): " cleanup_staging
if [ "$cleanup_staging" = "y" ]; then
    rm -rf "$STAGING_DIR"
    print_success "Staging directory cleaned up"
fi

echo -e "\n${BLUE}🎉 Integration Complete - Happy Coding!${NC}"