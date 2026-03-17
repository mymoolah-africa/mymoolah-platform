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
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17
 */

const { mapRejectionCode } = require('./pain001BulkBuilder');

/**
 * Parse a Pain.002 XML string.
 *
 * Returns a structured result:
 * {
 *   msgId:         string,   // Pain.002 message ID
 *   originalMsgId: string,   // MsgId of the original Pain.001
 *   groupStatus:   string,   // ACCP | PART | RJCT
 *   payments: [
 *     {
 *       endToEndId:      string,
 *       status:          'accepted' | 'rejected',
 *       rejectionCode:   string | null,
 *       rejectionReason: string | null,
 *       permanent:       boolean,
 *     }
 *   ]
 * }
 *
 * @param {string} xmlString
 * @returns {Object}
 */
function parsePain002(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') {
    throw new Error('Pain.002 XML string is required');
  }

  // ── Lightweight regex-based parser (avoids heavy XML library dependency) ──
  // This is a targeted parser for SBSA's Pain.002 structure.
  // If SBSA changes their format significantly, a full XML library (e.g. fast-xml-parser)
  // can be swapped in without changing the interface.

  const tag   = (name, src) => { const m = src.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i')); return m ? m[1].trim() : null; };
  const attr  = (name, src) => { const m = src.match(new RegExp(`<${name}\\s[^>]*Sts="([^"]+)"`, 'i')); return m ? m[1] : null; };
  const allOf = (name, src) => { const re = new RegExp(`<${name}[\\s\\S]*?<\\/${name}>`, 'gi'); return src.match(re) || []; };

  const msgId         = tag('MsgId',     xmlString) || '';
  const originalMsgId = tag('OrgnlMsgId', xmlString) || '';
  const groupStatus   = tag('GrpSts',    xmlString) || 'PART';

  const payments = [];

  // Each <TxInfAndSts> block is one payment's status
  const txBlocks = allOf('TxInfAndSts', xmlString);
  for (const block of txBlocks) {
    const endToEndId = tag('OrgnlEndToEndId', block) || tag('EndToEndId', block) || '';
    const txStatus   = tag('TxSts', block) || '';
    const isAccepted = ['ACSP', 'ACSC', 'ACCP', 'ACWC'].includes(txStatus.toUpperCase());

    let rejectionCode   = null;
    let rejectionReason = null;
    let permanent       = false;

    if (!isAccepted) {
      // SBSA puts the reason code inside <StsRsnInf><Rsn><Cd>
      const stsRsnBlock = tag('StsRsnInf', block);
      if (stsRsnBlock) {
        rejectionCode = tag('Cd', stsRsnBlock) || tag('Prtry', stsRsnBlock) || null;
      }
      if (!rejectionCode) {
        // Sometimes directly in <Rsn><Cd>
        rejectionCode = tag('Cd', block) || null;
      }
      const mapped = mapRejectionCode(rejectionCode);
      rejectionReason = mapped.reason;
      permanent       = mapped.permanent;
    }

    payments.push({
      endToEndId,
      status:          isAccepted ? 'accepted' : 'rejected',
      rejectionCode,
      rejectionReason,
      permanent,
    });
  }

  // If there are no TxInfAndSts blocks, fall back to group-level status
  if (payments.length === 0 && groupStatus === 'ACCP') {
    return { msgId, originalMsgId, groupStatus: 'ACCP', payments: [] };
  }

  return { msgId, originalMsgId, groupStatus, payments };
}

module.exports = { parsePain002 };
