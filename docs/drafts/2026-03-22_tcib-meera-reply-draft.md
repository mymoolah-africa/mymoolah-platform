────────────────────────────────────────────────────────────────────────────────

                         MYMOOLAH TREASURY PLATFORM
                    TCIB Pre-Reading Document for PayInc

────────────────────────────────────────────────────────────────────────────────

To:       Meera (TCIB / PayInc / PayInc)
From:     Andre Botes — MyMoolah Treasury Platform
Subject:  RE: TCIB Meeting — MyMoolah Overview & Pre-Reading
Date:     22 March 2026

────────────────────────────────────────────────────────────────────────────────


Hi Meera,

Thanks for setting this up — had a great weekend, hope you did too.

Please find below the pre-reading as requested. Happy to elaborate on any
of these during our meeting.


════════════════════════════════════════════════════════════════════════════════
1.  OVERVIEW OF MYMOOLAH
════════════════════════════════════════════════════════════════════════════════

MyMoolah Treasury Platform (MMTP) is a South African fintech operating a
banking-grade digital wallet and payments platform. We are a registered
Third-Party Payment Provider (TPPP) under PASA, sponsored by Standard Bank
of South Africa.


WHAT WE DO
──────────
  •  Digital wallet with secure value storage, real-time peer-to-peer
     transfers, and QR code payments
  •  Value-Added Services marketplace: airtime, mobile data, bill payments,
     digital vouchers, and electricity — integrated with multiple suppliers
     (Flash, MobileMart, EasyPay)
  •  PayShap integration for real-time bank payments (Request to Pay and
     Rapid Payments) via Standard Bank
  •  Cross-border remittance product (MoolahMove) currently in development
     for SADC corridors
  •  KYC-verified onboarding aligned with FICA requirements


KEY FACTS
─────────
  Sponsor bank       Standard Bank of South Africa
  PASA registration  TPPP (Third-Party Payment Provider)
  Technology stack   Node.js, PostgreSQL, React (mobile-first PWA),
                     hosted on Google Cloud Platform (Cloud Run, Cloud SQL, GCS)
  Standards          Mojaloop-compliant, ISO 20022 messaging, SWIFT-aligned
  Production URLs    api-mm.mymoolah.africa  |  wallet.mymoolah.africa


SECURITY AND COMPLIANCE
───────────────────────
  •  TLS 1.3 enforced across all endpoints
  •  AES-256-GCM encryption for sensitive data at rest
  •  JWT HS512 authentication with short-lived tokens
  •  Parameterised SQL queries only (zero injection surface)
  •  Double-entry ledger with full auditability and automated reconciliation
  •  POPIA-compliant data handling with PII redaction in all logs
  •  Distributed rate limiting and bot protection (Redis-backed)
  •  ISO 27001 readiness
  •  FICA/KYC verification pipeline


PERFORMANCE
───────────
  •  API response times:   < 200 ms average
  •  Database queries:     < 50 ms
  •  Uptime target:        99.9 %
  •  Real-time transaction processing with automated settlement



════════════════════════════════════════════════════════════════════════════════
2.  TARGET USE CASES
════════════════════════════════════════════════════════════════════════════════

PRIMARY MARKET

Foreign nationals living and working in South Africa who need to send money
home to family and friends across the SADC region.

South Africa hosts an estimated 3–4 million migrant workers from SADC
countries. These workers regularly send remittances home, but current options
are expensive (5 %–8 % fees via traditional corridors), slow (hours to days),
and often inaccessible for unbanked recipients.


OUR PRODUCT — MOOLAHMOVE ("Move your Moolah")

  •  A consumer-facing cross-border remittance feature within the MyMoolah
     wallet
  •  The sender initiates a transfer in ZAR from their MyMoolah wallet
  •  The recipient receives local fiat currency in their bank account or
     mobile money wallet in the destination country
  •  Target corridors: South Africa to Zimbabwe, Malawi, Mozambique, Zambia,
     Tanzania, DRC, Lesotho, Eswatini, Namibia, Botswana, and other SADC
     member states
  •  Competitive pricing: targeting 3 %–5 % total fees (significantly below
     the Sub-Saharan Africa average of ~8 %)
  •  Speed: near real-time settlement where infrastructure supports it


SECONDARY MARKET

SMEs and informal traders conducting cross-border commercial payments
within SADC.


