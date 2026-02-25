#!/usr/bin/env bash
# =============================================================================
# Flash Product Catalog — Full Verification & Sync
# Checks UAT, Staging, and Production catalog parity.
# Runs the sync script automatically if gaps are found.
#
# Run in Codespaces (proxies must be running):
#   ./scripts/ensure-proxies-running.sh
#   ./scripts/verify-and-sync-flash-catalog.sh
# =============================================================================

# NOTE: intentionally NOT using set -e so individual query failures don't abort
set -uo pipefail

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}✅  $*${RESET}"; }
fail() { echo -e "${RED}❌  $*${RESET}"; }
warn() { echo -e "${YELLOW}⚠️   $*${RESET}"; }
info() { echo -e "${CYAN}ℹ️   $*${RESET}"; }
hdr()  { echo -e "\n${BOLD}${CYAN}$*${RESET}"; echo "────────────────────────────────────────────────────────────"; }

# ── config ────────────────────────────────────────────────────────────────────
UAT_HOST=127.0.0.1;  UAT_PORT=6543;  UAT_DB=mymoolah
STG_HOST=127.0.0.1;  STG_PORT=6544;  STG_DB=mymoolah_staging
PRD_HOST=127.0.0.1;  PRD_PORT=6545;  PRD_DB=mymoolah_production
DB_USER=mymoolah_app
PROJECT=mymoolah-db

# ── helper: safe psql query (never exits on error) ────────────────────────────
q() {
  local HOST=$1 PORT=$2 DB=$3 PASS=$4 SQL=$5
  PGPASSWORD="$PASS" psql -h "$HOST" -p "$PORT" -U "$DB_USER" -d "$DB" \
    -t -A -c "$SQL" 2>/dev/null || echo ""
}

# ── helper: port check (bash built-in, no nc needed) ─────────────────────────
port_open() {
  (echo > /dev/tcp/127.0.0.1/$1) 2>/dev/null
}

# ── STEP 1: passwords ─────────────────────────────────────────────────────────
hdr "STEP 1 — Retrieving database passwords"

# UAT: from .env
if [[ -f .env ]]; then
  set +u
  source <(grep -E "^(DB_PASSWORD|DATABASE_URL)=" .env 2>/dev/null | head -5) 2>/dev/null || true
  set -u
fi
UAT_PASS="${DB_PASSWORD:-}"
if [[ -z "$UAT_PASS" && -n "${DATABASE_URL:-}" ]]; then
  UAT_PASS=$(python3 -c \
    "from urllib.parse import urlparse,unquote; u=urlparse('${DATABASE_URL}'); print(unquote(u.password or ''))" \
    2>/dev/null || echo "")
fi
if [[ -z "$UAT_PASS" ]]; then
  fail "Cannot determine UAT password — set DB_PASSWORD or DATABASE_URL in .env"
  exit 1
fi
ok "UAT password retrieved"

# Staging: from Secret Manager
STG_PASS=$(gcloud secrets versions access latest \
  --secret="db-mmtp-pg-staging-password" \
  --project="${PROJECT}" 2>/dev/null || echo "")
if [[ -z "$STG_PASS" ]]; then
  fail "Cannot retrieve Staging password from Secret Manager (db-mmtp-pg-staging-password)"
  exit 1
fi
ok "Staging password retrieved"

# Production: from Secret Manager
PRD_PASS=$(gcloud secrets versions access latest \
  --secret="db-mmtp-pg-production-password" \
  --project="${PROJECT}" 2>/dev/null || echo "")
if [[ -z "$PRD_PASS" ]]; then
  warn "Cannot retrieve Production password (db-mmtp-pg-production-password) — Production checks will be skipped"
  PRD_AVAILABLE=false
else
  ok "Production password retrieved"
  PRD_AVAILABLE=true
fi

# ── STEP 2: proxy ports ───────────────────────────────────────────────────────
hdr "STEP 2 — Checking Cloud SQL Auth Proxy ports"

for PORT in $UAT_PORT $STG_PORT; do
  if port_open "$PORT"; then
    ok "Port $PORT is listening"
  else
    fail "Port $PORT is NOT listening — run: ./scripts/ensure-proxies-running.sh"
    exit 1
  fi
