"use strict";

const { Sequelize, LedgerAccount, JournalEntry, JournalLine, sequelize } = require("../models");

function assert(condition, message) {
  if (!condition) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
}

async function createAccount({ code, name, type, normalSide }) {
  assert(code && name && type && normalSide, "Missing required account fields");
  assert(["debit", "credit"].includes(normalSide), "normalSide must be 'debit' or 'credit'");
  const existing = await LedgerAccount.findOne({ where: { code } });
  assert(!existing, `Account code already exists: ${code}`);
  const account = await LedgerAccount.create({ code, name, type, normalSide });
  return account.toJSON();
}

async function postJournalEntry({ reference, description, postedAt, lines }) {
  assert(Array.isArray(lines) && lines.length >= 2, "At least two lines required");
  const debitTotal = lines
    .filter(l => l.dc === "debit")
    .reduce((sum, l) => sum + Number(l.amount), 0);
  const creditTotal = lines
    .filter(l => l.dc === "credit")
    .reduce((sum, l) => sum + Number(l.amount), 0);
  assert(debitTotal > 0 && creditTotal > 0, "Both debit and credit totals must be > 0");
  assert(Math.abs(debitTotal - creditTotal) < 0.000001, "Debits must equal credits");

  const tx = await sequelize.transaction();
  try {
    const entry = await JournalEntry.create(
      { reference, description, postedAt: postedAt || new Date() },
      { transaction: tx }
    );

    for (const line of lines) {
      const account = line.accountId
        ? await LedgerAccount.findByPk(line.accountId)
        : await LedgerAccount.findOne({ where: { code: line.accountCode } });
      assert(account, `Account not found (${line.accountId || line.accountCode})`);
      assert(["debit", "credit"].includes(line.dc), "Line.dc must be 'debit' or 'credit'");
      assert(Number(line.amount) > 0, "Line.amount must be > 0");
      await JournalLine.create(
        {
          entryId: entry.id,
          accountId: account.id,
          dc: line.dc,
          amount: line.amount,
          memo: line.memo || null
        },
        { transaction: tx }
      );
    }

    await tx.commit();
    const created = await JournalEntry.findByPk(entry.id, {
      include: [{ model: JournalLine, as: "lines" }]
    });
    return created.toJSON();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function getTrialBalance() {
  const rows = await JournalLine.findAll({
    attributes: [
      "accountId",
      [Sequelize.literal("SUM(CASE WHEN dc='debit' THEN amount ELSE 0 END)"), "debits"],
      [Sequelize.literal("SUM(CASE WHEN dc='credit' THEN amount ELSE 0 END)"), "credits"]
    ],
    group: ["accountId"],
    raw: true
  });

  const accounts = await LedgerAccount.findAll({ raw: true });
  const byId = new Map(accounts.map(a => [a.id, a]));

  const balances = rows.map(r => {
    const account = byId.get(r.accountId);
    const debits = Number(r.debits || 0);
    const credits = Number(r.credits || 0);
    const normal = account.normalSide === "debit" ? 1 : -1;
    const balance = (debits - credits) * normal;
    return {
      accountCode: account.code,
      accountName: account.name,
      type: account.type,
      normalSide: account.normalSide,
      debits,
      credits,
      balance
    };
  });

  const totals = balances.reduce(
    (acc, b) => {
      acc.debits += b.debits;
      acc.credits += b.credits;
      return acc;
    },
    { debits: 0, credits: 0 }
  );

  return { balances, totals };
}

/**
 * Get current balance for a ledger account by code.
 * Balance is in account's normal units (same as journal lines - Rands for revenue/expense/float).
 * @param {string} accountCode - e.g. '1200-10-06' (VALR float)
 * @returns {Promise<number>} Balance (positive = asset/debit normal, negative = liability/credit normal)
 */
async function getAccountBalanceByCode(accountCode) {
  const account = await LedgerAccount.findOne({ where: { code: accountCode }, raw: true });
  if (!account) return null;
  const rows = await sequelize.query(
    `SELECT 
      SUM(CASE WHEN jl.dc = 'debit' THEN jl.amount ELSE 0 END) AS debits,
      SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END) AS credits
     FROM journal_lines jl
     WHERE jl."accountId" = :accountId`,
    { replacements: { accountId: account.id }, type: sequelize.QueryTypes.SELECT, raw: true }
  );
  const r = rows[0];
  const debits = Number(r?.debits || 0);
  const credits = Number(r?.credits || 0);
  const normal = account.normalSide === 'debit' ? 1 : -1;
  return (debits - credits) * normal;
}

module.exports = {
  createAccount,
  postJournalEntry,
  getTrialBalance,
  getAccountBalanceByCode,
  // Draft-only: Not wired. Use after configuring account codes.
  draftPostVasPurchase,
  draftPostPayShapRtp
};

/**
 * DRAFT: Post journals for a VAS purchase (closed-loop)
 * @param {Object} p
 * @param {string} p.reference - idempotency/business reference
 * @param {number} p.grossAmount - total amount charged to client (incl. fees if payer-pays)
 * @param {number} p.commissionAmount - MM revenue portion
 * @param {string} p.clientFloatCode - account code for Client Float (liability)
 * @param {string} p.clientClearingCode - account code for Client Settlement Clearing
 * @param {string} p.supplierClearingCode - account code for Supplier Settlement Clearing
 * @param {string} p.interchangeCode - account code for Interchange/Clearing Control
 * @param {string} p.revenueCode - account code for MM Commission/Fees Revenue
 */
async function draftPostVasPurchase({
  reference,
  grossAmount,
  commissionAmount,
  clientFloatCode,
  clientClearingCode,
  supplierClearingCode,
  interchangeCode,
  revenueCode
}) {
  assert(grossAmount > 0 && commissionAmount >= 0 && commissionAmount <= grossAmount, "Invalid amounts");
  const netToSupplier = Number((grossAmount - commissionAmount).toFixed(2));

  return postJournalEntry({
    reference,
    description: `VAS purchase (${reference})`,
    lines: [
      // Move from Client Float to Client Clearing (lock funds)
      { accountCode: clientClearingCode, dc: "debit", amount: grossAmount, memo: "Client clearing" },
      { accountCode: clientFloatCode, dc: "credit", amount: grossAmount, memo: "Client float" },

      // Recognise revenue (commission)
      { accountCode: clientClearingCode, dc: "debit", amount: commissionAmount, memo: "Commission from client" },
      { accountCode: revenueCode, dc: "credit", amount: commissionAmount, memo: "MM commission revenue" },

      // Deliver net to supplier via clearing/interchange
      { accountCode: interchangeCode, dc: "debit", amount: netToSupplier, memo: "Interchange debit" },
      { accountCode: supplierClearingCode, dc: "credit", amount: netToSupplier, memo: "Supplier clearing" },

      // Clear supplier to interchange (internal settle)
      { accountCode: supplierClearingCode, dc: "debit", amount: netToSupplier, memo: "Supplier clearing" },
      { accountCode: interchangeCode, dc: "credit", amount: netToSupplier, memo: "Interchange credit" }
    ]
  });
}

/**
 * DRAFT: Post journals for a PayShap RTP payment
 * Mirrors VAS pattern; treat payee as supplier-like float in closed-loop, or clearing for external.
 * @param {Object} p
 * @param {string} p.reference
 * @param {number} p.amount
 * @param {number} p.feeAmount - MM fee (can be 0)
 * @param {string} p.payerFloatCode - Client/User float
 * @param {string} p.payerClearingCode - Client/User clearing
 * @param {string} p.payeeClearingCode - Payee clearing (or house settlement clearing)
 * @param {string} p.interchangeCode
 * @param {string} p.revenueCode
 */
async function draftPostPayShapRtp({
  reference,
  amount,
  feeAmount,
  payerFloatCode,
  payerClearingCode,
  payeeClearingCode,
  interchangeCode,
  revenueCode
}) {
  assert(amount > 0 && feeAmount >= 0 && feeAmount <= amount, "Invalid amounts");
  const netToPayee = Number((amount - feeAmount).toFixed(2));

  return postJournalEntry({
    reference,
    description: `RTP PayShap (${reference})`,
    lines: [
      // Lock from payer float
      { accountCode: payerClearingCode, dc: "debit", amount, memo: "Payer clearing" },
      { accountCode: payerFloatCode, dc: "credit", amount, memo: "Payer float" },

      // Recognise MM fee
      { accountCode: payerClearingCode, dc: "debit", amount: feeAmount, memo: "MM fee" },
      { accountCode: revenueCode, dc: "credit", amount: feeAmount, memo: "MM fee revenue" },

      // Net to payee via clearing/interchange
      { accountCode: interchangeCode, dc: "debit", amount: netToPayee, memo: "Interchange debit" },
      { accountCode: payeeClearingCode, dc: "credit", amount: netToPayee, memo: "Payee clearing" },

      // Clear payee to interchange
      { accountCode: payeeClearingCode, dc: "debit", amount: netToPayee, memo: "Payee clearing" },
      { accountCode: interchangeCode, dc: "credit", amount: netToPayee, memo: "Interchange credit" }
    ]
  });
}
