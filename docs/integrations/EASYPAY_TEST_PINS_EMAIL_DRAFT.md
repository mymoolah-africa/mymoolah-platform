# EasyPay Test PINs Email Draft

**To**: Razeen@easypay.co.za  
**CC**: Theodore (EasyPay QA), Christopher Bada, Malusi@easypay.co.za, Nkululeko@easypay.co.za  
**From**: andre@mymoolah.africa  
**Subject**: Re: MyMoolah V5 Receiver - Test PINs and SessionToken for UAT

---

Hi Razeen,

Apologies for the delay on the test data. Please find attached:

**1. easypay_test_pins.xlsx / easypay_test_pins.csv** — 50 test rows covering all V5 response scenarios. Please use the XLSX file for manual testing so the 14-digit PINs remain text and are not converted to scientific notation by spreadsheet software.

| Scenario | Count | Expected infoRequest | Expected authorisationRequest |
|----------|-------|---------------------|-------------------------------|
| Happy path (R50 - R4,000) | 10 | 0 (AllowPayment) | 0 (Allow) |
| Already paid | 5 | 5 (AlreadyPaid) | 5 (AlreadyPaid) |
| Expired | 5 | 3 (ExpiredPayment) | 3 (Expired) |
| Cancelled | 3 | 3 (ExpiredPayment) | 3 (Expired) |
| Different user | 5 | 0 (AllowPayment) | 0 (Allow) |
| Boundary min R50 | 3 | 0 (AllowPayment) | 0 (Allow) |
| Boundary max R4,000 | 3 | 0 (AllowPayment) | 0 (Allow) |
| Amount mismatch (fixed R100) | 5 | 0 (AllowPayment) | 2 (InvalidAmount) if amount != R100 |
| USSD-issued | 3 | 0 (AllowPayment) | 0 (Allow) |
| No user (orphan) | 3 | 0 (AllowPayment) | 0 (Allow) |
| Invalid PIN formats | 5 | 1 (InvalidAccount) | N/A |

All valid PINs use receiver ID **5063**, are 14-digit Luhn-valid, are loaded in the same staging database used by `https://staging.mymoolah.africa/billpayment/v1/`, and expire after **30 days**.

**2. UAT SessionToken** — I will share this separately via secure channel (Signal or encrypted message) to comply with our security policy. The token is used in the `Authorization` header:

```
Authorization: SessionToken {token}
```

**3. UAT Endpoints (confirmed)**:

- Base URL: `https://staging.mymoolah.africa/billpayment/v1/`
- `GET /ping` (no auth — live now, returns `{"Ping":"OK"}`)
- `POST /infoRequest` (auth required)
- `POST /authorisationRequest` (auth required)
- `POST /paymentNotification` (auth required)

**4. One question for your side**:

Our system currently expires PINs after **30 days** from the time the user generates them. EasyPay confirmed that expiry is enforced by MyMoolah during the V5 authorisation request, so there is no EasyPay-side expiry to align.

**5. SFTP reminder** (for production reconciliation files only, as discussed):

We still need your **SSH public key** to enable SFTP access for the SOF file uploads. Connection details:
- Host: `34.35.137.166`
- Port: `5022`
- Username: `easypay`

Looking forward to Christopher scheduling the sprint for testing. Let me know if you need anything else.

Kind regards,  
Andre Botes  
Founder & CEO, MyMoolah  
andre@mymoolah.africa
