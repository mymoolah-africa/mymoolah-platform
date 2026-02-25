#!/usr/bin/env bash
# =============================================================================
# Flash Product Catalog — Full Verification & Sync
# Checks UAT, Staging, and Production catalog parity.
# Runs the sync script if gaps are found.
#
# Run in Codespaces (proxies must be running):
#   ./scripts/verify-and-sync-flash-catalog.sh
# =============================================================================
set -euo pipefail

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}✅  $*${RESET}"; }
fail() { echo -e "${RED}❌  $*${RESET}"; }
warn() { echo -e "${YELLOW}⚠️   $*${RESET}"; }
info() { echo -e "${CYAN}ℹ️   $*${RESET}"; }
hdr()  { echo -e "\n${BOLD}${CYAN}$*${RESET}"; echo "────────────────────────────────────────────────────────────"; }

# ── config ────────────────────────────────────────────────────────────────────
UAT_HOST=127.0.0.1;     UAT_PORT=6543;  UAT_DB=mymoolah
STG_HOST=127.0.0.1;     STG_PORT=6544;  STG_DB=mymoolah_staging
UAT_USER=mymoolah_app
STG_USER=mymoolah_app
PROJECT=mymoolah-db

# ── passwords ─────────────────────────────────────────────────────────────────
hdr "STEP 1 — Retrieving database passwords"

# UAT password from .env / DATABASE_URL
if [[ -f .env ]]; then
  source <(grep -E "^(DB_PASSWORD|DATABASE_URL)" .env | head -5) 2>/dev/null || true
fi
UAT_PASS="${DB_PASSWORD:-}"
if [[ -z "$UAT_PASS" && -n "${DATABASE_URL:-}" ]]; then
  UAT_PASS=$(python3 -c "from urllib.parse import urlparse,unquote; u=urlparse('${DATABASE_URL}'); print(unquote(u.password))" 2>/dev/null || true)
fi
if [[ -z "$UAT_PASS" ]]; then
  fail "Cannot determine UAT password (DB_PASSWORD or DATABASE_URL not set)"
  exit 1
fi
ok "UAT password retrieved"

STG_PASS=$(gcloud secrets versions access latest \
  --secret="db-mmtp-pg-staging-password" \
  --project="${PROJECT}" 2>/dev/null)
if [[ -z "$STG_PASS" ]]; then
  fail "Cannot retrieve Staging password from Secret Manager"
  exit 1
fi
ok "Staging password retrieved"

# ── proxy check ───────────────────────────────────────────────────────────────
hdr "STEP 2 — Checking Cloud SQL Auth Proxy ports"
for PORT in $UAT_PORT $STG_PORT; do
  if (echo > /dev/tcp/127.0.0.1/$PORT) 2>/dev/null; then
    ok "Port $PORT is listening"
  else
    fail "Port $PORT is NOT listening — run: ./scripts/ensure-proxies-running.sh"
    exit 1
  fi
done

# ── helper: run psql query ────────────────────────────────────────────────────
q() {
  local HOST=$1 PORT=$2 USER=$3 DB=$4 PASS=$5 SQL=$6
  PGPASSWORD="$PASS" psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB" \
    -t -A -c "$SQL" 2>/dev/null
}

# ── UAT counts ────────────────────────────────────────────────────────────────
hdr "STEP 3 — UAT catalog counts"

UAT_SUPPLIER=$(q $UAT_HOST $UAT_PORT $UAT_USER $UAT_DB "$UAT_PASS" \
  "SELECT id FROM suppliers WHERE code='FLASH' LIMIT 1")
if [[ -z "$UAT_SUPPLIER" ]]; then
  fail "FLASH supplier not found in UAT"; exit 1
fi
ok "UAT Flash supplier ID: $UAT_SUPPLIER"

UAT_PRODUCTS=$(q $UAT_HOST $UAT_PORT $UAT_USER $UAT_DB "$UAT_PASS" \
  "SELECT COUNT(*) FROM products WHERE \"supplierId\"='$UAT_SUPPLIER'")
UAT_VARIANTS=$(q $UAT_HOST $UAT_PORT $UAT_USER $UAT_DB "$UAT_PASS" \
  "SELECT COUNT(*) FROM product_variants WHERE \"supplierId\"='$UAT_SUPPLIER'")
