# Staging Password Authentication Troubleshooting Guide

## 🔍 Current Issue

Password authentication is failing for Staging database despite:
- ✅ Password retrieved from Secret Manager (62 characters)
- ✅ User `mymoolah_app` exists in Cloud SQL
- ✅ SSL configuration is correct (`ssl: false` for proxy)
- ✅ Proxy is running on port 6544
- ✅ UAT connection works fine (same user, different password)

**Error:** `password authentication failed for user "mymoolah_app"`

## 🔧 Root Cause Analysis

This indicates that **the password in Secret Manager doesn't match the password actually stored in Cloud SQL**. The CLI password update command may have:
1. Succeeded in updating Secret Manager but failed silently in Cloud SQL
2. Reported success but the password wasn't actually applied
3. There's a delay/propagation issue (unlikely after 5+ minutes)

## ✅ Solution: Update Password via Cloud Console UI

The Cloud Console UI is more reliable than CLI for password updates. Follow these steps:

### Step 1: Access Cloud SQL Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **SQL** → **Instances**
3. Click on **mmtp-pg-staging**
4. Go to **Users** tab

### Step 2: Reset Password via UI

1. Find user **mymoolah_app** in the users list
2. Click the **three dots (⋮)** menu next to the user
3. Select **Reset Password**
4. Enter a new secure password (or generate one)
5. **Save the password securely** - you'll need to update Secret Manager
6. Click **Update** or **Save**

### Step 3: Update Secret Manager

After resetting in Cloud Console, update Secret Manager:

```bash
# Option 1: Set password as variable (RECOMMENDED - safer)
NEW_PASSWORD="paste-your-password-here-from-cloud-console"
echo -n "$NEW_PASSWORD" | gcloud secrets versions add db-mmtp-pg-staging-password \
  --project=mymoolah-db \
  --data-file=-

# Option 2: Directly paste password (if no special characters)
# Replace "your-actual-password" with the password from Cloud Console
echo -n "your-actual-password" | gcloud secrets versions add db-mmtp-pg-staging-password \
  --project=mymoolah-db \
  --data-file=-
```

**Important Notes:**
- ✅ **Replace the placeholder** with your actual password from Cloud Console
- ✅ **No quotes needed** around the actual password (the quotes in the example are just to show where it goes)
- ✅ **Use Option 1** (variable) if your password has special characters like `$`, `` ` ``, `\`, etc.
- ⚠️ **Be careful** - the password will be visible in your terminal history (that's why Option 1 with variable is safer)

### Step 4: Verify the Update

Wait 1-2 minutes for propagation, then test:

```bash
# Test connection
./scripts/test-staging-password-direct.sh

# Or run schema comparison
./scripts/run-compare-schemas-in-codespaces.sh
```

## 🚨 Alternative: Use Cloud SQL Admin User

If the `mymoolah_app` user password is completely broken, you can:

1. **Connect as `postgres` user** (if you have the password)
2. **Reset `mymoolah_app` password directly** in the database:

```sql
ALTER USER mymoolah_app WITH PASSWORD 'your-new-secure-password';
```

Then update Secret Manager with the same password.

## 📋 Verification Checklist

After updating password:

- [ ] Password reset completed in Cloud Console UI
- [ ] Password updated in Secret Manager (same value)
- [ ] Waited 2-3 minutes for propagation
- [ ] Tested connection: `./scripts/test-staging-password-direct.sh`
- [ ] Connection successful ✅
- [ ] Schema comparison works: `./scripts/run-compare-schemas-in-codespaces.sh`
- [ ] Sync script works (dry-run): `./scripts/run-sync-in-codespaces.sh --dry-run`

## 🔐 Security Best Practices

1. **Never commit passwords to Git**
2. **Store passwords only in Secret Manager** (for Staging/Production)
3. **Use Cloud Console UI for password resets** (more reliable than CLI)
4. **Update Secret Manager immediately** after Cloud SQL password change
5. **Verify connection** within 2-3 minutes of update

## 💡 Why UI is Better Than CLI

- ✅ UI shows immediate feedback if update fails
- ✅ UI validates password before saving
- ✅ UI doesn't have silent failure modes
- ✅ UI can show if user doesn't exist
- ✅ CLI sometimes reports success when it actually failed

## 📞 If Still Not Working

If password update via UI also fails:

1. **Check Cloud SQL logs** for authentication errors
2. **Verify user exists**: `gcloud sql users list --instance=mmtp-pg-staging`
3. **Try creating a new user** and testing with that
4. **Contact Google Cloud Support** if issue persists

## 🔗 Related Documentation

- `docs/UPDATE_STAGING_PASSWORD_GUIDE.md` - Detailed password update guide
- `scripts/reset-staging-password.sh` - Automated password reset script (CLI)
- `scripts/test-staging-password-direct.sh` - Connection test script
