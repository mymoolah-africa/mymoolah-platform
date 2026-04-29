# EasyPay Staging Partner-Test Credentials Email Draft

**To**: Malusi@easypay.co.za, Razeen@easypay.co.za  
**CC**: Nkululeko@easypay.co.za  
**From**: andre@mymoolah.africa  
**Subject**: MyMoolah V5 Receiver - Staging Credentials and Test Data

---

Hi Malusi and Razeen,

Following our meeting on 10 April, here are the staging partner-test credentials for testing the V5 BillPayment Receiver integration.

I will send the test PIN spreadsheet (`easypay_test_pins.csv`) in a **separate email** after this one.

## 1. V5 Receiver Endpoints

| Environment | Base URL |
|-------------|----------|
| **Staging partner-test** | `https://staging.mymoolah.africa/billpayment/v1/` |
| **Production** | `https://api-mm.mymoolah.africa/billpayment/v1/` |

**Endpoints**:
- `GET  /ping` (no auth)
- `POST /infoRequest` (auth required)
- `POST /authorisationRequest` (auth required)
- `POST /paymentNotification` (auth required)

## 2. Authentication

**Header**: `Authorization: SessionToken {token}`

The SessionToken for staging partner testing will be shared via secure channel (Signal / encrypted email). This is the production EasyPay API credential configured on the deployed staging service via GCP Secret Manager, not a local/Codespaces `.env` credential.

## 3. SFTP for Daily Reconciliation Files

| Setting | Value |
|---------|-------|
| Host | `34.35.137.166` |
| Port | `5022` |
| Username | `easypay` |
| Auth method | SSH public key |
| Upload directory | `/home/easypay/` |

Please share your SSH public key so we can add it to the server. Files uploaded will be automatically processed.

## 4. Test Data

I will send `easypay_test_pins.xlsx` and `easypay_test_pins.csv` in a **separate email** shortly after this one (same recipients). The attached PINs must be generated with `node scripts/generate-easypay-test-pins.js --staging` so they exist in the same database used by the `staging.mymoolah.africa` endpoint. Please use the XLSX file for manual testing so the 14-digit PINs are not converted to scientific notation by spreadsheet software.

The file contains ~50 test PIN rows covering:
- Happy path (various amounts R50 - R4,000)
- Already paid (expect ResponseCode 5)
- Expired (expect ResponseCode 3)
- Cancelled (expect ResponseCode 3)
- Amount mismatch (fixed min=max, expect ResponseCode 2 on wrong amount)
- USSD-issued PINs
- Orphan PINs (no user linked)
- Invalid PIN formats (not in DB, expect ResponseCode 1)

All valid PINs use receiver ID `5063`, are 14-digit Luhn-valid, and expire after 30 days.

## 5. What We Need From You

1. **Egress IP CIDRs** (staging partner-test + production) — for our firewall allowlist on Cloud Run
2. **Sample daily SFTP reconciliation file** — column format, timezone, delimiter, and field mapping
3. **Confirmation of go-live date** for staging partner testing

Please let me know if you have any questions or need anything else to start testing.

Kind regards,  
Andre Botes  
Founder & CEO, MyMoolah  
andre@mymoolah.africa
