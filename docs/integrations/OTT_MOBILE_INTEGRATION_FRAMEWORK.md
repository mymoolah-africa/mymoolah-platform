# OTT Mobile Integration Framework

**Status**: Framework plus Phase 1/2 implementation scaffold
**Created**: 2026-04-28  
**Classification**: Internal - Banking-Grade Integration Planning  
**Provider**: OTT Mobile Technologies (Pty) Ltd  
**Related group**: CliqueFin  
**Commercial forecast artefact**: `docs/integrations/OTT_COMMERCIAL_VOLUME_FORECAST.html`

---

## 1. Purpose

This document defines the banking-grade framework for integrating OTT Mobile into
MyMoolah Treasury Platform (MMTP). It is deliberately a framework, not an
implementation plan. The next step is a detailed implementation plan only after
the open partner dependencies in this document are closed.

The required business outcomes are:

1. Resell OTT vouchers.
2. Use an OTT voucher as a wallet cash-withdrawal mechanism.
3. Use OTT Payout / Cash Send rails to send money to a bank ATM or supported
   cash-out provider.
4. Use an OTT voucher to top up a MyMoolah wallet.
5. Use the OTT Loyalty service.
6. Evaluate any other OTT / CliqueFin products that fit MMTP.

The core engineering principle is: reuse MMTP primitives only after verifying
they are correct for this flow. Existing code patterns are candidates, not
automatic templates.

---

## 2. Source Material Reviewed

### 2.1 Partner and public sources

- OTT Voucher public site: `https://ottvoucher.com/`
- CliqueFin public site: `https://cliquefin.com/`
- OTT Payout Agreement supplied to André under partner context. Keep the signed
  agreement out of the repository unless Legal approves a secure internal
  storage location.
- Zoho OTT API manual: password-protected `Payout-API - OTT Mobile`

### 2.2 API documentation access

Access to the Zoho API documentation was confirmed through browser
authentication. The readable content includes:

- Test and live base URLs.
- Basic authentication.
- SHA-256 request hash generation.
- Perform Payout.
- Get Balance.
- Verify Webhook.
- Get Active Providers.
- Payment Status.
- Resend SMS of Transaction.
- Get Universal Branch Codes.
- Get Country Codes.
- Get Active Provider Limits.
- Request and response examples.

No API credentials, portal passwords, API keys, or webhook secrets must be
stored in this repository. Use Google Secret Manager for staging/production and
gitignored, user-local environment files only for UAT.

### 2.4 Credential status update - 2026-04-29

OTT supplied TEST API credentials through a secure channel. The API username is
`MYMOOLAHPOT`; the API password and API key are not stored in the repository.
For local/Codespaces testing they belong only in gitignored `.env.codespaces`.
For staging and production they must be stored in Google Secret Manager and
mapped into Cloud Run by deployment tooling.

Partner-facing TEST webhook recommendation:

```text
https://staging.mymoolah.africa/api/v1/ott/webhook
```

Use the deployed staging URL for OTT partner testing because it is stable,
auditable, TLS-terminated, and uses staging Secret Manager values. Codespaces
public URLs are transient and should be limited to internal smoke tests.

### 2.5 Production integration parking note - 2026-05-05

Production OTT credentials have been stored in Google Secret Manager for the
`mymoolah-db` project, with matching staging secret names because the deployment
tooling expects environment-specific variables. The production API username is
`MYMOOLAHPOL`; password and API key values must remain secret and must only be
read from Secret Manager.

The production webhook André should configure in the OTT production portal is:

```text
https://api-mm.mymoolah.africa/api/v1/ott/webhook
```

Because OTT currently provides one production portal only, do not add a staging
webhook to the optional production webhook field unless OTT confirms isolation
semantics and André approves the risk.

Before controlled production testing resumes in the morning:

1. Keep `OTT_PAYOUT_ENABLED=false` except during an explicitly approved live
   test window.
2. Reconfirm the production provider list and provider limits from the live OTT
   API.
3. Reconcile the OTT portal/API balance against `1200-10-08` after each test.
4. Keep the MobileMart Uber / Uber Eats catalog issue separate from OTT
   production integration: those are MobileMart retail voucher mappings hidden
   by Product Catalog Governance, not OTT production products.

### 2.6 Production catalog readiness update - 2026-05-07

The OTT production catalog readiness implementation added a repeatable read-only
audit command:

```bash
node scripts/audit-ott-production-catalog.js --staging
node scripts/audit-ott-production-catalog.js --production
```

The command uses `scripts/db-connection-helper.js` and SELECT-only queries. It
does not call OTT live APIs, import catalog products, publish governance mappings,
enable payouts, debit wallets, or write production data.

