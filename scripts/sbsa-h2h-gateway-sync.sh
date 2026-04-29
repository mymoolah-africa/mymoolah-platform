#!/usr/bin/env bash
set -euo pipefail

# SBSA H2H gateway sync
#
# Intended runtime: sftp-1-vm, where SBSA has whitelisted the public IP and
# ~/.ssh/sbsa_sftp_key is available. Dry-run by default.

MODE="inbound"
APPLY="false"
ENVIRONMENT="${STANDARDBANK_ENVIRONMENT:-production}"
SBSA_HOST="${SBSA_SFTP_HOST:-196.8.86.53}"
SBSA_PORT="${SBSA_SFTP_PORT:-5022}"
SBSA_USER="${SBSA_SFTP_USER:-mymoolahuser}"
SBSA_KEY="${SBSA_SFTP_KEY:-${HOME}/.ssh/sbsa_sftp_key}"
BUCKET="${SFTP_BUCKET_NAME:-mymoolah-sftp-inbound}"
STATE_DIR="${SBSA_H2H_STATE_DIR:-/var/lib/mymoolah-sbsa-h2h}"
WORK_DIR="${SBSA_H2H_WORK_DIR:-/tmp/mymoolah-sbsa-h2h-sync}"
MAX_FILES="${SBSA_H2H_MAX_FILES:-200}"

usage() {
  cat <<'USAGE'
Usage:
  scripts/sbsa-h2h-gateway-sync.sh [--apply] [--inbound|--outbound|--both]

Defaults:
  --inbound dry-run

Environment:
  STANDARDBANK_ENVIRONMENT=production|staging|uat
  SBSA_SFTP_HOST=196.8.86.53
  SBSA_SFTP_PORT=5022
  SBSA_SFTP_USER=mymoolahuser
  SBSA_SFTP_KEY=~/.ssh/sbsa_sftp_key
  SFTP_BUCKET_NAME=mymoolah-sftp-inbound
  SBSA_H2H_STATE_DIR=/var/lib/mymoolah-sbsa-h2h
  SBSA_H2H_WORK_DIR=/tmp/mymoolah-sbsa-h2h-sync
  SBSA_H2H_MAX_FILES=200

Notes:
  Inbound copies SBSA /Inbox files into GCS:
    statements -> standardbank[/env]/inbox/statements/
    payments   -> standardbank[/env]/inbox/payments/

  Outbound uploads GCS outbox files to SBSA /Outbox. Use only after explicit
  production approval because outbound Pain.001 files move real money.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY="true" ;;
    --inbound) MODE="inbound" ;;
    --outbound) MODE="outbound" ;;
    --both) MODE="both" ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 2 ;;
  esac
  shift
done

if [[ ! -r "$SBSA_KEY" ]]; then
  echo "SBSA key not readable: $SBSA_KEY" >&2
  exit 1
fi

case "$ENVIRONMENT" in
  production) ENV_PREFIX="" ;;
  staging|uat) ENV_PREFIX="${ENVIRONMENT}/" ;;
  *) echo "Invalid STANDARDBANK_ENVIRONMENT: $ENVIRONMENT" >&2; exit 1 ;;
esac

INBOX_STATEMENTS_PREFIX="standardbank/${ENV_PREFIX}inbox/statements"
INBOX_PAYMENTS_PREFIX="standardbank/${ENV_PREFIX}inbox/payments"
OUTBOX_PREFIX="standardbank/${ENV_PREFIX}outbox"
STATE_FILE="${STATE_DIR}/${ENVIRONMENT}-inbox-processed.txt"
OUTBOUND_STATE_FILE="${STATE_DIR}/${ENVIRONMENT}-outbox-uploaded.txt"

mkdir -p "$WORK_DIR"
if [[ "$APPLY" == "true" ]]; then
  mkdir -p "$STATE_DIR"
  touch "$STATE_FILE" "$OUTBOUND_STATE_FILE"
fi

log() {
  printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

sftp_batch() {
  local batch_file="$1"
  sftp -i "$SBSA_KEY" \
    -P "$SBSA_PORT" \
    -oBatchMode=yes \
    -oStrictHostKeyChecking=accept-new \
    -b "$batch_file" \
    "${SBSA_USER}@${SBSA_HOST}"
}

gcs_exists() {
  local uri="$1"
  gcloud storage ls "$uri" >/dev/null 2>&1
}

is_statement_file() {
  case "$1" in
    MYMOOLAH_OWN11_FINSTMT_*.txt|MYMOOLAH_OWN11_PROVSTMT_*.txt) return 0 ;;
    *) return 1 ;;
  esac
}

