#!/bin/bash
# Automated Login API Test Script for MyMoolah
# Usage: ./test-login-api.sh

set -e
BASE_URL="${BASE_URL:-http://localhost:5050}"
LOGIN_ENDPOINT="$BASE_URL/api/v1/auth/login"
JQ_BIN=$(command -v jq || true)

failures=0
run_test() {
  local desc="$1"
  shift
  echo -e "\n=== $desc ==="
  response=$(eval "$@")
  echo "$response" | grep -q 'success":true' && echo "✅ PASS" || { echo "❌ FAIL"; failures=$((failures+1)); }
  if [ -n "$JQ_BIN" ]; then echo "$response" | $JQ_BIN; else echo "$response"; fi
}
run_fail_test() {
  local desc="$1"
  shift
  echo -e "\n=== $desc ==="
  response=$(eval "$@")
  echo "$response" | grep -q 'success":false' && echo "✅ PASS (expected fail)" || { echo "❌ FAIL (should have failed)"; failures=$((failures+1)); }
  if [ -n "$JQ_BIN" ]; then echo "$response" | $JQ_BIN; else echo "$response"; fi
}

# Demo credentials (should exist in DB for test to pass)
PHONE="27821234567"
PHONE_PASS="Demo123!"

# 1. Valid Login
run_test "Valid Login" \
  "curl -s -X POST $LOGIN_ENDPOINT -H 'Content-Type: application/json' -d '{\"identifier\":\"$PHONE\",\"password\":\"$PHONE_PASS\"}'"

# 2. Invalid Password
run_fail_test "Invalid Password" \
  "curl -s -X POST $LOGIN_ENDPOINT -H 'Content-Type: application/json' -d '{\"identifier\":\"$PHONE\",\"password\":\"WrongPass!\"}'"

# 3. Invalid Identifier
run_fail_test "Invalid Identifier" \
  "curl -s -X POST $LOGIN_ENDPOINT -H 'Content-Type: application/json' -d '{\"identifier\":\"notarealuser\",\"password\":\"SomePass1!\"}'"

# 4. Empty Fields
run_fail_test "Empty Identifier" \
  "curl -s -X POST $LOGIN_ENDPOINT -H 'Content-Type: application/json' -d '{\"identifier\":\"\",\"password\":\"Demo123!\"}'"
run_fail_test "Empty Password" \
  "curl -s -X POST $LOGIN_ENDPOINT -H 'Content-Type: application/json' -d '{\"identifier\":\"$PHONE\",\"password\":\"\"}'"

if [ "$failures" -eq 0 ]; then
  echo -e "\n🎉 All login API tests passed!"
  exit 0
else
  echo -e "\n❌ $failures login API test(s) failed."
  exit 1
fi 