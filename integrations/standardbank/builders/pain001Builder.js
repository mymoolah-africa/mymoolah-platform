'use strict';

/**
 * Pain.001 Builder - SBSA RPP PayShap (Customer Credit Transfer Initiation)
 * ISO 20022 Pain.001 - JSON format aligned with SBSA API Postman samples
 *
 * Payment method: PBAC (Pay-By-Account) only — no proxy/mobile dependency.
 * Structure: top-level grpHdr + pmtInf[] (no cstmrCdtTrfInitn wrapper)
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
 * Build Pain.001 for RPP payment initiation (PBAC — bank account only)
 * @param {Object} params
 * @param {string} params.merchantTransactionId - Our internal ID
 * @param {number} params.amount - Amount in ZAR
 * @param {string} [params.currency] - Default ZAR
 * @param {string} params.creditorAccountNumber - Beneficiary bank account number
 * @param {string} [params.creditorName] - Beneficiary name
 * @param {string} [params.creditorBankBranchCode] - Creditor bank branch code
 * @param {string} [params.debtorAccountNumber] - MMTP TPP account
 * @param {string} [params.debtorName] - Initiating party name
 * @param {string} [params.debtorOrgId] - CIPC registration number
 * @param {string} [params.remittanceInfo] - Payment reference
 * @param {string} [params.statementNarrative] - Debtor statement narrative
 */
function buildPain001(params) {
  const {
    merchantTransactionId,
    amount,
    currency = 'ZAR',
    creditorAccountNumber,
    creditorName = 'Beneficiary',
    creditorBankBranchCode = process.env.SBSA_CREDITOR_BANK_BRANCH || '051001',
    debtorAccountNumber = process.env.SBSA_DEBTOR_ACCOUNT || '0000000000',
    debtorName = process.env.SBSA_DEBTOR_NAME || 'MyMoolah Treasury',
    debtorOrgId = process.env.SBSA_ORG_ID || '',
    remittanceInfo,
    statementNarrative,
  } = params;

  if (!creditorAccountNumber) {
    throw new Error('creditorAccountNumber is required for RPP (PBAC)');
  }

  // SBSA field regex: alphanumeric only, no hyphens/special chars
  const cleanId = (str) => str.replace(/[^a-zA-Z0-9]/g, '');

  const uetr = uuidv4();
  const baseId = cleanId(merchantTransactionId);
  const msgId = `MM${baseId}`.substring(0, 35);
  const pmtInfId = `PMT${baseId}`.substring(0, 30);
  const instrId = `INSTR${Date.now()}`.substring(0, 35);
  const endToEndId = baseId.substring(0, 35);

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);

  const cdtrAcct = {
    id: {
      othr: {
        id: creditorAccountNumber,
      },
    },
    nm: (creditorName || 'Beneficiary').substring(0, 140),
  };

  const cdtTrfTxInf = {
    pmtId: {
      instrId,
      endToEndId,
      uetr,
    },
    pmtTpInf: {
      lclInstrm: {
        prtry: 'PBAC',
      },
    },
    amt: {
      instdAmt: {
        value: numAmount,
      },
    },
    cdtrAgt: {
      finInstnId: {
        pstlAdr: {
          ctry: 'ZA',
        },
      },
      brnchId: {
        id: creditorBankBranchCode,
      },
    },
    // Top-level brnchId at cdtTrfTxInf level — required by SBSA (matches Postman sample)
    brnchId: {
      id: creditorBankBranchCode,
    },
    cdtr: {
      nm: (creditorName || 'Beneficiary').substring(0, 140),
    },
    cdtrAcct,
    rmtInf: {
      strd: [
        {
          cdtrRefInf: {
            ref: (remittanceInfo || merchantTransactionId).substring(0, 140),
          },
        },
      ],
    },
    splmtryData: [
      {
        plcAndNm: 'BatchReference',
        envlp: {
          any: baseId.substring(0, 35),
        },
      },
      {
        plcAndNm: 'DbtStmNarr',
        envlp: {
          any: (statementNarrative || remittanceInfo || merchantTransactionId).substring(0, 140),
        },
      },
    ],
  };

  const initgPty = { nm: debtorName.substring(0, 140) };
  if (debtorOrgId) {
    initgPty.id = {
      orgId: {
        othr: [{ id: debtorOrgId, issr: 'CIPC' }],
      },
    };
  }

  const pain001 = {
    grpHdr: {
      msgId,
      creDtTm: isoNow(),
      nbOfTxs: 1,
      ctrlSum: numAmount,
      initgPty,
    },
    pmtInf: [
      {
        pmntInfId: pmtInfId,
        reqdExctnDt: {
          dtTm: new Date().toISOString(),
        },
        dbtr: {
          id: {
            othr: {
              id: debtorAccountNumber,
            },
          },
          nm: debtorName.substring(0, 140),
        },
        dbtrAcct: {
          id: {
            othr: {
              id: debtorAccountNumber,
            },
          },
          nm: debtorName.substring(0, 140),
        },
        cdtTrfTxInf: [cdtTrfTxInf],
      },
    ],
  };

  return { pain001, uetr, msgId };
}

module.exports = { buildPain001 };
