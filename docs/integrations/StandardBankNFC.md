# NFC Deposits & Payments Implementation Plan

**Last Updated**: January 24, 2026  
**Version**: 1.0.0  
**Status**: ✅ **PLAN COMPLETE** | ⏳ **AWAITING ENTITLEMENTS**

---

## 🎯 **Overview**

Design and implement banking-grade NFC deposits (SoftPOS) and NFC payments (tokenized virtual card) with Standard Bank T-PPP, fully compliant with PCI/MPoC/CPoC and Mojaloop ledger flows.

---

## ⚠️ **Critical Compliance & Security**

### **Brutal Gap Check (Must-fix before build)**
- **No Web NFC**: Browser-only NFC is non-compliant. Must use certified SoftPOS kernel (Android) and Apple Tap to Pay API (iOS).
- **Prerequisites**: Need issuing + acquiring agreements, MPoC/CPoC evidence, Apple/Google issuer provisioning entitlements, and Standard Bank (T-PPP) sandbox keys before coding.
- **Ledger Alignment**: All NFC events must map to existing double-entry patterns and ISO8583/ISO20022 semantics. No parallel balance logic.
- **Data Protection**: No PAN/CVV storage; only tokens/opaque data. All webhooks must be idempotent and signed.

---

## 🏗️ **Target Architecture**

### **1. Inbound NFC Deposits (SoftPOS)**
- **Flow**: SoftPOS kernel (Android) / Tap to Pay on iPhone (iOS) → Standard Bank acquiring → MyMoolah NFC callback API → wallet ledger credit.
- **Ledger**: T-PPP main float debit; User wallet credit.
- **UX**: Native terminal app triggered via deep link from PWA.

### **2. Outbound NFC Payments (Virtual Card)**
- **Flow**: MyMoolah issues virtual card via T-PPP → push provisioning to Apple Pay/Google Wallet → POS auth → Standard Bank issuer webhook → MyMoolah auth service → approval/decline → settlement.
- **Auth Service**: Checks balance/limits, locks funds, approves/declines with reason codes.
- **Ledger**: Debit wallet, credit settlement/issuer clearing.

### **3. Bridge Apps**
- **Android**: Native "Secure Terminal" app embedding certified EMV L2/MPoC kernel.
- **iOS**: Native companion wrapper using Tap to Pay on iPhone.
- **PWA**: Used for orchestration and UX only, not card handling.

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

1.  **Legal & Entitlements**: Secure T-PPP agreements and Apple/Google entitlements.
2.  **Models & Migrations**: Implement database changes and transaction enums.
3.  **Backend Services**: Build core NFC, Card, and Auth services.
4.  **API Contracts**: Define and secure webhooks (mTLS/HMAC).
5.  **Mobile Bridges**: Develop Android MPoC and iOS Tap to Pay wrappers.
6.  **Wallet UI**: Implement issuing and tap-to-deposit UX.
7.  **Certification**: Run full test suites and obtain bank signoff.
