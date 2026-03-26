# Cellfind USSD Manager API Reference

**Document version:** 1.0.3  
**Purpose:** Technical reference for the Cellfind USSD Manager integration with MyMoolah (callback contract, parameters, XML responses, constraints, and local testing).

---

## Endpoint configuration

MyMoolah exposes an HTTP **GET** callback for Cellfind USSD Manager:

| Item | Value |
|------|--------|
| Path | `/api/v1/ussd` |
| Method | `GET` |
| Production URL | `https://api-mm.mymoolah.africa/api/v1/ussd` (confirmed by Cellfind 2026-03-26) |
| Short code | **`*120*5616#`** (allocated by Cellfind 2026-03-26) |
| Cellfind IPs | `102.69.237.30`, `102.69.236.30`, `102.69.236.148` (permanent — whitelisted in `CELLFIND_ALLOWED_IPS`) |

All inbound traffic from Cellfind uses query parameters on this GET endpoint.

---

## Request parameters

Cellfind sends parameters as **HTTP GET query strings** (no request body).

| Parameter | Description |
|-----------|-------------|
| `msisdn` | Subscriber MSISDN in **international format** without a `+` prefix (e.g. `27829991234`). |
| `sessionid` | Unique session identifier assigned by Cellfind; must be echoed in the XML response. |
| `phase` | Always **`2`** for production USSD. |
| `type` | Interaction type: **`1`** = REQUEST (new session / initial dial), **`2`** = RESPONSE (user reply), **`3`** = RELEASE (user cancelled), **`4`** = TIMEOUT. |
| `request` | For `type=1`: the dial string (e.g. `*120*5616#`). For `type=2`: the user’s input text. Empty or absent for `type=3` and `type=4`. |
| `networkid` | Mobile network operator identifier: **`1`** = Vodacom, **`2`** = MTN, **`3`** = Cell C, **`4`** = Telkom, **`5`** = Rain. |

---

## Response format

Responses must be **XML** with **`Content-Type: text/xml`** (or equivalent XML content type as required by Cellfind).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<msg>
  <sessionid>{sessionid}</sessionid>
  <response type="{2|3}">{menu text}</response>
</msg>
```

| `response` `type` | Meaning |
|-------------------|--------|
| **`2`** | **Continue** — show menu or prompt text; session stays open and Cellfind waits for further user input. |
| **`3`** | **Release** — final message; session ends. |

The `{sessionid}` value in the XML should match the `sessionid` from the incoming request.

---

## Network constraints

- **Response timeout:** Approximately **20 seconds** per interaction; exact limits vary by MNO.
- **Character limits:**
  - Up to **182 characters** when using **7-bit GSM** encoding.
  - Roughly **80 characters** when using **Unicode** (UCS-2) content.
- **Menu structure:** Separate menu lines or options with a **newline** (`\n`).
- **Networks in scope:** Vodacom, MTN, Cell C, Telkom, Rain (aligned with `networkid` values above).

---

## Session lifecycle

1. User dials `*120*5616#` on the handset.
2. MNO routes the session to Cellfind.
3. Cellfind calls MyMoolah with **`type=1`** (REQUEST), including dial string in `request`.
4. MyMoolah returns XML with **`response type="2"`** (continue) and menu text.
5. Cellfind delivers the menu to the user via the MNO.
6. User enters a selection; MNO sends input to Cellfind.
7. Cellfind calls MyMoolah with **`type=2`** (RESPONSE), `request` = user input.
8. Steps 4–7 repeat until MyMoolah returns **`type="3"`**, or the user cancels (**incoming `type=3`**), or a **timeout** occurs (**incoming `type=4`**).

---

## Error handling

- **Always** return **well-formed XML** in the response body, including on application or validation errors.
- Prefer ending the USSD session on unrecoverable errors by responding with **`response type="3"`** and a safe, non-technical user message (no stack traces, internal codes, or sensitive data in the XML body).
- Avoid leaving the session in an ambiguous state: if the handler cannot continue, use **`type="3"`**.

---

## Testing locally

Replace host and port with your local server (example: `8080`). URL-encode `#` as `%23` in the dial string.

**New session (initial REQUEST):**

```bash
curl "http://localhost:8080/api/v1/ussd?msisdn=27821234567&sessionid=TEST001&type=1&phase=2&request=*120*5616%23&networkid=1"
```

**User input (e.g. option 1):**

```bash
curl "http://localhost:8080/api/v1/ussd?msisdn=27821234567&sessionid=TEST001&type=2&phase=2&request=1&networkid=1"
```

Use a stable `sessionid` across related `type=1` / `type=2` calls to mirror a single USSD session.

---

## IP whitelisting

- Production and non-dev deployments should restrict the USSD route to **Cellfind source IP addresses** configured in the environment variable **`CELLFIND_ALLOWED_IPS`** (comma-separated list).
- If **`CELLFIND_ALLOWED_IPS`** is **empty** and **`NODE_ENV`** is **`production`**, the middleware blocks requests and returns XML error-style responses (service unavailable).
- In **development** (non-production), when the allowlist is empty, **all client IPs are allowed** so local and tunnel testing work without maintaining Cellfind IPs on every machine.

---

## Premium USSD

MyMoolah uses **standard USSD** (user pays from airtime / standard USSD charges as per MNO rules). **Premium USSD** (operator-billed or reverse-billed short-code models) is available as a Cellfind product capability but **is not implemented** in this integration. Any future premium billing would require separate product, commercial, and technical design.

---

## Related implementation (MyMoolah)

| Area | Location |
|------|----------|
| USSD route | `routes/ussd.js` |
| Controller | `controllers/ussdController.js` |
| IP whitelist | `middleware/ussdIpWhitelist.js` (`CELLFIND_ALLOWED_IPS`) |
| Session / menu / auth | `services/ussdSessionService.js`, `services/ussdMenuService.js`, `services/ussdAuthService.js` |

---

**End of reference (v1.0.3).**
