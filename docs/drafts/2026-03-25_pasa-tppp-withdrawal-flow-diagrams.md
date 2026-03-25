# MyMoolah Treasury Platform — TPPP Withdrawal Functionality

**Prepared for**: PASA (via APSA / Standard Bank Sponsorship)
**Date**: 25 March 2026
**Document Reference**: MMTP-TPPP-WITHDRAWAL-001
**Prepared by**: MyMoolah (Pty) Ltd

---

## 1. Executive Summary

This document addresses PASA's query regarding the withdrawal functionality within the MyMoolah wallet service, specifically the **Cash-Out Network** and **Integrated Retail Network** referenced in our TPPP business case.

**Key clarification**: MyMoolah does **not** operate its own cash-out or withdrawal infrastructure. The "Cash-Out Network" and "Integrated Retail Network" referenced in our business case describe **third-party VAS product resale** and **partner integrations** — not proprietary withdrawal mechanisms that would require additional Standard Bank sponsorship beyond the existing TPPP scope.

---

## 2. Cash-Out Network — Flash eeziCash Voucher (Resale Model)

### 2.1 What It Is

The "Cash-Out Network" referenced in our business case describes the **resale of Flash eeziCash voucher PINs**. MyMoolah is a **registered reseller** of Flash's prepaid voucher products via the **Flash Partner API v4**.

- **Flash** (Pty) Ltd is itself a **registered TPPP** and holds the necessary licences and agreements with its retail agent network.
- MyMoolah purchases the eeziCash voucher product from Flash on behalf of the wallet user.
- **Flash generates the PIN** — MyMoolah does not generate, manage, or settle the cash redemption.
- The user redeems the PIN at any of Flash's **~240,000 retail agent locations** (Spar, Shoprite, PEP, independent traders, spaza shops, and freelance Flash agents) across South Africa.
- The cash dispensation is between the **end-user and Flash's retail network** — MyMoolah is not a party to the cash settlement.

### 2.2 Why Additional Sponsorship Is Not Required

| Aspect | Detail |
|--------|--------|
| **Nature of transaction** | VAS product purchase (prepaid voucher), not a banking withdrawal or payment instruction |
| **PIN issuer** | Flash (Pty) Ltd — not MyMoolah |
| **Cash settlement** | Between end-user and Flash retail agent — outside MyMoolah's clearing obligations |
| **Funds flow** | User's wallet → MyMoolah Flash float account → Flash (supplier settlement) |
| **Flash's own status** | Flash is a registered TPPP with its own PASA registration |
| **MyMoolah's role** | Reseller/distributor of Flash's voucher product |
| **Clearing system involvement** | None — no payment instruction enters the banking clearing system |

### 2.3 Flow Diagram — Flash eeziCash Cash-Out

```
┌─────────────────────────────────────────────────────────────────────┐
│                   FLASH eeziCASH VOUCHER FLOW                       │
│                   (VAS Product Resale — Not a Banking Withdrawal)    │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────┐         ┌──────────────┐         ┌─────────────┐
    │ MyMoolah │         │   MyMoolah   │         │  Flash API  │
    │   User   │         │   Backend    │         │ Partner v4  │
    │  (App)   │         │   (MMTP)     │         │             │
    └────┬─────┘         └──────┬───────┘         └──────┬──────┘
         │                      │                        │
    ① User selects              │                        │
      "Cash Out" and            │                        │
      enters amount             │                        │
      (e.g. R200)               │                        │
         │                      │                        │
         │──── POST ───────────>│                        │
         │  /api/v1/flash/      │                        │
         │  eezi-voucher/       │                        │
         │  purchase            │                        │
         │                      │                        │
         │               ② Validate wallet              │
         │                  balance                      │
         │                  (R200 + R8 fee)              │
         │                      │                        │
         │               ③ Debit user wallet             │
         │                  (R208 total)                 │
         │                  Double-entry ledger           │
         │                  journal posted               │
         │                      │                        │
         │                      │── POST ───────────────>│
         │                      │  /eezi-voucher/        │
         │                      │  purchase              │
         │                      │  (Flash Partner API)   │
         │                      │                        │
         │                      │       ④ FLASH GENERATES│
         │                      │          THE PIN       │
         │                      │          (e.g. EZ-     │
         │                      │          1234-5678-    │
         │                      │          9012)         │
         │                      │                        │
         │                      │<── PIN returned ───────│
         │                      │                        │
         │<── PIN displayed ────│                        │
         │    to user           │                        │
         │                      │                        │
    ⑤ User takes PIN            │                        │
      to ANY of Flash's         │                        │
      ~240,000 retail           │                        │
      agent locations           │                        │
         │                      │                        │
         │     ┌────────────────────────────┐            │
         │     │   FLASH RETAIL NETWORK     │            │
         │     │   (~240,000 locations)     │            │
         │     │                            │            │
         │     │  • Spar stores             │            │
         │     │  • Shoprite / Checkers     │            │
         │     │  • PEP stores              │            │
         │     │  • Independent traders     │            │
         │     │  • Spaza shops             │            │
         │     │  • Freelance Flash agents  │            │
         │     └────────────┬───────────────┘            │
         │                  │                            │
    ⑥ User presents PIN     │                            │
      at retail agent       │                            │
         │──────────────────>                            │
         │                  │                            │
    ⑦ Retail agent verifies │                            │
      PIN with Flash and    │────── PIN verification ───>│
      dispenses cash        │<──── Confirmed ────────────│
         │                  │                            │
         │<── Cash received │                            │
         │    (R200)        │                            │
         │                  │                            │
    ┌────┴──────────────────┴────────────────────────────┴──────┐
    │  NOTE: The cash dispensation (Steps ⑥–⑦) occurs between  │
    │  the end-user and Flash's retail agent network.           │
    │  MyMoolah is NOT a party to the cash settlement.          │
    │  No payment instruction enters the banking clearing       │
    │  system. This is a VAS product purchase and redemption.   │
    └──────────────────────────────────────────────────────────┘
```

