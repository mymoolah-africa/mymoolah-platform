'use strict';

/**
 * Pain.013 Builder - SBSA RTP PayShap (Request to Pay Initiation)
 * ISO 20022 Pain.013 - JSON format aligned with SBSA API Postman samples
 *
 * SBSA RTP debtor identification supports TWO flows (confirmed by SBSA Louis 2026-03):
 *
 * 1. PROXY flow (preferred — debtor identified by mobile number):
 *    - DbtrAcct.Id.Item.Id = "Proxy"
 *    - DbtrAcct.Prxy.Tp.Item = "MOBILE_NUMBER", Prxy.Id = mobile
 *    - DbtrAgt.FinInstnId.Othr.Id = proxy domain (e.g. 'discoverybank')
 *    - PmtTpInf = {} (empty — per SBSA Postman sample)
 *
 * 2. PBAC flow (fallback — debtor identified by account number only):
 *    - DbtrAcct.Id.Item.Id = account number
 *    - No Prxy block
 *    - DbtrAgt.FinInstnId.Othr.Id = branch code (e.g. '470010')
 *    - PmtTpInf = {} (empty — PBAC flag is for RPP Pain.001, NOT RTP Pain.013)
 *    - CdtrAgt.FinInstnId.PstlAdr.Ctry = "ZA" (per SBSA PBAC sample)
 *    - Amt.Item.value = amount (camelCase per sample)
 *    - GrpHdr.CtrlSum = total amount
 *
 * Proxy mode is ALWAYS preferred when mobile number is available.
 * PBAC is only used when mobile number is absent.
 *
 * Creditor (MMTP) always uses direct account in CdtrAcct.Id.Item.Id.
 *
 * PBAC payload aligned with official SBSA sample (Gustaf 2026-03): CdtrAgt.PstlAdr.ctry "ZA",
 * Amt.Item.value (camelCase), GrpHdr.CtrlSum. Reference: integrations/standardbank/samples/SBSA_PBAC_RTP_SAMPLE.json
 *
 * @author MyMoolah Treasury Platform
 */

const crypto = require('crypto');

function uuidv4() {
  return crypto.randomUUID();
}

function isoNow() {
  return new Date().toISOString();
}

/**
 * Normalise a South African mobile number for SBSA Prxy.Id field.
 *
 * API documentation (BIS Nexus, ISO 20022):
 * - E.164 specifies digits only; canonical format is +CCNNN... (no hyphens).
 * - BIS Nexus MBNO proxy pattern: ^\+(\d ?){6,14}\d$; placeholder +6581234567.
 *
 * SBSA API spec (rapid-payments_1.3.2) defines mobile proxy pattern as:
 *   ^\+\d{1,3}\-\d{9}$  →  e.g. +27-825571055 (WITH hyphen)
 * SBSA Postman samples also use "+27-585125485" (with hyphen).
 * Default to SBSA's required hyphen format. Override via SBSA_PROXY_ID_FORMAT=e164
 * if pure E.164 is ever needed.
 */
function normaliseMobile(raw) {
  const digits = raw.replace(/\D/g, '');
  let nineDigits;
  if (digits.startsWith('27') && digits.length === 11) {
    nineDigits = digits.slice(2); // 27825571055 → 825571055
  } else if (digits.startsWith('0') && digits.length === 10) {
    nineDigits = digits.slice(1); // 0825571055 → 825571055
  } else if (digits.startsWith('27') && digits.length === 10) {
    nineDigits = digits.slice(2); // 27825571055 (typo 10) → 825571055
  } else if (digits.length === 9 && digits.startsWith('8')) {
    nineDigits = digits;
  } else {
    return raw;
  }
  const format = process.env.SBSA_PROXY_ID_FORMAT || 'sbsa';
  return format === 'e164' ? `+27${nineDigits}` : `+27-${nineDigits}`;
}

/**
 * Build Pain.013 for RTP (Request to Pay) initiation
 * Creditor = MMTP (requesting money). Debtor = Payer (identified by mobile number — SBSA RTP requirement).
 *
 * @param {Object} params
 * @param {string} params.merchantTransactionId - Our internal ID
 * @param {number} params.amount - Amount in ZAR
 * @param {string} [params.currency] - Default ZAR
 * @param {string} params.payerName - Debtor name
 * @param {string} [params.payerMobileNumber] - Debtor mobile (proxy flow)
 * @param {string} [params.payerAccountNumber] - Debtor account number (PBAC flow — for debtors without PayShap proxy)
 * @param {string} [params.payerBankCode] - Debtor agent: domain (e.g. 'discoverybank'), 'bankc' in UAT
 * @param {number} [params.netAmount] - Net amount after SBSA fee (for DuePyblAmt)
 * @param {string} [params.creditorAccountNumber] - MMTP receiving account
 * @param {string} [params.creditorName] - Creditor display name (shown to payer on bank screen). When omitted, uses SBSA_CREDITOR_NAME. For RTP, pass e.g. "RTP requested from {walletUser}" so payer sees who requested the payment.
 * @param {string} [params.creditorOrgId] - CIPC registration
 * @param {string} [params.creditorBankBranchCode] - SBSA branch code
 * @param {string} [params.remittanceInfo] - Payment reference
 * @param {number} [params.expiryMinutes] - RTP expiry in minutes (default 60)
 */
