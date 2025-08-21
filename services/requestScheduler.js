// Lightweight scheduler loop for recurring wallet requests
// Runs every minute; selects due rows and creates normal PaymentRequest entries

const { sequelize, Sequelize, RecurringPaymentRequest, PaymentRequest, User, Wallet } = require('../models');
const notificationService = require('./notificationService');

function startOfMinute(date) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

function computeNextRun(row, fromDate) {
  const base = new Date(fromDate || row.nextRunAt);
  const d = new Date(base);
  if (row.frequency === 'daily') {
    d.setDate(d.getDate() + 1);
  } else if (row.frequency === 'weekly') {
    const target = typeof row.dayOfWeek === 'number' ? row.dayOfWeek : d.getDay();
    const cur = d.getDay();
    const diff = (7 + target - cur) % 7 || 7;
    d.setDate(d.getDate() + diff);
  } else if (row.frequency === 'monthly') {
    const target = Math.max(1, Math.min(31, row.dayOfMonth || d.getDate()));
    d.setMonth(d.getMonth() + 1, Math.min(target, daysInMonth(d.getFullYear(), d.getMonth()+1)));
  }
  return startOfMinute(d);
}

function daysInMonth(year, month1to12) {
  return new Date(year, month1to12, 0).getDate();
}

async function tick() {
  const now = new Date();
  const due = await RecurringPaymentRequest.findAll({
    where: {
      status: 'active',
      nextRunAt: { [Sequelize.Op.lte]: now },
    },
    order: [['nextRunAt','ASC']],
    limit: 50,
  });

  for (const row of due) {
    
    const t = await sequelize.transaction();
    try {
      const requester = await User.findByPk(row.requesterUserId);
      const payer = await User.findByPk(row.payerUserId);
      const requesterWallet = await Wallet.findOne({ where: { userId: requester.id } });
      const payerWallet = await Wallet.findOne({ where: { userId: payer.id } });

      const pr = await PaymentRequest.create({
        requesterUserId: requester.id,
        payerUserId: payer.id,
        requesterWalletId: requesterWallet.walletId,
        payerWalletId: payerWallet.walletId,
        amount: row.amount,
        currency: row.currency,
        description: row.description,
        status: 'requested',
      }, { transaction: t });

      await notificationService.createNotification(
        payer.id,
        'txn_wallet_credit',
        'Payment Request',
        `${requester.firstName} ${requester.lastName} requests R ${Number(row.amount).toFixed(2)}`,
        {
          payload: { requestId: pr.id, requesterUserId: requester.id, requesterName: `${requester.firstName} ${requester.lastName}`, amount: Number(row.amount), currency: row.currency, description: row.description },
          freezeUntilViewed: true,
        }
      );

      // Update counters and nextRun
      let status = row.status;
      let occurrencesRemaining = row.occurrencesRemaining;
      if (row.endOption === 'count' && occurrencesRemaining != null) {
        occurrencesRemaining = occurrencesRemaining - 1;
        if (occurrencesRemaining <= 0) status = 'completed';
      }
      const nextRunAt = computeNextRun(row);
      if (row.endOption === 'until' && row.untilDate && nextRunAt > row.untilDate) status = 'completed';

      await row.update({ lastRunAt: now, nextRunAt, status, occurrencesRemaining }, { transaction: t });
      await t.commit();
    } catch (e) {
      console.error('Scheduler tick error for recurring id', row.id, e.message);
      await t.rollback();
    }
  }
}

let intervalHandle;
function start() {
  if (intervalHandle) return;
  
  intervalHandle = setInterval(tick, 60 * 1000);
  // Run once on start to pick up immediate items
  tick().catch(()=>{});
}

function stop() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
}

module.exports = { start, stop, tick };


