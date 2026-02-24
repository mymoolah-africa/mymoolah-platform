'use strict';

/**
 * Pain.013 Builder - SBSA RTP PayShap (Request to Pay Initiation)
 * ISO 20022 Pain.013 - JSON format aligned with SBSA API Postman samples
 *
 * Structure: top-level GrpHdr + PmtInf[] (PascalCase per SBSA spec)
 * DbtrAcct uses Id.Item.Id + Prxy structure; CdtrAgt uses Othr.Id (branch code)
 * Amt uses Item.Value; RmtInf uses Strd[]; XpryDt/ReqdExctnDt use DtTm objects
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
 * @param {string} [params.payerProxyScheme] - 'MOBILE_NUMBER' per SBSA spec
 * @param {string} [params.payerBankCode] - Debtor bank branch code
 * @param {string} [params.creditorAccountNumber] - MMTP receiving account
 * @param {string} [params.creditorName] - MMTP/requestor name
 * @param {string} [params.creditorOrgId] - CIPC registration for creditor
 * @param {string} [params.creditorBankBranchCode] - SBSA branch code (default 051001)
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
    payerProxyScheme = 'MOBILE_NUMBER',
    payerBankCode,
    creditorAccountNumber = process.env.SBSA_CREDITOR_ACCOUNT || process.env.SBSA_DEBTOR_ACCOUNT || '0000000000',
    creditorName = process.env.SBSA_CREDITOR_NAME || process.env.SBSA_DEBTOR_NAME || 'MyMoolah Treasury',
    creditorOrgId = process.env.SBSA_ORG_ID || '',
    creditorBankBranchCode = process.env.SBSA_CREDITOR_BANK_BRANCH || '051001',
    remittanceInfo,
    expiryMinutes = 60,
  } = params;

  // SBSA field regex: ^(?=.*[a-zA-Z0-9])([a-zA-Z0-9\s]){1,35}$ — alphanumeric only, no hyphens/special chars
  const cleanId = (str) => str.replace(/[^a-zA-Z0-9]/g, '');

  const uetr = uuidv4();
  const baseId = cleanId(merchantTransactionId);
  const msgId = `MMRTP${baseId}`.substring(0, 35);
  const pmtInfId = `RTP${baseId}`.substring(0, 30);   // max 30 chars for PmtInfId
  const instrId = `RTPINSTR${Date.now()}`.substring(0, 35);
  const endToEndId = baseId.substring(0, 35);

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);

  const now = new Date();
  const expDt = new Date(now.getTime() + expiryMinutes * 60 * 1000);

  // Build debtor account
  // SBSA RTP always uses the proxy structure (Id.Item.Id = "Proxy" + Prxy block)
  // matching the Postman sample — direct account number is NOT supported for RTP debtors.
  // Mobile format per SBSA sample: "+27-XXXXXXXXX" (with hyphen after country code)
  let DbtrAcct;
  const proxyValue = payerProxy || payerAccountNumber;
  if (!proxyValue) {
    throw new Error('RTP requires payerMobileNumber (payerProxy) or payerAccountNumber as proxy identifier');
  }

  // Normalise to SBSA mobile format: +27-XXXXXXXXX
  const digits = proxyValue.replace(/\D/g, '');
  let normalizedProxy;
  if (digits.length >= 9 && (digits.startsWith('27') || digits.startsWith('0'))) {
    // Mobile number — format as +27-XXXXXXXXX
    const local = digits.startsWith('27') ? digits.slice(2) : digits.slice(1);
    normalizedProxy = `+27-${local}`;
  } else {
    // Account number or other identifier — use as-is
    normalizedProxy = proxyValue;
  }

  DbtrAcct = {
    Id: {
      Item: {
        Id: 'Proxy',
      },
    },
    Nm: (payerName || 'Payer').substring(0, 140),
    Prxy: {
      Tp: {
        Item: payerProxyScheme,
      },
      Id: normalizedProxy,
    },
  };

  // Build creditor org ID if available
  const CdtrId = creditorOrgId
    ? {
        OrgId: {
          Othr: [
            { Id: creditorOrgId, Issr: 'CIPC' },
          ],
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
              Value: numAmount.toFixed(2),
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
          ? {
              Id: {
                OrgId: {
                  Othr: [{ Id: creditorOrgId }],
                },
              },
            }
          : {}),
      },
    },
    // Required top-level field per SBSA Pain.013 spec
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
              // 'bankc' is the SBSA sandbox placeholder for unknown/generic debtor bank
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

module.exports = {
  buildPain013,
};