Current read-only findings:

1. Staging and production have OTT commercial terms for Standard Bank Instant
   Money `2`, ABSA CashSend `112`, PayShap Account `127`, OTT voucher rows,
   Pick n Pay `68`, Shoprite `69`, Nando's `156`, and Dis-Chem `157`.
2. Staging and production currently have no imported OTT `products`,
   `product_variants`, or OTT `product_catalog_mappings`.
3. Production OTT supplier float `1200-10-08` remains funded at `R1,000.00`
   with low-balance threshold `R100.00`; staging has the float row but no
   balance.
4. André's 2026-05-07 OTT portal screenshots confirm the active-provider set
   includes ABSA CashSend, Nedbank Cardless Withdrawal, Shoprite Vouchers, Uber
   and Uber Eats, PayShap Account, and multiple OTT Mobile Gift Card brands such
   as RocoMamas, Wimpy, Steers, Starbucks, Spur, Panarottis, Nando's, Mugg &
   Bean, KFC, John Dory's, Hungry Lion, Fishaways, Dis-Chem, Debonairs Pizza,
   Burger King, Boxer, Ackermans, Ticketmaster, and NetcarePlus.
5. Contractually, MyMoolah may expose cash-send / payout only for ABSA and
   Nedbank at this stage. Standard Bank Instant Money must remain hidden until
   Standard Bank approves the service for MyMoolah.
6. PayShap `127` remains deliberately excluded from wallet frontend exposure in
   this phase.
7. Nedbank Cardless Withdrawal is portal-active and contractually allowed, and
   MMTP staging terms now use the approved R13.00 incl VAT customer fee, but
   the 2026-05-07 controlled staging submit was rejected by OTT with
   `Provider is not authorised on this account :MyMoolah (Pty) Ltd`. Do not
   expose or retest Nedbank until OTT confirms provider `10` is enabled for the
   MyMoolah account.
8. Amazon Gift Card `141` remains on hold because the prior UAT test showed
   provider-side errors.

Customer-facing placement decision:

- Gift cards, Pick n Pay, and Shoprite / Checkers belong under Buy Retail
  Vouchers and must be exposed only through Product Catalog Governance.
- ABSA CashSend and Nedbank cardless cash belong under Withdraw
  Cash, because lower-literacy users understand the outcome as getting cash with
  an SMS PIN, not sending money to a bank account.
- Standard Bank Instant Money, OTT PayShap, and OTT airtime are not wired to
  frontend surfaces in this phase.

### 2.3 MMTP references

- `docs/CHART_OF_ACCOUNTS.md`
- `docs/VAT_ACCOUNTING_STRATEGY.md`
- `docs/policies/20-Cash-Withdrawal-Policy.md`
- `docs/RECONCILIATION_FRAMEWORK.md`
- `docs/integrations/EasyPay_API_Integration_Guide.md`
- `integrations/flash/FLASH_TESTING_REFERENCE.md`
- `integrations/mobilemart/MOBILEMART_REFERENCE.md`
- `integrations/zapper/ZAPPER_REFERENCE.md`
- `services/vasSupplierExecutor.js`
- `services/supplierFailoverService.js`
- `services/supplierCircuitBreaker.js`
- `services/productPurchaseService.js`
- `services/ledgerService.js`
- `middleware/idempotency.js`
- `services/reconciliation/adapters/EasyPayAdapter.js`
- `services/reconciliation/adapters/ZapperAdapter.js`
- `docs/integrations/OTT_COMMERCIAL_VOLUME_FORECAST.html` - partner-facing 36-month transaction count and face-value forecast for OTT rate discussions. The forecast excludes commissions, fees, rebates, revenue share, VAT, settlement charges, failed transactions, and reversals.

---

## 3. Current Codebase Position

OTT already appears in MMTP as a product or brand concept, but not as a
dedicated live OTT integration rail.

Verified current state from the 2026-04-28 read-only sweep. Re-verify this
section before implementation because routes, docs, and supplier modules can
change quickly.

- OTT is present in catalog/brand seed data and wallet voucher UI references.
- USSD has an OTT voucher brand option in the voucher menu.
- Existing supplier frameworks support catalog, supplier failover, circuit
  breakers, float monitoring, idempotency, and reconciliation adapters.
- The cash-withdrawal policy already names Cliquefin / OTT as a contemplated
  cash-withdrawal credential partner.
- A dedicated OTT Payout scaffold now exists (`services/ott/`, `routes/ott.js`,
  `models/OttPayout.js`, `OttAdapter`) but is disabled by default and must not
  be treated as production-ready until the contract gates in §5.3.1 are closed.
