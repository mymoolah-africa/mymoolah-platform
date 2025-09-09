## Flash VAS Product Catalog (DS01 – August 2024)

Source: `integrations/flash/Flash MM Products DS01 - August 2024.pdf`

### Commercial Model (summary)
- Prefunded account for most categories (COD/deposits). Daily settlement for previous day’s transactions unless specific terms specified.
- Commission/discounts include VAT; subject to 6‑monthly review and pass‑through adjustments from SPs.

### Product Groups and Commercials (selected)
- Airtime & Data (prefunded)
  - eeziAirtime: 3.50%
  - MTN/Vodacom/CellC/Telkom: 3.00%

- International Content & Vouchers (prefunded)
  - Netflix 3.25%, Uber 2.80%, Spotify 6.00%, Roblox 6.00%, Playstation 3.50%, PUBG Mobile 7.00%, Razer Gold 3.50%, Free Fire 3.50%, Steam 3.50%, Fifa Mobile 4.80%, Apple 4.50%, Google Play 3.10%, OTT 3.00%

- Flash Payments (prefunded)
  - DSTV R3.00 per txn; Unipay R2.00; Ekurhuleni R2.50; Flash R3.00; Tenacity 2.50%; JD Group 2.50%; StarSat 3.00%; Talk360 6.00%; Ria 0.40%; Intercape 5.00%; PayJoy 2.10%; Betway/HollywoodBets/YesPlay 3.00%

- Flash Tokens: R3.00 (prefunded)

- 1Voucher Sales: as per Annexure A (prefunded)

- Electricity: 0.85% (prefunded) – municipalities in Annexure C

Note: Fees charged to Partner listed separately in DS01; refer to PDF for full schedule and annexures.

---

## Backend Integration Implications

### 1) Airtime & Data Page (Wallet UI)
- Categories: Airtime, Data, Bundles by MNO (MTN, Vodacom, CellC, Telkom) + eeziAirtime aggregator.
- API endpoints already available via Flash Controller (cellular pinless purchase). We will:
  - Add product listing cache (from `/accounts/{account}/products`) to show available denominations.
  - Add purchase flow: `POST /api/v1/flash/cellular/pinless/purchase` with `reference`, `subAccountNumber`, `productCode`, `amount`, `mobileNumber`.
  - Display commission (optional) and final price.

### 2) Supplier Schema (Flash as supplier)
- New tables/columns (sketch):
  - `suppliers` (id, name, type, settlement_mode='prefunded', payable_account_id, receivable_account_id, float_wallet_id)
  - `supplier_products` (id, supplier_id, group, product_code, name, commission_type='percent'|'fixed', commission_value, active)
  - `supplier_product_pricing` (id, supplier_product_id, face_value_cents, min_qty, max_qty, effective_from)
  - `supplier_transactions` (id, supplier_id, reference, product_code, amount_cents, commission_cents, external_txn_id, response_code, status, raw_request, raw_response, created_at)

### 3) Ledger accounts
- Chart additions:
  - Suppliers
    - Flash Payables (liability)
    - Flash Float (asset – prefunded)
    - COGS – Flash Vouchers (expense)
  - Clients (wallets) – existing
  - Merchants (if we settle merchants) – `Merchant Payables`, `Merchant Revenue Share`
  - Service Providers (for pass‑through items) – optional tracking per SP where Flash passes commercials

Entries (example – Airtime purchase R100):
1. On client purchase (success):
   - Dr Client Wallet (liability) 100.00
   - Cr Sales – Airtime (revenue) 100.00
2. COGS to Flash (at commercial):
   - Dr COGS – Flash Vouchers 97.00 (if 3%)
   - Cr Flash Float 97.00
3. Commission recognition (gross margin):
   - Dr Sales Discounts/Contra 3.00
   - Cr Commission Income 3.00

Note: Final model depends on net/gross handling; if we treat 100 as gross revenue, recognize COGS accordingly; if agency, use net revenue.

### 4) Runtime configuration
- `.env` additions (if not present):
  - `FLASH_CONSUMER_KEY`, `FLASH_CONSUMER_SECRET`, `FLASH_API_URL=https://api.flashswitch.flash-group.com`

### 5) Caching and Idempotency
- Added idempotency cache (30 min) keyed by (endpoint|reference) in `flashAuthService`.
- Add product list cache (to implement) with short TTL to reduce traffic and improve catalog speed.

### 6) Follow‑ups
- Import Annexure A (1Voucher schedule) and Annexure C (municipality list) into `supplier_products` on bootstrap.
- Add admin screens to manage commissions/enable/disable products.
- Build Airtime/Data React page using products from the new cache.


