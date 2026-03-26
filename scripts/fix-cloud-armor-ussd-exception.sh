#!/bin/bash
# fix-cloud-armor-ussd-exception.sh
# Adds a Cloud Armor path exception to allow Cellfind USSD gateway
# callbacks on the /api/v1/ussd endpoint.
#
# Without this, Cloud Armor WAF may block Cellfind requests with 403
# (OWASP CRS rules can flag query parameters like networkid=1 as XSS).
#
# Safe: only adds a high-priority ALLOW rule for this specific path.
# Does NOT modify or delete any existing rules.
#
# Usage: Run from Codespaces (requires gcloud auth)
#   bash scripts/fix-cloud-armor-ussd-exception.sh [--dry-run]

set -uo pipefail

PROJECT="mymoolah-db"
PRIORITY=51
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "=== DRY RUN MODE — no changes will be made ==="
  echo ""
fi

echo "=== Step 1: List existing Cloud Armor policies ==="
gcloud compute security-policies list --project="$PROJECT" --format="table(name,description)" 2>&1 || {
  echo "ERROR: Could not list security policies. Check gcloud auth."
  exit 1
}
echo ""

for POLICY_NAME in mmtp-waf-staging mmtp-waf-production; do
  echo "=== Checking policy: $POLICY_NAME ==="

  POLICY_EXISTS=$(gcloud compute security-policies describe "$POLICY_NAME" \
    --project="$PROJECT" --format="value(name)" 2>/dev/null || echo "NOT_FOUND")

  if [[ "$POLICY_EXISTS" == "NOT_FOUND" ]]; then
    echo "  Policy $POLICY_NAME does not exist — skipping"
    echo ""
    continue
  fi

  echo "  Policy exists. Current rules:"
  gcloud compute security-policies describe "$POLICY_NAME" \
    --project="$PROJECT" \
    --format="table(rules.priority,rules.action,rules.description)" 2>&1 || true
  echo ""

  RULE_EXISTS=$(gcloud compute security-policies rules describe "$PRIORITY" \
    --security-policy="$POLICY_NAME" \
    --project="$PROJECT" --format="value(priority)" 2>/dev/null || echo "NOT_FOUND")

  if [[ "$RULE_EXISTS" != "NOT_FOUND" ]]; then
    echo "  Rule at priority $PRIORITY already exists — skipping (will not overwrite)"
    echo ""
    continue
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  [DRY RUN] Would create rule at priority $PRIORITY:"
    echo "    --expression=\"request.path.matches('/api/v1/ussd')\""
    echo "    --action=allow"
    echo ""
    continue
  fi

  echo "  Adding ALLOW rule at priority $PRIORITY for Cellfind USSD callback path..."
  gcloud compute security-policies rules create "$PRIORITY" \
    --security-policy="$POLICY_NAME" \
    --project="$PROJECT" \
    --expression="request.path.matches('/api/v1/ussd')" \
    --action=allow \
    --description="Allow Cellfind USSD gateway callbacks (*120*5616#)" 2>&1

  if [[ $? -eq 0 ]]; then
    echo "  Rule created successfully on $POLICY_NAME"
  else
    echo "  ERROR: Failed to create rule on $POLICY_NAME"
  fi
  echo ""
done

echo "=== Done ==="
echo ""
echo "Next steps:"
echo "  1. Deploy backend with USSD env vars:"
echo "     ./scripts/deploy-backend.sh --production"
echo "  2. Verify endpoint responds (will return XML even for unknown sessions):"
echo "     curl -s 'https://api-mm.mymoolah.africa/api/v1/ussd?msisdn=27821234567&sessionid=test&type=1&networkid=1'"
echo "  3. Confirm with Cellfind (Marcella) that endpoint is live"