### 2.4 Ledger Treatment

The wallet debit is recorded as a **VAS purchase** in MyMoolah's double-entry ledger:

```
DEBIT:   User Wallet (Liability)           R200.00
DEBIT:   User Wallet (Liability)           R  8.00  (service fee)
CREDIT:  Flash Supplier Float (Asset)      R200.00
CREDIT:  Commission Revenue (Revenue)      R  6.96  (fee net of VAT)
CREDIT:  VAT Control (Liability)           R  1.04  (15% VAT on fee)
```

The supplier float is settled with Flash via their standard B2B settlement process (prepaid float, topped up periodically by MyMoolah).

---

## 3. Integrated Retail Network — Partner Integrations

### 3.1 What It Is

The "Integrated Retail Network" referenced in our business case describes MyMoolah's API integrations with multiple **third-party service providers** that enable:

| Function | Provider | Description |
|----------|----------|-------------|
| **Voucher redemption** | Flash (eeziCash, 1Voucher) | Users purchase voucher PINs redeemable at Flash's retail network |
| **Cash deposits** | EasyPay | Users deposit cash at EasyPay merchant terminals to top up their wallets |
| **Bill payments** | MobileMart (Fulcrum API) | Users pay electricity, municipal, and other bills from their wallets |
| **Airtime & data** | Flash + MobileMart | Users purchase prepaid airtime and data bundles |
| **QR payments** | Zapper | Users pay at 25,000+ Zapper-enabled merchants |

### 3.2 Flow Diagram — EasyPay Cash Deposit (Wallet Top-Up)

