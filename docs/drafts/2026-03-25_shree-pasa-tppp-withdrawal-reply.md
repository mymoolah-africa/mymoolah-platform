# Draft Reply — Shree / PASA TPPP Withdrawal Query

**Date**: 25 March 2026
**To**: Shree
**Subject**: RE: PASA TPPP Query — Withdrawal Functionality Clarification + Flow Diagrams

---

## Copy-Paste Email Below:

---

Hi Shree,

Thank you for reverting with PASA's query. Please find our response below, along with a supporting flow diagram document (attached).

---

**1. Standard Bank Sponsorship for Withdrawal Functionality**

Additional Standard Bank sponsorship is **not required** for the "withdrawal" (cash-out) functionality described in our business case. Here is why:

The cash-out function within MyMoolah is the **resale of Flash eeziCash voucher PINs** — a Value-Added Service (VAS) product, not a banking withdrawal or payment instruction through the clearing system.

- MyMoolah purchases the eeziCash voucher product from **Flash (Pty) Ltd** via their **Flash Partner API v4** on behalf of the wallet user.
- **Flash generates the PIN** — MyMoolah does not generate, manage, or settle the cash redemption.
- The user redeems the PIN at any of Flash's approximately **240,000 retail agent locations** across South Africa (Spar, Shoprite, PEP, independent traders, spaza shops, and freelance Flash agents).
- The cash dispensation occurs between the **end-user and Flash's retail agent network** — MyMoolah is not a party to the cash settlement.
- **Flash is itself a registered TPPP** and manages its own retail agent network under its own regulatory framework.
- **No payment instruction enters the banking clearing system** — the wallet debit and Flash float settlement are internal ledger operations within MyMoolah's treasury platform.

This is functionally identical to how MyMoolah distributes airtime, data, and other prepaid VAS products — all of which are covered under our existing TPPP scope with Standard Bank as sponsor.

---

**2. Cash-Out Network (referenced in business case)**

The "unparalleled access to over 200,000 formal and informal retail points for cash withdrawals" refers to **Flash's retail agent network**, which MyMoolah accesses as a reseller of Flash's eeziCash voucher product:

**How it works:**

1. User selects "Cash Out" in the MyMoolah wallet app and chooses an amount (e.g. R200).
2. MyMoolah debits the user's wallet (R200 + service fee) and records a double-entry ledger journal.
3. MyMoolah calls the **Flash Partner API** to purchase an eeziCash voucher.
4. **Flash generates a PIN** (e.g. EZ-1234-5678-9012) and returns it to MyMoolah.
5. The PIN is displayed to the user in the app.
6. The user visits **any Flash retail agent** (~240,000 locations nationwide) and presents the PIN.
7. The retail agent verifies the PIN with Flash and dispenses the cash.

MyMoolah's role ends at Step 5 (displaying the PIN). Steps 6–7 are entirely within Flash's retail ecosystem. The funds flow from MyMoolah to Flash via **pre-funded B2B float settlement** — no consumer payment instruction enters the banking clearing system.

---

**3. Integrated Retail Network (referenced in business case)**

The "integrated retail network enabling voucher redemption, bill payments, and cash deposits" refers to MyMoolah's API integrations with three primary third-party service providers:

| Provider | Integration | Function | Direction |
|----------|-------------|----------|-----------|
| **Flash** (Partner API v4) | eeziCash vouchers, airtime, data, 1Voucher | Voucher redemption at ~240,000 retail points | Wallet → Cash (VAS purchase) |
| **EasyPay** (Receiver API) | Cash deposits via EasyPay terminals | Users deposit cash at retail to top up wallets | Cash → Wallet (deposit) |
| **MobileMart** (Fulcrum API) | Bill payments, electricity, airtime, data | Users pay bills from their wallets | Wallet → Biller (VAS purchase) |

**Cash deposits (EasyPay):**
- User requests a 14-digit EasyPay PIN in the app.
- User visits any EasyPay merchant (Pick n Pay, Shoprite, Checkers, Spar, etc.) and pays cash.
- EasyPay settles to **MyMoolah as the single named creditor** (Receiver ID 5063).
- MyMoolah credits the user's wallet upon settlement confirmation.

**Bill payments (MobileMart):**
- User selects a biller (electricity, municipality, insurance, etc.) from 150+ available billers.
- MyMoolah debits the wallet and purchases the product via MobileMart's Fulcrum API.
- The user receives a token/receipt (e.g. electricity token).

All of these are standard VAS distribution and deposit activities covered under our existing TPPP registration scope.

---

**Supporting Documentation**

Please find attached the **"MyMoolah TPPP — Withdrawal Functionality Flow Diagrams"** document, which contains detailed flow diagrams for:
- Flash eeziCash Cash-Out flow (with ledger treatment)
- EasyPay Cash Deposit flow
- MobileMart Bill Payment flow
- Integrated Retail Network overview

This document also references the relevant sections in our TPPP application (Annexure A Section 2.3, PASA Checklist Response Sections 3.1.2, 3.2, and 4.1.1).

Please let me know if PASA requires any additional detail or clarification.

Kind regards,
Andre Botes
MyMoolah (Pty) Ltd

---

*END OF DRAFT*
