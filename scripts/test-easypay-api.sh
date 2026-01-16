#!/bin/bash
# EasyPay API Testing Script
# Tests authentication and idempotency features

BASE_URL="http://localhost:3001/api/v1"
ENDPOINT="${BASE_URL}/vouchers/easypay/topup/settlement"

# Valid test PIN (generated with receiverId 5063, account 12345678)
# This passes Luhn validation: 95063123456785
VALID_TEST_PIN="95063123456785"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 EasyPay API Testing - Authentication & Idempotency"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ensure gcloud is authenticated and project is set (non-blocking)
echo "📋 Checking gcloud authentication..."
if gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q .; then
  echo "✅ gcloud is authenticated"
  echo "📋 Setting gcloud project to mymoolah-db..."
  gcloud config set project mymoolah-db 2>/dev/null || echo "⚠️  Could not set gcloud project (non-critical)"
else
  echo "⚠️  gcloud not authenticated. Skipping gcloud setup (not required for API testing)"
  echo "   To authenticate manually, run: gcloud auth login && gcloud config set project mymoolah-db"
fi

echo ""

# Test 1: Missing API Key (should return 401)
echo "📋 Test 1: Missing API Key (should return 401)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{
    \"easypay_code\": \"${VALID_TEST_PIN}\",
    "settlement_amount": 100.00,
    "merchant_id": "EP_TEST_001",
    "transaction_id": "EP_TXN_TEST_001",
    "terminal_id": "EP_TERMINAL_001"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat
echo ""
echo ""

# Test 2: Invalid API Key (should return 401)
echo "📋 Test 2: Invalid API Key (should return 401)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: invalid_key_12345" \
  -d "{
    \"easypay_code\": \"${VALID_TEST_PIN}\",
    "settlement_amount": 100.00,
    "merchant_id": "EP_TEST_001",
    "transaction_id": "EP_TXN_TEST_002",
    "terminal_id": "EP_TERMINAL_001"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat
echo ""
echo ""

# Test 3: Idempotency - First Request (will fail auth, but tests idempotency key storage)
echo "📋 Test 3: Idempotency - First Request with Idempotency Key"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
IDEMPOTENCY_KEY="test-idempotency-$(date +%s)"
echo "Using Idempotency Key: ${IDEMPOTENCY_KEY}"
echo ""

RESPONSE1=$(curl -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -d "{
    \"easypay_code\": \"${VALID_TEST_PIN}\",
    "settlement_amount": 100.00,
    "merchant_id": "EP_TEST_001",
    "transaction_id": "EP_TXN_TEST_003",
    "terminal_id": "EP_TERMINAL_001"
  }' \
  -w "\nHTTP_STATUS:%{http_code}" \
  -s)

echo "First Request Response:"
echo "$RESPONSE1" | grep -v "HTTP_STATUS" | jq '.' 2>/dev/null || echo "$RESPONSE1" | grep -v "HTTP_STATUS"
HTTP_STATUS1=$(echo "$RESPONSE1" | grep "HTTP_STATUS" | cut -d: -f2)
echo "HTTP Status: ${HTTP_STATUS1}"
echo ""

# Test 4: Idempotency - Duplicate Request (same key, same body - should return cached response)
echo "📋 Test 4: Idempotency - Duplicate Request (same key, same body)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Using SAME Idempotency Key: ${IDEMPOTENCY_KEY}"
echo ""

RESPONSE2=$(curl -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: ${IDEMPOTENCY_KEY}" \
  -d "{
    \"easypay_code\": \"${VALID_TEST_PIN}\",
    "settlement_amount": 100.00,
    "merchant_id": "EP_TEST_001",
    "transaction_id": "EP_TXN_TEST_003",
    "terminal_id": "EP_TERMINAL_001"
  }' \
  -w "\nHTTP_STATUS:%{http_code}" \
  -s)

echo "Second Request Response (should be identical to first):"
echo "$RESPONSE2" | grep -v "HTTP_STATUS" | jq '.' 2>/dev/null || echo "$RESPONSE2" | grep -v "HTTP_STATUS"
HTTP_STATUS2=$(echo "$RESPONSE2" | grep "HTTP_STATUS" | cut -d: -f2)
echo "HTTP Status: ${HTTP_STATUS2}"
echo ""

if [ "$HTTP_STATUS1" = "$HTTP_STATUS2" ]; then
  echo "✅ Idempotency working: Same HTTP status returned"
else
  echo "⚠️  Idempotency check: Different HTTP status (may be expected if first request failed)"
fi
echo ""

# Test 5: Idempotency Conflict - Same key, different body (should return 409)
echo "📋 Test 5: Idempotency Conflict - Same key, different body (should return 409)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CONFLICT_KEY="test-conflict-$(date +%s)"
echo "Using Idempotency Key: ${CONFLICT_KEY}"
echo ""

# First request
curl -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: ${CONFLICT_KEY}" \
  -d "{
    \"easypay_code\": \"${VALID_TEST_PIN}\",
    "settlement_amount": 100.00,
    "merchant_id": "EP_TEST_001",
    "transaction_id": "EP_TXN_TEST_004",
    "terminal_id": "EP_TERMINAL_001"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat
echo ""

# Second request with same key but different body
echo "Second request with SAME key but DIFFERENT body (different amount):"
curl -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: ${CONFLICT_KEY}" \
  -d "{
    \"easypay_code\": \"${VALID_TEST_PIN}\",
    "settlement_amount": 200.00,
    "merchant_id": "EP_TEST_001",
    "transaction_id": "EP_TXN_TEST_004",
    "terminal_id": "EP_TERMINAL_001"
  }' \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.' 2>/dev/null || cat
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Testing Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Expected Results:"
echo "  Test 1: HTTP 401, error.code = 'MISSING_API_KEY'"
echo "  Test 2: HTTP 401, error.code = 'INVALID_API_KEY'"
echo "  Test 3-4: Same response (idempotency working)"
echo "  Test 5: HTTP 409, error.code = 'DUPLICATE_REQUEST' (if first request succeeded)"
echo ""
