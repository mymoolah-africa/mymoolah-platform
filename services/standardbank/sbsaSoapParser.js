'use strict';

/**
 * SBSA H2H SOAP XML Parser — Credit Notification (PaymentNotificationV1)
 *
 * Parses SBSA's SendTransactionNotificationAsync SOAP messages into
 * a normalised payload compatible with processDepositNotification().
 *
 * SBSA WSDL:  PaymentNotificationBaseV1_0.wsdl
 * SBSA XSD:   PaymentNotificationBaseSRVV1_0.xsd
 * Sample:     PaymentNotification_SampleMessage.dat
 *
 * Amount encoding: SBSA sends a 15-char zero-padded string in CENTS
 *   e.g. "000000000300000" = 3 000.00 ZAR  (300000 cents / 100)
 */

const { XMLParser } = require('fast-xml-parser');

const SBSA_NS_BODY    = 'NS2:SendTransactionNotificationAsync';
const SBSA_NS_BODY_V2 = 'SendTransactionNotificationAsync';

const parserOptions = {
  ignoreAttributes: false,
  removeNSPrefix: false,
  parseTagValue: false,
  trimValues: true,
};

const parserOptionsStripped = {
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
};

/**
 * Detect whether a raw string is SOAP XML (not JSON).
 * @param {string} raw
 * @returns {boolean}
 */
function isSoapXml(raw) {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trimStart();
  return trimmed.startsWith('<') && (
    trimmed.includes('Envelope') ||
    trimmed.includes('SendTransactionNotificationAsync')
  );
}

/**
 * Parse SBSA amount string → number in rands.
 *
 * SBSA encodes amounts as zero-padded CENTS:
 *   "000000000300000" → 3000.00 rands
 *   "000000000001050" → 10.50 rands
 *
 * If the value is already a small decimal (not zero-padded), treat as rands.
 */
function parseAmount(raw) {
  if (!raw) return 0;
  const s = String(raw).trim();

  if (/^0{2,}/.test(s) && s.length >= 10) {
    const cents = parseInt(s, 10);
    return cents / 100;
  }

  return parseFloat(s) || 0;
}

/**
 * Recursively search for a key in a nested object,
 * stripping XML namespace prefixes. Returns first match.
 */
function deepFind(obj, targetKey) {
  if (!obj || typeof obj !== 'object') return undefined;

  for (const key of Object.keys(obj)) {
    const stripped = key.includes(':') ? key.split(':').pop() : key;
    if (stripped === targetKey) return obj[key];

    const child = deepFind(obj[key], targetKey);
    if (child !== undefined) return child;
  }
  return undefined;
}

/**
 * Parse SBSA SOAP XML into a normalised deposit notification payload.
 *
 * @param {string} xmlString - Raw SOAP XML body
 * @returns {{ transactionId, referenceNumber, amount, currency, description, source, debitCreditInd, fullAcctNumber, rqUID, trnDate, trnTime, balanceAmount, fiName, branchIdent }}
 * @throws {Error} if XML is malformed or critical fields are missing
 */
function parseSoapNotification(xmlString) {
  const parser = new XMLParser(parserOptionsStripped);
  const doc = parser.parse(xmlString);

  const body = deepFind(doc, 'Body');
  if (!body) {
    throw new Error('SOAP Body not found in XML');
  }

  const notification = deepFind(body, 'SendTransactionNotificationAsync');
  if (!notification) {
    throw new Error('SendTransactionNotificationAsync element not found');
  }

  const rqUID = deepFind(notification, 'RqUID') || '';

  const trnInfo = deepFind(notification, 'TrnNotificationInfo');
  if (!trnInfo) {
    throw new Error('TrnNotificationInfo element not found');
  }

  const fullAcctNumber = deepFind(trnInfo, 'FullAcctNumber') || '';

  const trnData = deepFind(trnInfo, 'TrnData');
  if (!trnData) {
    throw new Error('TrnData element not found');
  }

  const trnDt = deepFind(trnData, 'TrnDt') || '';
  const trnTime = deepFind(trnData, 'TrnTime') || '';

  const trnAmt = deepFind(trnData, 'TrnAmt') || {};
  const amtRaw = deepFind(trnAmt, 'Amt') || '0';
  const curCodeValue = deepFind(trnAmt, 'CurCodeValue') || 'ZAR';

  const acctTrnId = deepFind(trnData, 'AcctTrnId') || '';

  const trnEffDt = deepFind(trnData, 'TrnEffDt') || '';

  const balAmtObj = deepFind(trnData, 'BalAmt') || {};
  const balAmtRaw = deepFind(balAmtObj, 'Amt') || '0';

  const fiData = deepFind(trnInfo, 'FIData') || {};
  const fiName = deepFind(fiData, 'Name') || '';
  const branchIdent = deepFind(fiData, 'BranchIdent') || '';

  const debitCreditInd = deepFind(trnInfo, 'DebitCreditInd') || '';
  const referenceNumber = deepFind(trnInfo, 'ReferenceNumber') || '';

  const amount = parseAmount(amtRaw);
  const balanceAmount = parseAmount(balAmtRaw);

  if (!acctTrnId && !rqUID) {
    throw new Error('No transaction identifier (AcctTrnId or RqUID) found');
  }

  const transactionId = `SBSA-SOAP-${acctTrnId || rqUID}`;

  return {
    transactionId,
    referenceNumber: referenceNumber.trim(),
    amount,
    currency: curCodeValue,
    description: `SBSA H2H credit notification — AcctTrnId: ${acctTrnId}, Date: ${trnDt} ${trnTime}`,
    source: 'SBSA_SOAP_CREDIT_NOTIFICATION',

    debitCreditInd,
    fullAcctNumber,
    rqUID,
    trnDate: trnDt,
    trnTime,
    trnEffDt,
    balanceAmount,
    fiName,
    branchIdent,
  };
}

module.exports = {
  isSoapXml,
  parseSoapNotification,
  parseAmount,
};
