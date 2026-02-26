'use strict';

/**
 * Standard Bank PayShap Controller
 * RPP (Rapid Payments) and RTP (Request to Pay) - callbacks and initiation
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-12
 */

const { validateGroupHeaderHash, extractGrpHdr } = require('../integrations/standardbank/callbackValidator');
const db = require('../models');

function getBankCodeFromName(bankName) {
  const bankCodes = {
    'ABSA Bank': '632005',
    'African Bank': '430000',
    'Bidvest Bank': '462005',
    'Capitec Bank': '470010',
    'Discovery Bank': '679000',
    'First National Bank (FNB)': '250655',
    'FNB': '250655',
    'Investec Bank': '580105',
    'Nedbank': '198765',
    'Standard Bank': '051001',
    'TymeBank': '678910',
  };
  return bankCodes[bankName] || '';
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

  const grpHdr = extractGrpHdr(body, 'rpp');
  if (!grpHdr) {
    return res.status(400).json({ error: 'Missing grpHdr' });
  }

  if (!headerHash || !validateGroupHeaderHash(grpHdr, headerHash, secret)) {
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

  const grpHdr = extractGrpHdr(body, 'rpp') || body;
  if (!validateGroupHeaderHash(grpHdr, headerHash, secret)) {
    return res.status(401).json({ error: 'Invalid hash' });
  }

  try {
    // Prefer path param clientMessageId; fall back to body if SBSA omits it
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

  const grpHdr = extractGrpHdr(body, 'rtp');
  if (!grpHdr) {
    return res.status(400).json({ error: 'Missing grpHdr' });
  }

  if (!headerHash || !validateGroupHeaderHash(grpHdr, headerHash, secret)) {
    return res.status(401).json({ error: 'Invalid x-GroupHeader-Hash' });
  }

  try {
    const orgnlMsgId = grpHdr.OrgnlMsgId?.Id ?? grpHdr.orgnlMsgId?.id ?? null;
    const pmtInf = body.cstmrPmtReqStsRpt?.orgnlPmtReqInfAndSts ?? body.cstmrPmtReqStsRpt?.pmtInf ?? [];
    const infList = Array.isArray(pmtInf) ? pmtInf : [pmtInf];

    for (const inf of infList) {
      const txInf = inf.txInfAndSts ?? inf.cdtTrfTx ?? [];
      const txList = Array.isArray(txInf) ? txInf : [txInf];
      for (const tx of txList) {
        const txId = tx.txId?.txId ?? tx.txId ?? tx.instrId;
        const sts = tx.txSts ?? tx.sts ?? 'ACCP';
        await processRtpCallback(orgnlMsgId, txId, sts, body);
      }
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

  const grpHdr = extractGrpHdr(body, 'rtp') || body;
  if (!validateGroupHeaderHash(grpHdr, headerHash, secret)) {
    return res.status(401).json({ error: 'Invalid hash' });
  }

  try {
    // Prefer path param clientMessageId; fall back to body
    const orgnlMsgId = clientMessageId
      || body.originalMessageId
      || body.orgnlMsgId;
    const txId = transactionIdentifier
      || body.transactionIdentifier
      || body.txId;
    const sts = body.txSts ?? body.sts ?? 'ACSP';
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

    const wallet = await db.Wallet.findOne({ where: { userId } });
    if (!wallet || String(wallet.userId) !== String(userId)) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

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
      return res.status(400).json({ success: false, message: 'payerMobileNumber is required' });
    }
    if (!payerName) {
      return res.status(400).json({ success: false, message: 'payerName is required' });
    }

    const rtpService = require('../services/standardbankRtpService');
    const result = await rtpService.initiateRtpRequest({
      userId,
      walletId: wallet.walletId,
      amount,
      currency,
      payerName,
      payerMobileNumber,
      payerBankName,
      description,
      reference,
      expiryMinutes,
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
    // Pass through SBSA business rejection codes (422 = business reject, 400 = validation)
    const httpStatus = err.sbsaStatus === 422 ? 422 : err.sbsaStatus === 400 ? 400 : 500;
    return res.status(httpStatus).json({
      success: false,
      message: err.message || 'Failed to initiate Request to Pay',
      ...(err.sbsaBody ? { sbsaDetail: err.sbsaBody } : {}),
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
