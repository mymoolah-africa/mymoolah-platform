'use strict';

/**
 * Pain.002 Parser — SBSA H2H Wage/Salary Disbursement
 *
 * Parses SBSA's ISO 20022 Pain.002 (CustomerPaymentStatusReport) XML response
 * files to extract per-payment acceptance/rejection statuses.
 *
 * SBSA places Pain.002 files in the SFTP Inbox after processing a Pain.001.
 * The SFTP poller downloads these and passes the XML to this parser.
 *
 * Response types emitted by SBSA (one ISO 20022 Pain.002 document per file):
 *   ACK      — File received (GrpSts RCVD)
 *   NACK     — File rejected outright (GrpSts RJCT) — e.g. duplicate MsgId
 *   INTAUD   — Interim audit (GrpSts PDNG/PART/RJCT)
 *   FINAUD   — Final audit (GrpSts ACSP/PART/RJCT)
 *   VET_DATA — Validation data (mixed files)
 *   UNP_DATA — Unpaid / post-settlement bounce notifications. Authoritative
 *              over FINAUD on a per-transaction basis (confirmed UAT 2026-04-17).
 *
 * Status Code 0009 is dual-purpose on SBSA's current profile:
 *   - "INVALID ACCOUNT" (ordering account invalid) — RM9 UAT 2026-04-17
 *   - "RUN EXCEEDS LIMIT" (batch over sub-batch limit) — RM5v2 UAT 2026-04-20
 * The <AddtlInf> description is the authoritative differentiator and must
 * be preserved in rejectionReasonDetail so the poller/consumer can disambiguate.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17 (updated 2026-04-23: response-type classifier + AddtlInf)
 */

const { mapRejectionCode } = require('./pain001BulkBuilder');

const RESPONSE_TYPE_REGEX =
  /MYMOOLAH_[A-Z0-9]+_(ACK|NACK|INTAUD|FINAUD|UNP_DATA|VET_DATA)_(TST|PRD)_/i;

/**
 * Classify an SBSA response file by its filename.
 * Returns one of: 'ACK' | 'NACK' | 'INTAUD' | 'FINAUD' | 'UNPAID' | 'VET' | null
 *
 * SBSA naming pattern: MYMOOLAH_OWN11_<TYPE>_(TST|PRD)_<timestamp>_<seq>.xml
 *
 * @param {string} filename
 * @returns {string|null}
 */
function classifyResponseType(filename) {
  if (!filename || typeof filename !== 'string') return null;
  const m = filename.match(RESPONSE_TYPE_REGEX);
  if (!m) return null;
  const raw = m[1].toUpperCase();
  if (raw === 'UNP_DATA') return 'UNPAID';
  if (raw === 'VET_DATA') return 'VET';
  return raw;
}

/**
 * Parse a Pain.002 XML string.
 *
 * Returns a structured result:
 * {
 *   msgId:         string,   // Pain.002 message ID
 *   originalMsgId: string,   // MsgId of the original Pain.001
 *   groupStatus:   string,   // ACCP | ACSP | PART | RJCT | PDNG | RCVD
 *   responseType:  string|null, // ACK|NACK|INTAUD|FINAUD|UNPAID|VET (from filename, if supplied)
 *   addtlInf:      string|null, // Group-level AddtlInf (if any)
 *   payments: [
 *     {
 *       endToEndId:           string,
 *       txStatus:             string,    // raw TxSts (ACSP, ACWC, PDNG, RJCT, ...)
 *       status:               'accepted' | 'rejected',
 *       rejectionCode:        string | null,
 *       rejectionReason:      string | null,
 *       rejectionReasonDetail:string | null, // AddtlInf description (authoritative)
 *       unpaidReasonCode:     string | null, // Only for UNPAID responses
 *       permanent:            boolean,
 *     }
 *   ]
 * }
 *
 * @param {string} xmlString
 * @param {Object} [options]
 * @param {string} [options.filename] - Source filename; used to set responseType
 * @returns {Object}
 */
