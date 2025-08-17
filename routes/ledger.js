"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../controllers/ledgerController");

// POST /api/v1/ledger/accounts
router.post("/accounts", controller.createAccount);

// POST /api/v1/ledger/journal-entries
router.post("/journal-entries", controller.postJournalEntry);

// GET /api/v1/ledger/trial-balance
router.get("/trial-balance", controller.getTrialBalance);

module.exports = router;