- ATM Cash Send appears mostly as wallet UI/navigation concept today; backend
  implementation must not be assumed to exist.
- Loyalty is a wallet placeholder / Watch-to-Earn adjacent area today; no
  generic OTT loyalty engine was found.

Important drift warning:

- Some existing integrations are useful references, but not all are
  implementation templates. Examples found during the sweep include stale docs
  around legacy EasyPay paths, possible route/controller drift around EasyPay
  cash-out, and draft ledger helper functions that are explicitly not wired.
  The OTT implementation plan must verify exact live routes, models, and
  ledger calls before copying any pattern.

---

## 4. OTT Products and MMTP Classification

### 4.1 OTT retail voucher sale

MMTP sells an OTT voucher to a wallet user.

Framework classification:

- Product family: VAS / digital voucher.
- User effect: wallet debit.
- Supplier effect: OTT supplier transaction and supplier float movement.
- Revenue: commission or margin only if MMTP is commercially entitled to it.
- VAT: VAT control only on MMTP-owned commission, margin, or service fee.

Preferred MMTP primitives to verify:

- `Product`, `ProductBrand`, `ProductVariant`.
- `productCatalogService`.
- `productPurchaseService`.
- `vasSupplierExecutor`.
- `supplierFailoverService`.
- `supplierCircuitBreaker`.
- `commissionVatService`.
- `SupplierFloat`.

Open dependency:

- Confirm whether OTT retail voucher sale is supported by the Payout API, a separate
  voucher API, a portal batch process, or a different product catalogue API.

### 4.2 OTT voucher cash withdrawal

The wallet user uses an OTT voucher or credential to withdraw cash through OTT /
CliqueFin retail or trader infrastructure.

Framework classification:

- Product family: cash withdrawal.
- User effect: wallet debit.
- Regulatory effect: must enforce own-funds ring-fencing.
- Redemption risk: token/PIN bearer risk, same class as eeziCash / EasyPay
  cash-out.
- Ledger effect: debit unrestricted client float liability and credit OTT
  supplier float or clearing for the partner obligation.

Mandatory controls:

- Route through `Wallet.prototype.canCashOut` or the current equivalent
  unrestricted-balance guard.
- Reject Tier 0 and any amount above unrestricted balance.
- Apply cash-withdrawal velocity caps across all cash-withdrawal partners.
- Log blocked attempts with rail, amount, restricted balance, and unrestricted
  balance.
- Feed structuring and channel-rotation signals into transaction monitoring.

Open dependency:

- Confirm the actual redemption model: OTT voucher PIN only, mobile-number
  load, barcode, cash-send credential, ATM credential, or mixed provider model.

### 4.3 OTT Payout / bank ATM Cash Send

The user initiates a payout via OTT to a supported provider, bank ATM, or
cash-send rail.

Framework classification:

- Product family: external payout / cash send.
- API: likely OTT `PerformPayout`, with provider selected by
  `provider_providerCode`.
- Status lifecycle: initiated, accepted, pending, completed, failed, reversed,
  expired, cancelled, or provider-specific equivalent.
- Reconciliation: API status polling plus webhook verification plus daily/monthly
  OTT records.

Known commercial points from agreement:

- Nedbank cardless cash send: fixed transaction fee of R9.96 excl VAT.
- ABSA Cashsend: fixed transaction fee of R9.96 excl VAT.
- PayShap: fixed transaction fee of R2.50 excl VAT.
- RTC: fixed transaction fee of R4.50 excl VAT.
- OTT switching service fee: 0.3% of total completed payments per month, where
  applicable.
- Reversal fees may apply for Nedbank / ABSA, listed as R10.00 excl VAT in the
  agreement.

Do not hardcode these fees in runtime code. Use effective-dated fee policy or
supplier commercial configuration after Finance confirms payer-pays versus
MMTP-absorbed treatment. Treat agreement figures as commercial planning inputs,
not API truth, until OTT confirms launch pricing and API fee fields in writing.

### 4.4 OTT voucher wallet top-up

The user enters an OTT voucher PIN/code and MMTP credits the wallet.

Framework classification:

- Product family: voucher cash-in / wallet top-up.
- User effect: wallet credit after successful redemption.
- Ring-fencing: voucher-based cash-in should be classified conservatively as
  `voucher_deposit` / restricted own funds unless Compliance approves another
  classification.
- Ledger effect: credit client float liability and debit OTT supplier float,
  bank receivable, or settlement receivable depending on settlement model.

Open dependency:

