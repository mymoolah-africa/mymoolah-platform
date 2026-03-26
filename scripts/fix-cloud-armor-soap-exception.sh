#!/bin/bash
# fix-cloud-armor-soap-exception.sh
# Adds a Cloud Armor path exception to allow SOAP XML payloads
# on the /api/v1/standardbank/notification endpoint.
#
# Without this, Cloud Armor WAF blocks SBSA SOAP credit notifications
# with 403 Forbidden (OWASP CRS body-scanning rules flag XML as XSS/injection).
#
# Safe: only adds a high-priority ALLOW rule for this specific path.
# Does NOT modify or delete any existing rules.
#
# Usage: Run from Codespaces (requires gcloud auth)
#   bash scripts/fix-cloud-armor-soap-exception.sh [--dry-run]

set -uo pipefail

PROJECT="mymoolah-db"
PRIORITY=50
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
    echo "    --expression=\"request.path.matches('/api/v1/standardbank/notification')\""
    echo "    --action=allow"
    echo ""
    continue
  fi

  echo "  Adding ALLOW rule at priority $PRIORITY for SBSA SOAP notification path..."
  gcloud compute security-policies rules create "$PRIORITY" \
    --security-policy="$POLICY_NAME" \
    --project="$PROJECT" \
    --expression="request.path.matches('/api/v1/standardbank/notification')" \
    --action=allow \
    --description="Allow SBSA SOAP XML credit notifications (H2H integration)" 2>&1

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
echo "  1. Test via load balancer:"
echo "     curl -v -X POST https://staging.mymoolah.africa/api/v1/standardbank/notification -H 'Content-Type: text/xml' -d @/tmp/sbsa-test-notification.xml"
echo "  2. If staging works, production should also work (same fix applied)"
echo "  3. Deploy backend to production if not yet done: ./scripts/deploy-backend.sh --production"
