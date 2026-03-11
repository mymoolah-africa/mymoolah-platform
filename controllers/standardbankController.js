'use strict';

/**
 * Standard Bank PayShap Controller
 * RPP (Rapid Payments) and RTP (Request to Pay) - callbacks and initiation
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-12
 */

const { validateGroupHeaderHash, extractGrpHdr, extractRawGrpHdr } = require('../integrations/standardbank/callbackValidator');
const db = require('../models');

function getBankCodeFromName(bankName) {
  const bankCodes = {
    'ABSA Bank': '632005',
    'African Bank': '430000',
    'Bidvest Bank': '462005',
    'Capitec Bank': '470010',
    'Discovery Bank': '679000',
    'First National Bank (FNB)': '250655',
    'First National Bank': '250655',
    'FNB': '250655',
    'Investec Bank': '580105',
    'Nedbank': '198765',
    'Postbank': '460005',
    'Standard Bank': '051001',
    'TymeBank': '678910',
    'HBZ Bank': '570100',
    'OM Bank': '352000',
    'Al Baraka Bank': '800000',
    'Sasfin Bank': '683000',
  };
  return bankCodes[bankName] || '';
}

/**
 * Map bank name to SBSA PayShap proxy domain identifier.
 * Used for RTP DbtrAgt.FinInstnId.Othr.Id when the debtor is identified by proxy.
 * Source: SBSA "PROD Branch codes and Domains.xlsx" (March 2026).
 */
function getProxyDomainFromName(bankName) {
  const proxyDomains = {
    'Standard Bank': 'standardbank',
    'Capitec Bank': 'capitec',
    'ABSA Bank': 'absa',
    'First National Bank (FNB)': 'fnb',
    'First National Bank': 'fnb',
    'FNB': 'fnb',
    'RMB': 'rmb',
    'Nedbank': 'nedbank',
    'African Bank': 'africanbank',
    'TymeBank': 'tymebank',
    'Discovery Bank': 'discoverybank',
    'Investec Bank': 'investec',
    'HBZ Bank': 'hbz',
    'OM Bank': 'ombank',
    'Al Baraka Bank': 'albaraka',
    'Sasfin Bank': 'sasfin',
    'Bidvest Bank': 'hellopaisa',
  };
  return proxyDomains[bankName] || '';
}

/**
 * RPP Callback - Pain.002 (batch)
 * POST /api/v1/standardbank/callback
 */