- The reviewed Payout API is payout-oriented. Confirm whether OTT voucher
  redemption/top-up uses the same API family or a separate OTT Voucher API.

### 4.5 OTT Loyalty

The public OTT site describes Second Chance rewards and OTT App competitions.
The Payout API summary did not expose a loyalty endpoint in the confirmed
sections.

Framework classification:

- Product family: loyalty / rewards, not a cash movement until rewards are
  issued or redeemed.
- MMTP integration should start as display / enrolment / event capture only
  unless OTT provides a transactional loyalty API.
- Any monetary reward, voucher reward, or cashback creates ledger and tax
  questions and must be handled as a separate implementation phase.

Open dependency:

- Obtain official OTT Loyalty API documentation, eligibility rules, reward
  liability owner, settlement model, and POPIA consent requirements.

### 4.6 Other OTT / CliqueFin services

Public positioning suggests OTT and CliqueFin operate broader cash-to-digital
services, including payout, collect, digital voucher, and partner ecosystems.

No product is approved for implementation until the following are available:

- Official API documentation.
- Commercial terms.
- Settlement/reconciliation format.
- Data-processing terms.
- Compliance owner.
- Sponsor-bank classification.

---

## 5. API Framework

### 5.1 Environments

Confirmed from the API manual:

- Test: `https://test-payoutapi.ott-mobile.com`
- Live: `https://payoutapi.ott-mobile.com`

Planned environment variables:

```bash
OTT_PAYOUT_ENABLED=false
OTT_LIVE_INTEGRATION=false
OTT_TEST_INTEGRATION=false
OTT_API_BASE_URL=https://test-payoutapi.ott-mobile.com
OTT_API_USERNAME=MYMOOLAHPOT
OTT_API_PASSWORD=
OTT_API_KEY=
OTT_WEBHOOK_SECRET=
OTT_PORTAL_URL=https://test-payout-portal.ott-mobile.com
OTT_WEBHOOK_PUBLIC_BASE_URL=https://staging.mymoolah.africa
OTT_API_TIMEOUT_MS=60000
OTT_HASH_PARAM_ORDER_JSON={}
OTT_ENDPOINTS_JSON={}
OTT_HASH_FIELD_NAME=hashcheck
OTT_PAYOUT_PROVIDER_FEE_ZAR=
OTT_PAYOUT_MM_FEE_ZAR=
LEDGER_ACCOUNT_OTT_FLOAT=1200-10-08
```

Do not add these values to committed files. Names are placeholders for planning
only and should be finalized during implementation. The current scaffold includes
the May 2026 manual endpoint and hash-order defaults, allows env overrides, and
fails closed when the feature flag, fee inputs, integration flag, or API credentials are
missing.

### 5.2 Authentication

The API uses two layers:

1. Basic Auth:
   - `Authorization: Basic <base64(username:password)>`
   - UTF-8 encoding.
   - Credentials supplied by OTT.

2. SHA-256 request hash:
   - Gather required POST parameter values.
   - Use the endpoint-specific order from the API manual.
   - Exclude the hash value itself.
   - Concatenate values.
   - Append the API key.
   - SHA-256 hash the result.
  - Include the resulting hash in the request as `hashcheck`.

Implementation guardrails:

- Hash construction must be unit-tested per endpoint using OTT examples or the
  extracted manual order.
- Never log hash preimages, API keys, Basic Auth headers, webhook secrets, full
  mobile numbers, account numbers, voucher PINs, or bank beneficiary details.
- Store only masked request/response metadata unless full payload retention is
  required by Finance/Compliance and encrypted.

### 5.3 Endpoint catalogue

Confirmed Payout API endpoint family:

- `POST /api/purchase/v1/PerformPayout`
- `POST /api/purchase/v1/GetBalance`
- `POST /api/purchase/v1/VerifyWH`
- `POST /api/purchase/v1/GetPaymentStatus`
- `POST /api/purchase/v1/GetActiveProviders`
- `POST /api/purchase/v1/ResendSMS`
- `POST /api/purchase/v1/GetBranchCodes`
- `POST /api/purchase/v1/GetCountryCodes`
- `POST /api/purchase/v1/GetActiveProvidersLimits`

Manual update applied 2026-05-01: the scaffold now uses the confirmed path
names above and `hashcheck` as the request hash field. `OTT_ENDPOINTS_JSON`
remains available only as an override if OTT changes paths later.

### 5.3.1 Contract freeze status

MMTP now has a feature-gated implementation scaffold, but the following remain
partner-confirmed items before enabling wallet debits:

