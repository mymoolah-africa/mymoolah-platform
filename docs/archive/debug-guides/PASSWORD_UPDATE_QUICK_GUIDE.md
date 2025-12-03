# Quick Guide: Update Staging Password via Cloud Console UI

## 🎯 Current Situation

- ✅ Secret Manager has password: `B0t3s@Mymoolahstaging`
- ❌ Cloud SQL password doesn't match (authentication failing)
- ✅ Password sync script reported success, but authentication still fails

## ✅ Solution: Update via Cloud Console UI

### Step-by-Step Instructions

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com/
   - Select project: `mymoolah-db`

2. **Navigate to Cloud SQL**
   - In the left sidebar, go to **SQL**
   - Click on instance: **mmtp-pg-staging**

3. **Go to Users Tab**
   - Click on the **"Users"** tab at the top
   - Find user: **mymoolah_app**

4. **Reset Password**
   - Click the **three dots (⋮)** menu next to `mymoolah_app`
   - Select **"Reset Password"** or **"Edit"**
   - Enter password: `B0t3s@Mymoolahstaging`
   - Click **"Update"** or **"Save"**

5. **Verify Update**
   - You should see a success message
   - The password should now match Secret Manager

### After Updating

Wait 1-2 minutes, then test:

```bash
./scripts/test-staging-password-direct.sh
```

## 🔄 Alternative: Generate New Password Without Special Characters

If the `@` symbol is causing issues, use a password without special characters:

### Step 1: Generate New Password

```bash
# Generate password without special characters
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/@$\`\\" | cut -c1-32)
echo "New password: $NEW_PASSWORD"
# Save this password securely!
```

### Step 2: Update Cloud SQL (via Console UI)

1. Go to Cloud Console → SQL → mmtp-pg-staging → Users
2. Reset password for `mymoolah_app` to the NEW password from Step 1
3. Click **Update**

### Step 3: Update Secret Manager

```bash
# Use the NEW_PASSWORD from Step 1
echo -n "$NEW_PASSWORD" | gcloud secrets versions add db-mmtp-pg-staging-password \
  --project=mymoolah-db \
  --data-file=-
```

### Step 4: Test Connection

```bash
./scripts/test-staging-password-direct.sh
```

## 💡 Why UI is Better

- ✅ Immediate feedback if update fails
- ✅ Validates password before saving
- ✅ No silent failures like CLI sometimes has
- ✅ More reliable for password updates

## 🚨 If Still Not Working

If password update via UI also fails:

1. Check Cloud SQL logs for errors
2. Verify user exists: `gcloud sql users list --instance=mmtp-pg-staging`
3. Try creating a new user and testing with that
4. Contact Google Cloud Support
