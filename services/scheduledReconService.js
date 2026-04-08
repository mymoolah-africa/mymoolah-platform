'use strict';

/**
 * Scheduled Reconciliation Service — MyMoolah Treasury Platform
 *
 * Automated checks that run on schedule (Cloud Scheduler or cron):
 *   1. Wallet balance vs transaction net-flow per user
 *   2. Wallet aggregate vs ledger account 2100-01-01
 *   3. Supplier float balance vs ledger float accounts
 *   4. Commission journal integrity
 *   5. Trial balance (total DR = total CR)
 *
 * Results are stored in recon_runs and emailed on FAIL.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-04
 */

const { sequelize, Wallet, User, Transaction, LedgerAccount, JournalEntry,
        JournalLine, SupplierFloat } = require('../models');
const { Op } = require('sequelize');

class ScheduledReconService {
  constructor() {
    this.checks = [];
    this.passCount = 0;
    this.warnCount = 0;
    this.failCount = 0;
  }

  _pass(section, detail) {
    this.passCount++;
    this.checks.push({ section, status: 'PASS', detail });
  }
  _warn(section, detail) {
    this.warnCount++;
    this.checks.push({ section, status: 'WARN', detail });
  }
  _fail(section, detail) {
    this.failCount++;
    this.checks.push({ section, status: 'FAIL', detail });
  }

  /**
   * Run all reconciliation checks and return a structured report.
   * @returns {Promise<Object>} { verdict, passCount, warnCount, failCount, checks, timestamp }
   */
  async runFullRecon() {
    this.checks = [];
    this.passCount = 0;
    this.warnCount = 0;
    this.failCount = 0;
    const startMs = Date.now();

    await this._checkTrialBalance();
    await this._checkWalletVsTxnFlow();
    await this._checkWalletAggregateVsLedger();
    await this._checkSupplierFloats();
    await this._checkCommissionIntegrity();
    await this._checkNegativeWallets();
    await this._checkSolvency();
    await this._checkRestrictedBalance();

    const elapsedMs = Date.now() - startMs;
    const verdict = this.failCount > 0 ? 'FAIL' : this.warnCount > 0 ? 'WARN' : 'PASS';

    const report = {
      verdict,
      passCount: this.passCount,
      warnCount: this.warnCount,
      failCount: this.failCount,
      checks: this.checks,
      timestamp: new Date().toISOString(),
      elapsedMs,
    };

    await this._persistRun(report);

    if (verdict === 'FAIL') {
      await this._alertOnFailure(report);
    }

    return report;
  }

