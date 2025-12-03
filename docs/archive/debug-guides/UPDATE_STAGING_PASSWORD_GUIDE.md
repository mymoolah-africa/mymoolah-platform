# Update Staging Database Password in Secret Manager

**Last Updated**: December 3, 2025  
**Purpose**: Step-by-step guide to reset and update the Staging database password in Google Secret Manager

---

## 📋 Prerequisites

1. ✅ Access to Google Cloud Console (project: `mymoolah-db`)
2. ✅ `gcloud` CLI installed and authenticated
3. ✅ Permissions to manage secrets in Secret Manager
4. ✅ Access to Staging Cloud SQL instance to reset the database password

---

## 🔄 **Method 1: Update Password via Google Cloud Console (Recommended)**

### Step 1: Generate New Password (Optional but Recommended)

First, generate a strong password for the database:

```bash
# Generate a secure 64-character password
openssl rand -base64 48 | tr -d "=+/" | cut -c1-64

# Or generate a 32-character password
openssl rand -base64 24 | tr -d "=+/" | cut -c1-32
```

**Save this password securely** - you'll need it for both steps below.

---

### Step 2: Reset Password in Cloud SQL Database

**Option A: Using gcloud CLI (Recommended)**

```bash
# Set your new password
NEW_PASSWORD="your_new_secure_password_here"

# Reset the database user password in Cloud SQL
gcloud sql users set-password mymoolah_app \
  --instance=mmtp-pg-staging \
  --password="$NEW_PASSWORD" \
  --project=mymoolah-db

echo "✅ Database password updated in Cloud SQL"
```

**Option B: Using Google Cloud Console**

1. Go to **Cloud SQL** in Google Cloud Console
2. Select instance: **mmtp-pg-staging**
3. Click on **"Users"** tab
4. Find user: **mymoolah_app**
5. Click **"Reset password"** or edit the user
6. Enter your new password
7. Click **"Update"** or **"Save"**

---

### Step 3: Update Password in Secret Manager

**Option A: Using Google Cloud Console (Visual Interface)**

1. Go to **Secret Manager** in Google Cloud Console
2. Navigate to project: **mymoolah-db**
3. Find secret: **`db-mmtp-pg-staging-password`**
4. Click on the secret name (or click the three dots menu → **"View secret"**)
5. Click on **"ADD NEW VERSION"** button (top right)
6. In the **"Secret value"** field, paste your new password (from Step 1)
7. Click **"ADD VERSION"** to save
8. The new version will be automatically marked as **"latest"**

**Option B: Using gcloud CLI (Command Line)**

```bash
# Set your new password (same as used in Step 2)
NEW_PASSWORD="your_new_secure_password_here"

# Update Secret Manager with new password version
echo -n "$NEW_PASSWORD" | gcloud secrets versions add db-mmtp-pg-staging-password \
  --project=mymoolah-db \
  --data-file=-

echo "✅ Password updated in Secret Manager"
```

**⚠️ IMPORTANT**: Use `echo -n` (no newline) to avoid adding trailing newlines to the password!

---

### Step 4: Verify the Update

```bash
# Test retrieving the password from Secret Manager
gcloud secrets versions access latest \
  --secret="db-mmtp-pg-staging-password" \
  --project="mymoolah-db" | wc -c

# Should show password length (without newline, should match your password length)

# Test connection with the new password
./scripts/test-staging-password-direct.sh
```

---

## 🔄 **Method 2: Complete Automated Update Script**

I'll create a script that does both steps automatically:

```bash
# Generate new password and update both Cloud SQL and Secret Manager
./scripts/reset-staging-password.sh
```

*(Script to be created below)*

---

## 🧪 **Verification Steps**

After updating the password, verify everything works:

```bash
# 1. Verify password in Secret Manager (should show new password)
gcloud secrets versions access latest \
  --secret="db-mmtp-pg-staging-password" \
  --project="mymoolah-db" | head -c 20 && echo "... (first 20 chars)"

# 2. Test database connection
./scripts/test-staging-password-direct.sh

# 3. Run schema comparison (should work now!)
./scripts/run-compare-schemas-in-codespaces.sh

# 4. Test sync script
./scripts/run-sync-in-codespaces.sh --dry-run
```

---

## ⚠️ **Important Notes**

1. **Password Length**: Staging passwords are typically 64 characters (generated automatically by Cloud SQL)
2. **No Newlines**: Always use `echo -n` or ensure no trailing newlines when updating Secret Manager
3. **Version History**: Secret Manager keeps version history - old versions remain accessible
4. **Consistency**: The password in Cloud SQL and Secret Manager **MUST match** exactly
5. **Timing**: Update Cloud SQL first, then Secret Manager (or do both simultaneously)

---

## 🚨 **Troubleshooting**

### If authentication still fails after update:

```bash
# Check password length
gcloud secrets versions access latest \
  --secret="db-mmtp-pg-staging-password" \
  --project="mymoolah-db" | wc -c

# Check for hidden characters
gcloud secrets versions access latest \
  --secret="db-mmtp-pg-staging-password" \
  --project="mymoolah-db" | cat -A

# Verify database user exists
# (You'll need to connect as admin to check)
```

### If you need to see previous password versions:

```bash
# List all versions
gcloud secrets versions list db-mmtp-pg-staging-password \
  --project=mymoolah-db

# Access a specific version (if needed)
gcloud secrets versions access <VERSION_NUMBER> \
  --secret="db-mmtp-pg-staging-password" \
  --project="mymoolah-db"
```

---

## 📚 **Related Documentation**

- [Google Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Cloud SQL User Management](https://cloud.google.com/sql/docs/postgres/manage-users)
- `docs/STAGING_SYNC_GUIDE.md` - Database sync procedures

---

## ✅ **Quick Reference Commands**

```bash
# 1. Generate new password
NEW_PASSWORD=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-64)

# 2. Update Cloud SQL
gcloud sql users set-password mymoolah_app \
  --instance=mmtp-pg-staging \
  --password="$NEW_PASSWORD" \
  --project=mymoolah-db

# 3. Update Secret Manager
echo -n "$NEW_PASSWORD" | gcloud secrets versions add db-mmtp-pg-staging-password \
  --project=mymoolah-db \
  --data-file=-

# 4. Verify
./scripts/test-staging-password-direct.sh
```

---

**🎯 After completing these steps, your sync scripts should work perfectly!**
