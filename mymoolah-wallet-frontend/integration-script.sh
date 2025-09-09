#!/bin/bash

# Safe integration script for MyMoolah frontend
echo "🔍 Analyzing Figma files for safe integration..."

# 1. First, ensure your excellent foundation is backed up
if [ ! -d "frontend_EXCELLENT_BACKUP" ]; then
    echo "📦 Creating backup of your excellent foundation..."
    cp -r frontend/ "frontend_EXCELLENT_BACKUP_$(date +%Y%m%d_%H%M%S)/"
fi

# 2. Create analysis directory
mkdir -p temp_figma_analysis
echo "📁 Place your Figma files in temp_figma_analysis/ folder"

# 3. Compare key files (DO NOT OVERWRITE THESE)
PROTECTED_FILES=(
    "App.tsx"
    "styles/globals.css"
    "package.json"
    "vite.config.ts"
    "tsconfig.json"
    "contexts/AuthContext.tsx"
    "contexts/MoolahContext.tsx"
    "layouts/MobileLayout.tsx"
)

echo "🛡️  Protected files (will NOT be overwritten):"
for file in "${PROTECTED_FILES[@]}"; do
    echo "  ✅ $file"
done

# 4. Identify potentially beneficial new components
echo "🔍 Looking for new components to potentially add..."
find temp_figma_analysis/ -name "*.tsx" -not -path "*/node_modules/*" | while read -r file; do
    filename=$(basename "$file")
    if [ ! -f "frontend/$file" ]; then
        echo "  📝 New component found: $filename"
    fi
done

echo "✅ Analysis complete. Review the findings before proceeding."