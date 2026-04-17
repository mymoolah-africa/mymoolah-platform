#!/usr/bin/env node
/**
 * SBSA H2H — build Pain.001 XML files for Colette's 6 UAT scenarios.
 *
 * Outputs files to /tmp/sbsa-uat/ with filenames RM7..RM12 (continuing the
 * historical RM1..RM6 sequence from Melanie's 2026-03-30 tests).
 *
 * Scenarios (from "My Moolah test scenarios.xlsx"):
 *   RM7  Valid SSVS file              → expect ACK + INTAUDTST(PDNG) + FINAUDTST(ACSP)
 *   RM8  Duplicate MsgId              → expect NACK "Duplicate File"
 *   RM9  Invalid ordering account     → expect ACK + INTAUDTST err 0003 RJCT
 *   RM10 Past execution date          → expect ACK + INTAUDTST err 0014 RJCT
 *   RM11 Transaction over limit       → expect ACK + INTAUDTST err 0006 PART
 *   RM12 10-tx mixed valid + invalid  → expect ACK + interim + final + VET + UNPAID
 *
 * After the harness writes RM7, RM8 is produced by copying RM7 verbatim
 * (same MsgId — that is what triggers the duplicate-file rejection on SBSA's
 * side) but uploaded with a different filename.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { buildPain001Bulk } = require('../services/standardbank/pain001BulkBuilder');

const OUT_DIR = '/tmp/sbsa-uat';
const DEBTOR_ACCOUNT_VALID   = '272406481';
const DEBTOR_ACCOUNT_INVALID = '123456789';
const TOMORROW = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
const PAST_DATE = '2014-11-12';

const VALID_BENEFICIARIES = [
  { name: 'Andre Botes', account: '10111730633', branch: '051001', bank: 'Standard Bank' },
  { name: 'Andre Botes', account: '18828076450', branch: '679000', bank: 'Discovery Bank' },
  { name: 'Andre Botes', account: '1254107337',  branch: '470010', bank: 'Capitec' },
];

function ensureOutDir() {
  if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function tsStamp(offsetSeconds = 0) {
  const now = new Date(Date.now() + offsetSeconds * 1000);
  return now.getFullYear().toString()
    + String(now.getMonth() + 1).padStart(2, '0')
    + String(now.getDate()).padStart(2, '0')
    + String(now.getHours()).padStart(2, '0')
    + String(now.getMinutes()).padStart(2, '0')
    + String(now.getSeconds()).padStart(2, '0')
    + String(now.getMilliseconds()).padStart(3, '0');
}

function filenameFor(rm, offsetSeconds = 0) {
  return `MYMOOLAH_OWN11_Pain001v3_ZAR_TST_${tsStamp(offsetSeconds)}RM${rm}.xml`;
}

function writeXml(filename, xml) {
  const full = path.join(OUT_DIR, filename);
  fs.writeFileSync(full, xml);
  return full;
}

function payments(mods = {}) {
  const base = [
    { endToEndId: `UAT-SBSA-${Date.now()}-001`, beneficiaryName: VALID_BENEFICIARIES[0].name, accountNumber: VALID_BENEFICIARIES[0].account, branchCode: VALID_BENEFICIARIES[0].branch, amount: 1.00, reference: 'MMTP UAT PAYMENT 001' },
    { endToEndId: `UAT-DISC-${Date.now()}-002`, beneficiaryName: VALID_BENEFICIARIES[1].name, accountNumber: VALID_BENEFICIARIES[1].account, branchCode: VALID_BENEFICIARIES[1].branch, amount: 1.00, reference: 'MMTP UAT PAYMENT 002' },
    { endToEndId: `UAT-CAP-${Date.now()}-003`,  beneficiaryName: VALID_BENEFICIARIES[2].name, accountNumber: VALID_BENEFICIARIES[2].account, branchCode: VALID_BENEFICIARIES[2].branch, amount: 1.00, reference: 'MMTP UAT PAYMENT 003' },
  ];
  if (mods.overrideAmountIdx !== undefined) {
    base[mods.overrideAmountIdx].amount = mods.amount;
  }
  return base;
}

function buildRM7ValidSSVS() {
  const { xml, msgId } = buildPain001Bulk({
    runReference: `UAT-RM7-${Date.now()}`,
    paymentDate: TOMORROW,
    debtorAccount: DEBTOR_ACCOUNT_VALID,
    payments: payments(),
  });
  const filename = filenameFor(7, 0);
  writeXml(filename, xml);
  return { rm: 7, filename, msgId, scenario: 'Valid SSVS file', expected: 'ACK + INTAUDTST(PDNG×3) + FINAUDTST(ACSP×3)' };
}

function buildRM8DuplicateMsgId(rm7) {
  const sourceXml = fs.readFileSync(path.join(OUT_DIR, rm7.filename), 'utf8');
  const filename = filenameFor(8, 60);
  writeXml(filename, sourceXml);
  return { rm: 8, filename, msgId: rm7.msgId, scenario: 'Duplicate MsgId (of RM7)', expected: 'NACK <AddtlInf>Duplicate File</AddtlInf>' };
}

function buildRM9InvalidOrderingAccount() {
  const { xml, msgId } = buildPain001Bulk({
    runReference: `UAT-RM9-${Date.now()}`,
    paymentDate: TOMORROW,
    debtorAccount: DEBTOR_ACCOUNT_INVALID,
    payments: payments(),
  });
  const filename = filenameFor(9, 120);
  writeXml(filename, xml);
  return { rm: 9, filename, msgId, scenario: `Invalid ordering account (DbtrAcct=${DEBTOR_ACCOUNT_INVALID})`, expected: 'ACK + INTAUDTST err 0003 INVALID ACCOUNT NUMBER, GrpSts RJCT' };
}

function buildRM10PastDate() {
  const { xml, msgId } = buildPain001Bulk({
    runReference: `UAT-RM10-${Date.now()}`,
    paymentDate: PAST_DATE,
    debtorAccount: DEBTOR_ACCOUNT_VALID,
    payments: payments(),
  });
  const filename = filenameFor(10, 180);
  writeXml(filename, xml);
  return { rm: 10, filename, msgId, scenario: `Past execution date (ReqdExctnDt=${PAST_DATE})`, expected: 'ACK + INTAUDTST err 0014 ACTION DATE INVALID, GrpSts RJCT' };
}

function buildRM11OverLimit() {
  const { xml, msgId } = buildPain001Bulk({
    runReference: `UAT-RM11-${Date.now()}`,
    paymentDate: TOMORROW,
    debtorAccount: DEBTOR_ACCOUNT_VALID,
    payments: payments({ overrideAmountIdx: 0, amount: 96.15 }),
  });
  const filename = filenameFor(11, 240);
  writeXml(filename, xml);
  return { rm: 11, filename, msgId, scenario: 'Transaction amount exceeds limit (Tx1 = R96.15)', expected: 'ACK + INTAUDTST err 0006 TRANSACTION AMOUNT EXCEEDS LIMIT, GrpSts PART' };
}

function buildRM12VetUnpaid() {
  // 10 transactions: mix of SBSA and non-SBSA + 2 deliberately invalid.
  const txns = [
    { endToEndId: `UAT-RM12-${Date.now()}-01`, beneficiaryName: 'Andre Botes',  accountNumber: '10111730633', branchCode: '051001', amount: 1.00, reference: 'MMTP UAT12 001' },
    { endToEndId: `UAT-RM12-${Date.now()}-02`, beneficiaryName: 'Andre Botes',  accountNumber: '18828076450', branchCode: '679000', amount: 1.00, reference: 'MMTP UAT12 002' },
    { endToEndId: `UAT-RM12-${Date.now()}-03`, beneficiaryName: 'Andre Botes',  accountNumber: '1254107337',  branchCode: '470010', amount: 1.00, reference: 'MMTP UAT12 003' },
    { endToEndId: `UAT-RM12-${Date.now()}-04`, beneficiaryName: 'MM Test ABSA', accountNumber: '4012345678',  branchCode: '632005', amount: 1.00, reference: 'MMTP UAT12 004' },
    { endToEndId: `UAT-RM12-${Date.now()}-05`, beneficiaryName: 'MM Test FNB',  accountNumber: '62012345678', branchCode: '250655', amount: 1.00, reference: 'MMTP UAT12 005' },
    { endToEndId: `UAT-RM12-${Date.now()}-06`, beneficiaryName: 'MM Test NED',  accountNumber: '1012345678',  branchCode: '198765', amount: 1.00, reference: 'MMTP UAT12 006' },
    { endToEndId: `UAT-RM12-${Date.now()}-07`, beneficiaryName: 'MM Test SBSA', accountNumber: '10111730699', branchCode: '051001', amount: 1.00, reference: 'MMTP UAT12 007' },
    { endToEndId: `UAT-RM12-${Date.now()}-08`, beneficiaryName: 'MM BAD ACCT',  accountNumber: '999999999',   branchCode: '051001', amount: 1.00, reference: 'MMTP UAT12 008 BAD' },
    { endToEndId: `UAT-RM12-${Date.now()}-09`, beneficiaryName: 'MM BAD BRN',   accountNumber: '10111730633', branchCode: '198765', amount: 1.00, reference: 'MMTP UAT12 009 BADBRANCH' },
    { endToEndId: `UAT-RM12-${Date.now()}-10`, beneficiaryName: 'MM BAD SHORT', accountNumber: '12345',       branchCode: '051001', amount: 1.00, reference: 'MMTP UAT12 010 SHORT' },
  ];
  const { xml, msgId } = buildPain001Bulk({
    runReference: `UAT-RM12-${Date.now()}`,
    paymentDate: TOMORROW,
    debtorAccount: DEBTOR_ACCOUNT_VALID,
    payments: txns,
  });
  const filename = filenameFor(12, 300);
  writeXml(filename, xml);
  return { rm: 12, filename, msgId, scenario: '10-tx mixed (7 valid, 3 invalid), SBSA + ABSA + FNB + Nedbank + Discovery + Capitec', expected: 'ACK + INTERIM + FINAL + VET + UNPAID' };
}

function main() {
  ensureOutDir();

  const plan = [];
  const rm7 = buildRM7ValidSSVS();            plan.push(rm7);
  const rm8 = buildRM8DuplicateMsgId(rm7);    plan.push(rm8);
  plan.push(buildRM9InvalidOrderingAccount());
  plan.push(buildRM10PastDate());
  plan.push(buildRM11OverLimit());
  plan.push(buildRM12VetUnpaid());

  const planPath = path.join(OUT_DIR, 'PLAN.txt');
  const lines = [];
  lines.push('================================================================');
  lines.push('SBSA H2H UAT — 6 scenario files built');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Output directory: ${OUT_DIR}`);
  lines.push(`Debtor account (valid): ${DEBTOR_ACCOUNT_VALID}`);
  lines.push(`Debtor account (invalid, RM9 only): ${DEBTOR_ACCOUNT_INVALID}`);
  lines.push(`Tomorrow (ReqdExctnDt for valid files): ${TOMORROW}`);
  lines.push(`Past date (RM10 only): ${PAST_DATE}`);
  lines.push('================================================================');
  lines.push('');
  for (const s of plan) {
    lines.push(`RM${s.rm}: ${s.scenario}`);
    lines.push(`  Filename: ${s.filename}`);
    lines.push(`  MsgId:    ${s.msgId}`);
    lines.push(`  Expected: ${s.expected}`);
    lines.push('');
  }
  fs.writeFileSync(planPath, lines.join('\n'));
  console.log(lines.join('\n'));
  console.log(`Plan written to: ${planPath}`);
  console.log(`XML files written to: ${OUT_DIR}/`);
}

main();