WHY TCIB IS IMPORTANT TO US

The TCIB rails offer a regulated, bank-grade, ISO 20022-compliant clearing
and settlement mechanism across all 16 SADC member states. This is
significantly more robust, transparent, and cost-effective than alternative
corridor approaches. TCIB would become our primary remittance rail for SADC
cross-border payments.



════════════════════════════════════════════════════════════════════════════════
3.  ROLLOUT PLAN
════════════════════════════════════════════════════════════════════════════════

PHASE 1 — INTEGRATION AND UAT                          Target: Q2–Q3 2026
─────────────────────────────────────────────────────────────────────────
  •  Complete TCIB scheme application and onboarding documentation
  •  Obtain UAT / sandbox API credentials and connectivity details
  •  Build TCIB integration module within MMTP
     (ISO 20022 messaging — we already use ISO 20022 for our Standard Bank
      PayShap integration, so the message format is familiar)
  •  Implement FX rate sourcing and quote engine for SADC currencies
  •  UAT testing across priority corridors:
     SA → Zimbabwe, SA → Malawi, SA → Mozambique, SA → Zambia
  •  Compliance alignment: AML/CFT, balance-of-payments reporting per
     SARB requirements


PHASE 2 — PILOT LAUNCH                                 Target: Q3–Q4 2026
─────────────────────────────────────────────────────────────────────────
  •  Limited production rollout with controlled user group
  •  Monitor transaction flows, settlement cycles, and reconciliation
  •  Validate end-to-end user experience
     (wallet → TCIB → recipient payout)
  •  Work with settlement bank (Standard Bank) on clearing obligations
     and net settlement procedures


PHASE 3 — FULL PRODUCTION                        Target: Q4 2026 – Q1 2027
─────────────────────────────────────────────────────────────────────────
  •  Open to all MyMoolah wallet holders
  •  Expand to all available TCIB corridors
  •  Marketing campaign targeting migrant worker communities in
     South Africa
  •  Integrate with MoolahMove UI (existing cross-border transfer
     interface in the wallet)



════════════════════════════════════════════════════════════════════════════════
4.  INTEGRATION APPROACH
════════════════════════════════════════════════════════════════════════════════

CONNECTIVITY
────────────
We would connect to the TCIB RCSO (PayInc) via the prescribed
integration model. As a non-bank TPPP, we understand we would require a
settlement bank partner — our sponsor bank, Standard Bank of South Africa,
is our proposed settlement bank for TCIB obligations.


MESSAGING
─────────
ISO 20022 credit transfer messages. Our platform already generates and
processes ISO 20022 XML payloads (Pain.013, Pain.001) for our Standard Bank
PayShap integration, so extending to TCIB message types is a natural fit.


TECHNICAL INTEGRATION
─────────────────────
  •  Build a dedicated TCIB integration module within our existing
     Node.js backend
  •  Implement message construction, submission, and callback /
     notification handling
  •  Connect to TCIB sandbox / UAT environment for testing
  •  Implement reconciliation against daily net settlement reports
     from the RCSO
  •  Add TCIB transactions to our existing double-entry ledger and
     automated reconciliation engine


COMPLIANCE
──────────
  •  KYC / FICA-verified senders (existing pipeline)
  •  FATF-aligned transaction data in all messages
  •  Balance-of-payments reporting to SARB
  •  AML/CFT monitoring and suspicious transaction reporting
  •  Full audit trail with 5-year retention


WHAT WE NEED FROM TCIB / BANKSERVAFRICA TO PROCEED
───────────────────────────────────────────────────
  1.  Scheme application form and onboarding documentation
  2.  Technical specification / message usage guide (ISO 20022)
  3.  UAT / sandbox environment credentials and connectivity details
  4.  Settlement procedures manual
  5.  Fee schedule (scheme fees, per-transaction costs)
  6.  Confirmation of Standard Bank as acceptable settlement bank for
      our participation



════════════════════════════════════════════════════════════════════════════════

We look forward to the meeting and to understanding how we can align with
the TCIB service offering for our cross-border remittance use case.

Kind regards,


Andre Botes
Founder & CEO
MyMoolah Treasury Platform
www.mymoolah.africa

────────────────────────────────────────────────────────────────────────────────
CONFIDENTIAL — Intended for TCIB / PayInc / PayInc pre-reading only.
────────────────────────────────────────────────────────────────────────────────
