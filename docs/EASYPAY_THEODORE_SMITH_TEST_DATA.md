# EasyPay UAT Test Data — For Theodore Smith

**Send via encrypted email. Do not commit the SessionToken to git.**

---

## SessionToken (Staging / UAT)

```
[INSERT_SESSION_TOKEN_HERE]
```

To obtain: `gcloud secrets versions access latest --secret=easypay-api-key-staging --project=mymoolah-db`

---

## Base URL

- **Staging**: `https://staging.mymoolah.africa/billpayment/v1`
- **Header**: `Authorization: SessionToken <token>`

---

## Test Scenarios (5 EasyPay Numbers)

| # | Scenario | EasyPay Number (raw) | Formatted | Amount (cents) | Expected |
|---|----------|----------------------|-----------|----------------|----------|
| 1 | Valid, unpaid (R100 fixed) | 95063000000011 | 9 5063 0000 0001 1 | 10000 | infoRequest: 0, authorisationRequest: 0. Second attempt → 5 |
| 2 | Already paid (R200) | 95063000000029 | 9 5063 0000 0002 9 | 20000 | infoRequest: 5, authorisationRequest: 5 |
| 3 | Expired (R50) | 95063000000037 | 9 5063 0000 0003 7 | 5000 | infoRequest: 3, authorisationRequest: 3 |
| 4 | Open amount (R10–R1000) | 95063000000045 | 9 5063 0000 0004 5 | 1000–100000 | infoRequest: 0, authorisationRequest: 0 for any amount in range |
| 5 | Fixed R300 only | 95063000000052 | 9 5063 0000 0005 2 | 30000 | infoRequest: 0. authorisationRequest: 0 only for 30000; 2 for other amounts |

---

## Notes for Theo

- **Amounts**: API uses cents (R100.00 = 10000)
- **EchoData**: Return exactly as received in all responses
- **Receiver ID**: 5063 (MyMoolah)
- **Scenario 1 idempotency**: After first successful payment, second attempt must return ResponseCode 5 (AlreadyPaid)

---

## Run 5-Scenario Test

```bash
./scripts/test-easypay-5-scenarios.sh <SESSION_TOKEN>
```
