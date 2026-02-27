#!/usr/bin/env bash
#
# EasyPay Bill Payment — 5-Scenario End-to-End Test
# Run against Staging: https://staging.mymoolah.africa/billpayment/v1
#
# Prerequisites:
#   - Seed test data: node scripts/seed-easypay-data.js --staging
#   - EASYPAY_API_KEY or pass token as first argument
#
# Usage: ./scripts/test-easypay-5-scenarios.sh [SESSION_TOKEN] [BASE_URL]
#

set -e

TOKEN="${1:-${EASYPAY_API_KEY}}"
BASE="${2:-https://staging.mymoolah.africa/billpayment/v1}"

if [ -z "$TOKEN" ]; then
  echo "❌ Usage: $0 <SESSION_TOKEN> [BASE_URL]"
  echo "   Or set EASYPAY_API_KEY"
  exit 1
fi

echo "═══════════════════════════════════════════════════════════════════"
echo "  EasyPay 5-Scenario Test — $BASE"
echo "═══════════════════════════════════════════════════════════════════"

pass=0
fail=0

test_info() {
  local num=$1
  local ep=$2
  local expect=$3
  local name=$4
  local result
  result=$(curl -s -X POST "$BASE/infoRequest" \
    -H "Content-Type: application/json" \
    -H "Authorization: SessionToken $TOKEN" \
    -d "{\"EasyPayNumber\":\"$ep\",\"AccountNumber\":\"0000000$num\",\"EchoData\":\"echo$num\"}")
  local rc=$(echo "$result" | grep -o '"ResponseCode":"[0-9]"' | cut -d'"' -f4)
  if [ "$rc" = "$expect" ]; then
    echo "  ✅ Scenario $num infoRequest: RC=$rc (expected $expect)"
    pass=$((pass + 1))
  else
    echo "  ❌ Scenario $num infoRequest: got RC=$rc, expected $expect — $name"
    echo "     Response: $result"
    fail=$((fail + 1))
  fi
}

test_auth() {
  local num=$1
  local ep=$2
  local amount=$3
  local ref=$4
  local expect=$5
  local name=$6
  local result
  result=$(curl -s -X POST "$BASE/authorisationRequest" \
    -H "Content-Type: application/json" \
    -H "Authorization: SessionToken $TOKEN" \
    -d "{\"EasyPayNumber\":\"$ep\",\"AccountNumber\":\"0000000$num\",\"Amount\":$amount,\"Reference\":\"$ref\",\"EchoData\":\"echo$num\"}")
  local rc=$(echo "$result" | grep -o '"ResponseCode":"[0-9]"' | cut -d'"' -f4)
  if [ "$rc" = "$expect" ]; then
    echo "  ✅ Scenario $num authorisationRequest: RC=$rc (expected $expect)"
    pass=$((pass + 1))
  else
    echo "  ❌ Scenario $num authorisationRequest: got RC=$rc, expected $expect — $name"
    echo "     Response: $result"
    fail=$((fail + 1))
  fi
}

echo ""
echo "--- infoRequest tests ---"
test_info 1 "95063000000011" "0" "Valid unpaid"
test_info 2 "95063000000029" "5" "Already paid"
test_info 3 "95063000000037" "3" "Expired"
test_info 4 "95063000000045" "0" "Open amount"
test_info 5 "95063000000052" "0" "Fixed R300"

echo ""
echo "--- authorisationRequest tests ---"
test_auth 2 "95063000000029" 20000 "TESTREF-S2-$(date +%s)" "5" "Already paid (reject)"
test_auth 3 "95063000000037" 5000 "TESTREF-S3-$(date +%s)" "3" "Expired (reject)"
test_auth 5 "95063000000052" 10000 "TESTREF-S5-WRONG-$(date +%s)" "2" "Wrong amount (reject)"
test_auth 4 "95063000000045" 5000 "TESTREF-S4-$(date +%s)" "0" "Open amount R50 (allow)"
REF_S1="TESTREF-S1-$(date +%s)"
test_auth 1 "95063000000011" 10000 "$REF_S1" "0" "Valid R100 (allow)"

echo ""
echo "--- Scenario 1: paymentNotification (simulate EasyPay settlement) ---"
curl -s -X POST "$BASE/paymentNotification" \
  -H "Content-Type: application/json" \
  -H "Authorization: SessionToken $TOKEN" \
  -d "{\"EasyPayNumber\":\"95063000000011\",\"AccountNumber\":\"00000001\",\"Amount\":10000,\"Reference\":\"$REF_S1\",\"EchoData\":\"echo1\"}" | grep -q '"ResponseCode":"0"' && \
  echo "  ✅ paymentNotification OK" || echo "  ❌ paymentNotification failed"

echo ""
echo "--- Scenario 1 idempotency: second authorisationRequest must return 5 ---"
test_auth 1 "95063000000011" 10000 "TESTREF-S1-DUP-$(date +%s)" "5" "Second attempt (AlreadyPaid)"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  Results: $pass passed, $fail failed"
echo "═══════════════════════════════════════════════════════════════════"

[ $fail -eq 0 ]
