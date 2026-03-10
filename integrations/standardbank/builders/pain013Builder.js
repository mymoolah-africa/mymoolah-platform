'use strict';

/**
 * Pain.013 Builder - SBSA RTP PayShap (Request to Pay Initiation)
 * ISO 20022 Pain.013 - JSON format aligned with SBSA API Postman samples
 *
 * SBSA RTP debtor identification (per SBSA Postman and UAT testing 2026-02-24):
 *   - DbtrAcct.Id.Item.Id MUST be "Proxy" (mandatory discriminator per SBSA schema)
 *   - Debtor is identified via Prxy.Tp.Item = "MOBILE_NUMBER" + Prxy.Id = mobile number
 *   - SBSA RTP only supports MOBILE_NUMBER proxy for debtors — PBAC (direct account) returns EPRBA
 *   - RPP (outbound) uses PBAC for creditor — RTP (request) uses MOBILE_NUMBER for debtor
 *
 * Creditor (MMTP) uses direct account number in CdtrAcct.Id.Item.Id.
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
 * @param {string} params.payerMobileNumber - Debtor mobile number (required — SBSA RTP supports MOBILE_NUMBER proxy only)
 * @param {string} [params.payerBankCode] - Debtor agent ID: proxy domain in production (e.g. 'discoverybank'), 'bankc' in UAT
 * @param {number} [params.netAmount] - Net amount after SBSA fee (for DuePyblAmt)
 * @param {string} [params.creditorAccountNumber] - MMTP receiving account
 * @param {string} [params.creditorName] - MMTP name
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
    payerBankCode,
    netAmount,
    creditorAccountNumber = process.env.SBSA_CREDITOR_ACCOUNT || process.env.SBSA_DEBTOR_ACCOUNT || '0000000000',
    creditorName = process.env.SBSA_CREDITOR_NAME || process.env.SBSA_DEBTOR_NAME || 'MyMoolah Treasury',
    creditorOrgId = process.env.SBSA_ORG_ID || '',
    creditorBankBranchCode = process.env.SBSA_CREDITOR_BANK_BRANCH || '051001',
    remittanceInfo,
    expiryMinutes = 60,
  } = params;

  if (!payerMobileNumber) {
    throw new Error('payerMobileNumber is required for RTP (SBSA RTP only supports MOBILE_NUMBER proxy for debtors)');
  }

  // SBSA field regex: alphanumeric only, no hyphens/special chars
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

  const normalizedMobile = normaliseMobile(payerMobileNumber);

  // SBSA Pain.013 DbtrAcct: Id.Item.Id = "Proxy" is mandatory. Prxy.Tp.Item = "MOBILE_NUMBER".
  const DbtrAcct = {
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

  const CdtrId = creditorOrgId
    ? {
        OrgId: {
          Othr: [{ Id: creditorOrgId, Issr: 'CIPC' }],
        },
      }
    : undefined;

  const CdtTrfTx = {
    PmtId: {
      InstrId: instrId,
      EndToEndId: endToEndId,
      UETR: uetr,
    },
    PmtTpInf: {},
    PmtCond: {
      AmtModAllwd: true,
      EarlyPmtAllwd: false,
      GrntedPmtReqd: false,
    },
    Amt: {
      Item: {
        Value: numAmount.toFixed(2),
      },
    },
    ChrgBr: 'SLEV',
    CdtrAgt: {
      FinInstnId: {
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
        PmtTpInf: {},
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