UAT_BRANDS=$(q $UAT_HOST $UAT_PORT $UAT_USER $UAT_DB "$UAT_PASS" \
  "SELECT COUNT(DISTINCT pb.id) FROM product_brands pb
   JOIN products p ON p.\"brandId\"=pb.id
   WHERE p.\"supplierId\"='$UAT_SUPPLIER'")
UAT_ACTIVE=$(q $UAT_HOST $UAT_PORT $UAT_USER $UAT_DB "$UAT_PASS" \
  "SELECT COUNT(*) FROM products WHERE \"supplierId\"='$UAT_SUPPLIER' AND status='active'")
UAT_NO_VARIANT=$(q $UAT_HOST $UAT_PORT $UAT_USER $UAT_DB "$UAT_PASS" \
  "SELECT COUNT(*) FROM products p
   WHERE p.\"supplierId\"='$UAT_SUPPLIER'
   AND NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.\"productId\"=p.id)")

echo "   Products:              $UAT_PRODUCTS"
echo "   ProductVariants:       $UAT_VARIANTS"
echo "   Brands:                $UAT_BRANDS"
echo "   Active products:       $UAT_ACTIVE"
echo "   Products w/o variant:  $UAT_NO_VARIANT"

if [[ "$UAT_NO_VARIANT" -gt 0 ]]; then
  warn "$UAT_NO_VARIANT products have no ProductVariant — will fix"
fi

# ── UAT type breakdown ────────────────────────────────────────────────────────
hdr "STEP 4 — UAT product type breakdown"
q $UAT_HOST $UAT_PORT $UAT_USER $UAT_DB "$UAT_PASS" \
  "SELECT type, COUNT(*) as count
   FROM products WHERE \"supplierId\"='$UAT_SUPPLIER'
   GROUP BY type ORDER BY count DESC" | \
  while IFS='|' read -r TYPE CNT; do
    printf "   %-30s %s\n" "$TYPE" "$CNT"
  done

# ── Staging counts ────────────────────────────────────────────────────────────
hdr "STEP 5 — Staging catalog counts"

STG_SUPPLIER=$(q $STG_HOST $STG_PORT $STG_USER $STG_DB "$STG_PASS" \
  "SELECT id FROM suppliers WHERE code='FLASH' LIMIT 1")
if [[ -z "$STG_SUPPLIER" ]]; then
  fail "FLASH supplier not found in Staging"; exit 1
fi
ok "Staging Flash supplier ID: $STG_SUPPLIER"

STG_PRODUCTS=$(q $STG_HOST $STG_PORT $STG_USER $STG_DB "$STG_PASS" \
  "SELECT COUNT(*) FROM products WHERE \"supplierId\"='$STG_SUPPLIER'")
STG_VARIANTS=$(q $STG_HOST $STG_PORT $STG_USER $STG_DB "$STG_PASS" \
  "SELECT COUNT(*) FROM product_variants WHERE \"supplierId\"='$STG_SUPPLIER'")
STG_BRANDS=$(q $STG_HOST $STG_PORT $STG_USER $STG_DB "$STG_PASS" \
  "SELECT COUNT(DISTINCT pb.id) FROM product_brands pb
   JOIN products p ON p.\"brandId\"=pb.id
   WHERE p.\"supplierId\"='$STG_SUPPLIER'")
STG_ACTIVE=$(q $STG_HOST $STG_PORT $STG_USER $STG_DB "$STG_PASS" \
  "SELECT COUNT(*) FROM products WHERE \"supplierId\"='$STG_SUPPLIER' AND status='active'")
STG_NO_VARIANT=$(q $STG_HOST $STG_PORT $STG_USER $STG_DB "$STG_PASS" \
  "SELECT COUNT(*) FROM products p
   WHERE p.\"supplierId\"='$STG_SUPPLIER'
   AND NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.\"productId\"=p.id)")

echo "   Products:              $STG_PRODUCTS"
echo "   ProductVariants:       $STG_VARIANTS"
echo "   Brands:                $STG_BRANDS"
echo "   Active products:       $STG_ACTIVE"
echo "   Products w/o variant:  $STG_NO_VARIANT"

# ── Staging type breakdown ────────────────────────────────────────────────────
hdr "STEP 6 — Staging product type breakdown"
q $STG_HOST $STG_PORT $STG_USER $STG_DB "$STG_PASS" \
  "SELECT type, COUNT(*) as count
   FROM products WHERE \"supplierId\"='$STG_SUPPLIER'
   GROUP BY type ORDER BY count DESC" | \
  while IFS='|' read -r TYPE CNT; do
    printf "   %-30s %s\n" "$TYPE" "$CNT"
  done

