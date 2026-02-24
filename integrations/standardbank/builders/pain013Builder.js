'use strict';

/**
 * Pain.013 Builder - SBSA RTP PayShap (Request to Pay Initiation)
 * ISO 20022 Pain.013 - JSON format aligned with SBSA API Postman samples
 *
 * SBSA RTP debtor identification:
 *   - DbtrAcct.Id.Item.Id MUST be "Proxy" (mandatory discriminator per SBSA schema)
 *   - Debtor is identified via Prxy.Tp.Item = "MOBILE_NUMBER" + Prxy.Id = mobile number
 *   - Direct bank account (PBAC) is NOT supported for RTP debtors by SBSA
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
 * SBSA sandbox test numbers (9 digits with +27 prefix): send as "+27-XXXXXXXXX"
 * Real SA mobiles (10 digits with leading 0): send as "0XXXXXXXXX"
 * +27XXXXXXXXX (11 digits): convert to "0XXXXXXXXX"
 */
function normaliseMobile(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('27') && digits.length === 11) {
    return `0${digits.slice(2)}`;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return digits;
  }
  if (digits.startsWith('27') && digits.length === 10) {
    // 9-digit sandbox number with country code — use +27-XXXXXXXXX format
    return `+27-${digits.slice(2)}`;
  }
  return raw;
}

/**
 * Build Pain.013 for RTP (Request to Pay) initiation
 * Creditor = MMTP (requesting money). Debtor = Payer (identified by mobile number).
 *
 * @param {Object} params
 * @param {string} params.merchantTransactionId - Our internal ID
 * @param {number} params.amount - Amount in ZAR
 * @param {string} [params.currency] - Default ZAR
 * @param {string} params.payerName - Debtor name
 * @param {string} params.payerMobileNumber - Debtor mobile number (required by SBSA RTP)
 * @param {string} [params.payerBankCode] - Debtor bank code (defaults to 'bankc' in UAT)
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
    creditorAccountNumber = process.env.SBSA_CREDITOR_ACCOUNT || process.env.SBSA_DEBTOR_ACCOUNT || '0000000000',
    creditorName = process.env.SBSA_CREDITOR_NAME || process.env.SBSA_DEBTOR_NAME || 'MyMoolah Treasury',
    creditorOrgId = process.env.SBSA_ORG_ID || '',
    creditorBankBranchCode = process.env.SBSA_CREDITOR_BANK_BRANCH || '051001',
    remittanceInfo,
    expiryMinutes = 60,
  } = params;

  if (!payerMobileNumber) {
    throw new Error('payerMobileNumber is required for RTP (SBSA only supports mobile number proxy for RTP debtors)');
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
  const now = new Date();
  const expDt = new Date(now.getTime() + expiryMinutes * 60 * 1000);

  const normalizedMobile = normaliseMobile(payerMobileNumber);

  // SBSA Pain.013 DbtrAcct: Id.Item.Id = "Proxy" is mandatory discriminator.
  // Actual debtor identity goes in Prxy block with MOBILE_NUMBER scheme.
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
        Ccy: currency,
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
              Value: numAmount.toFixed(2),
              Ccy: currency,
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