done

if [[ "$PRD_AVAILABLE" == "true" ]]; then
  if port_open "$PRD_PORT"; then
    ok "Port $PRD_PORT is listening (Production)"
  else
    warn "Port $PRD_PORT is NOT listening — Production checks will be skipped"
    PRD_AVAILABLE=false
  fi
fi

# ── helper: full catalog check for one environment ───────────────────────────
check_env() {
  local LABEL=$1 HOST=$2 PORT=$3 DB=$4 PASS=$5

  hdr "$(echo $LABEL | tr '[:lower:]' '[:upper:]') — $DB @ $HOST:$PORT"

  local SUPPLIER
  SUPPLIER=$(q "$HOST" "$PORT" "$DB" "$PASS" \
    "SELECT id FROM suppliers WHERE code='FLASH' LIMIT 1")

  if [[ -z "$SUPPLIER" ]]; then
    fail "FLASH supplier not found in $LABEL database"
    echo "   SUPPLIER_ID=MISSING"
    return 1
  fi
  ok "Flash supplier ID: $SUPPLIER"

  local PRODUCTS VARIANTS BRANDS ACTIVE NO_VARIANT
  PRODUCTS=$(q  "$HOST" "$PORT" "$DB" "$PASS" "SELECT COUNT(*) FROM products WHERE \"supplierId\"='$SUPPLIER'")
  VARIANTS=$(q  "$HOST" "$PORT" "$DB" "$PASS" "SELECT COUNT(*) FROM product_variants WHERE \"supplierId\"='$SUPPLIER'")
  BRANDS=$(q    "$HOST" "$PORT" "$DB" "$PASS" \
    "SELECT COUNT(DISTINCT pb.id) FROM product_brands pb
     JOIN products p ON p.\"brandId\"=pb.id WHERE p.\"supplierId\"='$SUPPLIER'")
  ACTIVE=$(q    "$HOST" "$PORT" "$DB" "$PASS" \
    "SELECT COUNT(*) FROM products WHERE \"supplierId\"='$SUPPLIER' AND status='active'")
  NO_VARIANT=$(q "$HOST" "$PORT" "$DB" "$PASS" \
    "SELECT COUNT(*) FROM products p WHERE p.\"supplierId\"='$SUPPLIER'
     AND NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.\"productId\"=p.id)")

  echo "   Products:              ${PRODUCTS:-0}"
  echo "   ProductVariants:       ${VARIANTS:-0}"
  echo "   Brands:                ${BRANDS:-0}"
  echo "   Active products:       ${ACTIVE:-0}"
  echo "   Products w/o variant:  ${NO_VARIANT:-0}"

  # Type breakdown
  echo ""
  echo "   Product type breakdown:"
  q "$HOST" "$PORT" "$DB" "$PASS" \
    "SELECT type, COUNT(*) FROM products WHERE \"supplierId\"='$SUPPLIER'
     GROUP BY type ORDER BY COUNT(*) DESC" | \
    while IFS='|' read -r TYPE CNT; do
      [[ -n "$TYPE" ]] && printf "     %-30s %s\n" "$TYPE" "$CNT"
    done

  # Fee schedule & commission tiers
  local FEES TIERS
  FEES=$(q  "$HOST" "$PORT" "$DB" "$PASS" \
    "SELECT COUNT(*) FROM supplier_fee_schedule sfs
     JOIN suppliers s ON sfs.\"supplierId\"=s.id WHERE s.code='FLASH'" 2>/dev/null || echo "0")
  TIERS=$(q "$HOST" "$PORT" "$DB" "$PASS" \
    "SELECT COUNT(*) FROM supplier_commission_tiers sct
     JOIN suppliers s ON sct.\"supplierId\"=s.id WHERE s.code='FLASH'" 2>/dev/null || echo "0")
  echo ""
  echo "   Fee schedule rows:     ${FEES:-0}"
  echo "   Commission tier rows:  ${TIERS:-0}"
  [[ "${FEES:-0}" -gt 0 ]]  && ok "Fee schedule configured" || warn "Fee schedule empty"
  [[ "${TIERS:-0}" -gt 0 ]] && ok "Commission tiers configured" || warn "Commission tiers empty"

  # Float ledger
  local FLOAT_EXISTS FLOAT_BAL
  FLOAT_EXISTS=$(q "$HOST" "$PORT" "$DB" "$PASS" \
    "SELECT COUNT(*) FROM ledger_accounts WHERE code='1200-10-04'" 2>/dev/null || echo "0")
  if [[ "${FLOAT_EXISTS:-0}" -gt 0 ]]; then
    FLOAT_BAL=$(q "$HOST" "$PORT" "$DB" "$PASS" \
      "SELECT COALESCE(SUM(CASE WHEN jel.dc='debit' THEN jel.amount ELSE -jel.amount END),0)
       FROM journal_entry_lines jel
       JOIN ledger_accounts la ON jel.\"accountId\"=la.id
       WHERE la.code='1200-10-04'" 2>/dev/null || echo "?")
    ok "Flash float ledger (1200-10-04) exists — balance: R${FLOAT_BAL}"
  else
    warn "Flash float ledger (1200-10-04) NOT FOUND"
  fi

  # Export counts for comparison (using global vars named by label)
  eval "${LABEL}_SUPPLIER=$SUPPLIER"
  eval "${LABEL}_PRODUCTS=${PRODUCTS:-0}"
  eval "${LABEL}_VARIANTS=${VARIANTS:-0}"
  eval "${LABEL}_NO_VARIANT=${NO_VARIANT:-0}"
}

# ── STEP 3-5: run checks per environment ─────────────────────────────────────
check_env "UAT"     "$UAT_HOST" "$UAT_PORT" "$UAT_DB" "$UAT_PASS"
check_env "STAGING" "$STG_HOST" "$STG_PORT" "$STG_DB" "$STG_PASS"

if [[ "$PRD_AVAILABLE" == "true" ]]; then
  check_env "PRODUCTION" "$PRD_HOST" "$PRD_PORT" "$PRD_DB" "$PRD_PASS"
else
  hdr "PRODUCTION — SKIPPED (proxy not available)"
  warn "Production proxy on port $PRD_PORT is not running"
  info "Run: ./scripts/ensure-proxies-running.sh  then re-run this script"
fi

# ── STEP 6: parity analysis ───────────────────────────────────────────────────
hdr "STEP 6 — Parity analysis"

NEEDS_VARIANT_FIX=false
NEEDS_SYNC=false

if [[ "${UAT_NO_VARIANT:-0}" -gt 0 ]]; then
  warn "${UAT_NO_VARIANT} UAT products missing ProductVariants — will auto-fix"
  NEEDS_VARIANT_FIX=true
fi

if [[ "${UAT_PRODUCTS:-0}" -ne "${STAGING_PRODUCTS:-0}" || \
      "${UAT_VARIANTS:-0}" -ne "${STAGING_VARIANTS:-0}" ]]; then
  warn "UAT vs Staging mismatch — will auto-sync"
  warn "  Products:  UAT=${UAT_PRODUCTS:-0}  Staging=${STAGING_PRODUCTS:-0}"
  warn "  Variants:  UAT=${UAT_VARIANTS:-0}  Staging=${STAGING_VARIANTS:-0}"
  NEEDS_SYNC=true
else
  ok "UAT and Staging counts match (Products=${UAT_PRODUCTS:-0}, Variants=${UAT_VARIANTS:-0})"
fi

if [[ "$PRD_AVAILABLE" == "true" ]]; then
  if [[ "${UAT_PRODUCTS:-0}" -ne "${PRODUCTION_PRODUCTS:-0}" || \
        "${UAT_VARIANTS:-0}" -ne "${PRODUCTION_VARIANTS:-0}" ]]; then
    warn "UAT vs Production mismatch:"
    warn "  Products:  UAT=${UAT_PRODUCTS:-0}  Production=${PRODUCTION_PRODUCTS:-0}"
    warn "  Variants:  UAT=${UAT_VARIANTS:-0}  Production=${PRODUCTION_VARIANTS:-0}"
    info "Production sync must be done manually — run sync script with Production credentials"
  else
    ok "UAT and Production counts match (Products=${UAT_PRODUCTS:-0}, Variants=${UAT_VARIANTS:-0})"
  fi
fi

# ── STEP 7: auto-fix missing variants in UAT ─────────────────────────────────
if [[ "$NEEDS_VARIANT_FIX" == "true" ]]; then
  hdr "STEP 7 — Auto-fixing missing ProductVariants in UAT"
  DATABASE_URL="postgres://${DB_USER}:${UAT_PASS}@${UAT_HOST}:${UAT_PORT}/${UAT_DB}?sslmode=disable" \
    node scripts/create-missing-flash-product-variants.js
  ok "Missing variants fixed in UAT"
fi

# ── STEP 8: auto-sync UAT → Staging ──────────────────────────────────────────
if [[ "$NEEDS_SYNC" == "true" ]]; then
  hdr "STEP 8 — Auto-syncing Flash catalog UAT → Staging"
  node scripts/sync-flash-products-uat-to-staging.js
  ok "Sync complete"
fi

# ── FINAL: summary table ──────────────────────────────────────────────────────
hdr "FINAL VERIFICATION SUMMARY"

# Re-query final counts
FINAL_UAT_P=$(q  "$UAT_HOST" "$UAT_PORT" "$UAT_DB" "$UAT_PASS" \
  "SELECT COUNT(*) FROM products WHERE \"supplierId\"='${UAT_SUPPLIER}'")
FINAL_UAT_V=$(q  "$UAT_HOST" "$UAT_PORT" "$UAT_DB" "$UAT_PASS" \
  "SELECT COUNT(*) FROM product_variants WHERE \"supplierId\"='${UAT_SUPPLIER}'")
FINAL_STG_P=$(q  "$STG_HOST" "$STG_PORT" "$STG_DB" "$STG_PASS" \
  "SELECT COUNT(*) FROM products WHERE \"supplierId\"='${STAGING_SUPPLIER}'")
FINAL_STG_V=$(q  "$STG_HOST" "$STG_PORT" "$STG_DB" "$STG_PASS" \
  "SELECT COUNT(*) FROM product_variants WHERE \"supplierId\"='${STAGING_SUPPLIER}'")

echo ""
echo -e "  ${BOLD}Environment     Products   Variants   Status${RESET}"
echo    "  ──────────────────────────────────────────────────"
printf  "  %-15s %-10s %-10s %s\n" "UAT"     "${FINAL_UAT_P:-0}" "${FINAL_UAT_V:-0}" "✅ source of truth"
printf  "  %-15s %-10s %-10s %s\n" "Staging" "${FINAL_STG_P:-0}" "${FINAL_STG_V:-0}" \
  "$( [[ "${FINAL_UAT_P:-0}" -eq "${FINAL_STG_P:-0}" && "${FINAL_UAT_V:-0}" -eq "${FINAL_STG_V:-0}" ]] && echo '✅ in parity' || echo '⚠️  still differs')"

if [[ "$PRD_AVAILABLE" == "true" ]]; then
  FINAL_PRD_P=$(q "$PRD_HOST" "$PRD_PORT" "$PRD_DB" "$PRD_PASS" \
    "SELECT COUNT(*) FROM products WHERE \"supplierId\"='${PRODUCTION_SUPPLIER}'")
  FINAL_PRD_V=$(q "$PRD_HOST" "$PRD_PORT" "$PRD_DB" "$PRD_PASS" \
    "SELECT COUNT(*) FROM product_variants WHERE \"supplierId\"='${PRODUCTION_SUPPLIER}'")
  printf "  %-15s %-10s %-10s %s\n" "Production" "${FINAL_PRD_P:-0}" "${FINAL_PRD_V:-0}" \
    "$( [[ "${FINAL_UAT_P:-0}" -eq "${FINAL_PRD_P:-0}" && "${FINAL_UAT_V:-0}" -eq "${FINAL_PRD_V:-0}" ]] && echo '✅ in parity' || echo '⚠️  differs from UAT')"
else
  printf "  %-15s %-10s %-10s %s\n" "Production" "N/A" "N/A" "⚠️  proxy not available"
fi

echo ""
echo -e "${BOLD}${GREEN}✅  Flash catalog verification complete${RESET}"
echo ""