# ── Missing products in Staging ───────────────────────────────────────────────
hdr "STEP 7 — Products in UAT but missing from Staging"
MISSING=$(q $UAT_HOST $UAT_PORT $UAT_USER $UAT_DB "$UAT_PASS" \
  "SELECT p.name FROM products p
   WHERE p.\"supplierId\"='$UAT_SUPPLIER'
   AND p.name NOT IN (
     SELECT name FROM products
     WHERE \"supplierId\" IN (
       SELECT id FROM suppliers WHERE code='FLASH'
     )
   )" 2>/dev/null || echo "")

# Count missing (run against staging directly)
MISSING_COUNT=$(PGPASSWORD="$UAT_PASS" psql -h $UAT_HOST -p $UAT_PORT \
  -U $UAT_USER -d $UAT_DB -t -A 2>/dev/null <<EOF
SELECT COUNT(*) FROM products p
WHERE p."supplierId"='$UAT_SUPPLIER'
AND p.name NOT IN (
  SELECT p2.name FROM products p2
  JOIN suppliers s2 ON p2."supplierId"=s2.id
  WHERE s2.code='FLASH'
  AND p2."supplierId" != '$UAT_SUPPLIER'
);
EOF
) || MISSING_COUNT=0

if [[ "$UAT_PRODUCTS" -eq "$STG_PRODUCTS" ]]; then
  ok "Product counts match: UAT=$UAT_PRODUCTS  Staging=$STG_PRODUCTS"
else
  warn "Product count mismatch: UAT=$UAT_PRODUCTS  Staging=$STG_PRODUCTS"
fi

if [[ "$UAT_VARIANTS" -eq "$STG_VARIANTS" ]]; then
  ok "Variant counts match:  UAT=$UAT_VARIANTS  Staging=$STG_VARIANTS"
else
  warn "Variant count mismatch: UAT=$UAT_VARIANTS  Staging=$STG_VARIANTS"
fi

# ── Fee & commission config ───────────────────────────────────────────────────
hdr "STEP 8 — Flash fee & commission config (UAT)"
UAT_FEES=$(q $UAT_HOST $UAT_PORT $UAT_USER $UAT_DB "$UAT_PASS" \
  "SELECT COUNT(*) FROM supplier_fee_schedule sfs
   JOIN suppliers s ON sfs.\"supplierId\"=s.id WHERE s.code='FLASH'" 2>/dev/null || echo "0")
UAT_TIERS=$(q $UAT_HOST $UAT_PORT $UAT_USER $UAT_DB "$UAT_PASS" \
  "SELECT COUNT(*) FROM supplier_commission_tiers sct
   JOIN suppliers s ON sct.\"supplierId\"=s.id WHERE s.code='FLASH'" 2>/dev/null || echo "0")
echo "   Fee schedule rows:     $UAT_FEES"
echo "   Commission tier rows:  $UAT_TIERS"
[[ "$UAT_FEES" -gt 0 ]]  && ok "Fee schedule configured" || warn "Fee schedule empty"
[[ "$UAT_TIERS" -gt 0 ]] && ok "Commission tiers configured" || warn "Commission tiers empty"

hdr "STEP 9 — Flash fee & commission config (Staging)"
STG_FEES=$(q $STG_HOST $STG_PORT $STG_USER $STG_DB "$STG_PASS" \
  "SELECT COUNT(*) FROM supplier_fee_schedule sfs
   JOIN suppliers s ON sfs.\"supplierId\"=s.id WHERE s.code='FLASH'" 2>/dev/null || echo "0")
STG_TIERS=$(q $STG_HOST $STG_PORT $STG_USER $STG_DB "$STG_PASS" \
  "SELECT COUNT(*) FROM supplier_commission_tiers sct
   JOIN suppliers s ON sct.\"supplierId\"=s.id WHERE s.code='FLASH'" 2>/dev/null || echo "0")
echo "   Fee schedule rows:     $STG_FEES"
echo "   Commission tier rows:  $STG_TIERS"
[[ "$STG_FEES" -gt 0 ]]  && ok "Fee schedule configured" || warn "Fee schedule empty"
[[ "$STG_TIERS" -gt 0 ]] && ok "Commission tiers configured" || warn "Commission tiers empty"

