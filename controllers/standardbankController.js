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
 * RPP Realtime Callback - path params
 * GET/POST /api/v1/standardbank/realtime-callback/:originalMessageId/:paymentInformationId/:transactionIdentifier
 */
async function handleRppRealtimeCallback(req, res) {
  const { originalMessageId, paymentInformationId, transactionIdentifier } = req.params;
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
    const sts = body.txSts ?? body.sts ?? 'ACSP';
    await processRppCallback(originalMessageId, transactionIdentifier, sts, body);
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
 * RTP Realtime Callback
 * POST /api/v1/standardbank/rtp-realtime-callback
 */
async function handleRtpRealtimeCallback(req, res) {
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
    const orgnlMsgId = body.originalMessageId ?? body.orgnlMsgId ?? req.params?.originalMessageId;
    const txId = body.transactionIdentifier ?? body.txId;
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
      creditorPhone,
      creditorName,
      bankCode,
      bankName,
      description,
      reference,
    } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: 'amount is required' });
    }
    if (!creditorAccountNumber && !creditorPhone) {
      return res.status(400).json({ success: false, message: 'creditorAccountNumber or creditorPhone required' });
    }

    const rppService = require('../services/standardbankRppService');
    const result = await rppService.initiateRppPayment({
      userId,
      walletId,
      amount,
      currency,
      creditorAccountNumber: creditorAccountNumber || undefined,
      creditorProxy: creditorPhone || undefined,
      creditorName,
      bankCode,
      bankName,
      description,
      reference,
    });

    return res.status(202).json({
      success: true,
      data: {
        merchantTransactionId: result.merchantTransactionId,
        originalMessageId: result.originalMessageId,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
      },
    });
  } catch (err) {
    console.error('SBSA RPP initiation error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to initiate PayShap payment',
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
      payerAccountNumber,
      payerMobileNumber,
      payerBankCode,
      payerBankName,
      description,
      reference,
      expiryMinutes = 60,
    } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: 'amount is required' });
    }
    if (!payerAccountNumber && !payerMobileNumber) {
      return res.status(400).json({ success: false, message: 'payerAccountNumber or payerMobileNumber required' });
    }
    if (!payerName) {
      return res.status(400).json({ success: false, message: 'payerName is required' });
    }

    const derivedBankCode = payerBankCode || (payerBankName ? getBankCodeFromName(payerBankName) : null);

    const rtpService = require('../services/standardbankRtpService');
    const result = await rtpService.initiateRtpRequest({
      userId,
      walletId: wallet.walletId,
      amount,
      currency,
      payerName,
      payerAccountNumber: payerAccountNumber || undefined,
      payerMobileNumber: payerMobileNumber || undefined,
      payerBankCode: derivedBankCode,
      payerBankName,
      description,
      reference,
      expiryMinutes,
    });

    return res.status(202).json({
      success: true,
      data: {
        merchantTransactionId: result.merchantTransactionId,
        originalMessageId: result.originalMessageId,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        expiresAt: result.expiresAt,
      },
    });
  } catch (err) {
    console.error('SBSA RTP initiation error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to initiate Request to Pay',
    });
  }
}

module.exports = {
  handleRppCallback,
  handleRppRealtimeCallback,
  handleRtpCallback,
  handleRtpRealtimeCallback,
  initiatePayShapRpp,
  initiatePayShapRtp,
};
