# MyMoolah USSD Channel — Integration Guide

**Audience:** Engineering, security, compliance, and Cellfind / MNO integration partners  
**Classification:** Internal / partner technical documentation  
**Last updated:** 2026-03-25

---

## 1. Overview

The **MyMoolah USSD channel** exposes wallet and value-added services (VAS) over GSM USSD, integrated via **Cellfind** as the USSD gateway. Cellfind terminates the subscriber session on the mobile network and forwards each USSD step to the MyMoolah API as an HTTP request. MyMoolah returns **XML** instructions that tell Cellfind whether to **continue** the session (show another prompt) or **end** it.

### Capabilities (target scope)

| Capability | Description |
|------------|-------------|
| **Wallet registration** | Tier 0 onboarding from USSD using SA ID or passport (no proof of address). |
| **Balance** | View wallet balance after successful PIN authentication. |
| **Airtime** | Purchase airtime for the MSISDN linked to the session. |
| **Data** | Purchase mobile data bundles (denominations configured in menu). |
| **Cash out** | eeziCash voucher flow (Flash), subject to configuration and limits. |
| **Mini statement** | Last five completed transactions (abbreviated). |
| **PIN management** | Set USSD PIN (new users / migration), change PIN (authenticated), progressive lockout on failures. |

Additional items (referral code display, help) are exposed under the **More** submenu.

### Regulatory and product context

USSD Tier 0 is designed for **limited-KYC** access with **transaction caps** appropriate to lower assurance. Full KYC and higher limits are available through the mobile app and standard onboarding flows. All financial movements remain subject to existing ledger, AML/CFT monitoring, and product policies.

---

## 2. Architecture

### High-level flow

1. Subscriber dials the configured **short code** on the mobile network.  
2. **Cellfind** opens a USSD session and assigns a **session identifier**.  
3. For each network event (new session, user input, release, timeout), Cellfind issues an **HTTP** call to MyMoolah.  
4. MyMoolah’s **Express** application handles the request on a dedicated route, validates source IP, applies rate limits, and delegates to the **USSD controller** and **menu state machine**.  
5. Session continuity data is stored in **Redis** with a **time-to-live (TTL)** aligned to typical USSD session length.  
6. The response is **XML** consumed by Cellfind to render the next screen or close the session.

### Placement in the platform

The USSD gateway is **not** a separate microservice. It runs **inside the existing MyMoolah Express backend**, reusing:

- **PostgreSQL** for users, wallets, transactions, and PIN material (hashed).  
- **Redis** (`REDIS_URL`) for ephemeral USSD session state.  
- **Existing services** (e.g. product purchase, Flash / eeziCash) for financial and VAS operations, with **idempotency keys** on purchases where applicable.

### Session model

| Aspect | Behaviour |
|--------|-----------|
| **Storage** | Redis key prefix `ussd:session:{sessionid}` |
| **TTL** | Configurable; default **180 seconds** (`USSD_SESSION_TTL`). Refreshed on update using remaining TTL (or full TTL if key had no TTL). |
| **Binding** | Each session stores the **MSISDN** from the gateway. Subsequent requests **must** present the same MSISDN or the session is destroyed and a security response is returned. |
| **Lifecycle** | Created on Cellfind **new session** (`type=1`). Destroyed on **end** menu paths, **release** / **timeout**, MSISDN mismatch, or explicit cleanup in error paths. |

### Dependencies