| Contract item | Current status | Implementation handling |
|---|---|---|
| Basic Auth username | Received: `MYMOOLAHPOT` | Stored only in local gitignored env / Secret Manager |
| API password | Received by secure link | André provides to local env / Secret Manager; never commit |
| API key | Received by secure link | Used only for hash construction; never logged |
| Exact paths for all named discovery endpoints | Confirmed from manual 2026-05-01 | Defaults in `ottClient.js`; configurable through `OTT_ENDPOINTS_JSON` |
| Endpoint-specific hash parameter order | Confirmed from manual 2026-05-01 | Defaults in `ottClient.js`; configurable through `OTT_HASH_PARAM_ORDER_JSON` |
| Webhook hash example / vector | Confirmed by Jaco 2026-05-01 | Webhook preimage is `merchantUniqueReference + message + status + transactionId + utctimestamp + apikey` |
| Provider code list and limits | TBD via API/manual | Read-only checks before payout enablement |
| Webhook payload schema | Confirmed by Jaco 2026-05-01 | Endpoint verifies `hashcheck` against the OTT API key; body `secret` is not used and is expected to be constant |
| Status/error matrix | Partially confirmed by Jaco 2026-05-01 | `100` success, `98`/`99` pending, `97` and lower failed; unknown statuses normalise to `processing` and require polling/recon |
| Settlement/reconciliation file format | TBD | Flexible adapter scaffold exists; final mapping requires OTT sample |

Request signing must remain a pure function: concatenate POST parameter values
in the exact OTT-specified order, exclude the hash field, append the API key,
and SHA-256 hash the resulting UTF-8 string. Do not log hash preimages, Basic
Auth headers, full PII, voucher/PIN values, or bank account details.

### 5.4 Payout request concepts

The API manual indicates payout requests include recipient and provider fields
such as:

- Account name.
- Account number.
- Amount.
- Bank ID.
- Branch code.
- Branch name.
- Country of issue.
- Middle name.
- Mobile.
- Nationality.
- Provider code.
- Surname.
- Swift code.
- Unique reference ID.

Framework rule:

- MMTP must generate `uniqueReferenceId` from an internal business reference and
  persist it before making the OTT call.
- `uniqueReferenceId` is not a substitute for MMTP idempotency; both are needed.
- Provider availability and provider limits must be checked and cached only for
  a short, auditable TTL.

### 5.5 Webhooks and status

Jaco Snyders confirmed the webhook body and status contract on 2026-05-01.
The webhook hash preimage is:

```text
merchantUniqueReference + message + status + transactionId + utctimestamp + apikey
```

Confirmed status handling:

- `100`: successful / completed.
- `98` and `99`: pending; keep the MMTP transaction pending and resolve via webhook or `GetPaymentStatus`.
- `97` and lower: failed.
- The `secret` field in the body is not used and is expected to remain a constant value.

OTT also confirmed RTC and PayShap upstream transactions can take up to 50 seconds
to complete. MMTP therefore keeps the default OTT HTTP timeout at 60 seconds and
still treats network timeouts as pending/unknown instead of failed.

Framework rule:

- Inbound OTT webhook endpoint should acknowledge quickly only after basic
  syntactic validation, then process idempotently.
- Verification should use OTT's specified hash process or `VerifyWH`, depending
  on official recommendation.
- Status polling through `GetPaymentStatus` remains required for reconciliation
  and missed webhook recovery.
- Webhook event IDs or `uniqueReferenceId` must be used for deduplication.

---

## 6. MMTP Architecture Fit

### 6.1 Proposed integration components

The later implementation should consider the following components, subject to
code verification:

- `services/ott/ottClient.js` or `services/ottMobileService.js`
  - Authenticated request client.
  - Hash builder.
  - Redaction.
  - Retry policy for safe reads only.
  - No automatic retry on financial writes unless OTT confirms idempotent
    semantics and MMTP uses the same `uniqueReferenceId`.

- `services/ott/ottPayoutService.js`
  - Wallet-to-OTT payout orchestration.
  - Provider/limits validation.
  - Wallet debit and ledger posting.
  - Status lifecycle.

- `services/ott/ottVoucherService.js`
  - Retail voucher sale and redemption, only if OTT confirms the relevant API.

- `routes/ott.js`
  - Authenticated wallet endpoints for user-initiated actions.
  - Webhook endpoint with raw-body or equivalent signature-safe parsing.

- `services/reconciliation/adapters/OttAdapter.js`
  - Daily/monthly OTT transaction file parser.
  - API balance/status matching if files are unavailable.

These names are not final. They must be checked against existing route mounts
and service naming before implementation.

Implementation scaffold added:

