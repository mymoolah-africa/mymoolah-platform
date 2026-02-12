'use strict';

/**
 * Pain.013 Builder - SBSA RTP PayShap (Request to Pay Initiation)
 * ISO 20022 Pain.013.001.01 - JSON format for SBSA API
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
 * Build Pain.013 for RTP (Request to Pay) initiation
 * Creditor = MMTP (requestor, receiving money). Debtor = Payer.
 *
 * @param {Object} params
 * @param {string} params.merchantTransactionId - Our internal ID
 * @param {number} params.amount - Amount in ZAR
 * @param {string} params.currency - Default ZAR
 * @param {string} params.payerName - Debtor name
 * @param {string} [params.payerAccountNumber] - Debtor account (PBAC)
 * @param {string} [params.payerProxy] - Debtor mobile (PBPX)
 * @param {string} [params.payerProxyScheme] - 'MBNO' or 'CUST'
 * @param {string} [params.creditorAccountNumber] - MMTP receiving account
 * @param {string} [params.creditorName] - MMTP/requestor name
 * @param {string} [params.remittanceInfo] - Payment reference
 * @param {number} [params.expiryMinutes] - RTP expiry in minutes
 */
function buildPain013(params) {
  const {
    merchantTransactionId,
    amount,
    currency = 'ZAR',
    payerName,
    payerAccountNumber,
    payerProxy,
    payerProxyScheme = 'MBNO',
    creditorAccountNumber = process.env.SBSA_CREDITOR_ACCOUNT || process.env.SBSA_DEBTOR_ACCOUNT || '0000000000',
    creditorName = process.env.SBSA_CREDITOR_NAME || process.env.SBSA_DEBTOR_NAME || 'MyMoolah Treasury',
    remittanceInfo,
    expiryMinutes = 60,
  } = params;

  const msgId = `MM-RTP-${merchantTransactionId}`.substring(0, 35);
  const pmtInfId = `RTP-${merchantTransactionId}`.substring(0, 30);
  const instrId = `RTP-INSTR-${Date.now()}`.substring(0, 35);
  const endToEndId = merchantTransactionId.substring(0, 35);

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  const ctrlSum = numAmount.toFixed(2);

  const reqdExctnDt = new Date().toISOString().split('T')[0];
  const expDt = new Date();
  expDt.setMinutes(expDt.getMinutes() + expiryMinutes);
  const xpryDt = expDt.toISOString().split('T')[0];

  const cdtTrfTx = {
    pmtId: {
      instrId,
      endToEndId,
    },
    amt: {
      instdAmt: {
        value: numAmount.toFixed(2),
        ccy: currency,
      },
    },
    cdtr: {
      nm: creditorName.substring(0, 140),
    },
    cdtrAcct: {
      id: {
        othr: {
          id: creditorAccountNumber,
        },
      },
    },
    cdtrAgt: {
      finInstnId: {
        bicfi: 'SBZAZAJJ',
      },
    },
    dbtr: {
      nm: (payerName || 'Payer').substring(0, 140),
    },
    dbtrAcct: {},
    dbtrAgt: {
      finInstnId: {
        bicfi: 'SBZAZAJJ',
      },
    },
    chrgBr: 'SLEV',
    pmtCond: {
      amtModAllwd: false,
      prorataRte: false,
    },
    rmtInf: {
      ustrd: (remittanceInfo || merchantTransactionId).substring(0, 140),
    },
  };

  if (payerAccountNumber) {
    cdtTrfTx.dbtrAcct = {
      id: {
        othr: {
          id: payerAccountNumber,
        },
      },
    };
  } else if (payerProxy) {
    const proxy = payerProxy.replace(/\D/g, '');
    const normalizedProxy = proxy.startsWith('27') ? proxy : `27${proxy}`;
    cdtTrfTx.dbtrAcct = {
      id: {
        othr: {
          id: normalizedProxy,
          schmeNm: {
            cd: payerProxyScheme,
          },
        },
      },
    };
  } else {
    throw new Error('RTP requires payerAccountNumber or payerProxy');
  }

  const pain013 = {
    cstmrPmtReqInitn: {
      grpHdr: {
        msgId,
        creDtTm: isoNow(),
        nbOfTxs: '1',
        ctrlSum,
        initgPty: {
          nm: creditorName.substring(0, 140),
        },
      },
      pmtInf: {
        pmtInfId,
        pmtMtd: 'TRF',
        reqdExctnDt,
        xpryDt,
        dbtr: {
          nm: (payerName || 'Payer').substring(0, 140),
        },
        dbtrAcct: cdtTrfTx.dbtrAcct,
        dbtrAgt: {
          finInstnId: {
            bicfi: 'SBZAZAJJ',
          },
        },
        chrgBr: 'SLEV',
        cdtTrfTx: [cdtTrfTx],
      },
    },
  };

  return { pain013, msgId };
}

module.exports = {
  buildPain013,
};
