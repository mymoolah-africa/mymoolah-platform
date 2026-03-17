'use strict';

/**
 * Pain.001 Bulk Builder — SBSA H2H Wage/Salary Disbursement
 *
 * Builds an ISO 20022 CustomerCreditTransferInitiation (Pain.001.001.09) XML
 * document for bulk EFT/RTC submissions via SBSA's Host-to-Host SFTP channel.
 *
 * One Pain.001 document per DisbursementRun. Each beneficiary (employee) is
 * one <CdtTrfTxInf> within a single <PmtInf> block.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17
 */

const crypto = require('crypto');

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
 * Build a full ISO 20022 Pain.001.001.09 XML string for a disbursement run.
 *
 * @param {Object} params
 * @param {string} params.runReference       - DisbursementRun.run_reference
 * @param {string} params.rail               - 'eft' | 'rtc'
 * @param {string} [params.paymentDate]      - ISO date YYYY-MM-DD (defaults to today)
 * @param {string} [params.debtorName]       - Account holder name (MyMoolah)
 * @param {string} [params.debtorAccount]    - SBSA treasury account number
 * @param {string} [params.debtorBranchCode] - SBSA branch code
 * @param {Array}  params.payments           - Array of payment objects
 * @param {string} params.payments[].endToEndId
 * @param {string} params.payments[].beneficiaryName
 * @param {string} params.payments[].accountNumber
 * @param {string} params.payments[].branchCode
 * @param {number} params.payments[].amount
 * @param {string} [params.payments[].reference]  - Narrative on employee statement
 * @returns {{ xml: string, msgId: string, totalAmount: number, paymentCount: number }}
 */
function buildPain001Bulk(params) {
  const {
    runReference,
    rail = 'eft',
    paymentDate = new Date().toISOString().slice(0, 10),
    debtorName    = process.env.SBSA_DEBTOR_NAME    || 'MyMoolah (Pty) Ltd',
    debtorAccount = process.env.SBSA_DEBTOR_ACCOUNT || '000000000',
    debtorBranchCode = process.env.SBSA_DEBTOR_BRANCH || '051001',
    payments,
  } = params;

  if (!payments || payments.length === 0) {
    throw new Error('payments array is required and must not be empty');
  }

  const now = new Date().toISOString();
  const cleanRef = (s) => String(s).replace(/[^a-zA-Z0-9 \-\/\.,\(\)\?\+]/g, '').substring(0, 35);
  const msgId = `MM-BULK-${runReference.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25)}-${Date.now().toString(36).toUpperCase()}`.substring(0, 35);
  const pmtInfId = `PMT-${msgId}`.substring(0, 35);

  const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  // Local instrument code: EFT → PRPT, RTC → RTGS (SBSA convention)
  const lclInstrm = rail === 'rtc' ? 'RTGS' : 'PRPT';

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
          <CdtrAgt>
            <FinInstnId>
              <ClrSysMmbId>
                <ClrSysId><Cd>ZANCC</Cd></ClrSysId>
                <MmbId>${p.branchCode}</MmbId>
              </ClrSysMmbId>
            </FinInstnId>
          </CdtrAgt>
          <Cdtr>
            <Nm>${cleanRef(p.beneficiaryName)}</Nm>
          </Cdtr>
          <CdtrAcct>
            <Id><Othr><Id>${p.accountNumber}</Id></Othr></Id>
          </CdtrAcct>
          <RmtInf>
            <Ustrd>${narrative}</Ustrd>
          </RmtInf>
        </CdtTrfTxInf>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${now}</CreDtTm>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>${cleanRef(debtorName)}</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${pmtInfId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${totalAmount.toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>NURG</Cd></SvcLvl>
        <LclInstrm><Cd>${lclInstrm}</Cd></LclInstrm>
      </PmtTpInf>
      <ReqdExctnDt>
        <Dt>${paymentDate}</Dt>
      </ReqdExctnDt>
      <Dbtr>
        <Nm>${cleanRef(debtorName)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id><Othr><Id>${debtorAccount}</Id></Othr></Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <ClrSysMmbId>
            <ClrSysId><Cd>ZANCC</Cd></ClrSysId>
            <MmbId>${debtorBranchCode}</MmbId>
          </ClrSysMmbId>
        </FinInstnId>
      </DbtrAgt>${creditLines}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

  return { xml, msgId, totalAmount, paymentCount: payments.length };
}

module.exports = { buildPain001Bulk, mapRejectionCode, REJECTION_MESSAGES };
