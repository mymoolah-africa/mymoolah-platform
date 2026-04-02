#!/usr/bin/env bash
#
# Simulate SBSA H2H SOAP credit notification (SendTransactionNotificationAsync).
# Invokes the same path as live Standard Bank: POST /api/v1/standardbank/notification
# with Content-Type text/xml. No HMAC (SOAP auth is network / WAF — see SBSA guide).
#
# Resolves reference as wallet CID: MSISDN in local form (082...) or E.164 is fine;
# production User.phoneNumber must be canonical +27... (deposit service normalizes).
#
# Usage (dry-run — writes XML + prints curl, does NOT send):
#   REFERENCE=0825571055 AMOUNT_RANDS=4000 ./scripts/simulate-sbsa-deposit-notification.sh
#
# Send to production (requires explicit confirmation):
#   REFERENCE=0825571055 AMOUNT_RANDS=4000 CONFIRM_SEND=yes \
#     API_URL=https://api-mm.mymoolah.africa ./scripts/simulate-sbsa-deposit-notification.sh
#
# Optional env:
#   FULL_ACCT   — treasury account as SBSA sends it (digits, default: MM business account below)
#   ACCT_TRN_ID — unique SBSA transaction id (default: epoch seconds; must be new per deposit)
#   OUT_FILE    — XML path (default: /tmp/sbsa-sim-deposit.xml)
#
set -euo pipefail

REFERENCE="${REFERENCE:-0825571055}"
AMOUNT_RANDS="${AMOUNT_RANDS:-4000}"
# MyMoolah Treasury Account as displayed by SBSA (000027240648 1000 → stripped)
FULL_ACCT="${FULL_ACCT:-0000272406481000}"
API_URL="${API_URL:-https://api-mm.mymoolah.africa}"
OUT_FILE="${OUT_FILE:-/tmp/sbsa-sim-deposit.xml}"

# Unique idempotency key fragment (StandardBankTransaction.transactionId = SBSA-SOAP-${ACCT_TRN_ID})
ACCT_TRN_ID="${ACCT_TRN_ID:-$(date +%s)}"

if ! [[ "$AMOUNT_RANDS" =~ ^[0-9]+(\.[0-9]{1,2})?$ ]]; then
  echo "ERROR: AMOUNT_RANDS must be a positive decimal (e.g. 4000 or 4000.50)" >&2
  exit 1
fi

# SBSA 15-char zero-padded amount field = cents (see sbsaSoapParser.parseAmount)
AMT_CENTS_PAD="$(AMOUNT_RANDS="$AMOUNT_RANDS" node -e "const r=process.env.AMOUNT_RANDS||'0';const n=parseFloat(r,10);if(!Number.isFinite(n)||n<=0)process.exit(1);const c=Math.round(n*100);console.log(String(c).padStart(15,'0'));")"

RQUID="$(uuidgen 2>/dev/null || python3 -c 'import uuid; print(uuid.uuid4())' 2>/dev/null || echo "sim-$(date +%s)-rquid")"
TRN_DT="$(date +%Y-%m-%d)"
TRN_TIME="$(date +%H:%M:%S)"
SEQ="sim-${ACCT_TRN_ID}"

