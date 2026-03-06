# Scaling Preparation — TODO (Due: 2026-03-11)

**Created**: 2026-03-04
**Reminder**: Do this by Wednesday 11 March 2026

These items are required **before deploying multiple Cloud Run instances**.

---

## Item 5: Extract Cron Jobs from `server.js`

**Current state**: Two `node-cron` schedules run directly inside `server.js`:
- **Monthly Tier Review** (~line 683): `cron.schedule('0 2 1 * *')`
- **Daily Referral Payout** (~line 722): `cron.schedule('0 2 * * *')`

**What to do**:
1. Move monthly tier review to `scripts/jobs/monthlyTierReview.js`
2. Move daily referral payout to `scripts/jobs/dailyReferralPayout.js`
3. Add Redis `acquireLock` with date-scoped keys:
   - `cronlock:tier-review:YYYY-MM`
   - `cronlock:referral-payout:YYYY-MM-DD`
4. Create a `CronJobLog` model for audit trail (start, success, failure, row counts)
5. Reference: `.agents/skills/background-jobs-and-cron/SKILL.md`

---

## Item 6: Redis Locks on Wallet Mutations

**Current state**: Wallet mutations use `sequelize.transaction()` with PostgreSQL
row-level locking. Safe for single instance but needs Redis locks for multi-instance.

**What to do**:
1. Create `utils/redisLock.js` with `acquireLock` / `releaseLock` (Lua script pattern)
2. Wrap `walletController.sendMoney` with `lock:wallet:{walletId}`
3. Wrap `flashController.purchaseEeziVoucher` with `lock:wallet:{walletId}`
4. Wrap `airtimeController.purchase*` methods with `lock:wallet:{walletId}`
5. Return 409 if lock cannot be acquired
6. Reference: `.agents/skills/redis-caching-and-locks/SKILL.md`

---

## Trigger

These items become **mandatory** when:
- Deploying > 1 Cloud Run instance
- Enabling Cloud Run autoscaling (min instances > 1)
- Moving to a multi-node deployment

Until then, the current architecture is safe.
