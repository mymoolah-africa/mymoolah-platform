# SBSA PayShap Postman Samples – Integration Mapping

**Date**: 2026-02-23  
**Source**: Postman collections from Standard Bank (rerppsandboxintegration)  
**Purpose**: Map sample JSON structures to MyMoolah integration and identify gaps

**Sample files**: `integrations/standardbank/samples/`
- `SBSA_NonProd_Payments.json` (RPP)
- `SBSA_NonProd_Payshap_Requests.json` (RTP)
- `SBSA_NonProd_Proxy_Resolution.json` (Proxy Resolution)

---

## 1. MyMoolah - Non-prod Payments.json (RPP – Initiate Payment)

### API Details
| Item | Value |
|------|-------|
| **Endpoint** | `POST {{base_url}}` |
| **Base URL** | `https://api-gatewaynp.standardbank.co.za/npextorg/extnonprod/rapid-payments/api/payments/initiation` |
| **Auth** | Bearer (Ping token) |
| **Scope** | `rpp.payments.post rpp.payments.get` |
| **Headers** | X-IBM-Client-Id, X-IBM-Client-Secret, Session-Ip, x-fapi-interaction-id, X-Callback-Url, X-Realtime-Callback-Url |

### Sample Body Structure (camelCase, top-level)
```json
{
  "grpHdr": {
    "msgId": "{{uuidOne}}",
    "creDtTm": "2025-01-07T12:22:53.1234+00:00",
    "nbOfTxs": 1,
    "ctrlSum": 1.00,
    "initgPty": { "nm": "Demo", "id": { "orgId": { "othr": [{ "id": "2019/0519463/07", "issr": "CIPC" }] } } }
  },
  "pmtInf": [{
    "pmntInfId": "Demo batch",
    "reqdExctnDt": { "dtTm": "2024-04-11T14:33:14.8326209+00:00" },
    "dbtr": { "id": { "othr": { "id": "000602739172" } }, "nm": "Demo" },
    "dbtrAcct": { "id": { "othr": { "id": "000602739172" } }, "nm": "Demo" },
    "cdtTrfTxInf": [{
      "pmtId": { "instrId": "string", "endToEndId": "{{uuidOne}}", "uetr": "{{$guid}}" },
      "pmtTpInf": { "lclInstrm": { "prtry": "PBAC" } },
      "amt": { "instdAmt": { "value": 1.00 } },
      "cdtrAgt": { "finInstnId": { "pstlAdr": { "ctry": "ZA" } }, "brnchId": { "id": "051001" } },
      "brnchId": { "id": "051001" },
      "cdtr": { "nm": "test" },
      "cdtrAcct": {
        "id": { "othr": { "id": "411111111002" } },
        "nm": "test",
        "prxy": { "tp": { "prtry": "MBNO" }, "id": { "id": "+27-832502098" } }
      },
      "rmtInf": { "strd": [{ "cdtrRefInf": { "ref": "Creditor reference" } }] },
      "splmtryData": [...]
    }]
  }]
}
```

### Mapping to MyMoolah

| Postman Field | Our Integration | Location |
|---------------|-----------------|----------|
| **dbtr / dbtrAcct** | Debtor = MMTP sending account | `pain001Builder` → `SBSA_DEBTOR_ACCOUNT` (env) |
| **cdtrAcct** | Creditor = recipient | `pain001Builder` → `creditorAccountNumber` or `creditorProxy` |
| **cdtrAcct.prxy** | MBNO proxy (mobile) | `pain001Builder` → `creditorProxy` + `creditorProxyScheme: 'MBNO'` |
| **brnchId / cdtrAgt** | 051001 (Standard Bank) | Postman uses `brnchId`; we use `bicfi: 'SBZAZAJJ'` in some places – verify SBSA accepts both |
| **pmtTpInf.lclInstrm.prtry** | PBAC (account) or PBPX (proxy) | `pain001Builder` → `paymentType` |
| **X-Callback-Url** | `https://staging.mymoolah.africa/api/v1/standardbank/callback` | `client.js` → `buildHeaders` |
| **X-Realtime-Callback-Url** | `https://staging.mymoolah.africa/api/v1/standardbank/realtime-callback` | `client.js` → `buildHeaders` |