- `services/ott/ottClient.js`
- `services/ott/ottPayoutService.js`
- `routes/ott.js`, mounted at `/api/v1/ott`
- `models/OttPayout.js`
- `migrations/20260429_02_create_ott_payouts.js`
- `services/reconciliation/adapters/OttAdapter.js`
- `scripts/ott-readonly-check.js`

The scaffold is disabled by default with `OTT_PAYOUT_ENABLED=false`. Read-only
partner connectivity may be tested only after local or Secret Manager
credentials and partner-confirmed hash order are configured.

### 6.2 Reuse candidates to verify

Reuse after verification:

- Product catalog and variants for OTT retail voucher sale.
- `vasSupplierExecutor` only if the flow is product purchase-like.
- `supplierFailoverService` only if multiple suppliers can fulfil the same
  logical product.
- `supplierCircuitBreaker` for OTT availability.
- `SupplierFloat` for prepaid or receivable balances.
- `middleware/idempotency.js` for authenticated MMTP write endpoints.
- Reconciliation adapter pattern for OTT statements.
- `commissionVatService` for MMTP-owned commission.

Do not blindly reuse:

- Draft ledger helpers in `ledgerService.js`; they are marked draft-only.
- Any route documented as historical or removed.
- Any controller method that is not mounted and tested.
- Any code path that logs raw PII, voucher PINs, or partner payloads.
- Any supplier implementation that uses fallback/dummy behaviour for live
  financial operations.

---

## 7. Ledger Framework

All journal entries must use real account rows from `ledger_accounts`, balance
to the cent, and comply with `docs/CHART_OF_ACCOUNTS.md`.

### 7.1 Required account decisions

Before code:

- Add OTT supplier float account to `docs/CHART_OF_ACCOUNTS.md`.
- Create an idempotent migration for the ledger account.
- Create or update `SupplierFloat` row for OTT.
- Decide whether separate floats are required:
  - OTT retail voucher sale.
  - OTT payout / cash-send.
  - OTT wallet top-up receivable.
  - OTT loyalty rewards, if monetary.

Likely account range:

- `1200-10-08` OTT Payout Float Account, subject to Finance approval and
  migration `20260429_02_create_ott_payouts.js`.

### 7.2 Retail voucher sale journal concept

For a user buying an OTT voucher:

```text
DR  2100-01-01  Client Float Liability            R{faceValue}
CR  1200-10-XX  OTT Supplier Float                R{faceValue}
```

If MMTP earns commission:

```text
DR  2200-01-01  MM Commission Clearing            R{commissionInclVat}
CR  4000-10-01  Commission Revenue                R{commissionExVat}
CR  2300-10-01  VAT Control Account               R{commissionVat}
```

This template must be adjusted if commission is paid by monthly rebate, netted
in supplier settlement, or treated differently by Finance.

### 7.3 Cash withdrawal / cash-send journal concept

For user-funded OTT payout where user pays principal plus fees:

```text
DR  2100-01-01  Client Float Liability            R{principal + totalUserFee}
CR  1200-10-XX  OTT Supplier Float/Clearing        R{principal + partnerPassThroughFee}
CR  4000-20-01  Transaction Fee Revenue           R{mmtpFeeExVat}
CR  2300-10-01  VAT Control Account               R{mmtpFeeVat}
```

If MMTP absorbs any partner fee:

```text
DR  5000-xx-xx  Cost of Sales / Partner Fee        R{absorbedFee}
CR  1200-10-XX  OTT Supplier Float/Clearing        R{absorbedFee}
```

Do not post partner pass-through VAT to MMTP VAT control.
Confirm the final MMTP revenue account with Finance before implementation;
`4000-20-01` is shown as the current transaction-fee revenue anchor, not an
automatic account assignment for all OTT products.

### 7.4 OTT voucher wallet top-up journal concept

For successful OTT voucher redemption into wallet:

```text
DR  1200-10-XX  OTT Settlement Receivable/Float    R{grossTopup}
CR  2100-01-01  Client Float Liability            R{grossTopup}
```

If a user fee is deducted from the wallet credit:

```text
DR  2100-01-01  Client Float Liability            R{fee}
CR  4000-20-01  Transaction Fee Revenue           R{feeExVat}
CR  2300-10-01  VAT Control Account               R{feeVat}
```

Ring-fencing:

- Treat OTT voucher top-up as `voucher_deposit` and restrict under
  `2100-01-02` unless Compliance confirms a different classification.
- Confirm the final MMTP revenue account with Finance before implementation;
  the template uses current transaction-fee account conventions for planning
  only.

### 7.5 Monthly switching service fee

The agreement references 0.3% of completed payment value per month for some
services. This should be treated as a monthly supplier cost or pass-through only
after Finance confirms:

