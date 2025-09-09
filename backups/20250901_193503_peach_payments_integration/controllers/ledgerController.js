"use strict";

const ledgerService = require("../services/ledgerService");

function ok(res, message, data) {
  return res.json({ success: true, message, data });
}

function fail(res, error) {
  const status = error.statusCode || 400;
  return res.status(status).json({ success: false, message: error.message || "Request failed" });
}

module.exports = {
  async createAccount(req, res) {
    try {
      const account = await ledgerService.createAccount(req.body);
      return ok(res, "Account created", account);
    } catch (err) {
      return fail(res, err);
    }
  },

  async postJournalEntry(req, res) {
    try {
      const entry = await ledgerService.postJournalEntry(req.body);
      return ok(res, "Journal entry posted", entry);
    } catch (err) {
      return fail(res, err);
    }
  },

  async getTrialBalance(req, res) {
    try {
      const tb = await ledgerService.getTrialBalance();
      return ok(res, "Trial balance", tb);
    } catch (err) {
      return fail(res, err);
    }
  },

  // Demo endpoints (env-gated)
  async demoDraftVasPosting(req, res) {
    if (String(process.env.LEDGER_DEMO_ENABLED || '').toLowerCase() !== 'true') {
      return res.status(403).json({ success: false, message: 'Demo endpoints disabled' });
    }
    try {
      const result = await ledgerService.draftPostVasPurchase(req.body);
      return ok(res, 'Draft VAS posting complete', result);
    } catch (err) {
      return fail(res, err);
    }
  },

  async demoDraftRtpPosting(req, res) {
    if (String(process.env.LEDGER_DEMO_ENABLED || '').toLowerCase() !== 'true') {
      return res.status(403).json({ success: false, message: 'Demo endpoints disabled' });
    }
    try {
      const result = await ledgerService.draftPostPayShapRtp(req.body);
      return ok(res, 'Draft RTP posting complete', result);
    } catch (err) {
      return fail(res, err);
    }
  }
};
