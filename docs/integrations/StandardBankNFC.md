# NFC Deposits & Payments Implementation Plan

**Last Updated**: February 2, 2026  
**Version**: 2.0.0  
**Status**: ✅ **PHASE 1 READY** | ⏳ **PHASE 2 AWAITING VIRTUAL CARDS**  
**SoftPOS Vendor**: Halo Dot (Halo.Link / Halo.Go)

---

## 🎯 **Overview**

Design and implement banking-grade NFC deposits (SoftPOS) and NFC payments (tokenized virtual card) with Standard Bank T-PPP, fully compliant with PCI/MPoC/CPoC and Mojaloop ledger flows.

**Phase 1** (deposits only): ✅ **Halo Dot selected** — Implement tap-to-deposit using Halo.Link/Halo.Go. No virtual card needed. See `docs/NFC_DEPOSIT_IMPLEMENTATION_PLAN.md` for full implementation.

**Phase 2** (later): Virtual debit card for POS payments — deferred until Standard Bank issues virtual cards.

---

## ⚠️ **Critical Compliance & Security**

### **Brutal Gap Check (Must-fix before build)**
- **No Web NFC**: Browser-only NFC is non-compliant. Must use certified SoftPOS kernel (Android) and Apple Tap to Pay API (iOS).
- **Phase 1**: Halo.Link/Halo.Go handles PCI compliance; no PCI cert needed for MyMoolah.
- **Phase 2**: Need issuing + acquiring agreements, MPoC/CPoC evidence, Apple/Google issuer provisioning entitlements, and Standard Bank (T-PPP) sandbox keys.
- **Ledger Alignment**: All NFC events must map to existing double-entry patterns and ISO8583/ISO20022 semantics. No parallel balance logic.
- **Data Protection**: No PAN/CVV storage; only tokens/opaque data. All webhooks must be idempotent and signed.

---

## 🏗️ **Target Architecture**

### **1. Inbound NFC Deposits (Phase 1) — Halo Dot**
- **Vendor**: Halo Dot (Halo.Link / Halo.Go) — [docs](https://docs.halodot.io/), [Merchant Portal](https://go.merchantportal.prod.haloplus.io/)
- **Flow**: MyMoolah backend creates intent via Halo API → App launches Halo.Go via intent/deeplink → User taps card → Halo processes → App reports result to backend → NFCDepositService credits wallet + ledger.
- **Settlement**: T+1/T+2 to MyMoolah Treasury (Standard Bank).
- **Ledger**: NFC float debit; User wallet credit.
- **UX**: Native/PWA/TWA; Halo.Go/Halo.Link app required on device.

### **2. Outbound NFC Payments (Phase 2 — Deferred)**
- **Flow**: MyMoolah issues virtual card via T-PPP → push provisioning to Apple Pay/Google Wallet → POS auth → Standard Bank issuer webhook → MyMoolah auth service → approval/decline → settlement.
- **Auth Service**: Checks balance/limits, locks funds, approves/declines with reason codes.
- **Ledger**: Debit wallet, credit settlement/issuer clearing.
- **Prerequisite**: Standard Bank virtual card issuance.

### **3. Bridge Apps**
- **Phase 1**: Halo.Go/Halo.Link (no MyMoolah native app needed; PWA/TWA launches Halo via intent/deeplink).
- **Phase 2**: Android MPoC terminal app; iOS Tap to Pay wrapper with deep links from PWA/TWA.

---

## 🗄️ **Data Model Changes**

### **New Models**
- **`VirtualCard`**: `id`, `userId`, `cardToken`, `status`, `expiryDate`, `lastFour`, `monthlyLimit`, timestamps (Never PAN/CVV).
- **`SoftPosDevice`**: Device/terminal registry with attestation status, kernel version, risk flags.
- **`NfcAuthLog`**: Audit table for request/decision history.
- **`NfcCallbackLog`**: Audit table for deposit callbacks.

### **Transaction Extensions**
- New types: `nfc_deposit`, `nfc_payment`, `nfc_issuing_fee`, `nfc_refund`, `nfc_reversal`.

---

## 🔌 **Backend Services**

- **`NFCDepositService`**: Signature/attestation verification, idempotency, mapping acquiring response to ledger.
- **`VirtualCardService`**: Issue/suspend/resume via T-PPP, provisioning payload (OPD) generation.
- **`CardAuthService`**: Handle issuer webhooks, balance/limit/velocity checks, fund locking, reversal handling.
- **`ProvisioningController`**: Endpoints for push-to-wallet orchestration.
- **`RiskEngine Hooks`**: NFC-specific rules (max taps/hour, geo-fencing, device integrity).

---

## 🌐 **API Surfaces**

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/nfc/deposit/callback` | `POST` | S2S from kernel/acquirer; HMAC + client cert. |
| `/api/v1/nfc/auth` | `POST` | Issuer webhook for POS taps. |
| `/api/v1/nfc/issue-card` | `POST` | Request new virtual card issuing. |
| `/api/v1/nfc/provision/apple|google` | `POST` | Returns OPD for wallet provisioning. |
| `/api/v1/nfc/card/status` | `POST` | Suspend or resume card. |
| `/api/v1/nfc/card` | `GET` | Get masked card info and limits. |

---

## 🧪 **Testing & Certification**

- **Unit**: Mock T-PPP issuing/auth, risk/limits, and idempotency.
- **Integration**: Sandbox with SoftPOS test harness and issuer webhook replay.
- **Performance**: Auth path target `< 200ms` P99.
- **Security**: Pen testing, root/jailbreak bypass attempts, replay/HMAC tests.
- **Certification**: MPoC/CPoC/Apple Pay/Google Wallet issuer test suites; Standard Bank UAT signoff.

---

## 🚀 **High-Level Roadmap**

### Phase 1 — NFC Deposits (Current)
1. **Halo Dot Onboarding**: Register on Merchant Portal; obtain Merchant ID and API Key.
2. **Models & Migrations**: `NfcDepositIntent`, `NfcCallbackLog`; add `nfc_deposit` to Transaction enum.
3. **Backend**: `haloDotClient`, `nfcDepositService`, `/api/v1/nfc/deposit/create`, `/api/v1/nfc/deposit/confirm`.
4. **Wallet UI**: Tap-to-deposit flow; intent/deeplink to Halo.Go.
5. **Full plan**: See `docs/NFC_DEPOSIT_IMPLEMENTATION_PLAN.md`.

### Phase 2 — Virtual Card (Deferred)
1. **Legal & Entitlements**: Secure T-PPP agreements and Apple/Google entitlements.
2. **Models & Migrations**: VirtualCard, SoftPosDevice, NfcAuthLog.
3. **Backend Services**: VirtualCardService, CardAuthService, provisioning controller.
4. **API Contracts**: Define and secure issuer webhooks (mTLS/HMAC).
5. **Mobile Bridges**: Android MPoC and iOS Tap to Pay wrappers.
6. **Certification**: Run full test suites and obtain bank signoff.