- Whether MMTP pays it or passes it to users.
- Whether it is invoiced monthly by OTT or netted from settlement.
- Whether VAT is included in OTT invoice lines.
- Which service families it applies to.

Do not mix per-transaction ledger entries with monthly invoice accounting until
this is confirmed.

---

## 8. VAT and Commercial Treatment

Authoritative policy:

- MMTP VAT control only applies to MMTP-owned revenue, margin, markup, or
  commission.
- Supplier, bank, client, and merchant pass-through charges are posted
  VAT-inclusive to clearing/payable/float accounts.
- Do not create `TaxTransaction` rows for pass-through-only flows.

OTT application:

- OTT provider fees: pass-through unless MMTP absorbs them.
- OTT switching fees: supplier cost or pass-through depending on commercial
  setup.
- MMTP customer service fee or markup: MMTP revenue with VAT.
- OTT voucher commission: MMTP revenue with VAT if earned by MMTP.
- Loyalty reward funding: separate tax analysis required.

---

## 9. Risk, Compliance, and Controls

### 9.1 FICA / cash withdrawal

OTT cash withdrawal must obey `docs/policies/20-Cash-Withdrawal-Policy.md`:

- Own funds cannot fund cash withdrawal.
- Voucher deposits remain restricted unless Compliance approves otherwise.
- Only unrestricted third-party funds may fund cash withdrawal.
- Tier, velocity, structuring, CTR, STR, and channel-rotation controls apply
  across all cash-withdrawal partners.

### 9.2 POPIA

Potential OTT payloads include mobile number, names, bank account details,
nationality, country, provider details, and voucher/PIN data.

Controls:

- Minimize data sent to OTT to endpoint requirements.
- Mask PII in all logs.
- Encrypt sensitive stored payloads where retention is required.
- Retain records under MMTP data retention policy and regulatory obligations.
- Confirm OTT data-processing and marketing-consent terms before loyalty or
  direct marketing integration.

### 9.3 CPA / user disclosure

Before launch, wallet UX must disclose:

- Fees before confirmation.
- Provider and expected cash-send/cash-out method.
- Expiry or reversal rules.
- Whether SMS resend is possible.
- What happens on pending, failed, expired, or reversed payout.
- Support path and SLA expectations.

### 9.4 SLA and operations

Agreement SLA notes:

- Processing services intended 24/7, excluding scheduled maintenance.
- Scheduled maintenance up to 3 hours per month.
- Contractual target availability: 99.0%.
- Error Category 1 resolution target: 4 hours.
- Error Category 2 resolution target: 8 hours.
- Error Category 3 resolution target: 2 business days.
- Error Category 4 resolution in normal release cycles.

Operational requirements:

- OTT status page or support channel for incident management.
- Alert if `GetBalance` below threshold.
- Alert if provider active list changes materially.
- Alert on webhook verification failures.
- Alert on status-polling mismatch or stale pending payouts.

---

## 10. Reconciliation Framework

OTT reconciliation must cover four views:

1. MMTP transaction records.
2. MMTP ledger journals.
3. OTT API status / transaction records.
4. OTT statement, settlement, or invoice files.

Required matching keys:

- MMTP internal transaction ID.
- OTT `uniqueReferenceId`.
- OTT payment reference.
- Provider transaction reference.
- Amount.
- Status.
- Timestamp.
- Provider code.
- Mobile/account reference, masked.

Required reconciliations:

- Wallet debit/credit vs journal lines.
- OTT status vs MMTP status.
- Supplier float balance vs ledger account balance.
- OTT balance API vs internal expected balance, if OTT balance is prefunded.
- Daily/monthly OTT statement totals vs MMTP totals.
- Commission and fees vs commercial terms.
- Reversal fees vs reversal records.

New adapter target:

- `services/reconciliation/adapters/OttAdapter.js`

Do not implement until OTT provides the official settlement/reconciliation file
format or confirms API-only reconciliation.

---

## 11. Product Rollout Phases

### Phase 0 - Framework and partner clarification

Output:

- This framework.
- Partner question list.
- Implementation plan.

No code, no migrations, no live calls.

### Phase 1 - Read-only connectivity

Candidate scope:

- Credential configuration.
- `GetBalance`.
- Get Active Providers.
- Get Active Provider Limits.
- Get Country Codes.
- Get Universal Branch Codes.

No wallet debits, no payouts, no vouchers.

### Phase 2 - OTT Payout / Cash Send UAT

Candidate scope:

- Feature-flagged payout service.
- Idempotent wallet debit.
- `PerformPayout`.
- Status polling.
- Webhook verification.
- Reversal/failed payout handling.
- Ledger and reconciliation.