cat > "$OUT_FILE" <<XMLEOF
<?xml version="1.0" encoding="UTF-8"?>
<NS1:Envelope xmlns:NS1="http://schemas.xmlsoap.org/soap/envelope/">
  <NS1:Body>
    <NS2:SendTransactionNotificationAsync xmlns:NS2="http://standardbank.co.za/sa/services/Enterprise/Business/PaymentsandTransafers/PaymentNotificationV1/Base">
      <NS3:RqUID xmlns:NS3="http://standardbank.co.za/sa/services/Global/IfxV2_1/HeaderV2_0">${RQUID}</NS3:RqUID>
      <NS4:MsgRqHdr xmlns:NS4="http://standardbank.co.za/sa/services/Global/IfxV2_1/HeaderV2_0">
        <NS4:SvcIdent><NS4:SvcName>PAYMT_NTFTN</NS4:SvcName></NS4:SvcIdent>
        <NS4:ContextRqHdr>
          <NS4:ClientTerminalSeqNum>${SEQ}</NS4:ClientTerminalSeqNum>
          <NS4:NetworkTrnData>
            <NS4:NetworkOwner/>
            <NS4:AcquirerIdent>MM_MANUAL_SIM</NS4:AcquirerIdent>
            <NS4:ContentTypeXSB>TEXT/UTF-8</NS4:ContentTypeXSB>
            <NS4:InterfaceNameXSB>ESB</NS4:InterfaceNameXSB>
          </NS4:NetworkTrnData>
          <NS4:ClientDt>${TRN_DT}T${TRN_TIME}.000000</NS4:ClientDt>
        </NS4:ContextRqHdr>
      </NS4:MsgRqHdr>
      <NS2:SendTransactionNotificationAsync>
        <NS2:TrnNotificationInfo>
          <NS2:FullAcctNumber>${FULL_ACCT}</NS2:FullAcctNumber>
          <NS2:TrnData>
            <NS2:AcctTrnId>${ACCT_TRN_ID}</NS2:AcctTrnId>
            <NS2:TrnDt>${TRN_DT}</NS2:TrnDt>
            <NS2:TrnTime>${TRN_TIME}</NS2:TrnTime>
            <NS2:TrnAmt>
              <NS2:Amt>${AMT_CENTS_PAD}</NS2:Amt>
              <NS2:CurCodeValue>ZAR</NS2:CurCodeValue>
            </NS2:TrnAmt>
            <NS2:TrnEffDt>${TRN_DT}</NS2:TrnEffDt>
            <NS2:BalAmt>
              <NS2:Amt>000000000000001</NS2:Amt>
            </NS2:BalAmt>
          </NS2:TrnData>
          <NS2:FIData>
            <NS2:Name>Standard Bank</NS2:Name>
            <NS2:BranchIdent>051001</NS2:BranchIdent>
          </NS2:FIData>
          <NS2:DebitCreditInd>Credit</NS2:DebitCreditInd>
          <NS2:ReferenceNumber>${REFERENCE}</NS2:ReferenceNumber>
        </NS2:TrnNotificationInfo>
      </NS2:SendTransactionNotificationAsync>
    </NS2:SendTransactionNotificationAsync>
  </NS1:Body>
</NS1:Envelope>
XMLEOF

echo "Wrote ${OUT_FILE} ($(wc -c < "$OUT_FILE" | tr -d ' ') bytes)"
echo "  Reference (CID): ${REFERENCE}"
echo "  Amount:          R${AMOUNT_RANDS} (SOAP Amt field: ${AMT_CENTS_PAD} cents, padded)"
echo "  AcctTrnId:       ${ACCT_TRN_ID}  -> transactionId SBSA-SOAP-${ACCT_TRN_ID}"
echo ""
echo "curl (dry-run — copy/paste or set CONFIRM_SEND=yes):"
echo "curl -sS -w \"\\nHTTP %{http_code}\\n\" -X POST \\"
echo "  \"${API_URL}/api/v1/standardbank/notification\" \\"
echo "  -H \"Content-Type: text/xml; charset=utf-8\" \\"
echo "  -d @${OUT_FILE}"
echo ""

if [[ "${CONFIRM_SEND:-}" == "yes" ]]; then
  echo "CONFIRM_SEND=yes — posting to ${API_URL} ..."
  curl -sS -w "\nHTTP %{http_code}\n" -X POST \
    "${API_URL}/api/v1/standardbank/notification" \
    -H "Content-Type: text/xml; charset=utf-8" \
    -d @"$OUT_FILE"
else
  echo "Not sending. To POST, run again with CONFIRM_SEND=yes"
fi