async function handleRppCallback(req, res) {
  const secret = process.env.SBSA_CALLBACK_SECRET;
  const headerHash = req.headers['x-groupheader-hash'] || req.headers['x-GroupHeader-Hash'];

  if (!secret) {
    console.error('SBSA callback: SBSA_CALLBACK_SECRET not configured');
    return res.status(503).json({ error: 'Callback not configured' });
  }

  let body = req.body;
  if (Buffer.isBuffer(req.body)) {
    try {
      body = JSON.parse(req.body.toString('utf8'));
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const rawGrpHdr = extractRawGrpHdr(req.rawBodyStr, 'rpp');
  const grpHdr = extractGrpHdr(body, 'rpp');
  if (!grpHdr && !rawGrpHdr) {
    return res.status(400).json({ error: 'Missing grpHdr' });
  }

  const hashInput = rawGrpHdr || grpHdr;
  const rppHashResult = headerHash ? validateGroupHeaderHash(hashInput, headerHash, secret) : false;
  if (!rppHashResult) {
    return res.status(401).json({ error: 'Invalid x-GroupHeader-Hash' });
  }

  try {
    const orgnlMsgId = grpHdr.OrgnlMsgId?.Id ?? grpHdr.orgnlMsgId?.id ?? null;
    const pmtInf = body.cstmrPmtStsRpt?.orgnlPmtInfAndSts ?? body.cstmrPmtStsRpt?.pmtInf ?? [];
    const infList = Array.isArray(pmtInf) ? pmtInf : [pmtInf];

    for (const inf of infList) {
      const txInf = inf.txInfAndSts ?? inf.cdtTrfTxInf ?? [];
      const txList = Array.isArray(txInf) ? txInf : [txInf];
      for (const tx of txList) {
        const txId = tx.txId?.txId ?? tx.txId ?? tx.instrId ?? tx.endToEndId;
        const sts = tx.txSts ?? tx.sts ?? 'ACCP';
        await processRppCallback(orgnlMsgId, txId, sts, body);
      }
    }

    return res.status(200).send();
  } catch (err) {
    console.error('SBSA RPP callback error:', err.message);
    return res.status(500).json({ error: 'Callback processing failed' });
  }
}

async function processRppCallback(originalMessageId, transactionIdentifier, status, rawBody) {
  if (!originalMessageId) return;

  const existing = await db.StandardBankTransaction.findOne({
    where: { originalMessageId },
  });
  if (!existing) return;

  const statusMap = {
    ACSP: 'completed',
    ACWC: 'processing',
    ACCC: 'completed',
    RJCT: 'rejected',
    PDNG: 'pending',
  };
  const internalStatus = statusMap[status] || 'processing';

  await existing.update({
    status: internalStatus,
    webhookReceivedAt: new Date(),
    rawResponse: rawBody,
    processedAt: internalStatus === 'completed' || internalStatus === 'rejected' ? new Date() : null,
  });
}

/**
 * RPP Batch Callback with path params — Pain.002
 * POST /api/v1/standardbank/callback/paymentInitiation/:clientMessageId
 * POST /api/v1/standardbank/callback/paymentInitiation/:clientMessageId/paymentInstructions/:paymentInformationId
 *
 * SBSA appends path params to our base callback URL. These routes handle both
 * the top-level batch and per-instruction variants. Processing is identical to
 * the flat /callback route — path params are used for idempotency fallback.
 */
async function handleRppCallbackWithParams(req, res) {
  // Merge path params into body context then delegate to flat handler
  // clientMessageId = GrpHdr.MsgId (our originalMessageId)
  req._sbsaPathParams = {
    clientMessageId: req.params.clientMessageId,
    paymentInformationId: req.params.paymentInformationId,
  };
  return handleRppCallback(req, res);
}

/**
 * RPP Realtime Callback — SBSA appends full path:
 * POST /api/v1/standardbank/realtime-callback/paymentInitiation/{ClientMessageId}/paymentInstructions/{paymentInformationId}/transactions/{transactionIdentifier}
 *
 * ClientMessageId   = GrpHdr.MsgId (our originalMessageId)
 * paymentInformationId = pmtInfId from Pain.001
 * transactionIdentifier = UETR from the initiation request
 */
async function handleRppRealtimeCallback(req, res) {
  const { clientMessageId, paymentInformationId, transactionIdentifier } = req.params;
  const headerHash = req.headers['x-groupheader-hash'] || req.headers['x-GroupHeader-Hash'];
  const secret = process.env.SBSA_CALLBACK_SECRET;

  if (!secret || !headerHash) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let body = req.body;
  if (Buffer.isBuffer(req.body)) {
    try {
      body = JSON.parse(req.body.toString('utf8'));
    } catch (e) {
      body = {};
    }
  }

  const rawGrpHdr = extractRawGrpHdr(req.rawBodyStr, 'rpp');
  const grpHdr = rawGrpHdr || extractGrpHdr(body, 'rpp') || body;
  const rppRtHashResult = validateGroupHeaderHash(grpHdr, headerHash, secret);
  if (!rppRtHashResult) {
    return res.status(401).json({ error: 'Invalid hash' });
  }

  try {
    const originalMessageId = clientMessageId
      || body.originalMessageId
      || body.orgnlMsgId;
    const txIdentifier = transactionIdentifier
      || body.transactionIdentifier
      || body.txId;
    const sts = body.txSts ?? body.sts ?? 'ACSP';
    await processRppCallback(originalMessageId, txIdentifier, sts, body);
    return res.status(200).send();
  } catch (err) {
    console.error('SBSA RPP realtime callback error:', err.message);
    return res.status(500).json({ error: 'Processing failed' });
  }
}

/**
 * RTP Callback - Pain.014
 * POST /api/v1/standardbank/rtp-callback
 */
async function handleRtpCallback(req, res) {
  const secret = process.env.SBSA_CALLBACK_SECRET;
  const headerHash = req.headers['x-groupheader-hash'] || req.headers['x-GroupHeader-Hash'];

  if (!secret) {
    return res.status(503).json({ error: 'Callback not configured' });
  }

  let body = req.body;
  if (Buffer.isBuffer(req.body)) {
    try {
      body = JSON.parse(req.body.toString('utf8'));
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const rawGrpHdr = extractRawGrpHdr(req.rawBodyStr, 'rtp');
  const grpHdr = extractGrpHdr(body, 'rtp');
  if (!grpHdr && !rawGrpHdr) {
    return res.status(400).json({ error: 'Missing grpHdr' });
  }

  const hashInput = rawGrpHdr || grpHdr;
  const hashResult = headerHash ? validateGroupHeaderHash(hashInput, headerHash, secret) : false;
  if (!hashResult) {
    return res.status(401).json({ error: 'Invalid x-GroupHeader-Hash' });
  }
  if (hashResult === 'soft_fail') {
    console.warn('[RTP-BATCH-CB] Hash mismatch (soft_fail) — processing anyway. Ask SBSA for hash spec.');
  }

  try {
    const orgnlMsgId = grpHdr.OrgnlMsgId?.Id ?? grpHdr.orgnlMsgId?.id
      ?? grpHdr.msgId ?? null;

    // SBSA RTP callbacks may nest under cstmrPmtReqStsRpt or at top level
    const grpSts = body.orgnlGrpInfAndSts ?? body.cstmrPmtReqStsRpt?.orgnlGrpInfAndSts;
    if (grpSts) {
      const grpStatus = grpSts.grpSts || grpSts.GrpSts;
      const stsRsn = grpSts.stsRsnInf || [];
      const reasons = (Array.isArray(stsRsn) ? stsRsn : [stsRsn])
        .map(r => `${r.rsn?.prtry || r.rsn?.Prtry || '?'}: ${r.addtlInf || r.AddtlInf || ''}`);
      console.log('[RTP-BATCH-CB] Group status: %s, reasons: %s', grpStatus, reasons.join(' | '));
    }

    const pmtInf = body.orgnlPmtInfAndSts
      ?? body.cstmrPmtReqStsRpt?.orgnlPmtReqInfAndSts
      ?? body.cstmrPmtReqStsRpt?.orgnlPmtInfAndSts
      ?? body.cstmrPmtReqStsRpt?.pmtInf
      ?? [];
    const infList = Array.isArray(pmtInf) ? pmtInf : [pmtInf];

    for (const inf of infList) {
      const pmtSts = inf.pmtInfSts || inf.PmtInfSts;
      const pmtRsn = inf.stsRsnInf || [];
      const pmtReasons = (Array.isArray(pmtRsn) ? pmtRsn : [pmtRsn])
        .map(r => `${r.rsn?.prtry || r.rsn?.Prtry || '?'}: ${r.addtlInf || r.AddtlInf || ''}`);
      if (pmtSts) {
        console.log('[RTP-BATCH-CB] Payment status: %s, reasons: %s, pmtInfId: %s',
          pmtSts, pmtReasons.join(' | '), inf.orgnlPmtInfId || inf.OrgnlPmtInfId || '?');
      }

      const txInf = inf.txInfAndSts ?? inf.cdtTrfTx ?? [];
      const txList = Array.isArray(txInf) ? txInf : [txInf];
      for (const tx of txList) {
        const txId = tx.txId?.txId ?? tx.txId ?? tx.instrId;
        const sts = tx.txSts ?? tx.sts ?? pmtSts ?? 'ACCP';
        await processRtpCallback(orgnlMsgId, txId, sts, body);
      }
    }

    // If no transaction-level info, use group-level status
    if (infList.length === 0 && grpSts) {
      const grpStatus = grpSts.grpSts || grpSts.GrpSts;
      const orgnlMsgIdFromGrp = grpSts.orgnlMsgId || grpSts.OrgnlMsgId;
      await processRtpCallback(orgnlMsgIdFromGrp || orgnlMsgId, null, grpStatus, body);
    }

    return res.status(200).send();
  } catch (err) {
    console.error('SBSA RTP callback error:', err.message);
    return res.status(500).json({ error: 'Callback processing failed' });
  }
}

async function processRtpCallback(originalMessageId, transactionIdentifier, status, rawBody) {
  if (!originalMessageId) return;
  const rtpService = require('../services/standardbankRtpService');
  await rtpService.processRtpCallback(originalMessageId, transactionIdentifier, status, rawBody);
}

/**
 * RTP Batch Callback with path params — Pain.014
 * POST /api/v1/standardbank/rtp-callback/paymentInitiation/:clientMessageId
 * POST /api/v1/standardbank/rtp-callback/paymentInitiation/:clientMessageId/paymentInstructions/:paymentInformationId
 */
async function handleRtpCallbackWithParams(req, res) {
  req._sbsaPathParams = {
    clientMessageId: req.params.clientMessageId,
    paymentInformationId: req.params.paymentInformationId,
  };
  return handleRtpCallback(req, res);
}

/**
 * RTP Realtime Callback — SBSA appends full path:
 * POST /api/v1/standardbank/rtp-realtime-callback/paymentRequestInitiation/{ClientMessageId}/paymentRequestInstructions/{requestToPayInformationId}/requests/{transactionIdentifier}
 *
 * ClientMessageId              = GrpHdr.MsgId (our originalMessageId)
 * requestToPayInformationId    = PmtInfId from Pain.013
 * transactionIdentifier        = UETR from the initiation request
 */
async function handleRtpRealtimeCallback(req, res) {
  const { clientMessageId, requestToPayInformationId, transactionIdentifier } = req.params;
  const secret = process.env.SBSA_CALLBACK_SECRET;
  const headerHash = req.headers['x-groupheader-hash'] || req.headers['x-GroupHeader-Hash'];

  if (!secret || !headerHash) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let body = req.body;
  if (Buffer.isBuffer(req.body)) {
    try {
      body = JSON.parse(req.body.toString('utf8'));
    } catch (e) {
      body = {};
    }
  }

  const rawGrpHdr = extractRawGrpHdr(req.rawBodyStr, 'rtp');
  const grpHdr = rawGrpHdr || extractGrpHdr(body, 'rtp') || body;
  const hashResult = validateGroupHeaderHash(grpHdr, headerHash, secret);
  if (!hashResult) {
    return res.status(401).json({ error: 'Invalid hash' });
  }
  if (hashResult === 'soft_fail') {
    console.warn('[RTP-RT-CB] Hash mismatch (soft_fail) — processing anyway. Ask SBSA for hash spec.');
  }

  try {
    const orgnlMsgId = clientMessageId
      || body.orgnlGrpInfAndSts?.orgnlMsgId
      || body.originalMessageId
      || body.orgnlMsgId;
    const txId = transactionIdentifier
      || body.transactionIdentifier
      || body.txId;

    // Extract status from group or payment level
    const grpSts = body.orgnlGrpInfAndSts?.grpSts;
    const pmtInfArr = body.orgnlPmtInfAndSts || [];
    const pmtSts = Array.isArray(pmtInfArr) && pmtInfArr[0]?.pmtInfSts;
    const sts = body.txSts ?? body.sts ?? pmtSts ?? grpSts ?? 'ACSP';

    // Log rejection details
    if (grpSts === 'RJCT' || pmtSts === 'RJCT') {
      const grpReasons = (body.orgnlGrpInfAndSts?.stsRsnInf || [])
        .map(r => `${r.rsn?.prtry || '?'}: ${r.addtlInf || ''}`);
      const pmtReasons = pmtInfArr.flatMap(p => (p.stsRsnInf || [])
        .map(r => `${r.rsn?.prtry || '?'}: ${r.addtlInf || ''}`));
      console.error('[RTP-RT-CB] REJECTED orgnlMsgId=%s grpReasons=[%s] pmtReasons=[%s]',
        orgnlMsgId, grpReasons.join(' | '), pmtReasons.join(' | '));
    }

    await processRtpCallback(orgnlMsgId, txId, sts, body);
    return res.status(200).send();
  } catch (err) {
    console.error('SBSA RTP realtime callback error:', err.message);
    return res.status(500).json({ error: 'Processing failed' });
  }
}

/**
 * Initiate PayShap RPP (Send Money)
 * POST /api/v1/standardbank/payshap/rpp
 */
async function initiatePayShapRpp(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const wallet = await db.Wallet.findOne({
      where: req.body?.walletId ? { walletId: req.body.walletId } : { userId },
    });
    if (!wallet || String(wallet.userId) !== String(userId)) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }
    const walletId = wallet.walletId;

    const {
      amount,
      currency = 'ZAR',
      creditorAccountNumber,
      creditorBankBranchCode,
      creditorName,
      bankCode,
      bankName,
      description,
      reference,
    } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: 'amount is required' });
    }
    if (!creditorAccountNumber) {
      return res.status(400).json({ success: false, message: 'creditorAccountNumber is required' });
    }

    const rppService = require('../services/standardbankRppService');
    const result = await rppService.initiateRppPayment({
      userId,
      walletId,
      amount,
      currency,
      creditorAccountNumber,
      creditorBankBranchCode: creditorBankBranchCode || undefined,
      creditorName,
      bankCode,
      bankName,
      description,
      reference,
    });

    // Update beneficiary lastPaidAt if this user has a matching bank beneficiary
    try {
      const matchingBeneficiary = await db.Beneficiary.findOne({
        where: {
          userId,
          identifier: creditorAccountNumber,
          accountType: 'bank',
        },
      });
      if (matchingBeneficiary) {
        await matchingBeneficiary.update({
          lastPaidAt: new Date(),
          timesPaid: (matchingBeneficiary.timesPaid || 0) + 1,
        });
      }
    } catch (benErr) {
      console.warn('Non-fatal: failed to update beneficiary lastPaidAt after RPP:', benErr.message);
    }

    const fb = result.feeBreakdown || {};
    return res.status(202).json({
      success: true,
      data: {
        merchantTransactionId: result.merchantTransactionId,
        originalMessageId: result.originalMessageId,
        status: result.status,
        amount: result.amount,
        fee: result.fee,
        feeBreakdown: {
          sbsaFeeVatIncl: fb.sbsaFeeVatIncl,
          mmMarkupVatIncl: fb.mmMarkupVatIncl,
          totalFeeVatIncl: fb.totalUserFeeVatIncl,
          vatIncluded: fb.totalOutputVat,
        },
        totalDebit: result.totalDebit,
        currency: result.currency,
      },
    });
  } catch (err) {
    console.error('SBSA RPP initiation error:', err.message);
    // Pass through SBSA business rejection codes (422 = business reject, 400 = validation)
    const httpStatus = err.sbsaStatus === 422 ? 422 : err.sbsaStatus === 400 ? 400 : 500;
    return res.status(httpStatus).json({
      success: false,
      message: err.message || 'Failed to initiate PayShap payment',
      ...(err.sbsaBody ? { sbsaDetail: err.sbsaBody } : {}),
    });
  }
}