is_payment_file() {
  case "$1" in
    MYMOOLAH_OWN11_ACK_PRD_*.xml|MYMOOLAH_OWN11_NACK_PRD_*.xml|MYMOOLAH_OWN11_INTAUD_PRD_*.xml|MYMOOLAH_OWN11_FINAUD_PRD_*.xml|MYMOOLAH_OWN11_UNP_DATA_PRD_*.xml|MYMOOLAH_OWN11_VET_DATA_PRD_*.xml) return 0 ;;
    *) return 1 ;;
  esac
}

sync_inbound() {
  local listing="${WORK_DIR}/inbox-listing.txt"
  local batch="${WORK_DIR}/sftp-ls.batch"
  printf 'ls -1 /Inbox\nbye\n' > "$batch"
  sftp_batch "$batch" > "$listing"

  local count=0
  while IFS= read -r raw_line; do
    local filename
    filename="$(basename "$raw_line" | tr -d '\r')"
    [[ -z "$filename" || "$filename" == "sftp>" || "$filename" == "bye" ]] && continue
    [[ "$filename" == "Inbox" || "$filename" == "." || "$filename" == ".." ]] && continue

    local destination_prefix=""
    if is_statement_file "$filename"; then
      destination_prefix="$INBOX_STATEMENTS_PREFIX"
    elif is_payment_file "$filename"; then
      destination_prefix="$INBOX_PAYMENTS_PREFIX"
    else
      continue
    fi

    if [[ "$APPLY" == "true" ]] && grep -Fxq "$filename" "$STATE_FILE"; then
      continue
    fi

    local gcs_uri="gs://${BUCKET}/${destination_prefix}/${filename}"
    if gcs_exists "$gcs_uri"; then
      log "skip existing GCS object: $gcs_uri"
      [[ "$APPLY" == "true" ]] && echo "$filename" >> "$STATE_FILE"
      continue
    fi

    log "${APPLY}: inbound ${filename} -> ${gcs_uri}"
    if [[ "$APPLY" == "true" ]]; then
      local local_file="${WORK_DIR}/${filename}"
      local get_batch="${WORK_DIR}/get-${filename}.batch"
      printf 'get /Inbox/%s %s\nbye\n' "$filename" "$local_file" > "$get_batch"
      sftp_batch "$get_batch" >/dev/null
      if [[ ! -s "$local_file" ]]; then
        log "skip zero-byte inbound file: ${filename}"
        echo "$filename" >> "$STATE_FILE"
        rm -f "$local_file" "$get_batch"
        continue
      fi
      gcloud storage cp "$local_file" "$gcs_uri" >/dev/null
      echo "$filename" >> "$STATE_FILE"
      rm -f "$local_file" "$get_batch"
    fi

    count=$((count + 1))
    if [[ "$count" -ge "$MAX_FILES" ]]; then
      log "max file limit reached: $MAX_FILES"
      break
    fi
  done < "$listing"
}

sync_outbound() {
  local outbox_uri="gs://${BUCKET}/${OUTBOX_PREFIX}/"
  local listing="${WORK_DIR}/outbox-listing.txt"
  gcloud storage ls "$outbox_uri" > "$listing" 2>/dev/null || true

  while IFS= read -r uri; do
    local filename
    filename="$(basename "$uri" | tr -d '\r')"
    [[ -z "$filename" || "$filename" == ".keep" ]] && continue
    [[ "$filename" =~ ^MYMOOLAH_OWN11_ ]] || continue

    if [[ "$APPLY" == "true" ]] && grep -Fxq "$filename" "$OUTBOUND_STATE_FILE"; then
      continue
    fi

    log "${APPLY}: outbound ${uri} -> SBSA /Outbox/${filename}"
    if [[ "$APPLY" == "true" ]]; then
      local local_file="${WORK_DIR}/${filename}"
      local put_batch="${WORK_DIR}/put-${filename}.batch"
      gcloud storage cp "$uri" "$local_file" >/dev/null
      printf 'put %s /Outbox/%s\nbye\n' "$local_file" "$filename" > "$put_batch"
      sftp_batch "$put_batch" >/dev/null
      echo "$filename" >> "$OUTBOUND_STATE_FILE"
      rm -f "$local_file" "$put_batch"
    fi
  done < "$listing"
}

log "SBSA H2H gateway sync start env=${ENVIRONMENT} mode=${MODE} apply=${APPLY}"
case "$MODE" in
  inbound) sync_inbound ;;
  outbound) sync_outbound ;;
  both) sync_inbound; sync_outbound ;;
esac
log "SBSA H2H gateway sync complete"
