'use strict';

/**
 * Pain.001 Builder - SBSA RPP PayShap (Customer Credit Transfer Initiation)
 * ISO 20022 Pain.001.001.03 - JSON format for SBSA API
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-12
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
 * @param {string} params.merchantTransactionId - Our internal ID
 * @param {number} params.amount - Amount in ZAR (e.g. 100.50)
 * @param {string} params.currency - Default ZAR
 * @param {string} params.paymentType - 'PBAC' (account) or 'PBPX' (proxy)
 * @param {string} [params.creditorAccountNumber] - For PBAC
 * @param {string} [params.creditorName] - Beneficiary name
 * @param {string} [params.creditorProxy] - Mobile number (MBNO) for PBPX
 * @param {string} [params.creditorProxyScheme] - 'MBNO' or 'CUST'
 * @param {string} [params.debtorAccountNumber] - Our TPP account
 * @param {string} [params.debtorName] - Initiating party name
 * @param {string} [params.remittanceInfo] - Payment reference
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
    debtorAccountNumber = process.env.SBSA_DEBTOR_ACCOUNT || '0000000000',
    debtorName = process.env.SBSA_DEBTOR_NAME || 'MyMoolah Treasury',
    remittanceInfo,
  } = params;

  const uetr = uuidv4();
  const msgId = `MM-${merchantTransactionId}`.substring(0, 35);
  const pmtInfId = `PMT-${merchantTransactionId}`.substring(0, 30);
  const instrId = `INSTR-${Date.now()}`.substring(0, 35);
  const endToEndId = merchantTransactionId.substring(0, 35);

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  const ctrlSum = numAmount.toFixed(2);

  const cdtTrfTxInf = {
    pmtId: {
      instrId,
      endToEndId,
      uetr,
    },
    pmtTpInf: {
      ctgyPurp: {
        cd: 'SUPP',
      },
      lclInstrm: {
        cd: paymentType,
      },
    },
    amt: {
      instdAmt: {
        value: numAmount.toFixed(2),
        ccy: currency,
      },
    },
    cdtr: {
      nm: (creditorName || 'Beneficiary').substring(0, 140),
    },
    cdtrAcct: {},
    rmtInf: {
      ustrd: (remittanceInfo || merchantTransactionId).substring(0, 140),
    },
  };

  if (paymentType === 'PBAC' && creditorAccountNumber) {
    cdtTrfTxInf.cdtrAcct = {
      id: {
        othr: {
          id: creditorAccountNumber,
        },
      },
    };
  } else if (paymentType === 'PBPX' && creditorProxy) {
    const proxy = creditorProxy.replace(/\D/g, '');
    const normalizedProxy = proxy.startsWith('27') ? proxy : `27${proxy}`;
    cdtTrfTxInf.cdtrAcct = {
      id: {
        othr: {
          id: normalizedProxy,
          schmeNm: {
            cd: creditorProxyScheme,
          },
        },
      },
    };
  } else {
    throw new Error('PBAC requires creditorAccountNumber; PBPX requires creditorProxy');
  }

  const reqdExctnDt = new Date().toISOString().split('T')[0];

  const pain001 = {
    cstmrCdtTrfInitn: {
      grpHdr: {
        msgId,
        creDtTm: isoNow(),
        nbOfTxs: '1',
        ctrlSum,
        initgPty: {
          nm: debtorName.substring(0, 140),
        },
      },
      pmtInf: {
        pmtInfId,
        reqdExctnDt,
        dbtr: {
          nm: debtorName.substring(0, 140),
        },
        dbtrAcct: {
          id: {
            othr: {
              id: debtorAccountNumber,
            },
          },
        },
        cdtTrfTxInf: [cdtTrfTxInf],
      },
    },
  };

  return { pain001, uetr, msgId };
}

module.exports = {
  buildPain001,
};