function parsePain002(xmlString, options = {}) {
  if (!xmlString || typeof xmlString !== 'string') {
    throw new Error('Pain.002 XML string is required');
  }

  // ── Lightweight regex-based parser (avoids heavy XML library dependency) ──
  // This is a targeted parser for SBSA's Pain.002 structure.
  // If SBSA changes their format significantly, a full XML library (e.g. fast-xml-parser)
  // can be swapped in without changing the interface.

  const tag = (name, src) => {
    const m = src.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
    return m ? m[1].trim() : null;
  };
  const allOf = (name, src) => {
    const re = new RegExp(`<${name}[\\s\\S]*?<\\/${name}>`, 'gi');
    return src.match(re) || [];
  };

  const msgId         = tag('MsgId',      xmlString) || '';
  const originalMsgId = tag('OrgnlMsgId', xmlString) || '';
  const groupStatus   = tag('GrpSts',     xmlString) || 'PART';
  const responseType  = classifyResponseType(options.filename || '');

  // Group-level AddtlInf lives inside <OrgnlGrpInfAndSts><StsRsnInf><AddtlInf>
  // or sometimes at the OrgnlGrpInfAndSts level directly. Capture the first match.
  const groupAddtlInf = (() => {
    const orgnlBlock = tag('OrgnlGrpInfAndSts', xmlString);
    if (orgnlBlock) {
      const rsn = tag('StsRsnInf', orgnlBlock);
      const fromRsn = rsn ? tag('AddtlInf', rsn) : null;
      return fromRsn || tag('AddtlInf', orgnlBlock) || null;
    }
    return tag('AddtlInf', xmlString) || null;
  })();

  const payments = [];

  // Each <TxInfAndSts> block is one payment's status
  const txBlocks = allOf('TxInfAndSts', xmlString);
  for (const block of txBlocks) {
    const endToEndId = tag('OrgnlEndToEndId', block) || tag('EndToEndId', block) || '';
    const txStatus   = tag('TxSts', block) || '';
    const txUpper    = txStatus.toUpperCase();

    // ACSP/ACSC/ACCP are clear acceptances. ACWC = "Accepted With Change" — used
    // on UNPAID responses to mean "settlement attempted but conditional change";
    // per SBSA guidance (Colette 2026-04-20) UNPAID is authoritative, and ACWC
    // in UNPAID indicates a post-settlement amendment, NOT a clean success.
    // We keep the raw TxSts for the consumer to decide.
    const isAccepted = ['ACSP', 'ACSC', 'ACCP'].includes(txUpper) ||
      (txUpper === 'ACWC' && responseType !== 'UNPAID');

    let rejectionCode         = null;
    let rejectionReason       = null;
    let rejectionReasonDetail = null;
    let unpaidReasonCode      = null;
    let permanent             = false;

    // AddtlInf is useful on both accepted and rejected transactions
    // (UNPAID ACWC carries an UnpaidReasonCode in AddtlInf, for example).
    const stsRsnBlock = tag('StsRsnInf', block);

    if (stsRsnBlock) {
      rejectionCode = tag('Cd', stsRsnBlock) || tag('Prtry', stsRsnBlock) || null;
      rejectionReasonDetail = tag('AddtlInf', stsRsnBlock) || null;
    }
    if (!rejectionCode) {
      rejectionCode = tag('Cd', block) || null;
    }
    if (!rejectionReasonDetail) {
      rejectionReasonDetail = tag('AddtlInf', block) || null;
    }

    // For UNPAID responses, SBSA carries the "Unpaid Reason Code" inside
    // <AddtlInf> as e.g. "Unpaid Reason Code 14". Pull the trailing integer
    // so consumers can key off it.
    if (responseType === 'UNPAID' && rejectionReasonDetail) {
      const urc = rejectionReasonDetail.match(/(\d{1,3})\b/);
      if (urc) unpaidReasonCode = urc[1];
    }

    if (!isAccepted) {
      const mapped = mapRejectionCode(rejectionCode);
      // Prefer the SBSA AddtlInf description over the generic dictionary entry
      // when present — especially important for code 0009 where the numeric
      // code is overloaded ("INVALID ACCOUNT" vs "RUN EXCEEDS LIMIT").
      rejectionReason = rejectionReasonDetail || mapped.reason;
      permanent       = mapped.permanent;
    }

    payments.push({
      endToEndId,
      txStatus: txUpper || null,
      status:          isAccepted ? 'accepted' : 'rejected',
      rejectionCode,
      rejectionReason,
      rejectionReasonDetail,
      unpaidReasonCode,
      permanent,
    });
  }

  // If there are no TxInfAndSts blocks, fall back to group-level status.
  // Also normalise the group-level AddtlInf onto the result so consumers
  // can disambiguate code 0009 at the file level (RM5v2 RUN EXCEEDS LIMIT
  // came back with group-level 0009 and no per-tx blocks on RJCT).
  if (payments.length === 0 && groupStatus === 'ACCP') {
    return {
      msgId,
      originalMsgId,
      groupStatus: 'ACCP',
      responseType,
      addtlInf: groupAddtlInf,
      payments: [],
    };
  }

  return {
    msgId,
    originalMsgId,
    groupStatus,
    responseType,
    addtlInf: groupAddtlInf,
    payments,
  };
}

module.exports = { parsePain002, classifyResponseType };
