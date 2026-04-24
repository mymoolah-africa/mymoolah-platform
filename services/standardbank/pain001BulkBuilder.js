'use strict';

/**
 * Pain.001 Bulk Builder — SBSA H2H Wage/Salary Disbursement
 *
 * Builds an ISO 20022 CustomerCreditTransferInitiation (pain.001.001.03) XML
 * document for bulk EFT submissions via SBSA's Host-to-Host SFTP channel
 * (B2BI / SSVS processing).
 *
 * Schema: pain.001.001.03 — required by SBSA's SSVS-XML validator.
 * Structure validated against SBSA's working sample (LEGACY_PAIN1V3_SSVS_INPUT_SAMPLE3.xml).
 *
 * One Pain.001 document per DisbursementRun. Each beneficiary (employee) is
 * one <CdtTrfTxInf> within a single <PmtInf> block.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-27
 */

const crypto = require('crypto');
const {
  nextBusinessDay,
  isBusinessDay,
  describeDate,
} = require('../../utils/saPublicHolidays');

const logger = {
  warn: (...a) => console.warn('[pain001BulkBuilder]', ...a),
};

/**
 * ISO 20022 Pain.002 rejection code → human-readable reason + permanent flag
 */
const REJECTION_MESSAGES = {
  AC01: { reason: 'Invalid account number — please ask the employee to verify their bank account number.', permanent: true },
  AC04: { reason: 'Account closed — the employee must provide new bank account details.', permanent: true },
  AC06: { reason: 'Account blocked or frozen — the employee should contact their bank to resolve.', permanent: false },
  AGNT: { reason: 'Incorrect branch code — correct the branch code and resubmit.', permanent: true },
  BE01: { reason: 'Account holder name does not match — verify the employee name matches bank records.', permanent: true },
  AM04: { reason: 'Insufficient funds in your float account — top up your balance and resubmit.', permanent: false },
  DUPL: { reason: 'Duplicate payment detected by SBSA — remove the duplicate from this run.', permanent: true },
  MD07: { reason: 'Account holder is deceased — remove from payroll permanently.', permanent: true },
  FF01: { reason: 'File format error (affects entire batch) — contact MyMoolah support.', permanent: true },
  MS02: { reason: 'Unspecified rejection reason — please contact SBSA for clarification.', permanent: false },
};

/**
 * Map a Pain.002 rejection code to a human-readable message.
 * @param {string|null} code
 * @returns {{ reason: string, permanent: boolean }}
 */
function mapRejectionCode(code) {
  if (!code) return { reason: 'Unknown rejection reason — contact SBSA.', permanent: false };
  return REJECTION_MESSAGES[code.toUpperCase()] || { reason: `Rejection code: ${code} — contact SBSA for details.`, permanent: false };
}

/**
 * Generate the SBSA-compliant filename for a Pain.001 file.
 * Format: MYMOOLAH_OWN11_Pain001v3_ZAR_TST_yyyymmddhhmmssSSS.xml
 *
 * @returns {string}
 */
function generatePain001Filename() {
  const companyCode = process.env.SBSA_COMPANY_CODE || 'MYMOOLAH';
  const bolUserId   = process.env.SBSA_BOL_USER_ID  || 'OWN11';
  const env         = process.env.SBSA_FILE_ENV     || 'TST';
  const now = new Date();
  const ts = now.getFullYear().toString()
    + String(now.getMonth() + 1).padStart(2, '0')
    + String(now.getDate()).padStart(2, '0')
    + String(now.getHours()).padStart(2, '0')
    + String(now.getMinutes()).padStart(2, '0')
    + String(now.getSeconds()).padStart(2, '0')
    + String(now.getMilliseconds()).padStart(3, '0');
  return `${companyCode}_${bolUserId}_Pain001v3_ZAR_${env}_${ts}.xml`;
}

/**
 * Build a full ISO 20022 pain.001.001.03 XML string for a disbursement run.
 *
 * @param {Object} params
 * @param {string} params.runReference       - DisbursementRun.run_reference
 * @param {string} params.rail               - 'eft' | 'rtc' (stored for tracking; does not alter XML structure)
 * @param {string} [params.paymentDate]      - ISO date YYYY-MM-DD. If omitted,
 *                                             defaults to the next SA business
 *                                             day strictly after today (skips
 *                                             weekends + public holidays via
 *                                             utils/saPublicHolidays).
 *                                             If supplied, honoured verbatim
 *                                             but a structured warning is logged
 *                                             when the date is not a business
 *                                             day (SBSA will typically roll but
 *                                             our internal ledger will not).
 * @param {string} [params.debtorName]       - Account holder name (MyMoolah)
 * @param {string} [params.debtorAccount]    - SBSA treasury account number
 * @param {string} [params.debtorBranchCode] - SBSA branch code
 * @param {string} [params.bolUserId]        - SBSA BOL User ID (e.g. OWN11)
 * @param {Array}  params.payments           - Array of payment objects
 * @param {string} params.payments[].endToEndId
 * @param {string} params.payments[].beneficiaryName
 * @param {string} params.payments[].accountNumber
 * @param {string} params.payments[].branchCode
 * @param {number} params.payments[].amount
 * @param {string} [params.payments[].reference]  - Narrative on employee statement
 * @param {string} [params.payments[].accountType] - Account type code: CACC (current), SVGS (savings). Default: CACC
 * @returns {{ xml: string, msgId: string, totalAmount: number, paymentCount: number }}
 */
