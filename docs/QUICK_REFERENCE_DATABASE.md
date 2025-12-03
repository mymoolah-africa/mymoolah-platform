# Quick Reference: Database Operations

## 🚀 **Running Migrations (THE EASY WAY)**

```bash
# UAT
./scripts/run-migrations-master.sh uat

# Staging
./scripts/run-migrations-master.sh staging

# Specific migration
./scripts/run-migrations-master.sh uat 20251203_01_create_sync_audit_logs_table
```

**That's it!** The script handles everything automatically.

---

## ✅ **Pre-Flight Checklist**

Before any database work:
```bash
./scripts/ensure-proxies-running.sh
```

---

## 📊 **Verification Commands**

```bash
# Check migration status
node scripts/check-migration-status.js

# Audit extra tables
node scripts/audit-extra-staging-tables.js

# Full schema sync verification
node scripts/sync-staging-to-uat-banking-grade.js
```

---

## 🔧 **Using in Custom Scripts**

```javascript
const { getUATClient, getStagingClient, closeAll } = require('./scripts/db-connection-helper');

const client = await getUATClient();
try {
  // Your code here
} finally {
  client.release();
  await closeAll();
}
```

---

## ⚠️ **Common Issues**

| Error | Solution |
|-------|----------|
| `password authentication failed` | Use master script - it handles passwords |
| `proxy not running` | Run `./scripts/ensure-proxies-running.sh` |
| `ETIMEDOUT` | Check proxy port (UAT: 6543, Staging: 6544) |
| `Error parsing url` | Use master script - handles DATABASE_URL |

---

**Full Guide**: See `docs/DATABASE_CONNECTION_GUIDE.md`
