#!/bin/bash
# Automated Registration API Test Script for MyMoolah
# Usage: ./test-registration-api.sh

set -e
BASE_URL="${BASE_URL:-http://localhost:5050}"
REGISTER_ENDPOINT="$BASE_URL/api/v1/auth/register"
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

RANDOM_ID=$RANDOM
EMAIL1="testuser${RANDOM_ID}@example.com"
EMAIL2="testuser2${RANDOM_ID}@example.com"
# Generate a valid South African mobile number (e.g., 0821234567)
VALID_PHONE_PREFIXES=("082" "083" "084" "072" "073" "074" "076" "078" "079")
PREFIX_INDEX=$((RANDOM % ${#VALID_PHONE_PREFIXES[@]}))
PHONE_PREFIX=${VALID_PHONE_PREFIXES[$PREFIX_INDEX]}
PHONE_SUFFIX=$(printf "%07d" $((RANDOM % 10000000)))
PHONE="${PHONE_PREFIX}${PHONE_SUFFIX}"
ACCOUNT="12345${RANDOM_ID}"
USERNAME="user${RANDOM_ID}"

# Use a single valid password for all positive tests
VALID_PASSWORD="Testpass1!"
INVALID_PASSWORD="pass123"  # For negative test

# 1. Valid Registration: Phone
run_test "Valid Registration (Phone)" \
  "curl -s -X POST $REGISTER_ENDPOINT -H 'Content-Type: application/json' -d '{\"name\":\"Test User\",\"email\":\"$EMAIL1\",\"password\":\"$VALID_PASSWORD\",\"identifier\":\"$PHONE\",\"identifierType\":\"phone\"}'"

# 2. Valid Registration: Account
run_test "Valid Registration (Account)" \
  "curl -s -X POST $REGISTER_ENDPOINT -H 'Content-Type: application/json' -d '{\"name\":\"Account User\",\"email\":\"$EMAIL2\",\"password\":\"$VALID_PASSWORD\",\"identifier\":\"$ACCOUNT\",\"identifierType\":\"account\"}'"

# 3. Valid Registration: Username
run_test "Valid Registration (Username)" \
  "curl -s -X POST $REGISTER_ENDPOINT -H 'Content-Type: application/json' -d '{\"name\":\"Username User\",\"email\":\"user${RANDOM_ID}@example.com\",\"password\":\"$VALID_PASSWORD\",\"identifier\":\"$USERNAME\",\"identifierType\":\"username\"}'"

# 4. Duplicate Email
run_fail_test "Duplicate Email" \
  "curl -s -X POST $REGISTER_ENDPOINT -H 'Content-Type: application/json' -d '{\"name\":\"Test User\",\"email\":\"$EMAIL1\",\"password\":\"$VALID_PASSWORD\",\"identifier\":\"$PHONE\",\"identifierType\":\"phone\"}'"

# 5. Duplicate Identifier (Phone)
run_fail_test "Duplicate Identifier (Phone)" \
  "curl -s -X POST $REGISTER_ENDPOINT -H 'Content-Type: application/json' -d '{\"name\":\"Test User\",\"email\":\"dupe${RANDOM_ID}@example.com\",\"password\":\"$VALID_PASSWORD\",\"identifier\":\"$PHONE\",\"identifierType\":\"phone\"}'"

# 6. Invalid Phone
run_fail_test "Invalid Phone" \
  "curl -s -X POST $REGISTER_ENDPOINT -H 'Content-Type: application/json' -d '{\"name\":\"Test User\",\"email\":\"badphone${RANDOM_ID}@example.com\",\"password\":\"$VALID_PASSWORD\",\"identifier\":\"1234567\",\"identifierType\":\"phone\"}'"

# 7. Invalid Account
run_fail_test "Invalid Account" \
  "curl -s -X POST $REGISTER_ENDPOINT -H 'Content-Type: application/json' -d '{\"name\":\"Test User\",\"email\":\"badacct${RANDOM_ID}@example.com\",\"password\":\"$VALID_PASSWORD\",\"identifier\":\"1234abc\",\"identifierType\":\"account\"}'"

# 8. Invalid Username
run_fail_test "Invalid Username" \
  "curl -s -X POST $REGISTER_ENDPOINT -H 'Content-Type: application/json' -d '{\"name\":\"Test User\",\"email\":\"baduser${RANDOM_ID}@example.com\",\"password\":\"$VALID_PASSWORD\",\"identifier\":\"ab\",\"identifierType\":\"username\"}'"

# 9. Invalid Password
run_fail_test "Invalid Password" \
  "curl -s -X POST $REGISTER_ENDPOINT -H 'Content-Type: application/json' -d '{\"name\":\"Test User\",\"email\":\"badpass${RANDOM_ID}@example.com\",\"password\":\"$INVALID_PASSWORD\",\"identifier\":\"$PHONE\",\"identifierType\":\"phone\"}'"

if [ "$failures" -eq 0 ]; then
  echo -e "\n🎉 All registration API tests passed!"
  exit 0
else
  echo -e "\n❌ $failures registration API test(s) failed."
  exit 1
fi 