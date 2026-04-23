#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# SBSA H2H PROD Penny — /Inbox Polling Helper (for sftp-1-vm)
# ─────────────────────────────────────────────────────────────────────────────
#
# Scp this file to sftp-1-vm:/tmp/ and run it there AFTER the Pain.001 has been
# put into SBSA PROD /Outbox. It polls /Inbox every 60 seconds for up to 30
# minutes and downloads every new MYMOOLAH_OWN11_*_PRD_*.xml file into
# /tmp/sbsa-prod-penny-responses/ on the VM.
#
# Expected responses on the PROD profile:
#   MYMOOLAH_OWN11_ACK_PRD_...xml    (~30s after upload)
#   MYMOOLAH_OWN11_INTAUD_PRD_...xml (~2 min)
#   MYMOOLAH_OWN11_FINAUD_PRD_...xml (~4–5 min, authoritative)
#
# PROD has NO /BAS/ folder — poll /Inbox only.
#
# Prereqs on the VM:
#   - ~/.ssh/sbsa_sftp_key exists (used for UAT — same key works for PROD,
#     confirmed by SBSA 2026-04-22).
#   - sshpass / lftp not required; we shell out to `sftp -b` via a scripted file.
#
# Usage (on sftp-1-vm):
#   scp (copy this file onto the VM)
#   chmod +x /tmp/sbsa-prod-penny-poll.sh
#   /tmp/sbsa-prod-penny-poll.sh
#
# Stop early with Ctrl-C; partial downloads remain in the response dir.
# ─────────────────────────────────────────────────────────────────────────────

set -u

SBSA_HOST="${SBSA_HOST:-196.8.86.53}"
SBSA_PORT="${SBSA_PORT:-5022}"
SBSA_USER="${SBSA_USER:-mymoolahuser}"
SBSA_KEY="${SBSA_KEY:-$HOME/.ssh/sbsa_sftp_key}"
OUT_DIR="${OUT_DIR:-/tmp/sbsa-prod-penny-responses}"
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-60}"
MAX_POLL_SECONDS="${MAX_POLL_SECONDS:-1800}"   # 30 min
FILE_PATTERN='^MYMOOLAH_OWN11_(ACK|NACK|INTAUD|FINAUD|UNP_DATA|VET_DATA)_PRD_.*\.xml$'

mkdir -p "$OUT_DIR"
START_TS=$(date +%s)
ITER=0

echo "═══════════════════════════════════════════════════════════════════"
echo " SBSA PROD Penny polling started at $(date -u +%FT%TZ)"
echo "  host          : $SBSA_HOST:$SBSA_PORT"
echo "  user          : $SBSA_USER"
echo "  key           : $SBSA_KEY"
echo "  output dir    : $OUT_DIR"
echo "  poll interval : ${POLL_INTERVAL_SECONDS}s"
echo "  max runtime   : ${MAX_POLL_SECONDS}s"
echo "═══════════════════════════════════════════════════════════════════"

list_inbox() {
  # Produces one filename per line.
  sftp -q -i "$SBSA_KEY" -P "$SBSA_PORT" -b /dev/stdin "$SBSA_USER@$SBSA_HOST" <<EOF 2>/dev/null | awk '{print $NF}' | grep -E "$FILE_PATTERN" || true
cd /Inbox
ls -1
bye
EOF
}

download_file() {
  local fname="$1"
  sftp -q -i "$SBSA_KEY" -P "$SBSA_PORT" -b /dev/stdin "$SBSA_USER@$SBSA_HOST" <<EOF >/dev/null 2>&1
cd /Inbox
get "$fname" "$OUT_DIR/$fname"
bye
EOF
}

while :; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TS))
  ITER=$((ITER + 1))

  if [ "$ELAPSED" -ge "$MAX_POLL_SECONDS" ]; then
    echo "[$(date -u +%FT%TZ)] Max poll window (${MAX_POLL_SECONDS}s) reached — stopping."
    break
  fi

  echo "[$(date -u +%FT%TZ)] Poll #${ITER}  (elapsed ${ELAPSED}s)"

  FILES_RAW="$(list_inbox || true)"
  if [ -z "$FILES_RAW" ]; then
    echo "  no matching files in /Inbox yet"
  else
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      if [ -f "$OUT_DIR/$f" ]; then
        continue
      fi
      echo "  downloading  $f"
      if download_file "$f"; then
        SIZE=$(wc -c <"$OUT_DIR/$f" | tr -d ' ')
        echo "    saved ($SIZE bytes)"
      else
        echo "    DOWNLOAD FAILED for $f" >&2
      fi
    done <<<"$FILES_RAW"
  fi

  HAVE_ACK=0; HAVE_INTAUD=0; HAVE_FINAUD=0
  for f in "$OUT_DIR"/*.xml; do
    [ -e "$f" ] || continue
    case "$(basename "$f")" in
      MYMOOLAH_OWN11_ACK_PRD_*)    HAVE_ACK=1 ;;
      MYMOOLAH_OWN11_INTAUD_PRD_*) HAVE_INTAUD=1 ;;
      MYMOOLAH_OWN11_FINAUD_PRD_*) HAVE_FINAUD=1 ;;
    esac
  done
  echo "  have:  ACK=${HAVE_ACK}  INTAUD=${HAVE_INTAUD}  FINAUD=${HAVE_FINAUD}"

  if [ "$HAVE_FINAUD" = "1" ]; then
    echo "[$(date -u +%FT%TZ)] FINAUD received — polling complete."
    break
  fi

  sleep "$POLL_INTERVAL_SECONDS"
done

echo "═══════════════════════════════════════════════════════════════════"
echo " Files captured in $OUT_DIR:"
ls -la "$OUT_DIR"
echo "═══════════════════════════════════════════════════════════════════"
echo " Next: copy these back to the laptop, e.g."
echo "   gcloud compute scp --recurse sftp-1-vm:$OUT_DIR docs/test/sbsa-prod-penny-responses-\$(date +%F)/ \\"
echo "     --project=mymoolah-db --zone=africa-south1-a --tunnel-through-iap"
echo "═══════════════════════════════════════════════════════════════════"
