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

module.exports = {
  createAccount,
  postJournalEntry,
  getTrialBalance
};