function buildPain001Bulk(params) {
  const {
    runReference,
    paymentDate,
    debtorName       = process.env.SBSA_DEBTOR_NAME    || 'MyMoolah (Pty) Ltd',
    debtorAccount    = process.env.SBSA_DEBTOR_ACCOUNT || '000000000',
    debtorBranchCode = process.env.SBSA_DEBTOR_BRANCH  || '051001',
    bolUserId        = process.env.SBSA_BOL_USER_ID    || 'OWN11',
    payments,
  } = params;

  if (!payments || payments.length === 0) {
    throw new Error('payments array is required and must not be empty');
  }

  // Resolve the execution date with SA public-holiday awareness.
  //   - If the caller omits `paymentDate`, default to the next SA business
  //     day strictly AFTER today. This avoids Sat/Sun/public-holiday
  //     ReqdExctnDt values that SBSA would silently roll forward (causing
  //     our internal ledger's expected-settlement date to disagree with
  //     what SBSA actually books).
  //   - If the caller supplies `paymentDate`, honour it verbatim but emit
  //     a structured warning when it is not a business day. The decision
  //     to proceed remains with the caller (may be intentional in tests
  //     or for a specific future-dated run).
  const resolvedPaymentDate = paymentDate || nextBusinessDay(new Date().toISOString().slice(0, 10));
  if (paymentDate && !isBusinessDay(paymentDate)) {
    const info = describeDate(paymentDate);
    const suggestion = nextBusinessDay(paymentDate);
    logger.warn(
      `ReqdExctnDt=${paymentDate} is not an SA business day (${info.reason}). ` +
      `SBSA typically rolls forward to ${suggestion}; internal ledger will still ` +
      `record ${paymentDate}. Caller should pass a business day unless this is intentional.`
    );
  }

  const creDtTm = new Date().toISOString();
  const cleanRef = (s) => String(s).replace(/[^a-zA-Z0-9 \-\/\.,\(\)\?\+]/g, '').substring(0, 35);
  const msgId = `MM-${runReference.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25)}-${Date.now().toString(36).toUpperCase()}`.substring(0, 35);
  const pmtInfId = `PMT-${msgId}`.substring(0, 35);

  const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const creditLines = payments.map((p) => {
    const instrId = `I${crypto.randomBytes(8).toString('hex').toUpperCase()}`.substring(0, 35);
    const narrative = cleanRef(p.reference || `PAYROLL ${runReference}`);
    return `
      <CdtTrfTxInf>
        <PmtId>
          <InstrId>${instrId}</InstrId>
          <EndToEndId>${cleanRef(p.endToEndId)}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="ZAR">${Number(p.amount).toFixed(2)}</InstdAmt>
        </Amt>
        <ChrgBr>CRED</ChrgBr>
        <CdtrAgt>
          <FinInstnId>
            <ClrSysMmbId>
              <MmbId>${p.branchCode}</MmbId>
            </ClrSysMmbId>
            <PstlAdr>
              <Ctry>ZA</Ctry>
            </PstlAdr>
          </FinInstnId>
        </CdtrAgt>
        <Cdtr>
          <Nm>${cleanRef(p.beneficiaryName)}</Nm>
          <PstlAdr>
            <Ctry>ZA</Ctry>
          </PstlAdr>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <Othr>
              <Id>${p.accountNumber}</Id>
            </Othr>
          </Id>
          <Tp>
            <Cd>${p.accountType || 'CACC'}</Cd>
          </Tp>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>${narrative}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${creDtTm}</CreDtTm>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>${cleanRef(debtorName)}</Nm>
        <Id>
          <OrgId>
            <Othr>
              <Id>${bolUserId}</Id>
              <SchmeNm>
                <Cd>CUST</Cd>
              </SchmeNm>
            </Othr>
          </OrgId>
        </Id>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${pmtInfId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <InstrPrty>NORM</InstrPrty>
      </PmtTpInf>
      <ReqdExctnDt>${resolvedPaymentDate}</ReqdExctnDt>
      <Dbtr>
        <Nm>${cleanRef(debtorName)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <Othr>
            <Id>${debtorAccount}</Id>
          </Othr>
        </Id>
        <Ccy>ZAR</Ccy>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <ClrSysMmbId>
            <MmbId>${debtorBranchCode}</MmbId>
          </ClrSysMmbId>
          <PstlAdr>
            <Ctry>ZA</Ctry>
          </PstlAdr>
        </FinInstnId>
      </DbtrAgt>${creditLines}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

  return { xml, msgId, totalAmount, paymentCount: payments.length };
}

module.exports = { buildPain001Bulk, mapRejectionCode, REJECTION_MESSAGES, generatePain001Filename };