function buildPain013(params) {
  const {
    merchantTransactionId,
    amount,
    currency = 'ZAR',
    payerName,
    payerMobileNumber,
    payerAccountNumber,
    payerBankCode,
    netAmount,
    creditorAccountNumber = process.env.SBSA_CREDITOR_ACCOUNT || process.env.SBSA_DEBTOR_ACCOUNT || '0000000000',
    creditorName = process.env.SBSA_CREDITOR_NAME || process.env.SBSA_DEBTOR_NAME || 'MyMoolah Treasury',
    creditorOrgId = process.env.SBSA_ORG_ID || '',
    creditorBankBranchCode = process.env.SBSA_CREDITOR_BANK_BRANCH || '051001',
    remittanceInfo,
    expiryMinutes = 60,
  } = params;

  if (!payerMobileNumber && !payerAccountNumber) {
    throw new Error('Either payerMobileNumber (proxy) or payerAccountNumber (PBAC) is required');
  }

  // Proxy mode preferred when mobile number is available (SBSA default RTP flow).
  // PBAC only when mobile is absent and account number is the sole identifier.
  const isPbac = !payerMobileNumber && Boolean(payerAccountNumber);

  const cleanId = (str) => str.replace(/[^a-zA-Z0-9]/g, '');

  const uetr = uuidv4();
  const baseId = cleanId(merchantTransactionId);
  const msgId = `MMRTP${baseId}`.substring(0, 35);
  const pmtInfId = `RTP${baseId}`.substring(0, 30);
  const instrId = `RTPINSTR${Date.now()}`.substring(0, 35);
  const endToEndId = baseId.substring(0, 35);

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  const numNetAmount = netAmount
    ? (typeof netAmount === 'string' ? parseFloat(netAmount) : Number(netAmount))
    : Number((numAmount - 5.00).toFixed(2));
  const now = new Date();
  const expDt = new Date(now.getTime() + expiryMinutes * 60 * 1000);

  let DbtrAcct;
  if (isPbac) {
    DbtrAcct = {
      Id: {
        Item: {
          Id: payerAccountNumber,
        },
      },
      Nm: (payerName || 'Payer').substring(0, 140),
    };
  } else {
    const normalizedMobile = normaliseMobile(payerMobileNumber);
    DbtrAcct = {
      Id: {
        Item: {
          Id: 'Proxy',
        },
      },
      Nm: (payerName || 'Payer').substring(0, 140),
      Prxy: {
        Tp: {
          Item: 'MOBILE_NUMBER',
        },
        Id: normalizedMobile,
      },
    };
  }

  const CdtrId = creditorOrgId
    ? {
        OrgId: {
          Othr: [{ Id: creditorOrgId, Issr: 'CIPC' }],
        },
      }
    : undefined;

  // SBSA RTP Postman sample uses PmtTpInf: {} for all RTP modes.
  // The 'PBAC' local instrument code is for RPP (Pain.001), NOT RTP (Pain.013).
  // Debtor identification mode is conveyed via DbtrAcct structure, not PmtTpInf.
  const pbacPmtTpInf = {};

  const CdtTrfTx = {
    PmtId: {
      InstrId: instrId,
      EndToEndId: endToEndId,
      UETR: uetr,
    },
    PmtTpInf: pbacPmtTpInf,
    PmtCond: {
      AmtModAllwd: true,
      EarlyPmtAllwd: false,
      GrntedPmtReqd: false,
    },
    Amt: {
      Item: {
        value: numAmount.toFixed(2),
      },
    },
    ChrgBr: 'SLEV',
    CdtrAgt: {
      FinInstnId: {
        PstlAdr: { Ctry: 'ZA' },
        Othr: {
          Id: creditorBankBranchCode,
        },
      },
      BrnchId: {
        Id: creditorBankBranchCode,
      },
    },
    Cdtr: {
      Nm: creditorName.substring(0, 140),
      ...(CdtrId ? { Id: CdtrId } : {}),
    },
    CdtrAcct: {
      Id: {
        Item: {
          Id: creditorAccountNumber,
        },
      },
      Nm: creditorName.substring(0, 140),
    },
    RmtInf: {
      Strd: [
        {
          RfrdDocAmt: {
            DuePyblAmt: {
              Value: numNetAmount.toFixed(2),
            },
          },
          CdtrRefInf: {
            Ref: (remittanceInfo || merchantTransactionId).substring(0, 140),
          },
        },
      ],
    },
  };

  const pain013 = {
    GrpHdr: {
      MsgId: msgId,
      CreDtTm: isoNow(),
      NbOfTxs: '1',
      CtrlSum: numAmount.toFixed(2),
      InitgPty: {
        Nm: creditorName.substring(0, 140),
        ...(creditorOrgId
          ? { Id: { OrgId: { Othr: [{ Id: creditorOrgId }] } } }
          : {}),
      },
    },
    SplmtryData: {
      PlcAndNm: baseId.substring(0, 35),
    },
    PmtInf: [
      {
        PmtInfId: pmtInfId,
        PmtMtd: 'TRF',
        ReqdAdvcTp: '',
        PmtTpInf: pbacPmtTpInf,
        ReqdExctnDt: {
          DtTm: now.toISOString(),
        },
        XpryDt: {
          DtTm: expDt.toISOString(),
        },
        Dbtr: {
          Nm: (payerName || 'Payer').substring(0, 140),
        },
        DbtrAcct,
        DbtrAgt: {
          FinInstnId: {
            Othr: {
              Id: payerBankCode || 'bankc',
            },
          },
        },
        CdtTrfTx: [CdtTrfTx],
      },
    ],
  };

  return { pain013, msgId, uetr };
}

module.exports = { buildPain013 };