```
┌─────────────────────────────────────────────────────────────────────┐
│            EASYPAY CASH DEPOSIT (WALLET TOP-UP) FLOW                │
│            (Cash-In via EasyPay Retail Network)                     │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────┐         ┌──────────────┐         ┌─────────────┐
    │ MyMoolah │         │   MyMoolah   │         │   EasyPay   │
    │   User   │         │   Backend    │         │   Backend   │
    │  (App)   │         │   (MMTP)     │         │             │
    └────┬─────┘         └──────┬───────┘         └──────┬──────┘
         │                      │                        │
    ① User selects              │                        │
      "Top-up via EasyPay"      │                        │
      and enters amount         │                        │
      (e.g. R500)               │                        │
         │                      │                        │
         │── POST ─────────────>│                        │
         │  /api/v1/vouchers/   │                        │
         │  easypay/topup/issue │                        │
         │                      │                        │
         │               ② Generate 14-digit             │
         │                  EasyPay PIN                   │
         │                  (Receiver ID: 5063)           │
         │                  Format: 9-5063-XXXXXXXX-C     │
         │                  No wallet debit yet           │
         │                      │                        │
         │<── PIN displayed ────│                        │
         │    "9 5063 1234 5678 X"                       │
         │                      │                        │
    ③ User visits ANY           │                        │
      EasyPay merchant          │                        │
      (Pick n Pay, Shoprite,    │                        │
      Checkers, Spar, etc.)     │                        │
         │                      │                        │
    ④ User presents PIN         │                        │
      and pays R500 cash        │                        │
      at terminal               │                        │
         │                      │                        │
         │          ┌───────────────────────┐             │
         │          │  EASYPAY RETAIL       │             │
         │          │  TERMINAL NETWORK     │             │
         │          │  (Pick n Pay, Spar,   │             │
         │          │  Shoprite, Checkers,  │             │
         │          │  etc.)                │             │
         │          └───────────┬───────────┘             │
         │                      │                        │
         │               ⑤ EasyPay terminal              │
         │                  processes payment             │
         │                  and settles to                │
         │                  MyMoolah (Receiver            │
         │                  ID 5063)                      │
         │                      │                        │
         │                      │<── POST ───────────────│
         │                      │  /vouchers/easypay/    │
         │                      │  topup/settlement      │
         │                      │  (settlement callback) │
         │                      │                        │
         │               ⑥ Credit user wallet            │
         │                  (R500 minus fees)             │
         │                  Double-entry ledger           │
         │                  journal posted                │
         │                      │                        │
         │                      │── 200 OK ─────────────>│
         │                      │   (Settled)            │
         │                      │                        │
         │<── Push notification─│                        │
         │    "Wallet credited  │                        │
         │     R485.00"         │                        │
         │                      │                        │
    ┌────┴──────────────────────┴────────────────────────┴──────┐
    │  NOTE: MyMoolah is the single named creditor              │
    │  (Receiver ID 5063). EasyPay settles directly to          │
    │  MyMoolah — no onward settlement to sub-creditors.        │
    │  This falls under MyMoolah's existing TPPP scope.         │
    └──────────────────────────────────────────────────────────┘
```

### 3.3 Flow Diagram — Bill Payments via MobileMart

```
┌─────────────────────────────────────────────────────────────────────┐
│               BILL PAYMENT FLOW (via MobileMart)                    │
│               (VAS Purchase — Wallet Debit)                         │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────┐         ┌──────────────┐         ┌─────────────┐
    │ MyMoolah │         │   MyMoolah   │         │  MobileMart │
    │   User   │         │   Backend    │         │ Fulcrum API │
    │  (App)   │         │   (MMTP)     │         │             │
    └────┬─────┘         └──────┬───────┘         └──────┬──────┘
         │                      │                        │
    ① User selects bill         │                        │
      payment (electricity,     │                        │
      municipality, etc.)       │                        │
      and enters details        │                        │
         │                      │                        │
         │── GET ──────────────>│                        │
         │  /api/v1/mobilemart/ │                        │
         │  prevend/bill-payment│                        │
         │  (meter lookup)      │                        │
         │                      │── prevend request ────>│
         │                      │<── meter/account ──────│
         │                      │    details confirmed   │
         │<── Details shown ────│                        │
         │                      │                        │
    ② User confirms amount      │                        │
      and authorises payment    │                        │
         │                      │                        │
         │── POST ─────────────>│                        │
         │  /api/v1/overlay/    │                        │
         │  bill-payment/pay    │                        │
         │                      │                        │
         │               ③ Validate wallet               │
         │                  balance                      │
         │                  Debit user wallet             │
         │                  (atomic transaction)         │
         │                      │                        │
         │                      │── POST purchase ──────>│
         │                      │   (amount, meter,      │
         │                      │    product details)    │
         │                      │                        │
         │                      │<── Token/receipt ──────│
         │                      │    returned            │
         │                      │                        │
         │               ④ Record transaction            │
         │                  Post ledger journal           │
         │                  (Wallet ↓, Supplier Float ↓, │
         │                   Commission + VAT recorded)  │
         │                      │                        │
         │<── Token/receipt ────│                        │
         │    displayed         │                        │
         │                      │                        │
    ┌────┴──────────────────────┴────────────────────────┴──────┐
    │  NOTE: Bill payments are VAS purchases — wallet debits.   │
    │  MobileMart settles with the biller.                      │
    │  150+ billers available (municipal, utility, insurance).  │
    │  1,700+ products in the MobileMart catalogue.             │
    └──────────────────────────────────────────────────────────┘
```

### 3.4 Summary of Retail Network Partners

