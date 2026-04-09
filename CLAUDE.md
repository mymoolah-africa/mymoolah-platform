# MyMoolah — Claude Code Project Memory

> This file is automatically read by Claude Code at the start of every session.
> It provides the same project context as Cursor's `.cursor/rules/` files.
> Keep this in sync with `docs/CURSOR_2.0_RULES_FINAL.md`.

---

## What is MyMoolah?

Banking-grade Treasury Platform for South Africa.  
**Services**: Digital wallet, double-entry ledger, VAS (airtime/data/electricity/bills), USSD banking (`*120*5616#`), USDC/stablecoin, NFC deposits, KYC, automated reconciliation.  
**Production**: api-mm.mymoolah.africa | wallet.mymoolah.africa  
**Stack**: Node.js + Express, PostgreSQL (Cloud SQL), React + Vite, GCP

---

## BEFORE STARTING ANY WORK

1. Read `docs/AGENT_HANDOVER.md` — current status and next priorities
2. Read 2–3 most recent `docs/session_logs/*.md` — previous session context
3. Run `git status` — commit or stash before pulling
4. Run `git pull origin main`

---

## NON-NEGOTIABLE RULES

### Database — ALWAYS use db-connection-helper.js

```js
// ✅ ONLY correct way
const { getUATClient } = require('./scripts/db-connection-helper');
const client = await getUATClient();
const result = await client.query('SELECT ...', [params]);
client.release();
```

Never use `new Sequelize(...)` or `new Pool(...)` directly.

| Environment | Port | Admin port |
|------------|------|-----------|
| UAT | 6543 | 6543 (postgres user) |
| Staging | 6544 | 6544 (postgres user) |
| Production | 6545 | 6545 (postgres user) |

### Migrations

```bash
./scripts/run-migrations-master.sh uat        # not npx sequelize-cli directly
./scripts/run-migrations-master.sh staging
./scripts/run-migrations-master.sh production
```

If ECONNRESET: kill stale proxies first:
```bash
kill $(lsof -ti:6543) $(lsof -ti:6544) $(lsof -ti:6545) && sleep 2 && ./scripts/ensure-proxies-running.sh
```

### Git Workflow

```bash
git add . && git commit -m "[description]" && git push origin main
```

Agent always commits AND pushes. User pulls in Codespaces.

### Restart in Codespaces

**Main backend + proxy only:**
```bash
./scripts/one-click-restart-and-start.sh
```

**Admin Portal + wallet + main API** (disbursement admin, Vite on 3003):
```bash
./scripts/start-all-services.sh
# Logs: tail -f /tmp/mymoolah-logs/backend.log
```

Never `pm2 restart all`, never `node server.js`, never `npm start` for the main backend without the proxy script.

---

## Security (Banking-Grade — NON-NEGOTIABLE)

- Parameterized queries only (no string interpolation in SQL)
- Input validation at every API boundary
- JWT HS512, TLS 1.3, AES-256-GCM
- PII redaction in all logs
- POPIA: never cache personal responses

---

## Session End (when work is complete — proactively)

1. Create `docs/session_logs/YYYY-MM-DD_HHMM_[description].md`
2. Update `docs/AGENT_HANDOVER.md`
3. `git add . && git commit && git push origin main`

---

## Key File Locations

| What | Where |
|------|-------|
| Full rules | `docs/CURSOR_2.0_RULES_FINAL.md` |
| Current status | `docs/AGENT_HANDOVER.md` |
| DB connection guide | `docs/DATABASE_CONNECTION_GUIDE.md` |
| SBSA H2H | `docs/SBSA_H2H_SETUP_GUIDE.md` |
| Changelog | `docs/CHANGELOG.md` |
| Session logs | `docs/session_logs/` |
| DB helper | `scripts/db-connection-helper.js` |
| Migration script | `scripts/run-migrations-master.sh` |
| Restart (main only) | `scripts/one-click-restart-and-start.sh` |
| Start all (portal) | `scripts/start-all-services.sh` |
| USSD integration guide | `docs/USSD_INTEGRATION_GUIDE.md` |
| USSD state machine | `services/ussdMenuService.js` |
| USSD auth/PIN | `services/ussdAuthService.js` |
| USSD sessions | `services/ussdSessionService.js` |
| Chart of Accounts | `docs/CHART_OF_ACCOUNTS.md` |
| EasyPay V5 partner Q&A (meeting + finalisation) | `docs/integrations/EasyPay_V5_PARTNER_QA_CHECKLIST.md` |
| EasyPay integration guide (V5 + legacy) | `docs/integrations/EasyPay_API_Integration_Guide.md` |
| Portal dev guide | `docs/PORTAL_DEVELOPMENT_GUIDE.md` |
| Portal frontend | `portal/admin/frontend/src/` |
| Portal backend | `portal/backend/` |
| Portal brand logos | `portal/admin/frontend/src/assets/logo-*.png` |
| Portal builder skill | `.agents/skills/admin-portal-builder/SKILL.md` |

---

## Active Tech Debt (flag new items here)

| Item | Risk |
|------|------|
| Legacy AI services (unused 4,649-line files) | Low |
| `aiSupportService.js` references `gpt-5` | Medium — will crash if called |
| Conversation history in-memory only | Medium — lost on restart |
| `check-proxies-cs.sh` missing | Low — bash error only |
| npm audit: 9 vulnerabilities (5 low, 4 moderate) | Low — transitive deps |
| RTP balance auto-refresh can miss a polling cycle | Low — cosmetic delay, `MoolahContext.tsx` dedup logic |
| `tax_transactions` FK constraint on electricity commission | Low — commission JEs posted; audit record fails |
| USSD sessions use in-memory fallback on Cloud Run (no Redis) | Medium — sessions lost on cold-start |
| Airtime/Electricity/Biller inline in overlayServices.js (~1,200 lines) | Medium — violates separation of concerns |

---

## Using Superpowers Plugin

If installed, always start with:
```
/using-superpowers
```

For new features:
```
/superpowers:brainstorm   → before any creative/feature work
/superpowers:write-plan   → create bite-sized task list
/superpowers:execute-plan → execute in batches with checkpoints
```

Use `/compact` when context gets large to compress history and continue working.