### Phase 3 - OTT retail voucher sale

Candidate scope:

- Catalog entries.
- Product variants.
- Voucher issuance.
- Supplier transaction tracking.
- Commission/VAT treatment.

Only if official retail voucher API is confirmed.

### Phase 4 - OTT voucher wallet top-up

Candidate scope:

- Voucher redemption API.
- Wallet credit.
- Restricted balance classification.
- Settlement/recon.

Only if official top-up/redemption API is confirmed.

### Phase 5 - OTT Loyalty

Candidate scope:

- Loyalty enrolment/display.
- Reward event capture.
- Reward settlement.

Only after official loyalty API, consent, and reward-liability treatment are
confirmed.

---

## 12. Open Questions for OTT / CliqueFin

### 12.1 API and credentials

1. Provide official UAT credentials for Basic Auth and API key.
2. Confirm whether Basic Auth plus SHA-256 hash is required for every endpoint.
3. Provide endpoint-specific hash parameter order for all endpoints.
4. Provide complete status code and error code matrix.
5. Confirm idempotency semantics for duplicate `uniqueReferenceId`.
6. Confirm timeout guidance and whether `PerformPayout` is safe to retry with
   the same reference.
7. Confirm webhook delivery retry schedule and event schema.
8. Confirm whether `VerifyWH` is required for every webhook or only as an
   optional verification endpoint.

### 12.2 Products

1. Which providers are available for MyMoolah at launch?
2. Which provider codes map to Nedbank, ABSA Cashsend, PayShap, RTC, EFT, and
   any OTT voucher cash-out rail?
3. Which provider supports ATM cash-send specifically?
4. Are OTT retail voucher sale and OTT voucher redemption exposed through this Payout
   API or separate APIs?
5. Provide OTT voucher denomination rules, min/max, expiry, cancellation, and
   resend behaviour.
6. Provide official OTT Loyalty API documentation.

### 12.3 Commercials and settlement

1. Confirm launch fees by product and provider.
2. Confirm whether fees are VAT-inclusive or VAT-exclusive in API responses.
3. Confirm whether MMTP pays OTT fees, passes them to users, or both.
4. Confirm when the 0.3% switching service fee applies.
5. Confirm daily/monthly invoice format and VAT invoice treatment.
6. Confirm settlement schedule, bank narrative, and reconciliation files.
7. Confirm reversal windows, fees, and settlement handling.

### 12.4 Compliance and data

1. Confirm FICA responsibilities across MMTP, OTT, providers, and retailers.
2. Confirm CTR/STR responsibilities and reporting chain.
3. Confirm POPIA operator/responsible-party role allocation.
4. Confirm whether OTT may use consumer data for marketing and how consent is
   collected.
5. Confirm data retention and deletion requirements.
6. Confirm support escalation contacts and SLA process.

---

## 13. Implementation Plan Entry Criteria

Do not start implementation until these are available:

- UAT credentials and API key delivery through a secure channel.
- Endpoint-specific hash examples.
- Provider code list and active provider limits.
- Full error/status matrix.
- Webhook payload examples and verification process.
- Settlement/reconciliation file sample or API-only recon confirmation.
- Product-specific commercial confirmation.
- Finance approval for ledger accounts and VAT treatment.
- Compliance approval for cash-withdrawal and voucher top-up classification.
- Feature flag names and environment variable names approved.

---

## 14. Non-Negotiable Build Rules for the Next Phase

- No dummy financial flows.
- No hardcoded provider codes, fees, account codes, or amounts in runtime code.
- No live production calls without André approval.
- No production writes without André approval.
- No secrets in repository files.
- All financial writes must be idempotent.
- All wallet mutations must reconcile to balanced journal entries.
- All cash-withdrawal debits must enforce unrestricted balance.
- All logs must redact PII and voucher/PIN values.
- All direct DB scripts must use `scripts/db-connection-helper.js`.
- All new ledger accounts must be in `docs/CHART_OF_ACCOUNTS.md` and migrated
  before code posts to them.
- Existing code patterns must be verified against live routes, models, tests,
  and current docs before reuse.

---

## 15. Recommended Next Step

Create the detailed OTT implementation plan after the partner question list is
answered or consciously staged. The plan should split work into small approval
gates:

1. Read-only API client and provider discovery.
2. Payout/Cash Send UAT.
3. Webhook and status reconciliation.
4. Ledger and VAT migrations.
5. Retail voucher sale.
6. Voucher top-up with restricted-balance handling.
7. Loyalty, only after separate API/compliance confirmation.