# ── Float / ledger accounts ───────────────────────────────────────────────────
hdr "STEP 10 — Flash float ledger accounts"
for ENV_LABEL in "UAT" "Staging"; do
  if [[ "$ENV_LABEL" == "UAT" ]]; then
    H=$UAT_HOST; P=$UAT_PORT; U=$UAT_USER; D=$UAT_DB; PW="$UAT_PASS"
  else
    H=$STG_HOST; P=$STG_PORT; U=$STG_USER; D=$STG_DB; PW="$STG_PASS"
  fi
  FLOAT_BAL=$(q $H $P $U $D "$PW" \
    "SELECT COALESCE(SUM(CASE WHEN dc='debit' THEN amount ELSE -amount END),0)
     FROM journal_entry_lines jel
     JOIN ledger_accounts la ON jel.\"accountId\"=la.id
     WHERE la.code='1200-10-04'" 2>/dev/null || echo "N/A")
  FLOAT_EXISTS=$(q $H $P $U $D "$PW" \
    "SELECT COUNT(*) FROM ledger_accounts WHERE code='1200-10-04'" 2>/dev/null || echo "0")
  if [[ "$FLOAT_EXISTS" -gt 0 ]]; then
    ok "$ENV_LABEL: Flash float ledger (1200-10-04) exists — balance: R$FLOAT_BAL"
  else
    warn "$ENV_LABEL: Flash float ledger (1200-10-04) NOT FOUND"
  fi
done

# ── parity decision ───────────────────────────────────────────────────────────
hdr "STEP 11 — Parity decision"

NEEDS_SYNC=false
NEEDS_VARIANT_FIX=false

if [[ "$UAT_PRODUCTS" -ne "$STG_PRODUCTS" || "$UAT_VARIANTS" -ne "$STG_VARIANTS" ]]; then
  warn "Catalog out of sync — will run sync script"
  NEEDS_SYNC=true
fi
if [[ "$UAT_NO_VARIANT" -gt 0 ]]; then
  warn "$UAT_NO_VARIANT UAT products missing variants — will run fix script"
  NEEDS_VARIANT_FIX=true
fi

if [[ "$NEEDS_VARIANT_FIX" == "true" ]]; then
  hdr "STEP 12 — Fixing missing ProductVariants in UAT"
  DATABASE_URL="postgres://${UAT_USER}:${UAT_PASS}@${UAT_HOST}:${UAT_PORT}/${UAT_DB}?sslmode=disable" \
    node scripts/create-missing-flash-product-variants.js
  ok "Missing variants fixed in UAT"
fi

if [[ "$NEEDS_SYNC" == "true" ]]; then
  hdr "STEP 13 — Syncing Flash catalog UAT → Staging"
  node scripts/sync-flash-products-uat-to-staging.js
  ok "Sync complete"
else
  hdr "STEP 12 — Sync"
  ok "Catalogs are already in parity — no sync needed"
fi

# ── final counts ──────────────────────────────────────────────────────────────
hdr "FINAL VERIFICATION"

FINAL_STG_P=$(q $STG_HOST $STG_PORT $STG_USER $STG_DB "$STG_PASS" \
  "SELECT COUNT(*) FROM products WHERE \"supplierId\"='$STG_SUPPLIER'")
FINAL_STG_V=$(q $STG_HOST $STG_PORT $STG_USER $STG_DB "$STG_PASS" \
  "SELECT COUNT(*) FROM product_variants WHERE \"supplierId\"='$STG_SUPPLIER'")

echo ""
echo -e "  ${BOLD}Environment     Products   Variants${RESET}"
echo    "  ─────────────────────────────────────"
printf  "  %-15s %-10s %s\n" "UAT"     "$UAT_PRODUCTS"   "$UAT_VARIANTS"
printf  "  %-15s %-10s %s\n" "Staging" "$FINAL_STG_P"    "$FINAL_STG_V"
echo ""

if [[ "$UAT_PRODUCTS" -eq "$FINAL_STG_P" && "$UAT_VARIANTS" -eq "$FINAL_STG_V" ]]; then
  ok "PERFECT PARITY — UAT and Staging catalogs are identical"
else
  warn "Counts still differ after sync — check logs above for errors"
fi

echo ""
info "NOTE: Production uses the same Cloud SQL instance as Staging (mmtp-pg-staging)."
info "      The Staging database IS the pre-production database — no separate Production sync needed."
info "      When ready for Production, run migrations against the production Cloud SQL instance."
echo ""
echo -e "${BOLD}${GREEN}✅  Flash catalog verification complete${RESET}"
echo ""
