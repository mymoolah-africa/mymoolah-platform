'use strict';

/**
 * Pain.001 Builder - SBSA RPP PayShap (Customer Credit Transfer Initiation)
 * ISO 20022 Pain.001 - JSON format aligned with SBSA API Postman samples
 *
 * Structure: top-level grpHdr + pmtInf[] (no cstmrCdtTrfInitn wrapper)
 * lclInstrm uses prtry (not cd), reqdExctnDt is { dtTm }, rmtInf uses strd[]
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-21
 */

const crypto = require('crypto');

function uuidv4() {
  return crypto.randomUUID();
}

function isoNow() {
  return new Date().toISOString();
}

/**
 * Build Pain.001 for RPP payment initiation
 * @param {Object} params
 * @param {string} params.merchantTransactionId - Our internal ID (max 35 chars)
 * @param {number} params.amount - Amount in ZAR (e.g. 100.50)
 * @param {string} params.currency - Default ZAR
 * @param {string} params.paymentType - 'PBAC' (account) or 'PBPX' (proxy)
 * @param {string} [params.creditorAccountNumber] - For PBAC
 * @param {string} [params.creditorName] - Beneficiary name
 * @param {string} [params.creditorProxy] - Mobile number (MBNO) for PBPX
 * @param {string} [params.creditorProxyScheme] - 'MBNO' or 'CUST'
 * @param {string} [params.creditorBankBranchCode] - Creditor bank branch code (e.g. '051001' for SBSA)
 * @param {string} [params.debtorAccountNumber] - Our TPP account
 * @param {string} [params.debtorName] - Initiating party name
 * @param {string} [params.debtorOrgId] - CIPC registration number for initgPty.id
 * @param {string} [params.remittanceInfo] - Payment reference
 * @param {string} [params.statementNarrative] - Debtor statement narrative
 */
function buildPain001(params) {
  const {
    merchantTransactionId,
    amount,
    currency = 'ZAR',
    paymentType = 'PBAC',
    creditorAccountNumber,
    creditorName = 'Beneficiary',
    creditorProxy,
    creditorProxyScheme = 'MBNO',
    creditorBankBranchCode = process.env.SBSA_CREDITOR_BANK_BRANCH || '051001',
    debtorAccountNumber = process.env.SBSA_DEBTOR_ACCOUNT || '0000000000',
    debtorName = process.env.SBSA_DEBTOR_NAME || 'MyMoolah Treasury',
    debtorOrgId = process.env.SBSA_ORG_ID || '',
    remittanceInfo,
    statementNarrative,
  } = params;

  // SBSA field regex: ^(?=.*[a-zA-Z0-9])([a-zA-Z0-9\s]){1,35}$ — alphanumeric only, no hyphens/special chars
  // Strip all non-alphanumeric characters before use in SBSA ID fields
  const cleanId = (str) => str.replace(/[^a-zA-Z0-9]/g, '');

  const uetr = uuidv4();
  const baseId = cleanId(merchantTransactionId);
  const msgId = `MM${baseId}`.substring(0, 35);
  const pmtInfId = `PMT${baseId}`.substring(0, 30);   // max 30 chars for PmntInfId
  const instrId = `INSTR${Date.now()}`.substring(0, 35);
  const endToEndId = baseId.substring(0, 35);

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  const ctrlSum = numAmount;

  const reqdExctnDtTm = new Date().toISOString();

  // Build creditor account per payment type
  let cdtrAcct;
  if (paymentType === 'PBAC' && creditorAccountNumber) {
    cdtrAcct = {
      id: {
        othr: {
          id: creditorAccountNumber,
        },
      },
      nm: (creditorName || 'Beneficiary').substring(0, 140),
    };
  } else if (paymentType === 'PBPX' && creditorProxy) {
    const digits = creditorProxy.replace(/\D/g, '');
    const normalizedProxy = digits.startsWith('27') ? `+${digits}` : `+27${digits.replace(/^0/, '')}`;
    cdtrAcct = {
      id: {
        othr: {
          id: normalizedProxy,
        },
      },
      nm: (creditorName || 'Beneficiary').substring(0, 140),
      prxy: {
        tp: {
          prtry: creditorProxyScheme,
        },
        id: {
          id: normalizedProxy,
        },
      },
    };
  } else {
    throw new Error('PBAC requires creditorAccountNumber; PBPX requires creditorProxy');
  }

  const cdtTrfTxInf = {
    pmtId: {
      instrId,
      endToEndId,
      uetr,
    },
    pmtTpInf: {
      lclInstrm: {
        prtry: paymentType,
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
          any: merchantTransactionId.substring(0, 35),
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

  // Build initgPty with org ID if available (CIPC registration)
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
      ctrlSum,
      initgPty,
    },
    pmtInf: [
      {
        pmntInfId: pmtInfId,
        reqdExctnDt: {
          dtTm: reqdExctnDtTm,
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

module.exports = {
  buildPain001,
};