/**
 * Initiate PayShap RTP (Request Money)
 * POST /api/v1/standardbank/payshap/rtp
 */
async function initiatePayShapRtp(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const [wallet, user] = await Promise.all([
      db.Wallet.findOne({ where: { userId } }),
      db.User.findByPk(userId, { attributes: ['firstName', 'lastName'] }),
    ]);
    if (!wallet || String(wallet.userId) !== String(userId)) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }
    const walletUserDisplayName = user ? `${user.firstName} ${user.lastName}`.trim() : null;

    const {
      amount,
      currency = 'ZAR',
      payerName,
      payerMobileNumber,
      payerBankName,
      description,
      reference,
      expiryMinutes = 60,
    } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: 'amount is required' });
    }
    if (!payerMobileNumber) {
      return res.status(400).json({ success: false, message: 'payerMobileNumber is required (SBSA RTP uses mobile proxy for debtor)' });
    }
    if (!payerName) {
      return res.status(400).json({ success: false, message: 'payerName is required' });
    }

    const payerBankCode = payerBankName ? getBankCodeFromName(payerBankName) : null;
    const payerProxyDomain = payerBankName ? getProxyDomainFromName(payerBankName) : null;

    const rtpService = require('../services/standardbankRtpService');
    const result = await rtpService.initiateRtpRequest({
      userId,
      walletId: wallet.walletId,
      amount,
      currency,
      payerName,
      payerMobileNumber,
      payerBankCode,
      payerProxyDomain,
      payerBankName,
      description,
      reference,
      expiryMinutes,
      creditorName: walletUserDisplayName ? `RTP requested from ${walletUserDisplayName}` : undefined,
    });

    const fb = result.feeBreakdown || {};
    return res.status(202).json({
      success: true,
      data: {
        merchantTransactionId: result.merchantTransactionId,
        originalMessageId: result.originalMessageId,
        status: result.status,
        amount: result.amount,
        fee: result.fee,
        feeBreakdown: {
          sbsaFeeVatIncl: fb.sbsaFeeVatIncl,
          totalFeeVatIncl: fb.totalUserFeeVatIncl,
          vatIncluded: fb.totalOutputVat,
          mmMarkup: 0,
        },
        netCredit: result.netCredit,
        currency: result.currency,
        expiresAt: result.expiresAt,
      },
    });
  } catch (err) {
    console.error('SBSA RTP initiation error:', err.message);
    // Translate known SBSA rejection codes to user-friendly messages
    let userMessage = err.message || 'Failed to initiate Request to Pay';
    const body = err.sbsaBody;
    if (body && typeof body === 'object') {
      const arr = body.orgnlPmtInfAndSts || body.OrgnlPmtInfAndSts;
      const stsRsn = Array.isArray(arr) && arr[0]?.stsRsnInf?.[0] || arr?.[0]?.StsRsnInf?.[0];
      const prtry = stsRsn?.rsn?.prtry || stsRsn?.Rsn?.Prtry;
      const addtlInf = stsRsn?.addtlInf || stsRsn?.AddtlInf || '';
      if (prtry === 'EPDNF' || (addtlInf && addtlInf.toLowerCase().includes('proxy domain'))) {
        const isUat = (process.env.STANDARDBANK_ENVIRONMENT || 'uat') === 'uat';
        userMessage = isUat
          ? 'Payer\'s mobile number is not in PayShap test directory. Use SBSA test number +27585125485 for UAT.'
          : 'Payer\'s mobile number is not registered for PayShap. The payer needs PayShap enabled at their bank.';
        // Log payload sent for EPDNF diagnosis (production: SBSA proxy directory lookup failed)
        const sent = err.sbsaPayloadSent || {};
        console.warn('SBSA RTP EPDNF: Prxy.Id=%s DbtrAgt=%s | SBSA prtry=%s addtlInf=%s | Share with SBSA support.', sent.prxyId || req.body?.payerMobileNumber, sent.dbtrAgtId || '(unknown)', prtry, addtlInf || '(none)');
      } else if (prtry === 'EAMTI' || (addtlInf && addtlInf.toLowerCase().includes('invalid amount'))) {
        userMessage = addtlInf || 'Invalid amount. Minimum bank request is R10.';
      }
    }
    const httpStatus = err.sbsaStatus === 422 ? 422 : err.sbsaStatus === 400 ? 400 : 500;
    return res.status(httpStatus).json({
      success: false,
      message: userMessage,
      ...(body ? { sbsaDetail: body } : {}),
    });
  }
}