### Differences / Gaps
1. **Payload wrapper**: Postman sends `{ grpHdr, pmtInf }` at top level. Our `pain001Builder` wraps in `cstmrCdtTrfInitn`. The SBSA client posts `pain001` directly – confirm whether SBSA expects `cstmrCdtTrfInitn` or the inner structure.
2. **initgPty.id**: Postman includes CIPC org ID; we only send `initgPty.nm`. May be optional for UAT.
3. **reqdExctnDt**: Postman uses `dtTm` (datetime); we use date string. Align if SBSA rejects.
4. **splmtryData**: Postman has BatchReference, DbtStmNarr; we don’t. Optional for UAT.
5. **Debtor account**: Postman uses `000602739172` (one of the 7 test accounts) as debtor – this is the MMTP TPP account for RPP. Set `SBSA_DEBTOR_ACCOUNT=000602739172` for UAT.

---

## 2. MyMoolah - Non-Prod Payshap Requests.json (RTP – Request to Pay)

### API Details
| Item | Value |
|------|-------|
| **Endpoint** | `POST {{base_url}}` |
| **Base URL** | `https://api-gatewaynp.standardbank.co.za/npextorg/extnonprod/request-to-pay/api/requestToPay/initiation` |
| **Auth** | Bearer (Ping token) |
| **Scope** | `rpp.requestToPay.post rpp.requestToPay.get` |
| **Headers** | X-IBM-Client-Id, X-IBM-Client-Secret, Session-Ip, x-fapi-interaction-id, X-Callback-Url, X-Realtime-Callback-Url |

### Sample Body Structure (PascalCase)
```json
{
  "GrpHdr": { "MsgId": "...", "CreDtTm": "...", "NbOfTxs": "3", "InitgPty": {...} },
  "SplmtryData": { "PlcAndNm": "Test" },
  "PmtInf": [{
    "PmtInfId": "...",
    "PmtMtd": "TRF",
    "ReqdExctnDt": { "DtTm": "..." },
    "XpryDt": { "DtTm": "..." },
    "Dbtr": { "Nm": "Sample" },
    "DbtrAcct": {
      "Id": { "Item": { "Id": "Proxy" } },
      "Nm": "Sample Legal Name",
      "Prxy": { "Tp": { "Item": "MOBILE_NUMBER" }, "Id": "+27-585125485" }
    },
    "DbtrAgt": { "FinInstnId": { "Othr": { "Id": "bankc" } } },
    "CdtTrfTx": [{
      "PmtId": { "InstrId": "1", "EndToEndId": "...", "UETR": "..." },
      "PmtCond": { "AmtModAllwd": true, "EarlyPmtAllwd": false, "GrntedPmtReqd": false },
      "Amt": { "Item": { "Value": "100.00" } },
      "ChrgBr": "SLEV",
      "CdtrAgt": { "FinInstnId": { "Othr": { "Id": "051001" } }, "BrnchId": { "Id": "Branch Id" } },
      "Cdtr": { "Nm": "Standard Bank", "Id": {...} },
      "CdtrAcct": { "Id": { "Item": { "Id": "000602739172" } }, "Nm": "Standard Bank" },
      "RmtInf": { "Strd": [{ "RfrdDocAmt": { "DuePyblAmt": { "Value": "99.00" } }, "CdtrRefInf": { "Ref": "Test 1" } }] }
    }]
  }]
}
```

### Mapping to MyMoolah

| Postman Field | Our Integration | Location |
|---------------|-----------------|----------|
| **Dbtr** | Payer (debtor) | `pain013Builder` → `payerName` |
| **DbtrAcct** | Payer account or proxy | `pain013Builder` → `payerAccountNumber` or `payerProxy` |
| **DbtrAcct.Prxy** | MOBILE_NUMBER proxy | `pain013Builder` → `payerProxy` (MSISDN) |
| **CdtrAcct** | MMTP receiving account | `pain013Builder` → `SBSA_CREDITOR_ACCOUNT` = `000602739172` |
| **CdtrAgt.Othr.Id** | 051001 (Standard Bank) | We use `bicfi: 'SBZAZAJJ'` – Postman uses `Othr.Id`. May need to support both. |
| **PmtCond** | AmtModAllwd, EarlyPmtAllwd, GrntedPmtReqd | We have `amtModAllwd: false` – Postman has `true`. Check business rules. |
| **RmtInf.Strd** | RfrdDocAmt.DuePyblAmt | We use `rmtInf.ustrd`. SBSA may prefer Strd for RTP. |
| **X-Callback-Url** | RTP callback | `https://staging.mymoolah.africa/api/v1/standardbank/rtp-callback` |
| **X-Realtime-Callback-Url** | RTP realtime | `https://staging.mymoolah.africa/api/v1/standardbank/rtp-realtime-callback` |