```
┌─────────────────────────────────────────────────────────────────────┐
│              MyMoolah INTEGRATED RETAIL NETWORK                     │
│              (Third-Party Partner Integrations)                     │
└─────────────────────────────────────────────────────────────────────┘

                        ┌──────────────┐
                        │   MyMoolah   │
                        │   Treasury   │
                        │   Platform   │
                        └──────┬───────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────┴───────┐ ┌─────┴──────┐  ┌──────┴───────┐
     │     FLASH      │ │  EASYPAY   │  │  MOBILEMART  │
     │  Partner API   │ │  Receiver  │  │  Fulcrum API │
     │     v4         │ │  ID: 5063  │  │     v1/v2    │
     └────────┬───────┘ └─────┬──────┘  └──────┬───────┘
              │               │                │
     Products:         Products:         Products:
     • eeziCash        • Cash deposit    • Bill payments
       (cash-out         (wallet           (150+ billers)
       voucher PIN)      top-up)         • Electricity
     • Airtime         • Standalone        (prepaid)
     • Data              voucher         • Airtime
     • 1Voucher                          • Data
       (gaming,                          • Digital
       retail)                             vouchers
              │               │                │
     Retail Points:    Retail Points:    Settlement:
     ~240,000 agents   Pick n Pay,      Direct to
     Spar, Shoprite,   Shoprite, Spar,  billers/
     PEP, spaza       Checkers, etc.    utilities
     shops, traders
              │               │                │
     Direction:        Direction:        Direction:
     WALLET → CASH     CASH → WALLET    WALLET → BILLER
     (VAS purchase)    (deposit/top-up)  (VAS purchase)
```

---

## 4. Standard Bank Sponsorship — Position

### 4.1 Answer to PASA Query

**Is additional Standard Bank sponsorship required for the withdrawal functionality?**

**No.** The "withdrawal" functionality described in the business case is the **resale of Flash eeziCash voucher PINs**, which is a **Value-Added Service (VAS) product purchase**, not a banking withdrawal or payment instruction through the clearing system. Specifically:

1. **No payment instruction enters the banking clearing system** — the wallet debit and Flash float settlement are internal ledger operations between MyMoolah and its VAS supplier (Flash).

2. **Flash generates and manages the PIN** — MyMoolah is a reseller/distributor. The PIN redemption and cash dispensation occur within Flash's own retail agent network.

3. **Flash is a registered TPPP** — Flash holds its own PASA registration and manages its retail agent network under its own regulatory framework.

4. **The existing TPPP scope covers this** — MyMoolah's TPPP registration with Standard Bank as sponsor covers wallet management and VAS product distribution. The eeziCash voucher is one of many VAS products (alongside airtime, data, electricity, bill payments) distributed through the same platform.

5. **Funds flow is B2B supplier settlement** — MyMoolah pre-funds a float account with Flash. When a user purchases an eeziCash voucher, the wallet is debited and the Flash float is decremented. Periodic settlement between MyMoolah and Flash replenishes the float. This is standard B2B supplier settlement, not a consumer payment instruction.

### 4.2 TPPP Application Document References

The following sections in our TPPP application documents are relevant:

| Document | Section | Content |
|----------|---------|---------|
| **Annexure A** (Business Model) | Section 2.3 — VAS Marketplace | Lists Flash and EasyPay as VAS integration partners for digital vouchers |
| **Annexure A** (Business Model) | Section 2.2 — Digital Wallet | Describes wallet as platform for VAS purchases and bill payments |
| **PASA Checklist Response** | Section 3.1.2 — VAS Services | Lists airtime, data, electricity, digital vouchers, bill payments |
| **PASA Checklist Response** | Section 3.2 — Integration Partners | Lists Flash Partner API v4, MobileMart Fulcrum API, EasyPay, Zapper |
| **PASA Checklist Response** | Section 4.1.1 — BSP Agreements | Notes Flash Partner Agreement (agent of Flash for VAS services) |
| **Standard Bank T-PPP Sponsor Brief** | VAS Purchase Flow | Describes atomic VAS purchase with ledger treatment |

---

## 5. Conclusion

The MyMoolah "Cash-Out Network" and "Integrated Retail Network" are **third-party VAS product integrations**, not proprietary banking withdrawal infrastructure. The existing Standard Bank TPPP sponsorship scope adequately covers these functions as they are VAS product distribution activities, not payment instructions through the banking clearing system.

MyMoolah's role is that of a **digital wallet operator and VAS reseller**, with all cash-out/voucher products being issued and managed by registered third-party providers (Flash, EasyPay, MobileMart) under their own regulatory frameworks.

---

**Document prepared by**: MyMoolah (Pty) Ltd
**Date**: 25 March 2026
**For**: PASA TPPP Review — via APSA / Standard Bank Sponsorship

*END OF DOCUMENT*