/**
 * Deposit Notification - when money hits MM SBSA main account
 * Reference (CID) = MSISDN → wallet to credit, or float account identifier
 * POST /api/v1/standardbank/notification
 */
async function handleDepositNotification(req, res) {
  const secret = process.env.SBSA_CALLBACK_SECRET;
  const signature = req.headers['x-signature'] || req.headers['X-Signature'];

  if (!secret) {
    console.error('SBSA deposit notification: SBSA_CALLBACK_SECRET not configured');
    return res.status(503).json({ error: 'Notification not configured' });
  }

  let body = req.body;
  if (Buffer.isBuffer(req.body)) {
    try {
      body = JSON.parse(req.body.toString('utf8'));
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }

  const crypto = require('crypto');
  const rawBody = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(body);
  if (!signature) {
    return res.status(401).json({ error: 'Missing X-Signature' });
  }
  try {
    const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const computedBuf = Buffer.from(computed, 'hex');
    const sigBuf = Buffer.from(signature, 'hex');
    if (computedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(computedBuf, sigBuf)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (sigErr) {
    return res.status(401).json({ error: 'Invalid signature format' });
  }

  try {
    const depositService = require('../services/standardbankDepositNotificationService');
    const result = await depositService.processDepositNotification(body);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Processing failed' });
    }

    return res.status(200).json({ success: true, credited: result.credited });
  } catch (err) {
    console.error('SBSA deposit notification error:', err.message);
    return res.status(500).json({ error: 'Callback processing failed' });
  }
}

/**
 * GET RPP payment status (polling fallback)
 * GET /api/v1/standardbank/payshap/rpp/:uetr/status
 *
 * :uetr = UETR returned at initiation (stored as transactionId in StandardBankTransaction)
 * Gustaf confirmed: transactionIdentifier = UETR from initiation request
 */
async function getRppStatus(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { uetr } = req.params;
    if (!uetr) {
      return res.status(400).json({ success: false, message: 'uetr is required' });
    }

    // Verify this transaction belongs to the requesting user
    const record = await db.StandardBankTransaction.findOne({
      where: { transactionId: uetr, userId },
    });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const pollingService = require('../services/standardbankPollingService');
    const result = await pollingService.pollRppStatus(record.originalMessageId, uetr);

    return res.status(200).json({
      success: true,
      data: {
        uetr,
        originalMessageId: record.originalMessageId,
        status: result.status,
        terminal: result.terminal,
        amount: record.amount,
        currency: record.currency,
      },
    });
  } catch (err) {
    console.error('SBSA RPP status poll error:', err.message);
    const httpStatus = err.sbsaStatus || 500;
    return res.status(httpStatus).json({
      success: false,
      message: err.message || 'Failed to retrieve payment status',
    });
  }
}

/**
 * GET RTP request status (polling fallback)
 * GET /api/v1/standardbank/payshap/rtp/:uetr/status
 *
 * :uetr = UETR returned at initiation (stored as requestId in StandardBankRtpRequest)
 */
async function getRtpStatus(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { uetr } = req.params;
    if (!uetr) {
      return res.status(400).json({ success: false, message: 'uetr is required' });
    }

    const record = await db.StandardBankRtpRequest.findOne({
      where: { requestId: uetr, userId },
    });
    if (!record) {
      return res.status(404).json({ success: false, message: 'RTP request not found' });
    }

    const pollingService = require('../services/standardbankPollingService');
    const result = await pollingService.pollRtpStatus(record.originalMessageId, uetr);

    return res.status(200).json({
      success: true,
      data: {
        uetr,
        originalMessageId: record.originalMessageId,
        status: result.status,
        terminal: result.terminal,
        amount: record.amount,
        currency: record.currency,
        expiresAt: record.expiresAt,
      },
    });
  } catch (err) {
    console.error('SBSA RTP status poll error:', err.message);
    const httpStatus = err.sbsaStatus || 500;
    return res.status(httpStatus).json({
      success: false,
      message: err.message || 'Failed to retrieve RTP status',
    });
  }
}

module.exports = {
  handleRppCallback,
  handleRppCallbackWithParams,
  handleRppRealtimeCallback,
  handleRtpCallback,
  handleRtpCallbackWithParams,
  handleRtpRealtimeCallback,
  handleDepositNotification,
  initiatePayShapRpp,
  initiatePayShapRtp,
  getRppStatus,
  getRtpStatus,
};
