#!/usr/bin/env bash
# Generate a clean SBSA SOAP test notification XML file
# Usage: bash scripts/generate-sbsa-test-notification.sh

cat > /tmp/sbsa-test-notification.xml << 'XMLEOF'
<?xml version="1.0" encoding="UTF-8"?>
<NS1:Envelope xmlns:NS1="http://schemas.xmlsoap.org/soap/envelope/">
  <NS1:Body>
    <NS2:SendTransactionNotificationAsync xmlns:NS2="http://standardbank.co.za/sa/services/Enterprise/Business/PaymentsandTransafers/PaymentNotificationV1/Base">
      <NS3:RqUID xmlns:NS3="http://standardbank.co.za/sa/services/Global/IfxV2_1/HeaderV2_0">test-prod-rquid-001</NS3:RqUID>
      <NS4:MsgRqHdr xmlns:NS4="http://standardbank.co.za/sa/services/Global/IfxV2_1/HeaderV2_0">
        <NS4:SvcIdent><NS4:SvcName>PAYMT_NTFTN</NS4:SvcName></NS4:SvcIdent>
        <NS4:ContextRqHdr>
          <NS4:ClientTerminalSeqNum>prod-test-seq-001</NS4:ClientTerminalSeqNum>
          <NS4:NetworkTrnData>
            <NS4:NetworkOwner/>
            <NS4:AcquirerIdent>SBSA_USER</NS4:AcquirerIdent>
            <NS4:ContentTypeXSB>TEXT/UTF-8</NS4:ContentTypeXSB>
            <NS4:InterfaceNameXSB>ESB</NS4:InterfaceNameXSB>
          </NS4:NetworkTrnData>
          <NS4:ClientDt>2026-03-26T12:00:00.000000</NS4:ClientDt>
        </NS4:ContextRqHdr>
      </NS4:MsgRqHdr>
      <NS2:SendTransactionNotificationAsync>
        <NS2:AcctTrnId>99999</NS2:AcctTrnId>
        <NS2:FullAcctNumber>000602739172</NS2:FullAcctNumber>
        <NS2:Amt>000000000000100</NS2:Amt>
        <NS2:DebitCreditInd>Credit</NS2:DebitCreditInd>
        <NS2:ReferenceNumber>PROD-ENDPOINT-TEST</NS2:ReferenceNumber>
      </NS2:SendTransactionNotificationAsync>
    </NS2:SendTransactionNotificationAsync>
  </NS1:Body>
</NS1:Envelope>
XMLEOF

echo "Created /tmp/sbsa-test-notification.xml ($(wc -c < /tmp/sbsa-test-notification.xml) bytes)"
echo ""
echo "Testing production (via load balancer)..."
curl -s -o /tmp/sbsa-response.txt -w "HTTP %{http_code}" -X POST \
  https://api-mm.mymoolah.africa/api/v1/standardbank/notification \
  -H "Content-Type: text/xml" -d @/tmp/sbsa-test-notification.xml
echo ""
cat /tmp/sbsa-response.txt
echo ""