### Differences / Gaps
1. **Case**: Postman uses PascalCase (GrpHdr, PmtInf, CdtTrfTx); we use camelCase. SBSA may accept both – verify.
2. **CdtrAcct = 000602739172**: This is the MMTP account that receives RTP payments. Set `SBSA_CREDITOR_ACCOUNT=000602739172` for UAT.
3. **DbtrAcct with Proxy**: When payer is identified by mobile, use `Id: "Proxy"` and `Prxy.Tp.Item: "MOBILE_NUMBER"`. Our builder uses `othr.id` + `schmeNm` – structure may differ.
4. **RTP callback headers**: Client uses same callback headers for RPP and RTP. For RTP initiation, SBSA may expect RTP-specific callback URLs in headers – confirm and set if needed.
5. **PmtInf array**: Postman sends multiple PmtInf (batch); we send single. Our design is one RTP per request.

---

## 3. MyMoolah - Non-prod Proxy Resolution.json (PBPX – Proxy Resolution)

### API Details
| Item | Value |
|------|-------|
| **Base URL** | `https://api-gatewaynp.standardbank.co.za/npextorg/extnonprod/proxy-resolution/api/proxy-resolutions` |
| **Scope** | `rpp.proxy.post rpp.proxy.get` |
| **Auth** | Bearer (Ping token) |

### POST – Proxy Resolution
```json
{
  "ProxyHandle": "+27-790819115",
  "Domain": "standardbnk",
  "ProxyType": "CellphoneNumber",
  "CallbackUrl": "https://staging.mymoolah.africa/api/v1/standardbank/callback",
  "Uetr": "{{$guid}}"
}
```

### GET – Get Proxy Resolution
`GET {{base_url}}/d210940c-45db-426f-bc0b-8f3bfd3d36ec` (resolution ID from POST response)

### Mapping to MyMoolah

| Item | Status |
|------|--------|
| **Proxy Resolution API** | Not implemented |
| **Purpose** | Resolve MSISDN (ProxyHandle) to bank account before PBPX payment |
| **Use case** | Optional pre-check for Send Money (RPP) when paying by mobile number |
| **Session log** | Phase 8 deferred: "Proxy Resolution for PBPX (deferred until SBSA provides spec)" |

### Integration Fit
- **When to use**: Before RPP with `creditorProxy` (PBPX), to validate the mobile number resolves to a valid account.
- **Implementation**: Add `integrations/standardbank/proxyResolution.js` with `resolveProxy(proxyHandle, domain, proxyType)` and `getProxyResolution(resolutionId)`.
- **Ping scope**: Add `rpp.proxy.post rpp.proxy.get` to token request when calling proxy API.
- **Priority**: Lower – RPP works without it; improves UX and reduces failed payments.

---

## 4. Summary: Where Each Fits

| Postman Collection | MyMoolah Component | Status | Action |
|--------------------|-------------------|--------|--------|
| **Non-prod Payments** | RPP (Send Money) | Implemented | Align payload (wrapper, initgPty, reqdExctnDt); set SBSA_DEBTOR_ACCOUNT=000602739172 |
| **Non-Prod Payshap Requests** | RTP (Request Money) | Implemented | Align payload (case, CdtrAgt, PmtCond, RmtInf); set SBSA_CREDITOR_ACCOUNT=000602739172; ensure RTP callback URLs in headers |
| **Non-prod Proxy Resolution** | PBPX pre-validation | Not implemented | Add proxy resolution client; optional for Phase 1 |

---

## 5. Env Vars from Postman (UAT)

| Variable | Postman Value | Our Env Var |
|----------|---------------|-------------|
| client_id | a5370231-aa5f-4c33-b313-6c8e03271c28 | SBSA_PING_CLIENT_ID |
| client_secret | S3cr3t-311de-fd25d | SBSA_PING_CLIENT_SECRET |
| ibm_client_id | a98f3c8dd655b4f3b27c1c02ec495b08 | SBSA_IBM_CLIENT_ID |
| ibm_client_secret | 1fbd5009d748e31e08620f9ef29df524 | SBSA_IBM_CLIENT_SECRET |
| RPP base | .../rapid-payments/api/payments/initiation | SBSA_RPP_BASE_URL + /api/payments/initiation |
| RTP base | .../request-to-pay/api/requestToPay/initiation | SBSA_RTP_BASE_URL + /api/requestToPay/initiation |

**Test accounts**:
- **Debtor (RPP sender)**: `000602739172` → `SBSA_DEBTOR_ACCOUNT`
- **Creditor (RTP receiver)**: `000602739172` → `SBSA_CREDITOR_ACCOUNT`
- All 7 accounts (000602739172–178) usable as payer accounts for RTP.
