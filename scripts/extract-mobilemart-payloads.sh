#!/bin/bash

# Extract MobileMart API Payloads from Backend Logs
# Usage: ./scripts/extract-mobilemart-payloads.sh [network]
# Example: ./scripts/extract-mobilemart-payloads.sh telkom

set -e

NETWORK="${1:-all}"
OUTPUT_DIR="docs/mobilemart_payloads"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "🔍 Extracting MobileMart API Payloads..."
echo "Network filter: $NETWORK"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to extract from console/terminal output
extract_from_console() {
    echo "📋 Searching backend logs for MobileMart API calls..."
    echo ""
    
    # Try to find log files
    if [ -f "logs/backend.log" ]; then
        LOG_FILE="logs/backend.log"
    elif [ -f "server.log" ]; then
        LOG_FILE="server.log"
    else
        echo "⚠️  No log files found. Please check backend terminal output."
        echo ""
        echo "📝 To capture logs in Codespaces:"
        echo "   1. Make a test purchase (Telkom, MTN, Vodacom, or CellC)"
        echo "   2. Look for these lines in backend terminal:"
        echo "      - 📤 MobileMart request:"
        echo "      - 🔍 MobileMart HTTP Response:"
        echo "   3. Copy the JSON payloads"
        return 1
    fi
    
    echo "📂 Searching log file: $LOG_FILE"
    echo ""
    
    # Extract MobileMart requests
    echo "=== MOBILEMART REQUESTS ===" > "$OUTPUT_DIR/requests_$TIMESTAMP.log"
    grep -A 10 "MobileMart request:" "$LOG_FILE" | tail -500 >> "$OUTPUT_DIR/requests_$TIMESTAMP.log" 2>/dev/null || true
    
    # Extract MobileMart responses
    echo "=== MOBILEMART RESPONSES ===" > "$OUTPUT_DIR/responses_$TIMESTAMP.log"
    grep -A 30 "MobileMart HTTP Response:" "$LOG_FILE" | tail -500 >> "$OUTPUT_DIR/responses_$TIMESTAMP.log" 2>/dev/null || true
    
    # Extract error details
    echo "=== MOBILEMART ERRORS ===" > "$OUTPUT_DIR/errors_$TIMESTAMP.log"
    grep -A 20 "MobileMart Error Details:" "$LOG_FILE" | tail -500 >> "$OUTPUT_DIR/errors_$TIMESTAMP.log" 2>/dev/null || true
    
    echo "✅ Extracted to:"
    echo "   - $OUTPUT_DIR/requests_$TIMESTAMP.log"
    echo "   - $OUTPUT_DIR/responses_$TIMESTAMP.log"
    echo "   - $OUTPUT_DIR/errors_$TIMESTAMP.log"
}

# Function to query database for recent transactions
extract_from_database() {
    echo "📊 Querying database for recent MobileMart transactions..."
    echo ""
    
    # Use db-connection-helper
    if [ -f "scripts/db-connection-helper.js" ]; then
        node -e "
        const helper = require('./scripts/db-connection-helper.js');
        (async () => {
            try {
                const pool = await helper.connectToDatabase('staging');
                const result = await pool.query(\`
                    SELECT 
                        id,
                        \"productName\",
                        \"supplierCode\",
                        \"isAvailable\",
                        \"errorCode\",
                        \"errorMessage\",
                        \"checkedAt\",
                        \"productId\"
                    FROM product_availability_logs
                    WHERE \"supplierCode\" = 'MOBILEMART'
                      AND \"checkedAt\" > NOW() - INTERVAL '2 hours'
                    ORDER BY \"checkedAt\" DESC
                    LIMIT 20
                \`);
                console.log('\\n📋 Recent MobileMart Transactions:\\n');
                console.log(JSON.stringify(result.rows, null, 2));
                await pool.end();
            } catch (err) {
                console.error('❌ Database query failed:', err.message);
            }
        })();
        " || echo "⚠️  Database query failed"
    else
        echo "⚠️  db-connection-helper.js not found"
    fi
}

# Main execution
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  MobileMart Payload Extractor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Extract from logs
extract_from_console

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Extract from database
# extract_from_database

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📄 Full report available at:"
echo "   docs/MOBILEMART_UAT_API_PAYLOADS.md"
echo ""
echo "📤 To get complete payloads:"
echo "   1. In Codespaces, make test purchases for each network"
echo "   2. Copy backend terminal output (look for 📤 and 🔍 emojis)"
echo "   3. Or run: grep -A 20 'MobileMart request:' in Codespaces terminal"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
