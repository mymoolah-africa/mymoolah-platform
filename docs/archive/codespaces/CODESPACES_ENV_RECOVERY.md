# Codespaces .env Recovery Guide

**When**: Your Codespaces `.env` file was emptied or deleted  
**Where**: Root of `mymoolah-platform` in Codespaces  
**Cause**: Most likely `git clean -fd` was run (see `docs/troubleshooting/FIX_CODESPACES_GIT_ISSUE.md` – Option 4). This command deletes ALL untracked files, and `.env` is untracked (in `.gitignore`).

---

## 🔴 **IMMEDIATE RECOVERY**

### **Step 1: Check for Backup**

```bash
cd /workspaces/mymoolah-platform

# Check for any .env backup
ls -la .env* 2>/dev/null
```

If you see `.env.backup` or `.env.backup.YYYYMMDD`, restore it:

```bash
cp .env.backup .env
# OR
cp .env.backup.20260217 .env  # use actual date
```

---

### **Step 2: Recreate from Template (If No Backup)**

Copy the minimal UAT template below into a new `.env` file. **Replace placeholders** with your actual secrets.

```bash
cd /workspaces/mymoolah-platform
cp env.template .env
# Then edit .env with the values below
```

---

## 📋 **Minimal UAT .env for Codespaces**

Use this as your starting point. **UAT password** is documented in `docs/DATABASE_CONNECTION_GUIDE.md`:

```bash
# =============================================================================
# CODESPACES UAT - MINIMAL CONFIG
# =============================================================================
NODE_ENV=development
PORT=3001
TLS_ENABLED=false

# Database (Cloud SQL Auth Proxy on port 6543)
# Password: B0t3s@Mymoolah (from DATABASE_CONNECTION_GUIDE.md)
DATABASE_URL=postgres://mymoolah_app:B0t3s%40Mymoolah@127.0.0.1:6543/mymoolah?sslmode=disable

# JWT (generate a 32+ char secret if you don't have one)
JWT_SECRET=your_32_char_secret_minimum
JWT_EXPIRES_IN=24h

# CORS (Codespaces forwarded URL - update with your Codespace URL)
ALLOWED_ORIGINS=http://localhost:3000,https://YOUR-CODESPACE-3000.app.github.dev

# Supplier flags (UAT = simulation)
MOBILEMART_LIVE_INTEGRATION=false
FLASH_LIVE_INTEGRATION=false

# Optional but recommended
REDIS_URL=redis://127.0.0.1:6379
```

**Key values:**
- **UAT password**: `B0t3s@Mymoolah` (URL-encoded as `B0t3s%40Mymoolah` in DATABASE_URL)
- **Proxy port**: `6543` (start proxy with `./scripts/one-click-restart-and-start.sh` first)
- **JWT_SECRET**: Use any 32+ character string, or generate: `openssl rand -hex 32`

---

## 📦 **Full .env Reference**

For all variables (Flash, MobileMart, EasyPay, etc.), see `env.template`. Add the ones you need for UAT testing.

---

## 🛡️ **Prevent Future Loss**

1. **Backup before risky git commands:**
   ```bash
   cp .env .env.backup.$(date +%Y%m%d)
   ```

2. **Never run `git clean -fd`** without backing up `.env` first.

3. **Use GitHub Codespaces Secrets** (optional): Store sensitive values in Codespace Secrets; they persist across rebuilds. See [GitHub Docs](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-secrets-for-your-codespaces).

4. **Store a copy locally**: Keep a backup of your Codespaces `.env` on your Mac (in a secure location, never commit it).

---

## 📞 **If Secrets Are Lost**

- **UAT DB password**: `B0t3s@Mymoolah` (documented in `DATABASE_CONNECTION_GUIDE.md`)
- **MobileMart UAT**: Request via WhatsApp (see `integrations/mobilemart/`)
- **Flash**: See `docs/FLASH_CREDENTIALS_SETUP.md`
- **Other integrations**: Check `env.template` and respective docs in `docs/`

---

**Last Updated**: 2026-02-17  
**Related**: `docs/DATABASE_CONNECTION_GUIDE.md`, `docs/troubleshooting/FIX_CODESPACES_GIT_ISSUE.md`
