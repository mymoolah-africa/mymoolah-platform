'use strict';

/**
 * Pain.013 Builder - SBSA RTP PayShap (Request to Pay Initiation)
 * ISO 20022 Pain.013 - JSON format aligned with SBSA API Postman samples
 *
 * Payment method: PBAC (Pay-By-Account) only — no proxy/mobile dependency.
 * Structure: top-level GrpHdr + SplmtryData + PmtInf[] (PascalCase per SBSA spec)
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
 * Build Pain.013 for RTP (Request to Pay) initiation (PBAC — bank account only)
 * Creditor = MMTP (requesting money). Debtor = Payer (being asked to pay).
 *
 * @param {Object} params
 * @param {string} params.merchantTransactionId - Our internal ID
 * @param {number} params.amount - Amount in ZAR
 * @param {string} [params.currency] - Default ZAR
 * @param {string} params.payerName - Debtor name
 * @param {string} params.payerAccountNumber - Debtor bank account number
 * @param {string} [params.payerBankCode] - Debtor bank branch code
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
    payerAccountNumber,
    payerBankCode,
    creditorAccountNumber = process.env.SBSA_CREDITOR_ACCOUNT || process.env.SBSA_DEBTOR_ACCOUNT || '0000000000',
    creditorName = process.env.SBSA_CREDITOR_NAME || process.env.SBSA_DEBTOR_NAME || 'MyMoolah Treasury',
    creditorOrgId = process.env.SBSA_ORG_ID || '',
    creditorBankBranchCode = process.env.SBSA_CREDITOR_BANK_BRANCH || '051001',
    remittanceInfo,
    expiryMinutes = 60,
  } = params;

  if (!payerAccountNumber) {
    throw new Error('payerAccountNumber is required for RTP (PBAC)');
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

  // Debtor account — direct bank account (PBAC), no proxy
  const DbtrAcct = {
    Id: {
      Item: {
        Id: payerAccountNumber,
      },
    },
    Nm: (payerName || 'Payer').substring(0, 140),
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
        Value: numAmount,
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
              Value: numAmount,
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