- **Database migration** must be applied before enabling USSD in any environment (see [File structure](#3-file-structure)).  
- **Redis** must be available; session creation fails if Redis is unreachable.  
- **`USSD_ENABLED=true`** must be set for the route to be mounted (see [Environment variables](#8-environment-variables)).

---

## 3. File structure

The following artefacts implement the USSD channel:

| Path | Role |
|------|------|
| `migrations/20260326_01_add_ussd_tier0_fields.js` | Adds `ussd_pin`, `ussd_pin_attempts`, `ussd_locked_until`, `registration_channel`, `preferred_language`; extends `kycStatus` enum with `ussd_basic`; index on `registration_channel`. |
| `services/ussdSessionService.js` | Redis session create / read / update / destroy; TTL management. |
| `services/ussdAuthService.js` | MSISDN lookup, SA ID / passport validation, bcrypt PIN hash, verification, progressive lockout, Tier 0 user registration. |
| `services/ussdMenuService.js` | State machine for all menu flows; balance, VAS, cash-out, limits, mini statement, PIN change, referral, help. |
| `controllers/ussdController.js` | Parses Cellfind query parameters, orchestrates session + menu, builds **XML** responses, MSISDN masking in logs. |
| `routes/ussd.js` | Express router; **GET** and **POST** `/` with IP whitelist then controller. |
| `middleware/ussdIpWhitelist.js` | Restricts traffic to **Cellfind** source IPs from configuration; production requires `CELLFIND_ALLOWED_IPS`. |

**Mount point:** `server.js` registers the router at **`/api/v1/ussd`** when `USSD_ENABLED === 'true'`, and applies a dedicated USSD rate limiter ahead of the router.

---

## 4. Cellfind protocol

### Inbound HTTP parameters

Cellfind calls MyMoolah with **query parameters** (typical fields):

| Parameter | Description |
|-----------|-------------|
| `msisdn` | Subscriber number (international format without `+` is normalised in services to E.164 with `+`). **Required.** |
| `sessionid` | Gateway session identifier. **Required.** |
| `type` | Request type (see below). |
| `request` | User’s latest USSD input (empty or omitted on new session). |
| `networkid` | Operator / network identifier (stored on session as metadata; default `0` if missing). |

**HTTP methods:** The router accepts both **GET** and **POST** for compatibility with gateway configurations.

### Request types (`type`)

| Value | Meaning | MyMoolah behaviour |
|-------|---------|-------------------|
| **1** | New session | Create Redis session; `request` ignored for menu input. |
| **2** | Response (user input) | Load session; pass `request` to state machine. |
| **3** | Release (user cancelled) | Destroy session; respond with end. |
| **4** | Timeout | Destroy session; respond with end. |

### Response types (XML `response` element)

| `type` attribute | Meaning |
|-------------------|---------|
| **2** | **Continue** — show `response` body as next USSD screen; session remains active. |
| **3** | **End** — close USSD session; optional final message in body. |

### XML format

Successful handlers return **UTF-8 XML** of the form:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<msg>
  <sessionid>{sessionid}</sessionid>
  <response type="2|3">{escaped user-visible text}</response>
</msg>
```

- Message text is **HTML/XML entity-escaped** (`&`, `<`, `>`, `"`) in the controller.  
- USSD body length is constrained in the menu layer (typically **182 characters** per screen) to respect GSM USSD limits.

### Error and edge cases

- Missing `msisdn` or `sessionid`: **400** with XML end response.  
- Unknown or expired session on `type=2`: end response prompting user to dial again.  
- Unhandled exceptions: generic “service unavailable” end response; details logged server-side only.

---

## 5. KYC Tier 0 (USSD-only registration)

Tier 0 is a **deliberately reduced** assurance path for USSD-acquired customers.

| Element | Policy |
|---------|--------|
| **Identity capture** | **South African ID** (13 digits, Luhn-style validation) **or** **international passport** (alphanumeric pattern enforced in code). |
| **Proof of address** | **Not** collected on USSD. |
| **`kycStatus`** | Set to **`ussd_basic`** on registration. |
| **Daily outflow cap** | Default **R500** per day (configurable). Applies to aggregated **send / withdraw / payment** style outflows for Tier 0 users (see implementation in `ussdMenuService.js`). |
| **Monthly outflow cap** | Default **R3000** per calendar month (configurable). |
| **Channel marker** | `registration_channel` set to **`ussd`**. |
| **Upgrade path** | Copy in menus directs users to the **app** for full KYC and higher limits. |

Compliance teams should align caps and monitoring rules with the **AML/CFT programme** and product risk appetite. Tier 0 users remain in scope for **transaction monitoring** and **sanctions** processes at the platform level.

---

## 6. USSD PIN security

### PIN format and storage

- **5-digit numeric PIN** only (`^\d{5}$`).  
- Stored as **bcrypt** hash (`ussd_pin`), **12** salt rounds in current implementation.  
- **Never** logged in cleartext; controller logs use **masked MSISDN**.

### Verification and session handling

- After successful verification, the menu layer sets session metadata indicating the user may access the **main menu** (`pinVerified` in session payload).  
- **Cleartext PIN is not persisted in Redis** after verification — only derived state required for the state machine. This reduces exposure if Redis is compromised.

### Lockout policy

- **`USSD_PIN_MAX_ATTEMPTS`** (default **3**) failed attempts trigger a lockout window.  
- **Progressive lockout** (implemented in `ussdAuthService.js`): **30 minutes**, then **2 hours**, then **24 hours** (1440 minutes), based on cumulative failed attempt bands — not a single fixed duration for all lockouts.  
- Successful verification resets attempt counter and clears `ussd_locked_until`.  
- Lock expiry is evaluated on each verification attempt; expired locks clear counters in the database.

> **Note:** `USSD_PIN_LOCKOUT_MINUTES` is documented here as the **operational baseline for the first-tier** lockout (default **30**). The live service uses the progressive array in code; if a single env-driven first tier is required, engineering should wire `USSD_PIN_LOCKOUT_MINUTES` into `getLockoutMinutes` and regression-test lockout behaviour.

---

## 7. Menu tree

Text below matches the **implemented** prompts (option keys and labels may be tuned for product marketing).

### Entry / authentication

- **Unregistered:** Welcome → **1** Register / **2** Help / **0** Exit.  
- **Registration:** ID or passport → create PIN → confirm PIN → success end (dial again to transact).  
- **Registered, no USSD PIN yet:** Prompt to set PIN (existing app user edge case).  
- **Registered with PIN:** PIN entry → **Main menu** on success.

### Main menu

```
MyMoolah
1 Balance
2 Buy airtime
3 Buy data
4 Cash out
5 More
0 Exit
```

### More menu

```
More
1 Mini statement
2 Change PIN
3 My referral code
4 Help
0 Back
```

### Sub-flows (summary)

- **Airtime / Data:** Denomination menus → confirm **Yes/No** → VAS purchase via `ProductPurchaseService` with idempotency key.  
- **Cash out:** Amount menu → confirm → eeziCash / Flash path (requires `FLASH_ACCOUNT_NUMBER` and related config).  
- **Mini statement:** Last **5** completed transactions + balance.  
- **Change PIN:** Current PIN → new PIN → confirm.  
- **Help:** Support numbers and web reference.

---

## 8. Environment variables

| Variable | Purpose | Default / notes |
|----------|---------|-----------------|
| `USSD_ENABLED` | Master switch; must be **`true`** to mount `/api/v1/ussd`. | **`false`** (omit or any value other than `true` disables). |
| `CELLFIND_ALLOWED_IPS` | Comma-separated list of **Cellfind** egress IPs. In **production**, if empty, the whitelist middleware **blocks** all USSD traffic. Non-production may allow all when unset (see middleware). | No default — **required in production**. |
| `USSD_SHORTCODE` | Operational short code for documentation, monitoring dashboards, and partner alignment. | Not consumed by application code today; set for **runbooks and Cellfind provisioning**. |
| `USSD_SESSION_TTL` | Redis session TTL in **seconds**. | **180** |
| `USSD_PIN_MAX_ATTEMPTS` | Failed PIN attempts before lockout tier applies. | **3** |
| `USSD_PIN_LOCKOUT_MINUTES` | Documented **first-tier** expectation (30 min). | **30** (align code if single-tier override is required). |
| `USSD_TIER0_DAILY_LIMIT` | Tier 0 daily outflow cap (**ZAR**). | **500** |
| `USSD_TIER0_MONTHLY_LIMIT` | Tier 0 monthly outflow cap (**ZAR**). | **3000** |
| `REDIS_URL` | Required for sessions. | Platform standard. |

Additional variables apply to **downstream** features (e.g. Flash account number for cash-out). See deployment secrets and `docs/` runbooks for the full matrix.

---

## 9. Testing

### Prerequisites

1. Apply migration: `./scripts/run-migrations-master.sh <uat|staging|production>` per `docs/DATABASE_CONNECTION_GUIDE.md`.  
2. Ensure **Redis** is reachable (`REDIS_URL`).  
3. Set **`USSD_ENABLED=true`**.  
4. For local / dev without Cellfind IPs: leave `CELLFIND_ALLOWED_IPS` **unset** and use **non-production** `NODE_ENV`, or add your test IP to the allowlist.  
5. **Rate limiting:** USSD limiter is **skipped** when `NODE_ENV` is not `production` or when `STAGING=true` — confirm `server.js` behaviour for your environment.

### Manual HTTP test

Call the endpoint with query parameters (GET or POST):

```bash
# New session (type=1)
curl -s "http://localhost:PORT/api/v1/ussd?msisdn=27821234567&sessionid=test-sess-001&type=1&networkid=1"

# User input (type=2) — example: choose Register
curl -s "http://localhost:PORT/api/v1/ussd?msisdn=27821234567&sessionid=test-sess-001&type=2&request=1&networkid=1"
```

### Sample response (continue)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<msg>
  <sessionid>test-sess-001</sessionid>
  <response type="2">Welcome to MyMoolah!
1 Register new wallet
2 Help
0 Exit</response>
</msg>
```

### Sample response (end)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<msg>
  <sessionid>test-sess-001</sessionid>
  <response type="3">Thank you. Goodbye!</response>
</msg>
```

### Production-like testing

- Use **real test MSISDNs** and **real wallet data** in line with MyMoolah’s no-dummy-data policy for environment-appropriate testing.  
- Validate **IP whitelist** from the same egress paths Cellfind will use.  
- Load-test **Redis** TTL and **rate limit** headers separately before go-live.

---

## 10. Security

| Control | Implementation |
|---------|----------------|
| **IP whitelist** | `ussdIpWhitelist` — `CELLFIND_ALLOWED_IPS`; production hard-fail if unset. |
| **MSISDN binding** | Session stores MSISDN; mismatch **destroys** session and returns generic security message. |
| **Rate limiting** | **60 requests / hour** per `msisdn` (fallback to client IP if missing), `express-rate-limit`, XML **429** body. **Active in production** only (see `server.js`). |
| **PII in logs** | MSISDN **masked** in controller logs (e.g. first 4 + last 4 visible). |
| **Idempotency** | VAS purchases use deterministic keys: `ussd-{productType}-{sessionId}-{amountRand}` to reduce double-spend on gateway retries. Cash-out uses a separate reference pattern including session and timestamp. |
| **Transport** | Production must use **TLS 1.2+** (prefer **1.3**) between Cellfind and MyMoolah; terminate at load balancer / Cloud Run as per platform standard. |
| **Secrets** | No shared secrets in USSD query string for MVP; future enhancements (HMAC, signed payloads) should be captured in a revision of this guide. |

Security and GRC stakeholders should review **POPIA** implications of displaying balances and mini statements on USSD and ensure **customer communication** matches the privacy policy.

---

## 11. Phased rollout

### Phase 1 — MVP (current target)

- Registration (Tier 0), USSD PIN set / verify, **balance**, **airtime**, **data**, **mini statement**, **cash out** (where Flash is configured), **change PIN**, **referral code**, **help**.

### Phase 2

- **Buy for others** (alternate MSISDN).  
- **Electricity** and additional VAS catalog entries.  
- **Send money** (P2P) with Tier-aware limits.  
- **Multi-language** menus using `preferred_language` and translated prompts.

### Phase 3

- **Request money** (pull / voucher requests).  
- **Bill payments** (EasyPay and aligned billers).  
- **Push notifications** or **outbound USSD** where MNO and product rules allow.

Each phase should include **security review**, **load testing**, **SOP updates**, and **changelog** entries before production promotion.

---

## References

- Internal: `docs/DATABASE_CONNECTION_GUIDE.md`, `docs/security.md`, AML/CFT policy suite under `docs/policies/`.  
- Cellfind: partner integration manual (URL and version as supplied by Cellfind).  
- Code: files listed in [File structure](#3-file-structure).

---

*This document describes the MyMoolah USSD integration as implemented in the repository. For the exact behaviour of limits, menus, and third-party APIs, always verify the current source and deployed configuration.*