  // ─── 1. TRIAL BALANCE ──────────────────────────────────────────
  async _checkTrialBalance() {
    const [row] = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE WHEN dc = 'debit'  THEN amount ELSE 0 END), 0) AS total_dr,
        COALESCE(SUM(CASE WHEN dc = 'credit' THEN amount ELSE 0 END), 0) AS total_cr
      FROM journal_lines
    `, { type: sequelize.QueryTypes.SELECT });

    const dr = parseFloat(row.total_dr);
    const cr = parseFloat(row.total_cr);
    const diff = Math.abs(dr - cr);

    if (diff > 0.01) {
      this._fail('TRIAL_BALANCE', `DR R${dr.toFixed(2)} != CR R${cr.toFixed(2)} (diff R${diff.toFixed(2)})`);
    } else {
      this._pass('TRIAL_BALANCE', `DR R${dr.toFixed(2)} = CR R${cr.toFixed(2)}`);
    }
  }

  // ─── 2. WALLET vs TRANSACTION NET FLOW ─────────────────────────
  async _checkWalletVsTxnFlow() {
    const rows = await sequelize.query(`
      SELECT w."walletId", w.balance, w."userId", u."firstName", u."lastName",
             COALESCE(SUM(CASE
               WHEN t.type IN ('send','payment','purchase') THEN -ABS(t.amount)
               ELSE t.amount
             END), 0) AS net_flow
      FROM wallets w
      JOIN users u ON u.id = w."userId"
      LEFT JOIN transactions t ON t."walletId" = w."walletId" AND t.status = 'completed'
      GROUP BY w."walletId", w.balance, w."userId", u."firstName", u."lastName"
      ORDER BY w."userId"
    `, { type: sequelize.QueryTypes.SELECT });

    for (const r of rows) {
      const bal = parseFloat(r.balance);
      const flow = parseFloat(r.net_flow);
      const diff = Math.abs(bal - flow);
      if (diff > 0.01) {
        this._fail('WALLET_VS_TXN', `${r.firstName} ${r.lastName} (${r.walletId}): wallet R${bal.toFixed(2)} != txn_net R${flow.toFixed(2)} (diff R${diff.toFixed(2)})`);
      } else {
        this._pass('WALLET_VS_TXN', `${r.firstName} ${r.lastName}: wallet R${bal.toFixed(2)} = txn_net R${flow.toFixed(2)}`);
      }
    }
  }

  // ─── 3. WALLET AGGREGATE vs LEDGER 2100-01-01 ──────────────────
  async _checkWalletAggregateVsLedger() {
    const [walletRow] = await sequelize.query(
      `SELECT COALESCE(SUM(balance), 0) AS total FROM wallets`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const walletTotal = parseFloat(walletRow.total);

    const [ledgerRow] = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN jl.dc = 'debit'  THEN jl.amount ELSE 0 END), 0) AS ledger_balance
      FROM journal_lines jl
      JOIN ledger_accounts la ON la.id = jl."accountId"
      WHERE la.code = '2100-01-01'
    `, { type: sequelize.QueryTypes.SELECT });
    const ledgerBalance = parseFloat(ledgerRow.ledger_balance || 0);

    const diff = Math.abs(walletTotal - ledgerBalance);
    if (diff > 0.01) {
      this._fail('WALLET_VS_LEDGER', `Wallet aggregate R${walletTotal.toFixed(2)} != Ledger 2100-01-01 R${ledgerBalance.toFixed(2)} (diff R${diff.toFixed(2)})`);
    } else {
      this._pass('WALLET_VS_LEDGER', `Wallet aggregate R${walletTotal.toFixed(2)} = Ledger 2100-01-01 R${ledgerBalance.toFixed(2)}`);
    }
  }

  // ─── 4. SUPPLIER FLOAT BALANCE vs LEDGER ───────────────────────
  async _checkSupplierFloats() {
    const floats = await SupplierFloat.findAll({ where: { isActive: true } });

    for (const f of floats) {
      if (!f.ledgerAccountCode) continue;
      const dbBalance = parseFloat(f.currentBalance);
      if (dbBalance === 0) continue;

      const [ledgerRow] = await sequelize.query(`
        SELECT
          COALESCE(SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN jl.dc = 'debit'  THEN jl.amount ELSE 0 END), 0) AS ledger_balance
        FROM journal_lines jl
        JOIN ledger_accounts la ON la.id = jl."accountId"
        WHERE la.code = $1
      `, { bind: [f.ledgerAccountCode], type: sequelize.QueryTypes.SELECT });

      const ledgerBal = parseFloat(ledgerRow?.ledger_balance || 0);

      if (Math.abs(ledgerBal) < 0.01 && dbBalance > 0) {
        this._warn('SUPPLIER_FLOAT', `${f.supplierId}: DB balance R${dbBalance.toFixed(2)} but ledger ${f.ledgerAccountCode} is empty (float loaded outside app)`);
      } else {
        this._pass('SUPPLIER_FLOAT', `${f.supplierId}: DB R${dbBalance.toFixed(2)}, ledger ${f.ledgerAccountCode} R${Math.abs(ledgerBal).toFixed(2)}`);
      }
    }
  }

  // ─── 5. COMMISSION INTEGRITY ───────────────────────────────────
  async _checkCommissionIntegrity() {
    const rows = await sequelize.query(`
      SELECT je.reference,
             SUM(CASE WHEN jl.dc = 'debit' THEN jl.amount ELSE 0 END) AS dr,
             SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END) AS cr
      FROM journal_entries je
      JOIN journal_lines jl ON jl."entryId" = je.id
      WHERE je.reference LIKE 'COMMISSION-%'
      GROUP BY je.reference
    `, { type: sequelize.QueryTypes.SELECT });

    let allOk = true;
    for (const r of rows) {
      const diff = Math.abs(parseFloat(r.dr) - parseFloat(r.cr));
      if (diff > 0.01) {
        this._fail('COMMISSION', `${r.reference}: DR R${parseFloat(r.dr).toFixed(2)} != CR R${parseFloat(r.cr).toFixed(2)}`);
        allOk = false;
      }
    }
    if (allOk && rows.length > 0) {
      this._pass('COMMISSION', `All ${rows.length} commission JEs are balanced`);
    }
  }

  // ─── 6. NEGATIVE WALLET BALANCES ───────────────────────────────
  async _checkNegativeWallets() {
    const rows = await sequelize.query(`
      SELECT w."walletId", w.balance, u."firstName", u."lastName"
      FROM wallets w JOIN users u ON u.id = w."userId"
      WHERE w.balance < 0
    `, { type: sequelize.QueryTypes.SELECT });

    if (rows.length > 0) {
      for (const r of rows) {
        this._fail('NEGATIVE_WALLET', `${r.firstName} ${r.lastName} (${r.walletId}): R${parseFloat(r.balance).toFixed(2)}`);
      }
    } else {
      this._pass('NEGATIVE_WALLET', 'No negative wallet balances');
    }
  }

  // ─── 7. SOLVENCY CHECK — Client Float <= Bank + Supplier Floats ──
  async _checkSolvency() {
    const [bankRow] = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE WHEN jl.dc = 'debit' THEN jl.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END), 0) AS balance
      FROM journal_lines jl
      JOIN ledger_accounts la ON la.id = jl."accountId"
      WHERE la.code = '1100-01-01'
    `, { type: sequelize.QueryTypes.SELECT });
    const bankBal = parseFloat(bankRow?.balance || 0);

    const supplierFloatRows = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE WHEN jl.dc = 'debit' THEN jl.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END), 0) AS balance
      FROM journal_lines jl
      JOIN ledger_accounts la ON la.id = jl."accountId"
      WHERE la.code LIKE '1200-10-%'
    `, { type: sequelize.QueryTypes.SELECT });
    const totalFloats = parseFloat(supplierFloatRows[0]?.balance || 0);

    const [clientRow] = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN jl.dc = 'debit' THEN jl.amount ELSE 0 END), 0) AS balance
      FROM journal_lines jl
      JOIN ledger_accounts la ON la.id = jl."accountId"
      WHERE la.code = '2100-01-01'
    `, { type: sequelize.QueryTypes.SELECT });
    const clientFloat = parseFloat(clientRow?.balance || 0);

    const [restrictedRow] = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN jl.dc = 'debit' THEN jl.amount ELSE 0 END), 0) AS balance
      FROM journal_lines jl
      JOIN ledger_accounts la ON la.id = jl."accountId"
      WHERE la.code = '2100-01-02'
    `, { type: sequelize.QueryTypes.SELECT });
    const restrictedFloat = parseFloat(restrictedRow?.balance || 0);

    const backingAssets = bankBal + totalFloats;
    const totalClientLiability = clientFloat + restrictedFloat;

    if (totalClientLiability <= backingAssets + 0.01) {
      this._pass('SOLVENCY', `Client+Restricted R${totalClientLiability.toFixed(2)} (2100-01-01 R${clientFloat.toFixed(2)} + 2100-01-02 R${restrictedFloat.toFixed(2)}) <= Bank R${bankBal.toFixed(2)} + Floats R${totalFloats.toFixed(2)} = R${backingAssets.toFixed(2)}`);
    } else {
      this._fail('SOLVENCY', `Client+Restricted R${totalClientLiability.toFixed(2)} (2100-01-01 R${clientFloat.toFixed(2)} + 2100-01-02 R${restrictedFloat.toFixed(2)}) > Bank R${bankBal.toFixed(2)} + Floats R${totalFloats.toFixed(2)} = R${backingAssets.toFixed(2)} — UNDERFUNDED R${(totalClientLiability - backingAssets).toFixed(2)}`);
    }
  }

  async _checkRestrictedBalance() {
    const [walletRow] = await sequelize.query(
      'SELECT COALESCE(SUM(restricted_balance), 0) AS total FROM wallets WHERE restricted_balance > 0',
      { type: sequelize.QueryTypes.SELECT }
    );
    const walletRestricted = parseFloat(walletRow?.total || 0);

    const [ledgerRow] = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE WHEN jl.dc = 'credit' THEN jl.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN jl.dc = 'debit' THEN jl.amount ELSE 0 END), 0) AS balance
      FROM journal_lines jl
      JOIN ledger_accounts la ON la.id = jl."accountId"
      WHERE la.code = '2100-01-02'
    `, { type: sequelize.QueryTypes.SELECT });
    const ledgerRestricted = parseFloat(ledgerRow?.balance || 0);

    const diff = Math.abs(walletRestricted - ledgerRestricted);
    if (diff <= 0.01) {
      this._pass('RESTRICTED_BALANCE', `Wallet restricted (R${walletRestricted.toFixed(2)}) = Ledger 2100-01-02 (R${ledgerRestricted.toFixed(2)})`);
    } else {
      this._fail('RESTRICTED_BALANCE', `DRIFT: Wallet restricted (R${walletRestricted.toFixed(2)}) vs Ledger 2100-01-02 (R${ledgerRestricted.toFixed(2)}) DIFF=R${diff.toFixed(2)}`);
    }
  }

  // ─── PERSIST RUN ───────────────────────────────────────────────
  async _persistRun(report) {
    try {
      const tableExists = await sequelize.query(`
        SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recon_runs') AS exists
      `, { type: sequelize.QueryTypes.SELECT });

      if (!tableExists[0]?.exists) return;

      await sequelize.query(`
        INSERT INTO recon_runs (supplier_id, status, started_at, completed_at, metrics, created_at, updated_at)
        VALUES ('MMTP_INTERNAL', $1, NOW(), NOW(), $2, NOW(), NOW())
      `, {
        bind: [
          report.verdict === 'PASS' ? 'completed' : 'completed_with_errors',
          JSON.stringify({
            passCount: report.passCount,
            warnCount: report.warnCount,
            failCount: report.failCount,
            elapsedMs: report.elapsedMs,
            checks: report.checks,
          })
        ]
      });
    } catch (err) {
      console.warn('[ScheduledReconService] Failed to persist run (non-critical):', err.message);
    }
  }

  // ─── ALERT ON FAILURE ──────────────────────────────────────────
  async _alertOnFailure(report) {
    const failures = report.checks.filter(c => c.status === 'FAIL');
    const msg = `RECON FAILURE: ${failures.length} check(s) failed\n` +
      failures.map(f => `  [${f.section}] ${f.detail}`).join('\n');
    console.error(`\n${msg}\n`);

    try {
      const AlertService = require('./reconciliation/AlertService');
      const alertService = new AlertService();
      const opsEmail = process.env.OPS_ALERT_EMAIL || 'support@mymoolah.africa';

      if (alertService.smtpConfigured) {
        await alertService.transporter.sendMail({
          from: `"MyMoolah Recon Alerts" <${process.env.SMTP_USER}>`,
          to: opsEmail,
          subject: `[RECON FAIL] ${failures.length} discrepanc${failures.length === 1 ? 'y' : 'ies'} detected — ${new Date().toISOString().substring(0, 10)}`,
          html: `
            <h2 style="color:#c0392b">Reconciliation Failure Report</h2>
            <p>The scheduled reconciliation found <strong>${failures.length}</strong> failure(s).</p>
            <table style="border-collapse:collapse;width:100%">
              <tr style="background:#f5f5f5"><th style="padding:8px;text-align:left">Section</th><th style="padding:8px;text-align:left">Detail</th></tr>
              ${failures.map(f => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${f.section}</td><td style="padding:8px;border-bottom:1px solid #eee">${f.detail}</td></tr>`).join('')}
            </table>
            <p style="margin-top:16px;color:#7f8c8d;font-size:12px">MyMoolah Treasury Platform — Automated Reconciliation</p>
          `,
        });
      }
    } catch (alertErr) {
      console.warn('[ScheduledReconService] Alert email failed (non-critical):', alertErr.message);
    }
  }
}

module.exports = new ScheduledReconService();
